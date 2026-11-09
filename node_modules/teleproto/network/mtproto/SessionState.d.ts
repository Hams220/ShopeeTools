import bigInt from "big-integer";
import type { AuthKey } from "../../crypto/AuthKey";
import { TLMessage } from "../../tl/core";
import type { Writer } from "../../tl/binary/Writer";
import type { Logger } from "../../extensions/Logger";
import { SecurityError } from "../../errors";
export declare class DuplicateMessageError extends SecurityError {
    readonly msgId: bigInt.BigInteger;
    constructor(msgId: bigInt.BigInteger);
}
export declare class InvalidAuthKeyError extends SecurityError {
    constructor();
}
export declare class SessionState {
    private readonly authKey;
    private readonly log;
    private readonly securityChecks;
    timeOffset: number;
    salt: bigInt.BigInteger;
    private id;
    private sequence;
    private lastMsgId;
    private readonly receivedIds;
    constructor(authKey: AuthKey | undefined, log: Logger, securityChecks?: boolean);
    get sessionId(): bigInt.BigInteger;
    hasReceived(msgId: bigInt.BigInteger): boolean;
    reset(): void;
    private calcKey;
    writeDataAsMessage(buffer: Writer, data: Buffer, contentRelated: boolean, afterId?: bigInt.BigInteger, forcedMsgId?: bigInt.BigInteger, compress?: boolean): Promise<bigInt.BigInteger>;
    private invokeAfter;
    encryptMessageData(data: Buffer, randomPadding?: boolean): Promise<Buffer>;
    decryptMessageData(body: Buffer): Promise<TLMessage>;
    private now;
    private observeServerTime;
    newMsgId(): bigInt.BigInteger;
    updateTimeOffset(correctMsgId: bigInt.BigInteger): number;
    nextSeqNo(contentRelated: boolean): number;
}
