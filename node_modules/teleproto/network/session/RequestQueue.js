"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RequestQueue = void 0;
const tl_1 = require("../../tl");
const ORDERED_REQUESTS = new Set([
    "messages.SendMessage",
    "messages.SendMedia",
    "messages.SendMultiMedia",
    "messages.ForwardMessages",
    "messages.SendInlineBotResult",
]);
class RequestQueue {
    constructor() {
        this.requests = [];
        this.service = [];
        this.serviceStates = new WeakSet();
    }
    get size() {
        return this.requests.length + this.service.length;
    }
    isService(state) {
        return this.serviceStates.has(state);
    }
    push(state) {
        if (ORDERED_REQUESTS.has(state.request.className)) {
            for (let i = this.requests.length - 1; i >= 0; i--) {
                if (ORDERED_REQUESTS.has(this.requests[i].request.className)) {
                    state.after = this.requests[i];
                    break;
                }
            }
        }
        this.requests.push(state);
        this.notify();
    }
    pushService(state) {
        this.serviceStates.add(state);
        this.service.push(state);
        this.notify();
    }
    requeue(states) {
        const requests = [];
        const service = [];
        for (const state of states) {
            if (state.cancelled)
                continue;
            state.msgId = undefined;
            state.containerId = undefined;
            (this.isService(state) ? service : requests).push(state);
        }
        this.service.unshift(...service);
        this.requests.unshift(...requests);
        this.notify();
    }
    remove(state) {
        const index = this.requests.indexOf(state);
        if (index >= 0)
            this.requests.splice(index, 1);
    }
    next(includeRequests) {
        if (this.service.length)
            return this.service;
        if (includeRequests && this.requests.length)
            return this.requests;
        return undefined;
    }
    waitForWork() {
        return new Promise((resolve) => {
            this.wake = resolve;
        });
    }
    notify() {
        const wake = this.wake;
        this.wake = undefined;
        wake?.();
    }
    rejectAll(error) {
        for (const state of [...this.requests, ...this.service]) {
            if (!(state.request instanceof tl_1.Api.MsgsAck))
                state.reject(error);
        }
        this.requests.length = 0;
        this.service.length = 0;
    }
}
exports.RequestQueue = RequestQueue;
