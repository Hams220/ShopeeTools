"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlainSender = void 0;
const Helpers_1 = require("../../Helpers");
const errors_1 = require("../../errors");
const Reader_1 = require("../../tl/binary/Reader");
const SessionState_1 = require("./SessionState");
class PlainSender {
    constructor(connection, log) {
        this.connection = connection;
        this.state = new SessionState_1.SessionState(undefined, log);
    }
    async send(request) {
        const body = request.getBytes();
        const header = Buffer.alloc(20);
        (0, Helpers_1.toSignedLittleBuffer)(this.state.newMsgId(), 8).copy(header, 8);
        header.writeInt32LE(body.length, 16);
        await this.connection.send(Buffer.concat([header, body]));
        const packet = await this.connection.recv();
        if (packet.length < 20)
            throw new errors_1.InvalidBufferError(packet);
        const reader = new Reader_1.Reader(packet);
        if (!reader.readLong().isZero())
            throw new errors_1.SecurityError("Plain answer has a non-zero auth_key_id");
        if (reader.readLong().isZero())
            throw new errors_1.SecurityError("Plain answer has a zero msg_id");
        const length = reader.readInt();
        if (length <= 0 || length > packet.length - 20)
            throw new errors_1.SecurityError("Plain answer has an invalid length");
        return reader.tgReadObject();
    }
}
exports.PlainSender = PlainSender;
