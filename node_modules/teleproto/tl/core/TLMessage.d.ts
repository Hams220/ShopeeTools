import type bigInt from "big-integer";
export declare class TLMessage {
    readonly msgId: bigInt.BigInteger;
    readonly seqNo: number;
    obj: unknown;
    static readonly SIZE_OVERHEAD = 12;
    static readonly classType = "constructor";
    readonly classType = "constructor";
    constructor(msgId: bigInt.BigInteger, seqNo: number, obj: unknown);
}
