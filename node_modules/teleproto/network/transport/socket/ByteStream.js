"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ByteStream = exports.SocketClosedError = exports.ByteQueue = void 0;
class ByteQueue {
    constructor() {
        this.chunks = [];
        this.head = 0;
        this.offset = 0;
        this.bytes = 0;
    }
    get items() {
        return this.chunks.length - this.head;
    }
    push(data) {
        if (!data.length)
            return;
        this.chunks.push(data);
        this.bytes += data.length;
    }
    take(count) {
        count = Math.min(count, this.bytes);
        const first = this.chunks[this.head];
        let out;
        if (first && first.length - this.offset >= count) {
            out = first.subarray(this.offset, this.offset + count);
            this.offset += count;
            if (this.offset === first.length) {
                this.chunks[this.head++] = Buffer.alloc(0);
                this.offset = 0;
            }
        }
        else {
            out = Buffer.allocUnsafe(count);
            let written = 0;
            while (written < count) {
                const chunk = this.chunks[this.head];
                const n = Math.min(count - written, chunk.length - this.offset);
                chunk.copy(out, written, this.offset, this.offset + n);
                written += n;
                this.offset += n;
                if (this.offset === chunk.length) {
                    this.chunks[this.head++] = Buffer.alloc(0);
                    this.offset = 0;
                }
            }
        }
        this.bytes -= count;
        if (this.head >= 128 || !this.bytes) {
            this.chunks = this.chunks.slice(this.head);
            this.head = 0;
        }
        return out;
    }
    clear() {
        this.chunks = [];
        this.head = 0;
        this.offset = 0;
        this.bytes = 0;
    }
}
exports.ByteQueue = ByteQueue;
class SocketClosedError extends Error {
    constructor(message = "Socket was closed") {
        super(message);
        this.name = "SocketClosedError";
    }
}
exports.SocketClosedError = SocketClosedError;
class ByteStream {
    constructor() {
        this.queue = new ByteQueue();
        this.lastDataAt = 0;
    }
    get closed() {
        return this.error !== undefined;
    }
    push(data) {
        if (this.error)
            return;
        this.lastDataAt = Date.now();
        this.queue.push(data);
        this.notify();
    }
    end(error = new SocketClosedError()) {
        this.error ??= error;
        this.notify();
    }
    async read(n) {
        await this.waitFor(1);
        return this.queue.take(n);
    }
    async readExactly(n) {
        await this.waitFor(n);
        return this.queue.take(n);
    }
    async waitFor(n) {
        while (this.queue.bytes < n) {
            if (this.error)
                throw this.error;
            await new Promise((resolve) => {
                this.wake = resolve;
            });
        }
    }
    notify() {
        const wake = this.wake;
        this.wake = undefined;
        wake?.();
    }
}
exports.ByteStream = ByteStream;
