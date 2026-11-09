"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConnectionTCPAbridged = exports.AbridgedPacketCodec = void 0;
const Connection_1 = require("./Connection");
const errors_1 = require("../../errors");
const TRANSPORT_ERROR_HEADS = new Set([0x6c, 0x53, 0x44]);
const TRANSPORT_ERROR_CODES = new Set([-404, -429, -444]);
class AbridgedPacketCodec extends Connection_1.PacketCodec {
    static { this.tag = Buffer.from("ef", "hex"); }
    static { this.obfuscateTag = Buffer.from("efefefef", "hex"); }
    encodePacket(data) {
        const words = data.length >> 2;
        if (words < 127)
            return Buffer.concat([Buffer.from([words]), data]);
        const head = Buffer.allocUnsafe(4);
        head.writeUInt32LE(((words << 8) | 0x7f) >>> 0, 0);
        return Buffer.concat([head, data]);
    }
    async readPacket(reader) {
        const first = (await reader.readExactly(1))[0];
        if (first >= 0x7f) {
            const length = (await reader.readExactly(3)).readUIntLE(0, 3);
            return reader.readExactly(length << 2);
        }
        if (TRANSPORT_ERROR_HEADS.has(first)) {
            const tail = await reader.readExactly(3);
            const candidate = Buffer.concat([Buffer.from([first]), tail]);
            if (TRANSPORT_ERROR_CODES.has(candidate.readInt32LE(0)))
                throw new errors_1.InvalidBufferError(candidate);
            return Buffer.concat([tail, await reader.readExactly((first << 2) - 3)]);
        }
        return reader.readExactly(first << 2);
    }
}
exports.AbridgedPacketCodec = AbridgedPacketCodec;
class ConnectionTCPAbridged extends Connection_1.Connection {
    constructor() {
        super(...arguments);
        this.PacketCodecClass = AbridgedPacketCodec;
    }
}
exports.ConnectionTCPAbridged = ConnectionTCPAbridged;
