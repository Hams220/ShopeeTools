"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConnectionTCPFull = exports.FullPacketCodec = void 0;
const Connection_1 = require("./Connection");
const Helpers_1 = require("../../Helpers");
const errors_1 = require("../../errors");
class FullPacketCodec extends Connection_1.PacketCodec {
    constructor() {
        super(...arguments);
        this.sendCounter = 0;
    }
    encodePacket(data) {
        const length = data.length + 12;
        const packet = Buffer.allocUnsafe(length);
        packet.writeInt32LE(length, 0);
        packet.writeInt32LE(this.sendCounter++, 4);
        data.copy(packet, 8);
        packet.writeUInt32LE((0, Helpers_1.crc32)(packet.subarray(0, length - 4)), length - 4);
        return packet;
    }
    async readPacket(reader) {
        const head = await reader.readExactly(4);
        const length = head.readInt32LE(0);
        if (length < 0)
            throw new errors_1.InvalidBufferError(head);
        if (length < 12)
            throw new Error(`Invalid full packet length: ${length}`);
        const rest = await reader.readExactly(length - 4);
        const checksum = rest.readUInt32LE(rest.length - 4);
        const expected = (0, Helpers_1.crc32)(rest.subarray(0, rest.length - 4), (0, Helpers_1.crc32)(head));
        if (checksum !== expected)
            throw new errors_1.InvalidChecksumError(checksum, expected);
        return rest.subarray(4, rest.length - 4);
    }
}
exports.FullPacketCodec = FullPacketCodec;
class ConnectionTCPFull extends Connection_1.Connection {
    constructor() {
        super(...arguments);
        this.PacketCodecClass = FullPacketCodec;
    }
}
exports.ConnectionTCPFull = ConnectionTCPFull;
