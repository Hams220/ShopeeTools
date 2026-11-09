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
exports.UpdateManager = void 0;
const tl_1 = require("../../tl");
const utils = __importStar(require("../../Utils"));
const network_1 = require("../../network");
const ChannelUpdates_1 = require("./ChannelUpdates");
const PtsWaiter_1 = require("./PtsWaiter");
const updateKinds_1 = require("./updateKinds");
const STATE_CHECK_AFTER_MS = 300_000;
const STATE_CHECK_JITTER_MS = 60_000;
const RECENT_MESSAGE_BUFFER_SIZE = 1000;
const MAX_PENDING_SEQ = 1000;
const GAP_TIMEOUT_UPDATE_COUNT = 20;
const DIFFERENCE_DEADLINE_MS = 120_000;
const STATE_SAVE_DELAY_MS = 50;
const MAX_DATE = 2147483647;
class UpdateManager {
    constructor(client) {
        this.lastUpdateTime = 0;
        this.generation = 0;
        this.gapTimers = {};
        this.beforeState = [];
        this.pendingSeq = [];
        this.recentMessageKeys = new Set();
        this.recentMessageQueue = [];
        this.fetchingDifference = false;
        this.retryDelayS = 0;
        this.stateCheckAfterMs = 0;
        this.running = false;
        this.client = client;
        this.channels = new ChannelUpdates_1.ChannelUpdates(this);
        this.globalPts = this.makeWaiter("pts");
        this.qts = this.makeWaiter("qts");
    }
    get isRunning() {
        return this.running;
    }
    get polling() {
        return this.channels.polling;
    }
    start() {
        if (this.running)
            return;
        this.running = true;
        this.channels.start();
        this.client.updates._resume();
    }
    stop() {
        this.flushState();
        this.running = false;
        this.generation++;
        this.channels.stop();
        this.client.updates._pause();
        this.initializing = undefined;
        this.beforeState.length = 0;
        for (const waiter of [this.globalPts, this.qts]) {
            waiter.clearSkippedUpdates();
            waiter.setRequesting(false);
        }
        for (const timer of [this.gapTimers.pts, this.gapTimers.qts, this.repairTimer, this.retryTimer, this.seqGapTimer]) {
            clearTimeout(timer);
        }
        this.gapTimers.pts = this.gapTimers.qts = this.repairTimer = this.retryTimer = this.seqGapTimer = undefined;
        this.pendingSeq.length = 0;
        this.fetchingDifference = false;
        this.retryDelayS = 0;
    }
    reset() {
        this.state = undefined;
        this.lastUpdateTime = 0;
        this.channels.reset();
        this.recentMessageKeys.clear();
        this.recentMessageQueue.length = 0;
        this.globalPts.init(0);
        this.qts.init(0);
        this.client.session.setUpdateState(undefined);
    }
    isCurrent(generation) {
        return this.running && this.generation === generation;
    }
    receive(update) {
        try {
            if (typeof update === "number" || update instanceof network_1.UpdateConnectionState) {
                const state = typeof update === "number" ? ([-1, 0, 1].includes(update) ? new network_1.UpdateConnectionState(update) : undefined) : update;
                if (state) {
                    this.client._updateDispatcher
                        .dispatch(state)
                        .catch((e) => this.client._log.error(`Error dispatching connection state: ${e}`));
                }
                return;
            }
            const inner = update.updates ?? [update];
            if (inner.some((item) => item instanceof tl_1.Api.UpdateConfig))
                void this.client._reloadConfig();
            this.onUpdates(update);
        }
        catch (e) {
            this.client._log.error(`Error handling update: ${e}`);
        }
    }
    onUpdates(update, noDispatch = false, request) {
        if (!this.running)
            return;
        try {
            this.lastUpdateTime = Date.now();
            this.client._entityCache.add(update);
            void this.saveEntities(update);
            if (noDispatch)
                markNoDispatch(update);
            if (!this.state && update instanceof tl_1.Api.UpdatesTooLong)
                return;
            if (!this.state && isStateful(update)) {
                this.beforeState.push([update, noDispatch, request]);
                void this.ensureState();
                return;
            }
            if (update instanceof tl_1.Api.Updates || update instanceof tl_1.Api.UpdatesCombined) {
                this.handleContainer(update);
            }
            else if (update instanceof tl_1.Api.UpdateShort) {
                this.feed(update.update, { others: null });
            }
            else if (update instanceof tl_1.Api.UpdateShortMessage || update instanceof tl_1.Api.UpdateShortChatMessage) {
                this.handleShortMessage(update);
            }
            else if (update instanceof tl_1.Api.UpdateShortSentMessage) {
                this.handleShortSentMessage(update, noDispatch ? request : undefined);
            }
            else if (update instanceof tl_1.Api.UpdatesTooLong) {
                this.client._log.info("Received updatesTooLong, fetching difference");
                this.requestDifference();
            }
            else {
                this.feed(update, { others: null });
            }
        }
        catch (e) {
            this.client._log.error(`Error in onUpdates: ${e}`);
        }
    }
    applyAffected(pts, ptsCount, channelId) {
        if (!this.running || !this.state)
            return;
        if (channelId)
            this.channels.applyAffected(channelId, pts, ptsCount);
        else
            this.globalPts.updateAndApply(pts, ptsCount, { tag: "update" }, () => { }, () => { });
    }
    async catchUp() {
        const generation = this.generation;
        if (!this.isCurrent(generation) || this.client.updates.authorizationError)
            return;
        try {
            if (!this.state)
                await this.ensureState();
            else
                await this.fetchDifference();
        }
        catch (e) {
            if (!this.isCurrent(generation) || this.client.updates._suspendAuthorization(e))
                return;
            this.client._log.error(`Error during catch up: ${e}`);
        }
    }
    watchChannel(channelId, inputChannel, signal) {
        return this.channels.watch(channelId, inputChannel, signal);
    }
    releaseChannel(channelId) {
        this.channels.release(channelId);
    }
    watchedChannelIds() {
        return this.channels.watchedIds();
    }
    handleChannelFloodWait(request, seconds) {
        return this.channels.handleFloodWait(request, seconds);
    }
    async ensureState() {
        if (this.initializing)
            return this.initializing;
        const generation = this.generation;
        if (this.state || !this.isCurrent(generation) || this.client.updates.authorizationError)
            return;
        const task = this.initState(generation);
        this.initializing = task;
        try {
            await task;
        }
        finally {
            if (this.initializing === task)
                this.initializing = undefined;
        }
    }
    async initState(generation) {
        try {
            const stored = this.client.session.getUpdateState();
            const resume = !!stored && stored.pts > 0;
            if (resume) {
                this.client._log.info(`Resuming updates from saved state pts=${stored.pts} qts=${stored.qts} date=${stored.date}`);
                this.refreshFromState(stored);
                this.channels.restore(stored.channels);
            }
            else {
                this.refreshFromState(await this.client.api.updates.getState());
            }
            if (!this.isCurrent(generation))
                return;
            this.lastUpdateTime = Date.now();
            for (const [update, noDispatch, request] of this.beforeState.splice(0))
                this.onUpdates(update, noDispatch, request);
            if (resume)
                await this.fetchDifference();
        }
        catch (error) {
            if (this.isCurrent(generation))
                this.client.updates._suspendAuthorization(error);
        }
    }
    refreshFromState(state) {
        this.state = { pts: state.pts, qts: state.qts, date: state.date, seq: state.seq };
        this.globalPts.init(state.pts);
        this.qts.init(state.qts);
        this.saveState();
    }
    isStale() {
        if (!this.state)
            return false;
        this.stateCheckAfterMs ||= STATE_CHECK_AFTER_MS + Math.random() * STATE_CHECK_JITTER_MS;
        return Date.now() - this.lastUpdateTime > this.stateCheckAfterMs;
    }
    async recoverIfStale() {
        if (!this.isStale() || this.fetchingDifference)
            return;
        this.stateCheckAfterMs = 0;
        this.lastUpdateTime = Date.now();
        try {
            const server = await this.client.api.updates.getState();
            const local = this.state;
            if (!local || server.pts > local.pts || server.qts > local.qts || server.seq > local.seq) {
                this.client._log.debug("Server state moved during a quiet period, fetching difference");
                await this.fetchDifference();
            }
        }
        catch (error) {
            if (this.client.updates._suspendAuthorization(error))
                return;
            await this.fetchDifference();
        }
    }
    requestDifference() {
        if (!this.state) {
            void this.ensureState();
            return;
        }
        if (!this.fetchingDifference)
            void this.fetchDifference();
    }
    dispatch(update, payload) {
        if (!this.running || this.isDuplicateMessage(update))
            return;
        if (update._noDispatch)
            return;
        update._entities = payload.entities ?? new Map();
        this.client._updateDispatcher.dispatch(update).catch((e) => this.client._log.error(`Error dispatching update: ${e}`));
    }
    async saveEntities(tlo) {
        try {
            await this.client.session.processEntities(tlo);
        }
        catch (e) {
            this.client._log.warn(`session.processEntities failed: ${e}`);
        }
    }
    saveState() {
        if (this.saveTimer)
            return;
        this.saveTimer = setTimeout(() => this.flushState(), STATE_SAVE_DELAY_MS);
        this.saveTimer.unref?.();
    }
    flushState() {
        clearTimeout(this.saveTimer);
        this.saveTimer = undefined;
        if (!this.state)
            return;
        const snapshot = { ...this.state, channels: this.channels.snapshot() };
        try {
            this.client.session.setUpdateState(snapshot);
        }
        catch (error) {
            this.client._log.warn(`Failed to save update state: ${error}`);
        }
    }
    feed(update, payload) {
        if (!this.state) {
            this.dispatch(update, payload);
            return;
        }
        if (update instanceof tl_1.Api.UpdateChannelTooLong) {
            this.channels.tooLong(update, false);
        }
        else if (update instanceof tl_1.Api.UpdatePtsChanged) {
            this.client._log.info("Received updatePtsChanged, fetching difference");
            this.requestDifference();
        }
        else if ((0, updateKinds_1.isCommonPtsUpdate)(update)) {
            this.globalPts.updateAndApply(update.pts, update.ptsCount, { tag: "update", update }, (applied) => this.dispatch(applied, payload), () => { });
        }
        else if ((0, updateKinds_1.isChannelPtsUpdate)(update)) {
            this.channels.feed(update, payload);
        }
        else if ((0, updateKinds_1.hasQts)(update)) {
            this.qts.updateAndApply(update.qts, 1, { tag: "update", update }, (applied) => this.dispatch(applied, payload), () => { });
        }
        else {
            this.dispatch(update, payload);
        }
    }
    handleContainer(update) {
        const seqStart = update instanceof tl_1.Api.UpdatesCombined ? update.seqStart : update.seq;
        if (seqStart < 0 || update.seq < 0 || (update.seq !== 0 && update.seq < seqStart)) {
            this.client._log.warn(`Invalid seq ${seqStart}..${update.seq}, fetching difference`);
            this.requestDifference();
            return;
        }
        const payload = { others: update.updates, entities: (0, updateKinds_1.collectEntities)(update.users, update.chats) };
        const ordered = [];
        for (const item of update.updates) {
            if ((0, updateKinds_1.isCommonPtsUpdate)(item) || (0, updateKinds_1.isChannelPtsUpdate)(item) || (0, updateKinds_1.hasQts)(item) || item instanceof tl_1.Api.UpdateChannelTooLong) {
                this.feed(item, payload);
            }
            else {
                ordered.push(item);
            }
        }
        this.applySeq({ update, updates: ordered, payload, seqStart, seq: update.seq, receivedAt: Date.now() });
        this.drainPendingSeq();
    }
    applySeq(entry) {
        if (!this.state)
            return;
        const { seqStart, seq, update } = entry;
        if (seqStart !== 0 && seqStart <= this.state.seq)
            return;
        if (this.fetchingDifference || (seqStart !== 0 && seqStart > this.state.seq + 1)) {
            if (seqStart === 0 || !this.pendingSeq.some((pending) => pending.seqStart === seqStart && pending.seq === seq)) {
                if (this.pendingSeq.length >= MAX_PENDING_SEQ)
                    this.pendingSeq.shift();
                this.pendingSeq.push(entry);
            }
            if (!this.fetchingDifference)
                this.armSeqGapTimer();
            return;
        }
        for (const item of entry.updates)
            this.feed(item, entry.payload);
        if (seq === 0)
            return;
        this.state.seq = seq;
        if (update.date && update.date <= Date.now() / 1000 + 1 && update.date > this.state.date)
            this.state.date = update.date;
        this.saveState();
    }
    armSeqGapTimer() {
        clearTimeout(this.seqGapTimer);
        const firstReceivedAt = Math.min(...this.pendingSeq.slice(0, GAP_TIMEOUT_UPDATE_COUNT).map((entry) => entry.receivedAt));
        this.seqGapTimer = setTimeout(() => {
            this.seqGapTimer = undefined;
            this.client._log.debug("Seq gap was not filled in time, fetching difference");
            this.requestDifference();
        }, Math.max(0, firstReceivedAt + PtsWaiter_1.WAIT_FOR_SKIPPED_TIMEOUT_MS - Date.now()));
    }
    drainPendingSeq() {
        if (!this.state || this.fetchingDifference)
            return;
        this.pendingSeq.sort((a, b) => a.seqStart - b.seqStart);
        while (this.pendingSeq.length) {
            const entry = this.pendingSeq[0];
            if (entry.seqStart !== 0 && entry.seqStart > this.state.seq + 1)
                break;
            this.pendingSeq.shift();
            this.applySeq(entry);
        }
        if (this.pendingSeq.length) {
            this.armSeqGapTimer();
        }
        else {
            clearTimeout(this.seqGapTimer);
            this.seqGapTimer = undefined;
        }
    }
    dropUnfillablePendingSeq() {
        if (!this.state)
            return;
        const seq = this.state.seq;
        for (let i = this.pendingSeq.length - 1; i >= 0; i--) {
            const entry = this.pendingSeq[i];
            if (entry.seqStart !== 0 && entry.seqStart > seq + 1)
                this.pendingSeq.splice(i, 1);
        }
    }
    handleShortMessage(update) {
        const asUpdate = update;
        if (!this.state) {
            this.dispatch(asUpdate, { others: null });
            return;
        }
        this.globalPts.updateAndApply(update.pts, update.ptsCount, { tag: "update", update: asUpdate }, (applied) => this.dispatch(applied, { others: null }), () => { });
    }
    handleShortSentMessage(update, request) {
        if (!this.state)
            return;
        if (request === undefined) {
            this.client._log.warn("updateShortSentMessage arrived outside of a request result, fetching difference");
            this.requestDifference();
            return;
        }
        this.applyAffected(update.pts, update.ptsCount, (0, updateKinds_1.requestChannelId)(request));
    }
    isDuplicateMessage(update) {
        if (!(update instanceof tl_1.Api.UpdateNewMessage) && !(update instanceof tl_1.Api.UpdateNewChannelMessage))
            return false;
        const message = update.message;
        if (message?.id == undefined || message.peerId == undefined)
            return false;
        let peerId;
        try {
            peerId = utils.getPeerId(message.peerId);
        }
        catch {
            return false;
        }
        const key = `${peerId}:${message.id}`;
        if (this.recentMessageKeys.has(key))
            return true;
        this.recentMessageKeys.add(key);
        this.recentMessageQueue.push(key);
        if (this.recentMessageQueue.length > RECENT_MESSAGE_BUFFER_SIZE)
            this.recentMessageKeys.delete(this.recentMessageQueue.shift());
        return false;
    }
    makeWaiter(kind) {
        return new PtsWaiter_1.PtsWaiter({
            onApplied: (value) => {
                if (!this.state)
                    return;
                this.state[kind] = value;
                this.saveState();
            },
            onWaitForSkipped: (ms) => {
                clearTimeout(this.gapTimers[kind]);
                this.gapTimers[kind] = undefined;
                if (ms < 0) {
                    if (kind === "pts") {
                        clearTimeout(this.repairTimer);
                        this.repairTimer = undefined;
                    }
                    return;
                }
                this.gapTimers[kind] = setTimeout(() => {
                    this.gapTimers[kind] = undefined;
                    this.client._log.debug(`${kind} gap was not filled in time, fetching difference`);
                    this.requestDifference();
                }, ms);
            },
            onSingleGap: kind === "pts"
                ? () => {
                    if (this.repairTimer)
                        return;
                    this.repairTimer = setTimeout(() => {
                        this.repairTimer = undefined;
                        void this.repairSingleGap();
                    }, PtsWaiter_1.SINGLE_GAP_REPAIR_MS);
                }
                : undefined,
        });
    }
    async repairSingleGap() {
        const generation = this.generation;
        if (!this.state || this.fetchingDifference || !this.globalPts.pendingCount)
            return;
        const pts = this.globalPts.current();
        let diff;
        try {
            diff = await this.client.invoke(new tl_1.Api.updates.GetDifference({ pts, ptsLimit: 1, ptsTotalLimit: 0, date: MAX_DATE, qts: 0, qtsLimit: 0 }));
        }
        catch {
            return;
        }
        if (!this.isCurrent(generation) || this.globalPts.current() !== pts)
            return;
        if (!(diff instanceof tl_1.Api.updates.Difference || diff instanceof tl_1.Api.updates.DifferenceSlice))
            return;
        const updates = [
            ...diff.newMessages.filter(updateKinds_1.isMessage).map((message) => new tl_1.Api.UpdateNewMessage({ message, pts: pts + 1, ptsCount: 1 })),
            ...diff.otherUpdates.filter(updateKinds_1.isCommonPtsUpdate),
        ];
        if (updates.length !== 1)
            return;
        this.client._entityCache.add(diff);
        await this.saveEntities(diff);
        const entities = (0, updateKinds_1.collectEntities)(diff.users, diff.chats);
        this.client._log.debug(`Repaired a single pts gap at ${pts + 1}`);
        this.globalPts.updateAndApply(pts + 1, 1, { tag: "update", update: updates[0] }, (applied) => this.dispatch(applied, { others: null, entities }), () => { });
    }
    async fetchDifference() {
        const generation = this.generation;
        if (!this.isCurrent(generation) || this.client.updates.authorizationError || this.fetchingDifference || !this.state)
            return;
        clearTimeout(this.retryTimer);
        this.retryTimer = undefined;
        this.fetchingDifference = true;
        this.globalPts.setRequesting(true);
        this.qts.setRequesting(true);
        let failed = false;
        try {
            await this.differenceLoop(generation);
            if (this.isCurrent(generation))
                this.retryDelayS = 0;
        }
        catch (e) {
            if (!this.isCurrent(generation) || this.client.updates._suspendAuthorization(e))
                return;
            if (e?.errorMessage === "PERSISTENT_TIMESTAMP_INVALID") {
                this.client._log.warn("Saved update state is invalid, reinitializing it");
                this.state = undefined;
                this.client.session.setUpdateState(undefined);
                void this.ensureState();
            }
            else {
                failed = true;
                this.client._log.warn(`updates.getDifference failed: ${e}`);
            }
        }
        finally {
            if (this.isCurrent(generation)) {
                if (this.state) {
                    this.globalPts.init(this.state.pts, true);
                    this.qts.init(this.state.qts, true);
                }
                this.fetchingDifference = false;
                this.globalPts.setRequesting(false);
                this.qts.setRequesting(false);
                this.saveState();
            }
        }
        if (failed && this.running) {
            this.retryDelayS = (0, updateKinds_1.nextRetryDelaySeconds)(this.retryDelayS);
            this.client._log.debug(`Retrying updates.getDifference in ${Math.round(this.retryDelayS)}s`);
            this.retryTimer = setTimeout(() => {
                this.retryTimer = undefined;
                void this.fetchDifference();
            }, this.retryDelayS * 1000);
        }
        this.drainPendingSeq();
    }
    async differenceLoop(generation) {
        while (this.state && this.isCurrent(generation)) {
            const diff = await withDeadline(this.client.invoke(new tl_1.Api.updates.GetDifference({ pts: this.state.pts, date: this.state.date, qts: this.state.qts })), DIFFERENCE_DEADLINE_MS, "updates.getDifference");
            if (!this.isCurrent(generation))
                return;
            if (diff instanceof tl_1.Api.updates.DifferenceEmpty) {
                this.state.date = diff.date;
                this.state.seq = diff.seq;
                this.dropUnfillablePendingSeq();
                return;
            }
            if (diff instanceof tl_1.Api.updates.DifferenceTooLong) {
                this.client._log.warn("updates.getDifference returned differenceTooLong, some updates are skipped");
                this.state.pts = diff.pts;
                continue;
            }
            await this.applyDifference(diff, generation);
            if (!this.isCurrent(generation))
                return;
            const next = diff instanceof tl_1.Api.updates.Difference ? diff.state : diff.intermediateState;
            this.state = { pts: next.pts, qts: next.qts, date: next.date, seq: next.seq };
            if (diff instanceof tl_1.Api.updates.Difference)
                return;
        }
    }
    async applyDifference(diff, generation) {
        const entities = (0, updateKinds_1.collectEntities)(diff.users, diff.chats);
        this.client._entityCache.add(diff);
        await this.saveEntities(diff);
        if (!this.isCurrent(generation))
            return;
        const others = diff.otherUpdates;
        const first = new Set(others.filter((update) => update instanceof tl_1.Api.UpdateMessageID || update instanceof tl_1.Api.UpdateEncryption || update instanceof tl_1.Api.UpdateFolderPeers));
        for (const update of first)
            this.dispatch(update, { others, entities });
        for (const message of diff.newMessages.filter(updateKinds_1.isMessage)) {
            this.dispatch(new tl_1.Api.UpdateNewMessage({ message, pts: 0, ptsCount: 0 }), { others: null, entities });
        }
        for (const message of diff.newEncryptedMessages) {
            this.dispatch(new tl_1.Api.UpdateNewEncryptedMessage({ message, qts: 0 }), { others: null, entities });
        }
        for (const update of others) {
            if (first.has(update))
                continue;
            if (update instanceof tl_1.Api.UpdateChannelTooLong)
                this.channels.tooLong(update, true);
            else if ((0, updateKinds_1.isChannelPtsUpdate)(update))
                this.channels.feed(update, { others, entities });
            else
                this.dispatch(update, { others, entities });
        }
    }
}
exports.UpdateManager = UpdateManager;
function isStateful(update) {
    const raw = (update instanceof tl_1.Api.UpdateShort ? update.update : update);
    return (update instanceof tl_1.Api.Updates ||
        update instanceof tl_1.Api.UpdatesCombined ||
        update instanceof tl_1.Api.UpdateShortMessage ||
        update instanceof tl_1.Api.UpdateShortChatMessage ||
        update instanceof tl_1.Api.UpdateShortSentMessage ||
        update instanceof tl_1.Api.UpdatesTooLong ||
        (0, updateKinds_1.isCommonPtsUpdate)(raw) ||
        (0, updateKinds_1.isChannelPtsUpdate)(raw) ||
        (0, updateKinds_1.hasQts)(raw));
}
function markNoDispatch(update) {
    const mark = (obj) => Object.defineProperty(obj, "_noDispatch", { value: true, configurable: true });
    mark(update);
    if (update instanceof tl_1.Api.Updates || update instanceof tl_1.Api.UpdatesCombined)
        for (const u of update.updates)
            mark(u);
    else if (update instanceof tl_1.Api.UpdateShort)
        mark(update.update);
}
function withDeadline(promise, ms, what) {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            promise.catch(() => { });
            reject(new Error(`${what} timed out after ${ms}ms`));
        }, ms);
        promise.then((value) => {
            clearTimeout(timer);
            resolve(value);
        }, (error) => {
            clearTimeout(timer);
            reject(error);
        });
    });
}
