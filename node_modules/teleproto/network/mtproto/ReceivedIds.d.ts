import bigInt from "big-integer";
export type RegisterResult = "success" | "duplicate" | "tooOld";
export declare class ReceivedIdsManager {
    private readonly ids;
    registerMsgId(msgId: bigInt.BigInteger): RegisterResult;
    has(msgId: bigInt.BigInteger): boolean;
    shrink(): void;
    clear(): void;
    private lowerBound;
}
