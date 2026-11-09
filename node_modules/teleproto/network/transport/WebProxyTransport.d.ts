import type { Connection } from "../connection/Connection";
import type { SocketFactory } from "./socket/types";
import { Transport, type ResolvedTransport } from "./Transport";
type SocketEventHandler<T = unknown> = {
    handle(event: T): void;
}["handle"];
export interface WebProxyWebSocket {
    binaryType: string;
    readonly bufferedAmount: number;
    readonly protocol: string;
    send(data: Uint8Array): void;
    close(): void;
    onopen: SocketEventHandler | null;
    onmessage: SocketEventHandler<{
        data: ArrayBuffer | string;
    }> | null;
    onerror: SocketEventHandler | null;
    onclose: SocketEventHandler | null;
}
export interface WebProxyOptions {
    /** Relay hostname, optionally followed by a base path; HTTPS port 443 is used. */
    server: string;
    secret: string;
    /** Total relay startup deadline in milliseconds. Defaults to 30000. */
    connectTimeoutMs?: number;
    /** HTTP operation and retry deadline in milliseconds. Defaults to 90000. */
    requestTimeoutMs?: number;
    maxStreams?: number;
    /** Optional WebSocket constructor for websocket relay profiles on Node.js 18/20. */
    webSocket?: new (url: string, protocols: string | string[]) => WebProxyWebSocket;
}
export declare function createWebProxySocket(options: WebProxyOptions): {
    socket: SocketFactory;
    host: string;
    secret: string;
};
/** Connects to Telegram through a WEB relay. Experimental. */
export declare class WebProxyTransport extends Transport {
    readonly options: WebProxyOptions;
    constructor(options: WebProxyOptions);
    resolve(connection?: typeof Connection): ResolvedTransport;
}
export {};
