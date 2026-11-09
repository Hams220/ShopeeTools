"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConnectThrottle = void 0;
const SANITY = [[5, 10]];
const OFFLINE = [[1, 1], [4, 2], [8, 3]];
const ONLINE = [[1, 4], [5, 5]];
const TRANSPORT_FLOOD = [[1, 1], [4, 2], [8, 3]];
const MAX_BACKOFF_S = 16;
class StrictFloodControl {
    constructor(limits) {
        this.limits = limits;
        this.events = [];
    }
    wakeupAt() {
        let at = 0;
        for (const [duration, count] of this.limits) {
            if (this.events.length >= count)
                at = Math.max(at, this.events[this.events.length - count] + duration * 1000);
        }
        return at;
    }
    add(now) {
        this.events.push(now);
        const keep = Math.max(...this.limits.map(([, count]) => count));
        if (this.events.length > keep)
            this.events.splice(0, this.events.length - keep);
    }
    clear() {
        this.events = [];
    }
}
class ConnectThrottle {
    constructor() {
        this.sanity = new StrictFloodControl(SANITY);
        this.offline = new StrictFloodControl(OFFLINE);
        this.onlineLimits = new StrictFloodControl(ONLINE);
        this.transportFlood = new StrictFloodControl(TRANSPORT_FLOOD);
        this.backoffAt = 0;
        this.backoffDelayS = 1;
        this.online = false;
    }
    setOnline(online) {
        this.online = online;
    }
    nextAttemptAt() {
        const online = this.online;
        let at = Math.max(this.sanity.wakeupAt(), this.transportFlood.wakeupAt(), (online ? this.onlineLimits : this.offline).wakeupAt());
        if (!online)
            at = Math.max(at, this.backoffAt);
        return at;
    }
    attempt(now = Date.now()) {
        this.sanity.add(now);
        (this.online ? this.onlineLimits : this.offline).add(now);
        if (!this.online) {
            this.backoffAt = now + this.backoffDelayS * 1000;
            this.backoffDelayS = Math.min(MAX_BACKOFF_S, this.backoffDelayS * 2);
        }
    }
    transportFlooded(now = Date.now()) {
        this.transportFlood.add(now);
    }
    connected() {
        this.backoffAt = 0;
        this.backoffDelayS = 1;
    }
    networkChanged() {
        this.connected();
        this.sanity.clear();
        this.offline.clear();
        this.onlineLimits.clear();
        this.transportFlood.clear();
    }
}
exports.ConnectThrottle = ConnectThrottle;
