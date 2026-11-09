"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Writer = void 0;
const Helpers_1 = require("../../Helpers");
const INITIAL_SIZE = 256;
class Writer {
    constructor(initial) {
        this.buffer = Buffer.allocUnsafe(INITIAL_SIZE);
        this.offset = 0;
        if (initial?.length)
            this.raw(initial);
    }
    reserve(bytes) {
        const needed = this.offset + bytes;
        if (needed <= this.buffer.length)
            return;
        let size = this.buffer.length * 2;
        while (size < needed)
            size *= 2;
        const next = Buffer.allocUnsafe(size);
        this.buffer.copy(next, 0, 0, this.offset);
        this.buffer = next;
    }
    int(value) {
        this.reserve(4);
        this.buffer.writeInt32LE(value | 0, this.offset);
        this.offset += 4;
    }
    uint(value) {
        this.reserve(4);
        this.buffer.writeUInt32LE(value >>> 0, this.offset);
        this.offset += 4;
    }
    long(value) {
        this.reserve(8);
        const small = value.value;
        const native = typeof small === "number" ? BigInt(small) : BigInt(value.toString());
        this.buffer.writeBigInt64LE(BigInt.asIntN(64, native), this.offset);
        this.offset += 8;
    }
    largeInt(value, bytes) {
        this.raw((0, Helpers_1.toSignedLittleBuffer)(value, bytes));
    }
    double(value) {
        this.reserve(8);
        this.buffer.writeDoubleLE(value, this.offset);
        this.offset += 8;
    }
    bytes(value) {
        const data = typeof value === "string" ? Buffer.from(value, "utf8") : value;
        const length = data.length;
        const header = length < 254 ? 1 : 4;
        const padding = (4 - ((header + length) % 4)) % 4;
        this.reserve(header + length + padding);
        if (header === 1) {
            this.buffer[this.offset++] = length;
        }
        else {
            this.buffer[this.offset++] = 254;
            this.buffer[this.offset++] = length & 255;
            this.buffer[this.offset++] = (length >> 8) & 255;
            this.buffer[this.offset++] = (length >> 16) & 255;
        }
        data.copy(this.buffer, this.offset);
        this.offset += length;
        this.buffer.fill(0, this.offset, this.offset + padding);
        this.offset += padding;
    }
    raw(data) {
        this.reserve(data.length);
        data.copy(this.buffer, this.offset);
        this.offset += data.length;
    }
    write(data) {
        this.raw(data);
    }
    getValue() {
        return Buffer.from(this.buffer.subarray(0, this.offset));
    }
    finish() {
        const used = this.buffer.subarray(0, this.offset);
        return this.offset * 2 >= this.buffer.length ? used : Buffer.from(used);
    }
}
exports.Writer = Writer;
