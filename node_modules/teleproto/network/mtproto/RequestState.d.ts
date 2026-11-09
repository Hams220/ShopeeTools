import type bigInt from "big-integer";
import Deferred from "../../extensions/Deferred";
import type { Reader } from "../../tl/binary/Reader";
import { Api } from "../../tl";
export type OutgoingObject = Api.AnyRequest | Api.MsgsAck | Api.MsgsStateReq | Api.MsgsStateInfo | Api.MsgResendReq;
export declare function readResult(request: OutgoingObject, reader: Reader): unknown;
export declare function expectsAnswer(request: OutgoingObject): request is Api.AnyRequest;
export declare class RequestState<T = unknown> {
    request: OutgoingObject;
    data: Buffer;
    msgId?: bigInt.BigInteger;
    containerId?: bigInt.BigInteger;
    forcedMsgId?: bigInt.BigInteger;
    after?: RequestState;
    sentAt?: number;
    acknowledged: boolean;
    initWrapped: boolean;
    cancelled: boolean;
    readonly finished: Deferred<void>;
    promise: Promise<T>;
    resolve: (value: T) => void;
    reject: (reason: unknown) => void;
    private settled;
    constructor(request: OutgoingObject);
    isReady(): Promise<void>;
    resetPromise(): void;
}
