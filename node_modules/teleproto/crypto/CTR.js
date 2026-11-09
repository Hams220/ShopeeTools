"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CTR = void 0;
const cifrante_1 = require("cifrante");
const Helpers_1 = require("../Helpers");
class CTR {
    constructor(key, iv) {
        if (!Buffer.isBuffer(key) || !Buffer.isBuffer(iv) || iv.length !== 16) {
            throw new Error("Key and iv need to be a buffer");
        }
        const cipher = cifrante_1.aes.ctr(key);
        this.state = cipher.create({ iv });
        cipher.dispose();
    }
    encrypt(data) {
        return (0, Helpers_1.asBuffer)(this.state.update(data));
    }
    encryptInPlace(data) {
        this.state.update(data, data);
        return data;
    }
    dispose() {
        this.state.dispose();
    }
}
exports.CTR = CTR;
