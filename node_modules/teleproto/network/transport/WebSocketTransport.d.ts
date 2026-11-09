import type { Connection } from "../connection/Connection";
import { Transport, type ResolvedTransport } from "./Transport";
/** Connects to Telegram over secure WebSocket. */
export declare class WebSocketTransport extends Transport {
    resolve(connection?: typeof Connection): ResolvedTransport;
}
