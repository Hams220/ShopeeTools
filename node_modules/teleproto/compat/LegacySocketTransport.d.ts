import type { ProxyInterface } from "../client/TelegramBaseClient";
import type { Connection } from "../network/connection/Connection";
import { Transport, type ResolvedTransport } from "../network/transport/Transport";
import type { SocketFactory } from "./extensions/SocketInterface";
/** Runs a legacy `networkSocket` factory as a {@link Transport}. */
export declare class LegacySocketTransport extends Transport {
    readonly factory: SocketFactory;
    readonly proxy?: ProxyInterface | undefined;
    constructor(factory: SocketFactory, proxy?: ProxyInterface | undefined);
    resolve(connection?: typeof Connection): ResolvedTransport;
}
