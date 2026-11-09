import type { Connection } from "../connection/Connection";
import { Transport, type ResolvedTransport } from "./Transport";
export interface HttpProxyTransportOptions {
    host: string;
    port: number;
    /** Sent with Basic authentication. */
    username?: string;
    password?: string;
    /** Connect to the proxy itself over TLS (an HTTPS proxy). Defaults to false. */
    tls?: boolean;
    /** Proxy handshake timeout in seconds. Defaults to 5. */
    timeout?: number;
}
/** Connects to Telegram through an HTTP proxy that supports CONNECT tunnels. */
export declare class HttpProxyTransport extends Transport {
    readonly options: HttpProxyTransportOptions;
    constructor(options: HttpProxyTransportOptions);
    resolve(connection?: typeof Connection): ResolvedTransport;
}
