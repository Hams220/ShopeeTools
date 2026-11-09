"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.serializeBytes = serializeBytes;
exports.serializeDate = serializeDate;
const Writer_1 = require("./Writer");
function serializeBytes(data) {
    if (typeof data !== "string" && !Buffer.isBuffer(data))
        throw new Error(`Bytes or str expected, not ${typeof data}`);
    const writer = new Writer_1.Writer();
    writer.bytes(data);
    return writer.finish();
}
function serializeDate(dt) {
    const buffer = Buffer.alloc(4);
    if (!dt)
        return buffer;
    if (dt instanceof Date)
        dt = Math.floor((Date.now() - dt.getTime()) / 1000);
    if (typeof dt !== "number")
        throw new Error(`Cannot interpret "${String(dt)}" as a date`);
    buffer.writeInt32LE(dt, 0);
    return buffer;
}
