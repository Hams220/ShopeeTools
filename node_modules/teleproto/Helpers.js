"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports._EntityType = exports.TotalList = exports.sleep = exports.isArrayLike = void 0;
exports.asBuffer = asBuffer;
exports.readBigIntFromBuffer = readBigIntFromBuffer;
exports.escapeRegex = escapeRegex;
exports.groupBy = groupBy;
exports.betterConsoleLog = betterConsoleLog;
exports.toSignedLittleBuffer = toSignedLittleBuffer;
exports.readBufferFromBigInt = readBufferFromBigInt;
exports.generateRandomLong = generateRandomLong;
exports.generateRandomBigInt = generateRandomBigInt;
exports.mod = mod;
exports.bigIntMod = bigIntMod;
exports.generateRandomBytes = generateRandomBytes;
exports.stripText = stripText;
exports.generateKeyDataFromNonce = generateKeyDataFromNonce;
exports.convertToLittle = convertToLittle;
exports.sha1 = sha1;
exports.sha256 = sha256;
exports.modExp = modExp;
exports.getByteArray = getByteArray;
exports.returnBigInt = returnBigInt;
exports.getMinBigInt = getMinBigInt;
exports.getRandomInt = getRandomInt;
exports.bufferXor = bufferXor;
exports.crc32 = crc32;
exports.unionId = unionId;
exports._entityType = _entityType;
const big_integer_1 = __importDefault(require("big-integer"));
const crypto_1 = __importDefault(require("crypto"));
const node_zlib_1 = __importDefault(require("node:zlib"));
const cifrante_1 = require("cifrante");
function asBuffer(bytes) {
    return Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
}
/**
 * converts a buffer to big int
 * @param buffer
 * @param little
 * @param signed
 * @returns {bigInt.BigInteger}
 */
function readBigIntFromBuffer(buffer, little = true, signed = false) {
    if (!Buffer.isBuffer(buffer)) {
        const view = buffer;
        buffer = Buffer.from(view.buffer, view.byteOffset, view.byteLength);
    }
    if (buffer.length === 8) {
        return (0, big_integer_1.default)(little
            ? signed
                ? buffer.readBigInt64LE(0)
                : buffer.readBigUInt64LE(0)
            : signed
                ? buffer.readBigInt64BE(0)
                : buffer.readBigUInt64BE(0));
    }
    let count8b = buffer.length / 8 | 0;
    let bytesLeft = buffer.length - count8b * 8;
    // TODO use 0n after setting build target >= ES2020
    const bi64 = BigInt(64);
    let resBigInt = BigInt(0);
    let i = count8b;
    while (i > 0) {
        let bi = little ? buffer.readBigUInt64LE(buffer.length - (count8b - i + 1) * 8)
            : buffer.readBigUint64BE((count8b - i) * 8);
        resBigInt = bi + (resBigInt << bi64);
        --i;
    }
    const resBitLength = 8 * buffer.length;
    // bytesLeft<8
    if (bytesLeft) {
        if (buffer.length < 8) {
            let buf8b = Buffer.allocUnsafe(8);
            let writeIdx = little ?
                0
                : 8 - bytesLeft;
            buffer.copy(buf8b, writeIdx, 0, bytesLeft);
            buffer = buf8b;
        }
        //read 64 bits and discard excess bits
        let bi = little ?
            buffer.readBigUInt64LE(0)
            : buffer.readBigUint64BE(buffer.length - 8);
        bi = BigInt.asUintN(8 * bytesLeft, bi); // discard higher bits - garbage
        resBigInt = bi + (resBigInt << BigInt(8 * bytesLeft));
    }
    if (signed) {
        resBigInt = BigInt.asIntN(resBitLength, resBigInt);
    }
    return (0, big_integer_1.default)(resBigInt);
}
function escapeRegex(string) {
    return string.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
}
function groupBy(list, keyGetter) {
    const map = new Map();
    list.forEach((item) => {
        const key = keyGetter(item);
        const collection = map.get(key);
        if (!collection) {
            map.set(key, [item]);
        }
        else {
            collection.push(item);
        }
    });
    return map;
}
/**
 * Outputs the object in a better way by hiding all the private methods/attributes.
 * @param object - the class to use
 */
function betterConsoleLog(object) {
    const toPrint = {};
    for (const key in object) {
        if (object.hasOwnProperty(key)) {
            if (!key.startsWith("_") && key != "originalArgs") {
                toPrint[key] = object[key];
            }
        }
    }
    return toPrint;
}
/**
 * Helper to find if a given object is an array (or similar)
 */
