"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RpcCallControl = void 0;
class RpcCallControl {
    constructor(options) {
        this.options = options;
        this.controller = new AbortController();
        this.onAbort = () => this.controller.abort(this.options.abortSignal?.reason);
        for (const key of ["dcId", "maxRetryCount", "timeout", "floodSleepThreshold"]) {
            const value = options[key];
            if (value === undefined)
                continue;
            const minimum = key === "dcId" || key === "timeout" ? 1 : 0;
            if (!Number.isSafeInteger(value) || value < minimum || (key === "timeout" && value > 2147483647)) {
                throw new RangeError(`Invalid RPC option ${key}: ${value}`);
            }
        }
        if (options.abortSignal?.aborted)
            this.onAbort();
        else
            options.abortSignal?.addEventListener("abort", this.onAbort, { once: true });
        if (options.timeout !== undefined) {
            this.timer = setTimeout(() => {
                const error = new Error(`RPC timed out after ${options.timeout}ms`);
                error.name = "TimeoutError";
                this.controller.abort(error);
            }, options.timeout);
        }
    }
    get signal() {
        return this.controller.signal;
    }
    check() {
        this.signal.throwIfAborted();
    }
    wait(promise) {
        return new Promise((resolve, reject) => {
            const aborted = () => reject(this.signal.reason);
            if (this.signal.aborted)
                aborted();
            else
                this.signal.addEventListener("abort", aborted, { once: true });
            Promise.resolve(promise).then(resolve, reject).finally(() => {
                this.signal.removeEventListener("abort", aborted);
            });
        });
    }
    async sleep(ms) {
        let timer;
        try {
            await this.wait(new Promise((resolve) => { timer = setTimeout(resolve, ms); }));
        }
        finally {
            if (timer)
                clearTimeout(timer);
        }
    }
    dispose() {
        if (this.timer)
            clearTimeout(this.timer);
        this.options.abortSignal?.removeEventListener("abort", this.onAbort);
    }
}
exports.RpcCallControl = RpcCallControl;
