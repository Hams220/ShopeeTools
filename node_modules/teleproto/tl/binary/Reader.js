"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Reader = void 0;
const big_integer_1 = __importDefault(require("big-integer"));
const Common_1 = require("../../errors/Common");
const Helpers_1 = require("../../Helpers");
const Registry_1 = require("../runtime/Registry");
const BOOL_TRUE = 0x997275b5;
const BOOL_FALSE = 0xbc799737;
const VECTOR = 0x1cb5c415;
class Reader {
    constructor(data) {
        this.offset = 0;
        this.stream = data;
    }
    ensure(bytes) {
        if (this.offset + bytes > this.stream.length) {
            throw new Error(`No more data left to read (need ${bytes}, got ${Math.max(0, this.stream.length - this.offset)}); last read ${this.last}`);
        }
    }
    readByte() {
        this.ensure(1);
        return this.stream[this.offset++];
    }
    readInt(signed = true) {
        this.ensure(4);
        const value = signed ? this.stream.readInt32LE(this.offset) : this.stream.readUInt32LE(this.offset);
        this.offset += 4;
        return value;
    }
    readLong(signed = true) {
        this.ensure(8);
        const value = signed ? this.stream.readBigInt64LE(this.offset) : this.stream.readBigUInt64LE(this.offset);
        this.offset += 8;
        return (0, big_integer_1.default)(value);
    }
    readFloat() {
        this.ensure(4);
        const value = this.stream.readFloatLE(this.offset);
        this.offset += 4;
        return value;
    }
    readDouble() {
        this.ensure(8);
        const value = this.stream.readDoubleLE(this.offset);
        this.offset += 8;
        return value;
    }
    readLargeInt(bits, signed = true) {
        if (bits === 64)
            return this.readLong(signed);
        return (0, Helpers_1.readBigIntFromBuffer)(this.read(Math.floor(bits / 8)), true, signed);
    }
    read(length = -1, checkLength = true) {
        if (length === -1)
            length = this.stream.length - this.offset;
        if (checkLength)
            this.ensure(length);
        const result = this.stream.subarray(this.offset, this.offset + length);
        this.offset += length;
        this.last = result;
        return result;
    }
    getBuffer() {
        return this.stream;
    }
    tgReadBytes() {
        const first = this.readByte();
        let length;
        let header;
        if (first === 254) {
            this.ensure(3);
            length = this.stream[this.offset] | (this.stream[this.offset + 1] << 8) | (this.stream[this.offset + 2] << 16);
            this.offset += 3;
            header = 4;
        }
        else {
            length = first;
            header = 1;
        }
        const data = this.read(length);
        const padding = (4 - ((header + length) % 4)) % 4;
        if (padding)
            this.read(padding);
        return data;
    }
    tgReadString() {
        return this.tgReadBytes().toString("utf-8");
    }
    tgReadBool() {
        const value = this.readInt(false);
        if (value === BOOL_TRUE)
            return true;
        if (value === BOOL_FALSE)
            return false;
        throw new Error(`Invalid boolean code ${value.toString(16)}`);
    }
    tgReadDate() {
        return new Date(this.readInt() * 1000);
    }
    tgReadObject() {
        const constructorId = this.readInt(false);
        if (constructorId === BOOL_TRUE)
            return true;
        if (constructorId === BOOL_FALSE)
            return false;
        if (constructorId === VECTOR) {
            const length = this.readInt();
            const items = new Array(length);
            for (let i = 0; i < length; i++)
                items[i] = this.tgReadObject();
            return items;
        }
        const type = Registry_1.registry.readerFor(constructorId);
        if (!type) {
            this.offset -= 4;
            throw new Common_1.TypeNotFoundError(constructorId, this.stream.subarray(this.offset));
        }
        return type.fromReader(this);
    }
    tgReadVector() {
        if (this.readInt(false) !== VECTOR)
            throw new Error("Invalid constructor code, vector was expected");
        const length = this.readInt();
        const items = new Array(length);
        for (let i = 0; i < length; i++)
            items[i] = this.tgReadObject();
        return items;
    }
    tellPosition() {
        return this.offset;
    }
    setPosition(position) {
        this.offset = position;
    }
    seek(offset) {
        this.offset += offset;
    }
}
exports.Reader = Reader;