const isArrayLike = (x) => x &&
    typeof x.length === "number" &&
    typeof x !== "function" &&
    typeof x !== "string";
exports.isArrayLike = isArrayLike;
/*
export function addSurrogate(text: string) {
    let temp = "";
    for (const letter of text) {
        const t = letter.charCodeAt(0);
        if (0x1000 < t && t < 0x10FFFF) {
            const b = Buffer.from(letter, "utf16le");
            const r = String.fromCharCode(b.readUInt16LE(0)) + String.fromCharCode(b.readUInt16LE(2));
            temp += r;
        } else {
            text += letter;
        }
    }
    return temp;
}

 */
/**
 * Special case signed little ints
 * @param big
 * @param number
 * @returns {Buffer}
 */
function toNativeBigInt(value) {
    if (typeof value === "bigint") {
        return value;
    }
    if (typeof value === "number") {
        return BigInt(value);
    }
    const wrapped = returnBigInt(value);
    return typeof wrapped.value === "bigint"
        ? wrapped.value
        : BigInt(String(wrapped));
}
function bitLengthOf(value) {
    let bits = 0;
    while (value > BigInt(0xffffffff)) {
        value >>= BigInt(32);
        bits += 32;
    }
    return bits + (32 - Math.clz32(Number(value)));
}
function writeUnsignedLE(buffer, value, offset, length) {
    let rest = value;
    for (let done = 0; done < length;) {
        const count = Math.min(8, length - done);
        if (count === 8) {
            buffer.writeBigUInt64LE(BigInt.asUintN(64, rest), offset + done);
        }
        else {
            for (let i = 0; i < count; i++) {
                buffer[offset + done + i] = Number(BigInt.asUintN(8, rest >> BigInt(8 * i)));
            }
        }
        rest >>= BigInt(8 * count);
        done += count;
    }
}
function toSignedLittleBuffer(big, number = 8) {
    const buffer = Buffer.allocUnsafe(number);
    writeUnsignedLE(buffer, BigInt.asUintN(number * 8, toNativeBigInt(big)), 0, number);
    return buffer;
}
/**
 * converts a big int to a buffer
 * @param bigIntVar {BigInteger}
 * @param bytesNumber
 * @param little
 * @param signed
 * @returns {Buffer}
 */
function readBufferFromBigInt(bigIntVar, bytesNumber, little = true, signed = false) {
    const value = toNativeBigInt(bigIntVar);
    const bits = bytesNumber * 8;
    const negative = value < BigInt(0);
    const magnitude = negative ? -value - BigInt(1) : value;
    if (bytesNumber < Math.ceil(bitLengthOf(magnitude) / 8)) {
        throw new Error("OverflowError: int too big to convert");
    }
    if (!signed && negative) {
        throw new Error("Cannot convert to unsigned");
    }
    const buffer = Buffer.allocUnsafe(bytesNumber);
    writeUnsignedLE(buffer, BigInt.asUintN(bits, value), 0, bytesNumber);
    return little ? buffer : buffer.reverse();
}
/**
 * Generates a random long integer (8 bytes), which is optionally signed
 * @returns {BigInteger}
 */
function generateRandomLong(signed = true) {
    return readBigIntFromBuffer(generateRandomBytes(8), true, signed);
}
/**
 * Generates a random unsigned long integer (8 bytes)
 * @returns {BigInteger}
 */
function generateRandomBigInt() {
    return generateRandomLong(false);
}
/**
 * .... really javascript
 * @param n {number}
 * @param m {number}
 * @returns {number}
 */
function mod(n, m) {
    return ((n % m) + m) % m;
}
/**
 * returns a positive bigInt
 * @param n {bigInt.BigInteger}
 * @param m {bigInt.BigInteger}
 * @returns {bigInt.BigInteger}
 */
function bigIntMod(n, m) {
    return n.remainder(m).add(m).remainder(m);
}
/**
 * Generates a random bytes array
 * @param count
 * @returns {Buffer}
 */
function generateRandomBytes(count) {
    return crypto_1.default.randomBytes(count);
}
/**
 * Calculate the key based on Telegram guidelines, specifying whether it's the client or not
 * @param sharedKey
 * @param msgKey
 * @param client
 * @returns {{iv: Buffer, key: Buffer}}
 */
