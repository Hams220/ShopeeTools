"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SessionState = exports.InvalidAuthKeyError = exports.DuplicateMessageError = void 0;
const node_crypto_1 = __importDefault(require("node:crypto"));
const cifrante_1 = require("cifrante");
const big_integer_1 = __importDefault(require("big-integer"));
const Helpers_1 = require("../../Helpers");
const tl_1 = require("../../tl");
const core_1 = require("../../tl/core");
const Reader_1 = require("../../tl/binary/Reader");
const IGE_1 = require("../../crypto/IGE");
const errors_1 = require("../../errors");
const ReceivedIds_1 = require("./ReceivedIds");
class DuplicateMessageError extends errors_1.SecurityError {
    constructor(msgId) {
        super(`Duplicate message ${msgId}`);
        this.msgId = msgId;
    }
}
exports.DuplicateMessageError = DuplicateMessageError;
class InvalidAuthKeyError extends errors_1.SecurityError {
    constructor() {
        super("Server replied with an invalid auth key");
    }
}
exports.InvalidAuthKeyError = InvalidAuthKeyError;
const PADDED_SIZES = [64, 128, 192, 256, 384, 512, 768, 1024, 1280];
const MAX_MESSAGE_AGE_S = 300;
const MAX_MESSAGE_LEAD_S = 30;
function paddedSize(size, randomPadding) {
    if (randomPadding)
        return (size + node_crypto_1.default.randomInt(256) + 12 + 15) & ~15;
    const minimal = (size + 12 + 15) & ~15;
    const bucket = PADDED_SIZES.find((value) => minimal <= value);
    return bucket ?? Math.ceil((minimal - 1280) / 448) * 448 + 1280;
}
function msgIdTime(msgId) {
    return msgId.shiftRight(32).toJSNumber() + msgId.and(0xffffffff).toJSNumber() / 2 ** 32;
}
class SessionState {
    constructor(authKey, log, securityChecks = true) {
        this.authKey = authKey;
        this.log = log;
        this.securityChecks = securityChecks;
        this.timeOffset = 0;
        this.salt = big_integer_1.default.zero;
        this.id = big_integer_1.default.zero;
        this.sequence = 0;
        this.lastMsgId = big_integer_1.default.zero;
        this.receivedIds = new ReceivedIds_1.ReceivedIdsManager();
        this.reset();
    }
    get sessionId() {
        return this.id;
    }
    hasReceived(msgId) {
        return this.receivedIds.has(msgId);
    }
    reset() {
        this.id = (0, Helpers_1.generateRandomLong)(true);
        this.sequence = 0;
        this.lastMsgId = big_integer_1.default.zero;
        this.receivedIds.clear();
    }
    calcKey(authKey, msgKey, client) {
        const x = client ? 0 : 8;
        const a = (0, Helpers_1.asBuffer)(cifrante_1.sha256.sync.create().update(msgKey).update(authKey.subarray(x, x + 36)).digest());
        const b = (0, Helpers_1.asBuffer)(cifrante_1.sha256.sync.create().update(authKey.subarray(x + 40, x + 76)).update(msgKey).digest());
        const key = Buffer.allocUnsafe(32);
        a.copy(key, 0, 0, 8);
        b.copy(key, 8, 8, 24);
        a.copy(key, 24, 24, 32);
        const iv = Buffer.allocUnsafe(32);
        b.copy(iv, 0, 0, 8);
        a.copy(iv, 8, 8, 24);
        b.copy(iv, 24, 24, 32);
        return { key, iv };
    }
    async writeDataAsMessage(buffer, data, contentRelated, afterId, forcedMsgId, compress = contentRelated) {
        const msgId = forcedMsgId ?? this.newMsgId();
        const seqNo = this.nextSeqNo(contentRelated);
        const payload = afterId ? this.invokeAfter(afterId, data) : data;
        const body = await core_1.GZIPPacked.gzipIfSmaller(compress, payload);
        const header = Buffer.allocUnsafe(16);
        (0, Helpers_1.toSignedLittleBuffer)(msgId, 8).copy(header, 0);
        header.writeInt32LE(seqNo, 8);
        header.writeInt32LE(body.length, 12);
        buffer.raw(header);
        buffer.raw(body);
        return msgId;
    }
    invokeAfter(afterId, data) {
        const header = Buffer.allocUnsafe(12);
        header.writeUInt32LE(tl_1.Api.InvokeAfterMsg.CONSTRUCTOR_ID, 0);
        (0, Helpers_1.toSignedLittleBuffer)(afterId, 8).copy(header, 4);
        return Buffer.concat([header, data]);
    }
    async encryptMessageData(data, randomPadding = false) {
        if (!this.authKey)
            throw new Error("Auth key unset");
        await this.authKey.waitForKey();
        const authKey = this.authKey.getKey();
        const keyId = this.authKey.keyId;
        if (!authKey || !keyId)
            throw new Error("Auth key unset");
        const padLen = paddedSize(16 + data.length, randomPadding) - 16 - data.length;
        const packet = Buffer.allocUnsafe(24 + 16 + data.length + padLen);
        const plain = packet.subarray(24);
        (0, Helpers_1.toSignedLittleBuffer)(this.salt, 8).copy(plain, 0);
        (0, Helpers_1.toSignedLittleBuffer)(this.id, 8).copy(plain, 8);
        data.copy(plain, 16);
        node_crypto_1.default.randomFillSync(plain, 16 + data.length, padLen);
        const msgKey = (0, Helpers_1.asBuffer)(cifrante_1.sha256.sync.create().update(authKey.subarray(88, 120)).update(plain).digest()).subarray(8, 24);
        const { iv, key } = this.calcKey(authKey, msgKey, true);
        (0, Helpers_1.readBufferFromBigInt)(keyId, 8).copy(packet, 0);
        msgKey.copy(packet, 8);
        const ige = new IGE_1.IGE(key, iv);
        ige.encryptIge(plain, plain);
        ige.dispose();
        return packet;
    }
    async decryptMessageData(body) {
        if (!this.authKey)
            throw new Error("Auth key unset");
        if (body.length < 8)
            throw new errors_1.InvalidBufferError(body);
        const keyId = (0, Helpers_1.readBigIntFromBuffer)(body.subarray(0, 8));
        if (!this.authKey.keyId || keyId.neq(this.authKey.keyId))
            throw new InvalidAuthKeyError();
        const authKey = this.authKey.getKey();
        if (!authKey)
            throw new InvalidAuthKeyError();
        if (body.length < 24 + 32 || (body.length - 24) % 16)
            throw new errors_1.SecurityError("Invalid encrypted payload length");
        const msgKey = body.subarray(8, 24);
        const { iv, key } = this.calcKey(authKey, msgKey, false);
        const encrypted = body.subarray(24);
        const ige = new IGE_1.IGE(key, iv);
        const plain = ige.decryptIge(encrypted, encrypted);
        ige.dispose();
        const ourKey = (0, Helpers_1.asBuffer)(cifrante_1.sha256.sync.create().update(authKey.subarray(96, 128)).update(plain).digest());
        if (!msgKey.equals(ourKey.subarray(8, 24))) {
            throw new errors_1.SecurityError("Received msg_key doesn't match with expected one");
        }
        const reader = new Reader_1.Reader(plain);
        reader.readLong();
        const sessionId = reader.readLong();
        if (sessionId.neq(this.id) && this.securityChecks) {
            throw new errors_1.SecurityError("Server replied with a wrong session ID");
        }
        const msgId = reader.readLong();
        const seqNo = reader.readInt();
        const length = reader.readInt();
        if (this.securityChecks) {
            const padding = plain.length - 32 - length;
            if (length < 0 || length % 4 || padding < 12 || padding > 1024)
                throw new errors_1.SecurityError("Invalid message length");
            if (msgId.isEven())
                throw new errors_1.SecurityError(`Server sent an even msg_id ${msgId}`);
        }
        this.observeServerTime(msgId);
        const age = this.now() - msgIdTime(msgId);
        const registered = this.receivedIds.registerMsgId(msgId);
        this.receivedIds.shrink();
        if (this.securityChecks) {
            if (registered === "duplicate")
                throw new DuplicateMessageError(msgId);
            if (registered !== "success")
                throw new errors_1.SecurityError(`Rejected message: ${registered}`);
            if (age > MAX_MESSAGE_AGE_S)
                throw new errors_1.SecurityError(`Message ${msgId} is too old`);
            if (age < -MAX_MESSAGE_LEAD_S)
                throw new errors_1.SecurityError(`Message ${msgId} is too far in the future`);
        }
        return new core_1.TLMessage(msgId, seqNo, reader.tgReadObject());
    }
    now() {
        return Date.now() / 1000 + this.timeOffset;
    }
    observeServerTime(msgId) {
        const offset = msgIdTime(msgId) - Date.now() / 1000;
        if (offset > this.timeOffset)
            this.timeOffset = offset;
    }
    newMsgId() {
        const now = this.now();
        const seconds = Math.floor(now);
        const fraction = Math.floor((now - seconds) * 2 ** 32) & ~3;
        let msgId = (0, big_integer_1.default)(seconds).shiftLeft(32).or((0, big_integer_1.default)(fraction >>> 0));
        if (this.lastMsgId.greaterOrEquals(msgId))
            msgId = this.lastMsgId.add(4);
        this.lastMsgId = msgId;
        return msgId;
    }
    updateTimeOffset(correctMsgId) {
        const old = this.timeOffset;
        this.timeOffset = msgIdTime(correctMsgId) - Date.now() / 1000;
        this.lastMsgId = big_integer_1.default.zero;
        this.log.debug(`Updated time offset from ${old.toFixed(3)}s to ${this.timeOffset.toFixed(3)}s`);
        return this.timeOffset;
    }
    nextSeqNo(contentRelated) {
        if (!contentRelated)
            return this.sequence * 2;
        return this.sequence++ * 2 + 1;
    }
}
exports.SessionState = SessionState;
