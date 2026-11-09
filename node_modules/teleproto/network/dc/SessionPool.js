"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SessionPool = void 0;
const promises_1 = require("node:timers/promises");
const AuthKey_1 = require("../../crypto/AuthKey");
const tempKeyBinding_1 = require("../mtproto/tempKeyBinding");
const SessionSlot_1 = require("./SessionSlot");
const dcId_1 = require("./dcId");
class SessionPool {
    constructor(client, opts) {
        this.client = client;
        this.opts = opts;
        this.slots = new Map();
        this.keyCreation = new Map();
        this.lastStartAt = new Map();
        this.closed = false;
    }
    dcenter(dcId) {
        return this.client._dcenters.get(dcId, this.client.session.getAuthKey(dcId));
    }
    getSession(shiftedDcId) {
        if (this.closed)
            throw new Error("Network is closed");
        let slot = this.slots.get(shiftedDcId);
        if (!slot || slot.state === "dead") {
            slot = this.createSlot(shiftedDcId);
            this.slots.set(shiftedDcId, slot);
        }
        return slot;
    }
    async lease(dcId) {
        const slot = this.getSession(dcId);
        const sender = await slot.ensureConnected();
        slot.enter();
        let released = false;
        return {
            sender,
            release: () => {
                if (released)
                    return;
                released = true;
                slot.leave();
            },
        };
    }
    removeSession(shiftedDcId) {
        const slot = this.slots.get(shiftedDcId);
        if (!slot)
            return;
        this.slots.delete(shiftedDcId);
        slot.markDead("manual").catch(() => { });
    }
    async purge() {
        await this.retire("manual");
    }
    async close() {
        this.closed = true;
        await this.retire("pool-closed");
    }
    async retire(reason) {
        const slots = [...this.slots.values()];
        this.slots.clear();
        await Promise.all(slots.map((slot) => slot.markDead(reason).catch(() => { })));
    }
    createSlot(shiftedDcId) {
        const dcId = (0, dcId_1.bareDcId)(shiftedDcId);
        const dc = this.dcenter(dcId);
        const slot = new SessionSlot_1.SessionSlot({
            dcId,
            idleTimeoutMs: this.opts.idleTimeoutMs,
            connect: () => {
                if (this.hasKey(dc))
                    return this.start(shiftedDcId, slot, dc);
                const previous = this.keyCreation.get(dcId) ?? Promise.resolve();
                const ours = previous.then(() => this.start(shiftedDcId, slot, dc));
                this.keyCreation.set(dcId, ours.catch(() => { }));
                return ours;
            },
        });
        return slot;
    }
    hasKey(dc) {
        return !!dc.authKey.getKey() || !!this.client.session.getAuthKey(dc.dcId)?.getKey();
    }
    async start(shiftedDcId, slot, dc) {
        const gap = this.opts.sessionStartupDelayMs;
        const last = this.lastStartAt.get(shiftedDcId) ?? 0;
        const wait = gap - (Date.now() - last);
        if (gap > 0 && last > 0 && wait > 0)
            await (0, promises_1.setTimeout)(wait);
        try {
            const dcId = dc.dcId;
            const sessionKey = this.client.session.getAuthKey(dcId)?.getKey();
            const ownKey = dc.authKey.getKey();
            const isHome = dcId === this.client.session.dcId;
            if (sessionKey && (!ownKey || (isHome && !sessionKey.equals(ownKey))))
                await dc.authKey.setKey(sessionKey);
            const media = (0, dcId_1.isMediaDcId)(shiftedDcId) && !this.client._addresses.isCdn(dcId);
            const mediaCluster = (0, dcId_1.isDownloadDcId)(shiftedDcId) || (0, dcId_1.isDownloadSmallDcId)(shiftedDcId);
            const pfs = media && this.client._usePfs() && !dc.pfsFailed && !!dc.authKey.getKey();
            const log = this.client._log;
            const session = this.client._makeSender(dcId, (_dc, reason) => this.onBreak(shiftedDcId, slot, dc, reason), pfs ? new AuthKey_1.AuthKey() : dc.authKey, true, pfs
                ? {
                    permAuthKey: dc.authKey,
                    dcParam: -(dcId + (this.client._testServers ? 10000 : 0)),
                    expiresIn: (0, tempKeyBinding_1.tempKeyLifetime)(),
                    onFailed: (error) => {
                        dc.pfsFailed = true;
                        log.info(`Temporary key binding failed for dc ${dcId}, media sessions use the permanent key (${error instanceof Error ? error.message : error})`);
                    },
                }
                : undefined, media);
            return await this.client._connectSender(session, dcId, undefined, mediaCluster);
        }
        finally {
            this.lastStartAt.set(shiftedDcId, Date.now());
        }
    }
    onBreak(shiftedDcId, slot, dc, reason = "disconnected") {
        if (this.slots.get(shiftedDcId) === slot)
            this.slots.delete(shiftedDcId);
        if (reason !== "disconnected")
            dc.unauthorize();
        if (reason === "auth-broken" && dc.dcId !== this.client.session.dcId) {
            dc.authKey.setKey(undefined).catch(() => { });
            this.client.session.setAuthKey(undefined, dc.dcId);
        }
        slot.markDead(reason === "disconnected" ? "disconnected" : "auth-broken").catch(() => { });
    }
}
exports.SessionPool = SessionPool;
