"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IGE = void 0;
const cifrante_1 = require("cifrante");
const Helpers_1 = require("../Helpers");
const BLOCK_SIZE = 16;
class IGE {
    constructor(key, iv) {
        if (key.length !== 32)
            throw new Error("Key must be 32 bytes (AES-256)");
        if (iv.length !== 32)
            throw new Error("IV must be 32 bytes (2 * block size)");
        this.cipher = cifrante_1.aes.ige(key);
        this.iv = iv;
    }
    encryptIge(plainText, output) {
        const padding = plainText.length % BLOCK_SIZE;
        if (padding !== 0) {
            plainText = Buffer.concat([
                plainText,
                (0, Helpers_1.generateRandomBytes)(BLOCK_SIZE - padding),
            ]);
        }
        return (0, Helpers_1.asBuffer)(this.cipher.encryptSync(plainText, { iv: this.iv, output }));
    }
    decryptIge(cipherText, output) {
        if (cipherText.length % BLOCK_SIZE !== 0) {
            throw new Error("Cipher text must be multiple of 16 bytes");
        }
        return (0, Helpers_1.asBuffer)(this.cipher.decryptSync(cipherText, { iv: this.iv, output }));
    }
    static backend() {
        const probe = cifrante_1.aes.ige(Buffer.alloc(32));
        const { backend } = probe;
        probe.dispose();
        return backend;
    }
    dispose() {
        this.cipher.dispose();
    }
}
exports.IGE = IGE;
