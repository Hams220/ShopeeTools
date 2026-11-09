"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Factorizator = void 0;
const big_integer_1 = __importDefault(require("big-integer"));
const cifrante_1 = require("cifrante");
function toNative(value) {
    return BigInt(value.toString());
}
function fromNative(value) {
    return (0, big_integer_1.default)(value.toString());
}
class Factorizator {
    static gcd(a, b) {
        return fromNative(cifrante_1.math.gcd(toNative(a), toNative(b)));
    }
    static factorize(pq) {
        const { p, q } = cifrante_1.math.factor(toNative(pq));
        return p < q
            ? { p: fromNative(p), q: fromNative(q) }
            : { p: fromNative(q), q: fromNative(p) };
    }
}
exports.Factorizator = Factorizator;
