"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProxyRejectedError = void 0;
/**
 * The proxy refused the connection for a reason retrying cannot fix,
 * such as wrong credentials (HTTP 407, SOCKS5 authentication) or a forbidden target (HTTP 403).
 */
class ProxyRejectedError extends Error {
    constructor(message) {
        super(message);
        this.name = "ProxyRejectedError";
    }
}
exports.ProxyRejectedError = ProxyRejectedError;