/*CONTEST
this is mtproto 1 (mostly used for secret chats)
async function calcKey(sharedKey, msgKey, client) {
    const x = client === true ? 0 : 8
    const [sha1a, sha1b, sha1c, sha1d] = await Promise.all([
        sha1(Buffer.concat([msgKey, sharedKey.slice(x, x + 32)])),
        sha1(Buffer.concat([sharedKey.slice(x + 32, x + 48), msgKey, sharedKey.slice(x + 48, x + 64)])),
        sha1(Buffer.concat([sharedKey.slice(x + 64, x + 96), msgKey])),
        sha1(Buffer.concat([msgKey, sharedKey.slice(x + 96, x + 128)]))
    ])
    const key = Buffer.concat([sha1a.slice(0, 8), sha1b.slice(8, 20), sha1c.slice(4, 16)])
    const iv = Buffer.concat([sha1a.slice(8, 20), sha1b.slice(0, 8), sha1c.slice(16, 20), sha1d.slice(0, 8)])
    return {
        key,
        iv
    }
}

 */
function stripText(text, entities) {
    if (!entities || !entities.length) {
        return text.trim();
    }
    while (text && text[text.length - 1].trim() === "") {
        const e = entities[entities.length - 1];
        if (e.offset + e.length == text.length) {
            if (e.length == 1) {
                entities.pop();
                if (!entities.length) {
                    return text.trim();
                }
            }
            else {
                e.length -= 1;
            }
        }
        text = text.slice(0, -1);
    }
    while (text && text[0].trim() === "") {
        for (let i = 0; i < entities.length; i++) {
            const e = entities[i];
            if (e.offset != 0) {
                e.offset--;
                continue;
            }
            if (e.length == 1) {
                entities.shift();
                if (!entities.length) {
                    return text.trimLeft();
                }
            }
            else {
                e.length -= 1;
            }
        }
        text = text.slice(1);
    }
    return text;
}
/**
 * Generates the key data corresponding to the given nonces
 * @param serverNonceBigInt
 * @param newNonceBigInt
 * @returns {{key: Buffer, iv: Buffer}}
 */
async function generateKeyDataFromNonce(serverNonceBigInt, newNonceBigInt) {
    const serverNonce = toSignedLittleBuffer(serverNonceBigInt, 16);
    const newNonce = toSignedLittleBuffer(newNonceBigInt, 32);
    const [hash1, hash2, hash3] = await Promise.all([
        sha1(Buffer.concat([newNonce, serverNonce])),
        sha1(Buffer.concat([serverNonce, newNonce])),
        sha1(Buffer.concat([newNonce, newNonce])),
    ]);
    const keyBuffer = Buffer.concat([hash1, hash2.slice(0, 12)]);
    const ivBuffer = Buffer.concat([
        hash2.slice(12, 20),
        hash3,
        newNonce.slice(0, 4),
    ]);
    return {
        key: keyBuffer,
        iv: ivBuffer,
    };
}
function convertToLittle(buf) {
    const correct = Buffer.alloc(buf.length * 4);
    for (let i = 0; i < buf.length; i++) {
        correct.writeUInt32BE(buf[i], i * 4);
    }
    return correct;
}
/**
 * Calculates the SHA1 digest for the given data
 * @param data
 * @returns {Promise}
 */
function sha1(data) {
    // @ts-ignore
    return asBuffer(cifrante_1.sha1.sync(data));
}
/**
 * Calculates the SHA256 digest for the given data
 * @param data
 * @returns {Promise}
 */
function sha256(data) {
    // @ts-ignore
    return asBuffer(cifrante_1.sha256.sync(data));
}
/**
 * Fast mod pow for RSA calculation. a^b % n
 * @param a
 * @param b
 * @param n
 * @returns {bigInt.BigInteger}
 */
function modExp(a, b, n) {
    if (b.lesserOrEquals(big_integer_1.default.zero)) {
        return big_integer_1.default.one;
    }
    return (0, big_integer_1.default)(cifrante_1.math
        .modPow(BigInt(a.toString()), BigInt(b.toString()), BigInt(n.toString()))
        .toString());
}
/**
 * Gets the arbitrary-length byte array corresponding to the given integer
 * @param integer {number,BigInteger}
 * @param signed {boolean}
 * @returns {Buffer}
 */
