"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RequestIter = void 0;
const Helpers_1 = require("./Helpers");
class RequestIter {
    constructor(client, limit, params = {}, args = {}) {
        this.client = client;
        this.reverse = params.reverse;
        this.waitTime = params.waitTime;
        this.limit = Math.max(limit ?? Number.MAX_SAFE_INTEGER, 0);
        this.left = this.limit;
        this.buffer = undefined;
        this.kwargs = args;
        this.index = 0;
        this.total = undefined;
        this.lastLoad = 0;
    }
    async _init(kwargs) {
        // for overload
    }
    [Symbol.asyncIterator]() {
        this.buffer = undefined;
        this.index = 0;
        this.lastLoad = 0;
        this.left = this.limit;
        return {
            next: async () => {
                if (this.buffer == undefined) {
                    this.buffer = [];
                    if (await this._init(this.kwargs)) {
                        this.left = Math.min(this.left, this.buffer.length);
                    }
                }
                if (this.left <= 0) {
                    return {
                        value: undefined,
                        done: true,
                    };
                }
                if (this.index == this.buffer.length) {
                    if (this.waitTime && this.lastLoad) {
                        const delay = this.waitTime * 1000 - (Date.now() - this.lastLoad);
                        if (delay > 0)
                            await (0, Helpers_1.sleep)(delay);
                    }
                    this.lastLoad = Date.now();
                    this.index = 0;
                    this.buffer = [];
                    const nextChunk = await this._loadNextChunk();
                    if (nextChunk === false) {
                        // we exit;
                        return {
                            value: undefined,
                            done: true,
                        };
                    }
                    if (nextChunk) {
                        this.left = Math.min(this.left, this.buffer.length);
                    }
                }
                if (!this.buffer || !this.buffer.length) {
                    return {
                        value: undefined,
                        done: true,
                    };
                }
                const result = this.buffer[this.index];
                this.left -= 1;
                this.index += 1;
                return {
                    value: result,
                    done: false,
                };
            },
        };
    }
    async collect() {
        const result = new Helpers_1.TotalList();
        for await (const message of this) {
            result.push(message);
        }
        result.total = this.total;
        return result;
    }
    async _loadNextChunk() {
        throw new Error("Not Implemented");
    }
}
exports.RequestIter = RequestIter;
