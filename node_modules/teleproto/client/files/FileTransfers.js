"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileTransfers = void 0;
exports.transferKindFor = transferKindFor;
const promises_1 = require("node:timers/promises");
const errors_1 = require("../../errors");
const RequestState_1 = require("../../network/mtproto/RequestState");
const SessionSlot_1 = require("../../network/dc/SessionSlot");
const dcId_1 = require("../../network/dc/dcId");
const ResourceManager_1 = require("./ResourceManager");
const PartsManager_1 = require("./PartsManager");
const SMALL_FILE_SIZE = 20 * 1024;
const SMALL_QUEUE_FILE_SIZE = 20 * 1024 * 1024;
const DEFAULT_SMALL_QUEUE = 5;
const DEFAULT_LARGE_QUEUE = 2;
const DEFAULT_MAX_FILE_PARTS = 4000;
const DEFAULT_MAX_FILE_PARTS_PREMIUM = 8000;
const DOWNLOAD_RESOURCE_LIMIT = 2 * 1024 * 1024;
const DOWNLOAD_RESOURCE_LIMIT_PREMIUM = 16 * 1024 * 1024;
const UPLOAD_RESOURCE_LIMIT = 4 * 1024 * 1024;
const RETRY_BUDGET_MS = 60_000;
const RETRY_BUDGET_BOT_MS = 8_000;
const MAX_FLOOD_WAIT_S = 14 * 24 * 3600;
const MAX_LOST_SESSIONS = 5;
function transferKindFor(size) {
    return size !== undefined && size > 0 && size < SMALL_FILE_SIZE ? "downloadSmall" : "download";
}
function floodSeconds(error) {
    const message = error.errorMessage ?? "";
    if (!/^FLOOD_(?:PREMIUM_|TEST_PHONE_)?WAIT_/.test(message))
        return undefined;
    const seconds = typeof error.seconds === "number" ? error.seconds : Number(message.split("_").pop());
    return Math.min(Math.max(Number.isFinite(seconds) ? seconds : 1, 1), MAX_FLOOD_WAIT_S);
}
function isRetryableServerError(error) {
    if (error.errorMessage === "WORKER_BUSY_TOO_LONG_RETRY" || error.errorMessage === "FLOOD_SKIP_FAILED_WAIT")
        return true;
    return typeof error.code === "number" && (error.code >= 500 || error.code < 0);
}
function isLostSession(error) {
    return error instanceof SessionSlot_1.SlotRemovedError || error?.errorMessage === "AUTH_KEY_UNREGISTERED";
}
class FileTransfers {
    constructor(client, opts = {}) {
        this.client = client;
        this.opts = opts;
        this.managers = new Map();
        this.operations = new Map();
        this.speedLimitLogged = false;
    }
    get cdnEnabled() {
        return this.opts.cdnSupported ?? true;
    }
    get maxPartSize() {
        return Math.min(this.opts.partSize ?? PartsManager_1.MAX_PART_SIZE, PartsManager_1.MAX_PART_SIZE);
    }
    get premium() {
        return !!this.client._premium;
    }
    async appNumber(key, fallback) {
        const value = (await this.client._getAppConfig())[key];
        return typeof value === "number" && value > 0 ? value : fallback;
    }
    async cdnReachable(dcId) {
        if (this.client._addresses.isCdn(dcId))
            return true;
        this.configRefresh ??= this.client._reloadConfig().finally(() => (this.configRefresh = undefined));
        await this.configRefresh;
        return this.client._addresses.isCdn(dcId);
    }
    maxUploadParts() {
        return this.premium
            ? this.appNumber("upload_max_fileparts_premium", DEFAULT_MAX_FILE_PARTS_PREMIUM)
            : this.appNumber("upload_max_fileparts_default", DEFAULT_MAX_FILE_PARTS);
    }
    async acquireDownload(dcId, size, signal) {
        const large = size !== undefined && size > SMALL_QUEUE_FILE_SIZE;
        const limit = large
            ? await this.appNumber("large_queue_max_active_operations_count", DEFAULT_LARGE_QUEUE)
            : await this.appNumber("small_queue_max_active_operations_count", DEFAULT_SMALL_QUEUE);
        const key = `${dcId}:${large ? "large" : "small"}`;
        let queue = this.operations.get(key);
        if (!queue)
            this.operations.set(key, (queue = { active: 0, waiters: [] }));
        const owned = queue;
        while (owned.active >= limit) {
            if (signal?.aborted)
                throw new errors_1.MediaAbortError();
            await new Promise((resolve, reject) => {
                const onAbort = () => {
                    owned.waiters.splice(owned.waiters.indexOf(wake), 1);
                    reject(new errors_1.MediaAbortError());
                };
                const wake = () => {
                    signal?.removeEventListener("abort", onAbort);
                    resolve();
                };
                owned.waiters.push(wake);
                signal?.addEventListener("abort", onAbort, { once: true });
            });
        }
        owned.active++;
        let released = false;
        return () => {
            if (released)
                return;
            released = true;
            owned.active--;
            owned.waiters.shift()?.();
        };
    }
    sessionCount(kind, dcId) {
        if (kind === "cdn")
            return 1;
        const override = kind === "upload" ? this.opts.upload?.sessions : this.opts.download?.sessions;
        const configured = override ?? this.opts.sessions;
        if (configured && configured > 0)
            return Math.min(configured, 16);
        if (kind === "upload")
            return this.premium || (dcId !== 2 && dcId !== 4) ? 8 : 4;
        return this.premium ? 8 : 2;
    }
    manager(kind, dcId) {
        const key = kind === "upload" ? "upload" : `${kind}:${dcId}`;
        let manager = this.managers.get(key);
        if (!manager) {
            manager = new ResourceManager_1.ResourceManager(this.resourceLimit(kind, dcId), kind === "upload" ? "greedy" : "baseline");
            this.managers.set(key, manager);
        }
        return manager;
    }
    resourceLimit(kind, dcId) {
        const balance = kind === "upload" ? this.opts.upload : this.opts.download;
        const inFlight = balance?.inFlight ?? this.opts.inflightPerDc;
        if (inFlight && inFlight > 0)
            return inFlight * this.sessionCount(kind, dcId) * (balance?.partSize ?? this.maxPartSize);
        if (kind === "upload")
            return UPLOAD_RESOURCE_LIMIT;
        return this.premium ? DOWNLOAD_RESOURCE_LIMIT_PREMIUM : DOWNLOAD_RESOURCE_LIMIT;
    }
    slot(kind, dcId) {
        const count = this.sessionCount(kind, dcId);
        const shift = kind === "upload" ? dcId_1.uploadDcId : kind === "downloadSmall" ? dcId_1.downloadSmallDcId : dcId_1.downloadDcId;
        let best = [];
        let bestLoad = Infinity;
        for (let index = 0; index < count; index++) {
            const slot = this.client._network.getSession(shift(dcId, index));
            if (slot.load < bestLoad) {
                best = [slot];
                bestLoad = slot.load;
            }
            else if (slot.load === bestLoad) {
                best.push(slot);
            }
        }
        return best[Math.floor(Math.random() * best.length)];
    }
    async run(kind, dcId, build, signal) {
        const budget = this.client._bot ? RETRY_BUDGET_BOT_MS : RETRY_BUDGET_MS;
        let waited = 0;
        let backoffS = 1;
        let lostSessions = 0;
        for (;;) {
            if (signal?.aborted)
                throw new errors_1.MediaAbortError();
            const slot = this.slot(kind, dcId);
            slot.enter();
            try {
                const session = await slot.ensureConnected();
                return (await this.send(session, slot, build(), signal));
            }
            catch (error) {
                if (signal?.aborted || error instanceof errors_1.MediaAbortError)
                    throw new errors_1.MediaAbortError();
                if (error instanceof errors_1.FileMigrateError)
                    throw error;
                if (isLostSession(error)) {
                    if (++lostSessions > MAX_LOST_SESSIONS)
                        throw error;
                    continue;
                }
                const flood = floodSeconds(error);
                const premiumWait = /^FLOOD_PREMIUM_WAIT_/.test(error.errorMessage ?? "");
                let delayS;
                if (premiumWait && flood !== undefined) {
                    if (!this.speedLimitLogged) {
                        this.speedLimitLogged = true;
                        this.client._log.info(`Telegram limits ${kind} speed for accounts without Premium, waiting ${flood}s between parts`);
                    }
                    try {
                        await (0, promises_1.setTimeout)(flood * 1000, undefined, { signal });
                    }
                    catch {
                        throw new errors_1.MediaAbortError();
                    }
                    continue;
                }
                else if (flood !== undefined) {
                    delayS = flood;
                    backoffS = 1;
                }
                else if (isRetryableServerError(error)) {
                    delayS = backoffS;
                    if (backoffS < 60)
                        backoffS *= 2;
                }
                else {
                    throw error;
                }
                if (waited + delayS * 1000 > budget)
                    throw error;
                waited += delayS * 1000;
                this.client._log.debug(`${kind} part on dc ${dcId} retries in ${delayS}s: ${error.message}`);
                try {
                    await (0, promises_1.setTimeout)(delayS * 1000, undefined, { signal });
                }
                catch {
                    throw new errors_1.MediaAbortError();
                }
            }
            finally {
                slot.leave();
            }
        }
    }
    send(session, slot, request, signal) {
        const state = new RequestState_1.RequestState(request);
        session.addStateToQueue(state);
        return new Promise((resolve, reject) => {
            const cleanup = () => {
                offDeath();
                signal?.removeEventListener("abort", onAbort);
            };
            const offDeath = slot.onDeath((reason) => {
                cleanup();
                reject(new SessionSlot_1.SlotRemovedError(reason));
            });
            const onAbort = () => {
                cleanup();
                session.cancelRequest(state, new errors_1.MediaAbortError());
                reject(new errors_1.MediaAbortError());
            };
            signal?.addEventListener("abort", onAbort, { once: true });
            state.promise.then((value) => {
                cleanup();
                resolve(value);
            }, (error) => {
                cleanup();
                reject(error);
            });
        });
    }
    reset() {
        this.managers.clear();
        this.operations.clear();
    }
}
exports.FileTransfers = FileTransfers;
