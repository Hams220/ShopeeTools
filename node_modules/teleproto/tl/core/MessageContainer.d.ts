import { TLMessage } from "./TLMessage";
import type { Reader } from "../binary/Reader";
export declare class MessageContainer {
    readonly messages: TLMessage[];
    static readonly CONSTRUCTOR_ID = 1945237724;
    static readonly classType = "constructor";
    static readonly MAXIMUM_SIZE: number;
    static readonly MAXIMUM_LENGTH = 100;
    readonly CONSTRUCTOR_ID = 1945237724;
    readonly classType = "constructor";
    constructor(messages: TLMessage[]);
    static fromReader(reader: Reader): MessageContainer;
}
