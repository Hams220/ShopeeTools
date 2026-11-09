"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.invoke = invoke;
const tl_1 = require("../../tl");
const errors = __importStar(require("../../errors"));
const utils = __importStar(require("../../Utils"));
const Helpers_1 = require("../../Helpers");
const RequestState_1 = require("../../network/mtproto/RequestState");
const network_1 = require("../../network");
const RpcCallControl_1 = require("./RpcCallControl");
const uploads_1 = require("../methods/uploads");
const telegramInternalErrors = async (e, ctx) => {
    if (!(e instanceof errors.ServerError ||
        e.errorMessage === "RPC_CALL_FAIL" ||
        e.errorMessage === "RPC_MCGET_FAIL")) {
        return false;
    }
    ctx.client._log.warn(`Telegram is having internal issues ${e.constructor.name}`);
    await ctx.control.sleep(2000);
    return true;
};
const floodWait = async (e, ctx) => {
    if (!(e instanceof errors.FloodWaitError ||
        e instanceof errors.FloodTestPhoneWaitError)) {
        return false;
    }
    if (e.seconds > (ctx.options.floodSleepThreshold ?? ctx.client.floodSleepThreshold)) {
        throw e;
    }
    ctx.client._log.info(`Sleeping for ${e.seconds}s on flood wait (Caused by ${ctx.request.className})`);
    await ctx.control.sleep(e.seconds * 1000);
    return true;
};
const dcMigration = async (e, ctx) => {
    if (!(e instanceof errors.PhoneMigrateError ||
        e instanceof errors.NetworkMigrateError ||
        e instanceof errors.UserMigrateError)) {
        return false;
    }
    if (e instanceof errors.UserMigrateError &&
        (ctx.dcId !== undefined || ctx.sender !== ctx.client._sender) &&
        e.newDc === ctx.client.session.dcId) {
        ctx.client._log.info(`Request must run on the home DC ${e.newDc}; rerouting to the main sender`);
        ctx.lease?.release();
        ctx.lease = undefined;
        ctx.dcId = undefined;
        ctx.sender = ctx.client._sender;
        return true;
    }
    ctx.client._log.info(`Migrating to data center ${e.newDc}`);
    const shouldRaise = e instanceof errors.PhoneMigrateError ||
        e instanceof errors.NetworkMigrateError;
    if (shouldRaise && (await ctx.control.wait(ctx.client.isUserAuthorized()))) {
        throw e;
    }
    ctx.control.check();
    await ctx.control.wait(ctx.client._switchDC(e.newDc));
    ctx.control.check();
    ctx.lease?.release();
    ctx.lease = undefined;
    if (ctx.dcId === undefined) {
        ctx.sender = ctx.client._sender;
    }
    else {
        ctx.lease = await ctx.control.wait(ctx.client._leaseSender(ctx.dcId).then((lease) => {
            if (ctx.control.signal.aborted)
                lease.release();
            return lease;
        }));
        ctx.sender = ctx.lease.sender;
    }
    return true;
};
const msgWait = async (e, ctx) => {
    if (!(e instanceof errors.MsgWaitError)) {
        return false;
    }
    await ctx.control.wait(ctx.state.isReady());
    ctx.state.after = undefined;
    return true;
};
const reCaptcha = async (e, ctx) => {
    if (!(e.errorMessage &&
        e.errorMessage.startsWith("RECAPTCHA_CHECK_") &&
        ctx.client._reCaptchaCallback)) {
        return false;
    }
    const match = e.errorMessage.match(/RECAPTCHA_CHECK_.*(6Le[-\w]+)/);
    if (!match) {
        throw e;
    }
    const token = await ctx.control.wait(ctx.client._reCaptchaCallback(match[1]));
    ctx.control.check();
    const newRequest = new tl_1.Api.InvokeWithReCaptcha({
        token: token,
        query: ctx.request,
    });
    await ctx.control.wait(newRequest.resolve(ctx.client, utils));
    ctx.control.check();
    ctx.state.request = newRequest;
    ctx.state.data = newRequest.getBytes();
    return true;
};
const connectionNotInited = async (e, ctx) => {
    if (e.message !== "CONNECTION_NOT_INITED") {
        return false;
    }
    const targetSender = ctx.sender || ctx.client._sender;
    if (targetSender) {
        targetSender._needsInitConnection = true;
    }
    ctx.client._log.warn("CONNECTION_NOT_INITED, will re-wrap next request with initConnection");
    return true;
};
const missingFileParts = async (e, ctx) => {
    const part = e instanceof errors.FilePartMissingError ? e.value : e.errorMessage === "MD5_CHECKSUM_INVALID" ? "all" : undefined;
    if (part === undefined || ctx.resavedFiles)
        return false;
    ctx.resavedFiles = true;
    return ctx.control.wait((0, uploads_1._resaveUploadedParts)(ctx.client, ctx.request, part));
};
const INVOKE_ERROR_POLICIES = [
    telegramInternalErrors,
    floodWait,
    dcMigration,
    msgWait,
    reCaptcha,
    connectionNotInited,
    missingFileParts,
];
async function invoke(client, request, dcId, otherSender, options = {}) {
    if (request.classType !== "request") {
        throw new Error("You can only invoke MTProtoRequests");
    }
    const control = new RpcCallControl_1.RpcCallControl(options);
    const authorizationError = client.updates.authorizationError;
    const ctx = {
        client, request, state: undefined, dcId, sender: client._sender, control, options,
    };
    try {
        control.check();
        if (dcId) {
            ctx.lease = await control.wait(client._leaseSender(dcId).then((lease) => {
                if (control.signal.aborted)
                    lease.release();
                return lease;
            }));
            ctx.sender = ctx.lease.sender;
        }
        if (otherSender !== undefined) {
            ctx.sender = otherSender instanceof network_1.MTProtoSender ? otherSender : otherSender.sender;
        }
        if (!ctx.sender || ctx.sender.userDisconnected) {
            throw new Error("Cannot send requests while disconnected. Please connect first.");
        }
        await control.wait(client._connectedDeferred.promise);
        control.check();
        await control.wait(request.resolve(client, utils));
        control.check();
        client._lastRequest = Date.now();
        const state = new RequestState_1.RequestState(request);
        ctx.state = state;
        const attempts = options.maxRetryCount === undefined ? client._requestRetries : options.maxRetryCount + 1;
        let attempt = 0;
        for (attempt = 0; attempt < attempts; attempt++) {
            control.check();
            ctx.sender.addStateToQueue(state);
            try {
                const result = await control.wait(state.promise);
                state.finished.resolve();
                try {
                    await client.session.processEntities(result);
                }
                catch (err) {
                    client._log.warn(`session.processEntities failed: ${err}`);
                }
                client._entityCache.add(result);
                if (!dcId && !otherSender) {
                    if (result instanceof tl_1.Api.auth.Authorization || result instanceof tl_1.Api.auth.LoginTokenSuccess ||
                        (result instanceof tl_1.Api.updates.State && authorizationError !== undefined &&
                            authorizationError === client.updates.authorizationError)) {
                        client.updates._resumeAuthorization();
                    }
                    const sub = result
                        ?.SUBCLASS_OF_ID;
                    if (sub === (0, Helpers_1.unionId)("Updates")) {
                        client.updateManager.onUpdates(result, true, request);
                    }
                    else if (sub === (0, Helpers_1.unionId)("messages.AffectedMessages") ||
                        sub === (0, Helpers_1.unionId)("messages.AffectedHistory") ||
                        sub === (0, Helpers_1.unionId)("messages.AffectedFoundMessages")) {
                        const affected = result;
                        let affectedRequest = request;
                        while (affectedRequest.query?.classType === "request") {
                            affectedRequest = affectedRequest.query;
                        }
                        const channel = affectedRequest.channel;
                        client.updateManager.applyAffected(affected.pts, affected.ptsCount, channel?.channelId?.toString());
                    }
                }
                return result;
            }
            catch (e) {
                control.check();
                if ((e instanceof errors.FloodWaitError || e instanceof errors.FloodTestPhoneWaitError) &&
                    client.updateManager.handleChannelFloodWait(request, e.seconds))
                    throw e;
                if (attempt + 1 >= attempts)
                    throw e;
                let recovered = false;
                for (const policy of INVOKE_ERROR_POLICIES) {
                    try {
                        recovered = await policy(e, ctx);
                    }
                    catch (fatal) {
                        state.finished.resolve();
                        throw fatal;
                    }
                    if (recovered)
                        break;
                }
                if (!recovered) {
                    state.finished.resolve();
                    throw e;
                }
            }
            state.resetPromise();
        }
        throw new Error(`Request was unsuccessful ${attempt} time(s)`);
    }
    finally {
        if (ctx.state) {
            if (control.signal.aborted)
                ctx.sender.cancelRequest(ctx.state, control.signal.reason);
            ctx.state.finished.resolve();
        }
        ctx.lease?.release();
        control.dispose();
    }
}
