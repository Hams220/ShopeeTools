import type * as net from "node:net";
import type { Connection } from "../connection/Connection";
import { Transport, type ResolvedTransport } from "./Transport";
export interface SocksTransportOptions {
    host: string;
    port: number;
    version: 4 | 5;
    /** SOCKS5 only. */
    username?: string;
    /** SOCKS5 only. */
    password?: string;
    /** Proxy handshake timeout in seconds. Defaults to 5. */
    timeout?: number;
}
export declare function openSocksTunnel(options: SocksTransportOptions, ip: string, port: number): Promise<{
    socket: net.Socket;
}>;
/** Connects to Telegram through a SOCKS4 or SOCKS5 proxy. */
export declare class SocksTransport extends Transport {
    readonly options: SocksTransportOptions;
    constructor(options: SocksTransportOptions);
    resolve(connection?: typeof Connection): ResolvedTransport;
}
