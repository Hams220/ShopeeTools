"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CdnSource = exports.CdnHashMismatchError = void 0;
const node_crypto_1 = require("node:crypto");
class CdnHashMismatchError extends Error {
    constructor(offset) {
        super(`CDN file hash mismatch at offset ${offset}`);
        this.name = "CdnHashMismatchError";
    }
}
exports.CdnHashMismatchError = CdnHashMismatchError;
class CdnSource {
    constructor(redirect, fetchHashes) {
        this.fetchHashes = fetchHashes;
        this.hashes = new Map();
        this.partial = new Map();
        this.dcId = redirect.dcId;
        this.fileToken = redirect.fileToken;
        this.key = redirect.encryptionKey;
        this.iv = redirect.encryptionIv;
        this.addHashes(redirect.fileHashes);
    }
    addHashes(hashes) {
        for (const item of hashes)
            this.hashes.set(item.offset.toJSNumber(), { limit: item.limit, hash: Buffer.from(item.hash) });
    }
    decrypt(offset, data) {
        const iv = Buffer.from(this.iv);
        iv.writeUInt32BE((offset / 16) >>> 0, 12);
        const decipher = (0, node_crypto_1.createDecipheriv)("aes-256-ctr", this.key, iv);
        return Buffer.concat([decipher.update(data), decipher.final()]);
    }
    async verify(offset, data) {
        const end = offset + data.length;
        let position = offset;
        while (position < end) {
            const [start, range] = await this.rangeAt(position);
            const rangeEnd = start + range.limit;
            const pieceEnd = Math.min(rangeEnd, end);
            if (start >= offset && rangeEnd <= end) {
                this.check(start, range, data.subarray(start - offset, rangeEnd - offset));
            }
            else {
                this.collect(start, range, position, data.subarray(position - offset, pieceEnd - offset));
            }
            position = pieceEnd;
        }
    }
    async rangeAt(position) {
        let requested = false;
        for (;;) {
            const found = this.find(position);
            if (found)
                return found;
            if (this.fetching) {
                await this.fetching.catch(() => { });
                continue;
            }
            if (requested)
                throw new Error(`Telegram returned no CDN hash for offset ${position}`);
            requested = true;
            this.fetching = this.fetchHashes(position)
                .then((hashes) => this.addHashes(hashes))
                .finally(() => (this.fetching = undefined));
            await this.fetching;
        }
    }
    find(position) {
        for (const [start, range] of this.hashes) {
            if (start <= position && position < start + range.limit)
                return [start, range];
        }
        return undefined;
    }
    collect(start, range, offset, data) {
        let pending = this.partial.get(start);
        if (!pending)
            this.partial.set(start, (pending = { pieces: [], bytes: 0 }));
        pending.pieces.push({ offset, data: Buffer.from(data) });
        pending.bytes += data.length;
        if (pending.bytes < range.limit)
            return;
        this.partial.delete(start);
        const whole = Buffer.concat(pending.pieces.sort((a, b) => a.offset - b.offset).map((piece) => piece.data));
        this.check(start, range, whole);
    }
    check(start, range, data) {
        if (!(0, node_crypto_1.createHash)("sha256").update(data).digest().equals(range.hash))
            throw new CdnHashMismatchError(start);
    }
}
exports.CdnSource = CdnSource;
