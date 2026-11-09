"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessagePacker = void 0;
const containerPacker_1 = require("../network/mtproto/containerPacker");
const USE_INVOKE_AFTER_WITH = new Set([
    "messages.SendMessage",
    "messages.SendMedia",
    "messages.SendMultiMedia",
    "messages.ForwardMessages",
    "messages.SendInlineBotResult",
]);
class MessagePacker {
    constructor(state, logger) {
        this._state = state;
        this._queue = [];
        this._pendingStates = [];
        this._ready = new Promise((resolve) => {
            this.setReady = resolve;
        });
        this._log = logger;
    }
    values() {
        return this._queue;
    }
    get length() {
        return this._queue.length + this._pendingStates.length;
    }
    append(state, setReady = true, atStart = false) {
        // We need to check if there is already a `USE_INVOKE_AFTER_WITH` request
        if (state && USE_INVOKE_AFTER_WITH.has(state.request.className)) {
            if (atStart) {
                // Assign `after` for the previously first `USE_INVOKE_AFTER_WITH` request
                for (let i = 0; i < this._queue.length; i++) {
                    if (USE_INVOKE_AFTER_WITH.has(this._queue[i]?.request.className)) {
                        this._queue[i].after = state;
                        break;
                    }
                }
            }
            else {
                // Assign after for the previous `USE_INVOKE_AFTER_WITH` request
                for (let i = this._queue.length - 1; i >= 0; i--) {
                    if (USE_INVOKE_AFTER_WITH.has(this._queue[i]?.request.className)) {
                        state.after = this._queue[i];
                        break;
                    }
                }
            }
        }
        if (atStart) {
            this._queue.unshift(state);
        }
        else {
            this._queue.push(state);
        }
        if (setReady && this.setReady) {
            this.setReady(true);
        }
        // 1658238041=MsgsAck, we don't care about MsgsAck here because they never resolve anyway.
        if (state && state.request.CONSTRUCTOR_ID !== 1658238041) {
            this._pendingStates.push(state);
            state
                .promise // Using finally causes triggering `unhandledrejection` event
                .catch((err) => { })
                .finally(() => {
                this._pendingStates = this._pendingStates.filter((s) => s !== state);
            });
        }
    }
    prepend(states) {
        states.reverse().forEach((state) => {
            this.append(state, false, true);
        });
        if (this.setReady) {
            this.setReady(true);
        }
    }
    extend(states) {
        states.forEach((state) => {
            this.append(state, false);
        });
        if (this.setReady) {
            this.setReady(true);
        }
    }
    clear() {
        this._queue = [];
        this.append(undefined);
    }
    async wait() {
        if (!this._queue.length) {
            this._ready = new Promise((resolve) => {
                this.setReady = resolve;
            });
            await this._ready;
        }
    }
    async get() {
        if (!this._queue[this._queue.length - 1]) {
            this._queue = this._queue.filter(Boolean);
            return undefined;
        }
        this._queue = this._queue.filter(Boolean);
        return (await (0, containerPacker_1.packMessages)(this._state, [this._queue])) ?? null;
    }
}
exports.MessagePacker = MessagePacker;
