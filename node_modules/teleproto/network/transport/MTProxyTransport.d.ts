import type { Connection } from "../connection/Connection";
import { Transport, type ResolvedTransport } from "./Transport";
export interface MTProxyTransportOptions {
    host: string;
    port: number;
    /** Hex, base64 or base64url: 16 bytes, `dd` + 16 bytes, or `ee` + 16 bytes + domain. */
    secret: string;
}
export interface ProxySecret {
    key: Buffer;
    padded: boolean;
    fakeTlsDomain?: Buffer;
}
export declare function parseProxySecret(input: string): ProxySecret;
export declare function mtproxyConnection(host: string, port: number, secret: ProxySecret): typeof Connection;
export declare class MTProxyTransport extends Transport {
    readonly options: MTProxyTransportOptions;
    constructor(options: MTProxyTransportOptions);
    resolve(connection?: typeof Connection): ResolvedTransport;
}
