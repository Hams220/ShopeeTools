import type { Connection } from "../connection/Connection";
import { Transport, type ResolvedTransport } from "./Transport";
/** Connects to Telegram directly over TCP. This is the default transport. */
export declare class TcpTransport extends Transport {
    resolve(connection?: typeof Connection): ResolvedTransport;
}
