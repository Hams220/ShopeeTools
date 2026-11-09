"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChannelScheduler = exports.ChannelPollCancelledError = void 0;
class ChannelPollCancelledError extends Error {
    constructor() {
        super("Channel polling cancelled");
        this.name = "AbortError";
    }
}
exports.ChannelPollCancelledError = ChannelPollCancelledError;
class ChannelScheduler {
    constructor(interval, concurrency) {
        this.interval = interval;
        this.concurrency = concurrency;
        this.queue = [];
        this.active = new Set();
        this.running = false;
        this.nextStartAt = 0;
        this.pausedUntil = 0;
    }
    start() {
        this.running = true;
        this.pump();
    }
    stop() {
        this.running = false;
        if (this.timer)
            clearTimeout(this.timer);
        this.timer = undefined;
        for (const job of [...this.queue, ...this.active]) {
            job.reject(new ChannelPollCancelledError());
        }
        this.queue.length = 0;
        this.active.clear();
    }
    cancel(channelId) {
        for (let index = this.queue.length - 1; index >= 0; index--) {
            const job = this.queue[index];
            if (job.channelId !== channelId)
                continue;
            this.queue.splice(index, 1);
            job.reject(new ChannelPollCancelledError());
        }
        this.pump();
    }
    pause(milliseconds) {
        this.pausedUntil = Math.max(this.pausedUntil, Date.now() + milliseconds);
        this.pump();
    }
    get state() {
        return {
            pendingRequests: this.queue.length,
            activeRequests: this.active.size,
            pausedUntil: this.pausedUntil > Date.now() ? this.pausedUntil : undefined,
        };
    }
    schedule(channelId, run) {
        if (!this.running)
            return Promise.reject(new ChannelPollCancelledError());
        return new Promise((resolve, reject) => {
            this.queue.push({ channelId, run, resolve, reject });
            this.pump();
        });
    }
    pump() {
        if (this.timer)
            clearTimeout(this.timer);
        this.timer = undefined;
        if (!this.running || !this.queue.length || this.active.size >= this.concurrency)
            return;
        const index = this.queue.findIndex((job) => ![...this.active].some((active) => active.channelId === job.channelId));
        if (index < 0)
            return;
        const delay = Math.max(this.nextStartAt, this.pausedUntil) - Date.now();
        if (delay > 0) {
            this.timer = setTimeout(() => {
                this.timer = undefined;
                this.pump();
            }, Math.min(delay, 2147483647));
            return;
        }
        const [job] = this.queue.splice(index, 1);
        this.active.add(job);
        this.nextStartAt = Date.now() + this.interval;
        void Promise.resolve().then(() => {
            if (!this.running || !this.active.has(job))
                throw new ChannelPollCancelledError();
            return job.run();
        }).then(job.resolve, job.reject).finally(() => {
            this.active.delete(job);
            this.pump();
        });
        this.pump();
    }
}
exports.ChannelScheduler = ChannelScheduler;
