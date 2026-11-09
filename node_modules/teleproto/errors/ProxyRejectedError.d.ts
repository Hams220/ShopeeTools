/**
 * The proxy refused the connection for a reason retrying cannot fix,
 * such as wrong credentials (HTTP 407, SOCKS5 authentication) or a forbidden target (HTTP 403).
 */
export declare class ProxyRejectedError extends Error {
    constructor(message: string);
}
