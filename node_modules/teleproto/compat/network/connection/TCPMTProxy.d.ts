import type { ProxyInterface } from "../../../client/TelegramBaseClient";
import { ConnectionTCPObfuscated } from "../../../network/connection/Obfuscation";
export { PaddedIntermediatePacketCodec } from "../../../network/connection/IntermediateCodec";
export type { ProxyInterface, WebProxyType } from "../../../client/TelegramBaseClient";
export type MTProxyType = Extract<ProxyInterface, {
    MTProxy: true;
}>;
export type SocksProxyType = Extract<ProxyInterface, {
    socksType: 4 | 5;
}>;
/** @deprecated The proxy picks its own framing: pass `proxy` or an `MTProxyTransport` without `connection`. */
export declare class TCPMTProxy extends ConnectionTCPObfuscated {
}
/** @deprecated The proxy picks its own framing: pass `proxy` or an `MTProxyTransport` without `connection`. */
export declare class ConnectionTCPMTProxyAbridged extends TCPMTProxy {
}
export declare function isLegacyProxyConnection(connection: unknown): boolean;