function getByteArray(integer, signed = false) {
    const bits = integer.toString(2).length;
    const byteLength = Math.floor((bits + 8 - 1) / 8);
    return readBufferFromBigInt(typeof integer == "number" ? (0, big_integer_1.default)(integer) : integer, byteLength, false, signed);
}
function returnBigInt(num) {
    if (big_integer_1.default.isInstance(num)) {
        return num;
    }
    if (typeof num == "number") {
        return (0, big_integer_1.default)(num);
    }
    if (typeof num == "bigint") {
        return (0, big_integer_1.default)(num);
    }
    return (0, big_integer_1.default)(num);
}
/**
 * Helper function to return the smaller big int in an array
 * @param arrayOfBigInts
 */
function getMinBigInt(arrayOfBigInts) {
    if (arrayOfBigInts.length == 0) {
        return big_integer_1.default.zero;
    }
    if (arrayOfBigInts.length == 1) {
        return returnBigInt(arrayOfBigInts[0]);
    }
    let smallest = returnBigInt(arrayOfBigInts[0]);
    for (let i = 1; i < arrayOfBigInts.length; i++) {
        if (returnBigInt(arrayOfBigInts[i]).lesser(smallest)) {
            smallest = returnBigInt(arrayOfBigInts[i]);
        }
    }
    return smallest;
}
/**
 * returns a random int from min (inclusive) and max (inclusive)
 * @param min
 * @param max
 * @returns {number}
 */
function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}
/**
 * Sleeps a specified amount of time
 * @param ms time in milliseconds
 * @param isUnref make a timer unref'ed
 * @returns {Promise}
 */
const sleep = (ms, isUnref = false) => new Promise((resolve) => isUnref ? setTimeout(resolve, ms).unref() : setTimeout(resolve, ms));
exports.sleep = sleep;
/**
 * Helper to export two buffers of same length
 * @returns {Buffer}
 */
function bufferXor(a, b) {
    const res = [];
    for (let i = 0; i < a.length; i++) {
        res.push(a[i] ^ b[i]);
    }
    return Buffer.from(res);
}
// Taken from https://stackoverflow.com/questions/18638900/javascript-crc32/18639999#18639999
function makeCRCTable() {
    let c;
    const crcTable = [];
    for (let n = 0; n < 256; n++) {
        c = n;
        for (let k = 0; k < 8; k++) {
            c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
        }
        crcTable[n] = c;
    }
    return crcTable;
}
let crcTable = undefined;
const nativeCrc32 = node_zlib_1.default.crc32;
function crc32(buf, previous = 0) {
    if (nativeCrc32) {
        return nativeCrc32(buf, previous) >>> 0;
    }
    if (!crcTable) {
        crcTable = makeCRCTable();
    }
    if (!Buffer.isBuffer(buf)) {
        buf = Buffer.from(buf);
    }
    let crc = previous ^ -1;
    for (let index = 0; index < buf.length; index++) {
        const byte = buf[index];
        crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
    }
    return (crc ^ -1) >>> 0;
}
const unionIdCache = new Map();
function unionId(name) {
    let id = unionIdCache.get(name);
    if (id === undefined) {
        id = crc32(name) >>> 0;
        unionIdCache.set(name, id);
    }
    return id;
}
class TotalList extends Array {
    constructor() {
        super();
        this.total = 0;
    }
}
exports.TotalList = TotalList;
exports._EntityType = {
    USER: 0,
    CHAT: 1,
    CHANNEL: 2,
};
Object.freeze(exports._EntityType);
function _entityType(entity) {
    if (typeof entity !== "object" || !("SUBCLASS_OF_ID" in entity)) {
        throw new Error(`${entity} is not a TLObject, cannot determine entity type`);
    }
    if (![
        unionId("Peer"),
        unionId("InputPeer"),
        unionId("InputUser"),
        unionId("InputChannel"),
        unionId("User"),
        unionId("Chat"),
        unionId("UserFull"),
        unionId("ChatFull"),
    ].includes(entity.SUBCLASS_OF_ID)) {
        throw new Error(`${entity} does not have any entity type`);
    }
    const name = entity.className;
    if (name.includes("User")) {
        return exports._EntityType.USER;
    }
    else if (name.includes("Chat")) {
        return exports._EntityType.CHAT;
    }
    else if (name.includes("Channel") || name.includes("Community")) {
        return exports._EntityType.CHANNEL;
    }
    else if (name.includes("Self")) {
        return exports._EntityType.USER;
    }
    // 'Empty' in name or not found, we don't care, not a valid entity.
    throw new Error(`${entity} does not have any entity type`);
}
