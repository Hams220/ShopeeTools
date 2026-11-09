"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PartsManager = exports.MAX_PART_COUNT_PREMIUM = exports.MAX_PART_COUNT = exports.MAX_PART_SIZE = exports.MIN_PART_SIZE = void 0;
exports.choosePartSize = choosePartSize;
exports.MIN_PART_SIZE = 64 * 1024;
exports.MAX_PART_SIZE = 512 * 1024;
exports.MAX_PART_COUNT = 4000;
exports.MAX_PART_COUNT_PREMIUM = 8000;
const UNKNOWN_SIZE_PART = 128 * 1024;
function choosePartSize(size, maxPartSize = exports.MAX_PART_SIZE) {
    if (size === undefined || size <= 0)
        return Math.min(UNKNOWN_SIZE_PART, maxPartSize);
    let partSize = exports.MIN_PART_SIZE;
    while (Math.ceil(size / partSize) > exports.MAX_PART_COUNT && partSize < exports.MAX_PART_SIZE)
        partSize *= 2;
    return Math.min(partSize, Math.max(maxPartSize, exports.MIN_PART_SIZE));
}
const EMPTY = 0;
const PENDING = 1;
const READY = 2;
class PartsManager {
    constructor(opts) {
        this.firstPart = 0;
        this.status = [];
        this.readyBytes = 0;
        this.aheadLimit = Infinity;
        this.partSize = opts.partSize;
        this.size = opts.size;
        this.origin = opts.offset ?? 0;
        this.cursor = 0;
        const windowEnd = opts.limit !== undefined ? Math.ceil(opts.limit / this.partSize) : Infinity;
        const fileEnd = this.size !== undefined ? Math.ceil(Math.max(0, this.size - this.origin) / this.partSize) : Infinity;
        this.endPart = Math.min(windowEnd, fileEnd);
    }
    get knownSize() {
        return this.size;
    }
    get downloadedBytes() {
        return this.readyBytes;
    }
    get partCount() {
        return Number.isFinite(this.endPart) ? this.endPart : undefined;
    }
    setAheadLimit(offset) {
        this.aheadLimit = offset;
    }
    startPart() {
        while (this.cursor < this.endPart && this.status[this.cursor] === READY)
            this.cursor++;
        for (let id = this.cursor; id < this.endPart; id++) {
            const offset = this.origin + id * this.partSize;
            if (offset >= this.aheadLimit)
                return undefined;
            if (this.size === undefined && id > this.readyPrefixPart() + 32)
                return undefined;
            if ((this.status[id] ?? EMPTY) !== EMPTY)
                continue;
            this.status[id] = PENDING;
            const size = this.size !== undefined ? Math.min(this.partSize, this.size - offset) : this.partSize;
            return { id, offset, size };
        }
        return undefined;
    }
    onPartOk(part, received) {
        if (part.id >= this.endPart)
            return;
        if (received > this.partSize)
            throw new Error(`Part ${part.id} has ${received} bytes, more than the part size ${this.partSize}`);
        if (this.size !== undefined) {
            const expected = Math.min(this.partSize, this.size - part.offset);
            if (received !== expected && part.id !== this.endPart - 1) {
                throw new Error(`Part ${part.id} has ${received} bytes, expected ${expected}`);
            }
            if (part.id === this.endPart - 1 && received < expected)
                this.size = part.offset + received;
        }
        else if (received < this.partSize) {
            this.size = part.offset + received;
            this.endPart = Math.min(this.endPart, part.id + 1);
            if (received === 0)
                this.endPart = part.id;
        }
        this.status[part.id] = READY;
        this.readyBytes += received;
    }
    onPartFailed(part) {
        if (this.status[part.id] === PENDING)
            this.status[part.id] = EMPTY;
        if (part.id < this.cursor)
            this.cursor = part.id;
    }
    isReady() {
        if (!Number.isFinite(this.endPart))
            return false;
        for (let id = this.firstPart; id < this.endPart; id++)
            if (this.status[id] !== READY)
                return false;
        return true;
    }
    remainingBytes() {
        if (!Number.isFinite(this.endPart))
            return 2 * this.partSize;
        let parts = 0;
        for (let id = this.cursor; id < this.endPart; id++)
            if ((this.status[id] ?? EMPTY) === EMPTY)
                parts++;
        return parts * this.partSize;
    }
    readyPrefixPart() {
        let id = this.firstPart;
        while (this.status[id] === READY)
            id++;
        return id;
    }
}
exports.PartsManager = PartsManager;
