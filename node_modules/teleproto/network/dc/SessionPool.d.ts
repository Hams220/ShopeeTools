import type { TelegramBaseClient } from "../../client/TelegramBaseClient";
import type { Session } from "../session/Session";
import type { DcState } from "./DcState";
import { SessionSlot } from "./SessionSlot";
import { type ShiftedDcId } from "./dcId";
export interface NetworkOptions {
    idleTimeoutMs: number;
    sessionStartupDelayMs: number;
}
export interface SessionLease {
    sender: Session;
    release: () => void;
}
export declare class SessionPool {
    private readonly client;
    private readonly opts;
    private readonly slots;
    private readonly keyCreation;
    private readonly lastStartAt;
    private closed;
    constructor(client: TelegramBaseClient, opts: NetworkOptions);
    dcenter(dcId: number): DcState;
    getSession(shiftedDcId: ShiftedDcId): SessionSlot;
    lease(dcId: ShiftedDcId): Promise<SessionLease>;
    removeSession(shiftedDcId: ShiftedDcId): void;
    purge(): Promise<void>;
    close(): Promise<void>;
    private retire;
    private createSlot;
    private hasKey;
    private start;
    private onBreak;
}
