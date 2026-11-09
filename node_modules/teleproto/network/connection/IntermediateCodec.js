"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConnectionTCPPaddedIntermediate = exports.ConnectionTCPIntermediate = exports.PaddedIntermediatePacketCodec = exports.IntermediatePacketCodec = void 0;
exports.readIntermediateLength = readIntermediateLength;
exports.checkTransportError = checkTransportError;
const node_crypto_1 = require("node:crypto");
const Helpers_1 = require("../../Helpers");
const Connection_1 = require("./Connection");
const errors_1 = require("../../errors");
const TRANSPORT_ERRORS = new Set([-404, -429, -444]);
const MAX_PACKET_LENGTH = (1 << 24) + 1024;
async function readIntermediateLength(reader) {
    const header = await reader.readExactly(4);
    const length = header.readInt32LE(0);
    if (TRANSPORT_ERRORS.has(length))
        throw new errors_1.InvalidBufferError(header);
    if (length < 4 || length > MAX_PACKET_LENGTH)
        throw new Error(`Invalid intermediate packet length: ${length}`);
    return length;
}
function checkTransportError(body) {
    if (body.length === 4 && body.readInt32LE(0) < 0)
        throw new errors_1.InvalidBufferError(body);
}
class IntermediatePacketCodec extends Connection_1.PacketCodec {
    static { this.tag = Buffer.from("eeeeeeee", "hex"); }
    static { this.obfuscateTag = IntermediatePacketCodec.tag; }
    encodePacket(data) {
        const packet = Buffer.allocUnsafe(4 + data.length);
        packet.writeUInt32LE(data.length, 0);
        data.copy(packet, 4);
        return packet;
    }
    async readPacket(reader) {
        const body = await reader.readExactly(await readIntermediateLength(reader));
        checkTransportError(body);
        return body;
    }
}
exports.IntermediatePacketCodec = IntermediatePacketCodec;
class PaddedIntermediatePacketCodec extends Connection_1.PacketCodec {
    static { this.tag = Buffer.from("dddddddd", "hex"); }
    static { this.obfuscateTag = PaddedIntermediatePacketCodec.tag; }
    encodePacket(data) {
        const padding = (0, node_crypto_1.randomInt)(16);
        const packet = Buffer.allocUnsafe(4 + data.length + padding);
        packet.writeUInt32LE(data.length + padding, 0);
        data.copy(packet, 4);
        if (padding)
            (0, Helpers_1.generateRandomBytes)(padding).copy(packet, 4 + data.length);
        return packet;
    }
    async readPacket(reader) {
        const length = await readIntermediateLength(reader);
        const body = await reader.readExactly(length);
        if (length < 20) {
            checkTransportError(body.subarray(0, 4));
            throw new Error("Invalid padded intermediate payload");
        }
        if (body.readBigUInt64LE(0) === BigInt(0)) {
            const end = 20 + body.readUInt32LE(16);
            if (end > length)
                throw new Error("Invalid unencrypted MTProto payload length");
            return body.subarray(0, end);
        }
        if (length < 40)
            throw new Error("Invalid encrypted MTProto payload length");
        return body.subarray(0, length - ((length - 24) % 16));
    }
}
exports.PaddedIntermediatePacketCodec = PaddedIntermediatePacketCodec;
class ConnectionTCPIntermediate extends Connection_1.Connection {
    constructor() {
        super(...arguments);
        this.PacketCodecClass = IntermediatePacketCodec;
    }
}
exports.ConnectionTCPIntermediate = ConnectionTCPIntermediate;
class ConnectionTCPPaddedIntermediate extends Connection_1.Connection {
    constructor() {
        super(...arguments);
        this.PacketCodecClass = PaddedIntermediatePacketCodec;
    }
    get usesRandomPadding() {
        return true;
    }
}
exports.ConnectionTCPPaddedIntermediate = ConnectionTCPPaddedIntermediate;
