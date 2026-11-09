"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PendingRequests = void 0;
class PendingRequests {
    constructor() {
        this.byId = new Map();
    }
    get size() {
        return this.byId.size;
    }
    add(state) {
        if (state.msgId)
            this.byId.set(state.msgId.toString(), state);
    }
    get(msgId) {
        return this.byId.get(msgId.toString());
    }
    take(msgId) {
        const key = msgId.toString();
        const state = this.byId.get(key);
        this.byId.delete(key);
        return state;
    }
    takeMessage(msgId) {
        const state = this.take(msgId);
        if (state)
            return [state];
        const inContainer = this.values().filter((pending) => pending.containerId?.equals(msgId));
        for (const pending of inContainer)
            this.take(pending.msgId);
        return inContainer;
    }
    delete(msgId) {
        this.byId.delete(msgId.toString());
    }
    values() {
        return [...this.byId.values()];
    }
    clear() {
        this.byId.clear();
    }
}
exports.PendingRequests = PendingRequests;
