import type { SessionState } from "../network/mtproto/SessionState";
import type { RequestState } from "../network/mtproto/RequestState";
export declare class MessagePacker {
    private _state;
    _pendingStates: RequestState[];
    private _queue;
    private _ready;
    private setReady;
    private _log;
    constructor(state: SessionState, logger: any);
    values(): any[];
    get length(): number;
    append(state?: RequestState, setReady?: boolean, atStart?: boolean): void;
    prepend(states: RequestState[]): void;
    extend(states: RequestState[]): void;
    clear(): void;
    wait(): Promise<void>;
    get(): Promise<import("../network/mtproto/containerPacker").PackedMessages | null | undefined>;
}
