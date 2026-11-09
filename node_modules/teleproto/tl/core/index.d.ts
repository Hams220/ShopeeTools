import { GZIPPacked } from "./GZIPPacked";
import { MessageContainer } from "./MessageContainer";
import { RPCResult } from "./RPCResult";
import type { Reader } from "../binary/Reader";
export { TLMessage } from "./TLMessage";
export { RPCResult, MessageContainer, GZIPPacked };
export declare const coreObjects: Map<number, {
    fromReader(reader: Reader): unknown;
}>;
