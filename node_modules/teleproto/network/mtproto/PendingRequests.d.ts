import type bigInt from "big-integer";
import type { RequestState } from "./RequestState";
export declare class PendingRequests {
    private readonly byId;
    get size(): number;
    add(state: RequestState): void;
    get(msgId: bigInt.BigInteger): RequestState<unknown> | undefined;
    take(msgId: bigInt.BigInteger): RequestState<unknown> | undefined;
    takeMessage(msgId: bigInt.BigInteger): RequestState[];
    delete(msgId: bigInt.BigInteger): void;
    values(): RequestState[];
    clear(): void;
}
