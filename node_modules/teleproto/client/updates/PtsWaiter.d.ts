import type { Api } from "../../tl";
export declare const WAIT_FOR_SKIPPED_TIMEOUT_MS = 700;
export declare const SINGLE_GAP_REPAIR_MS = 50;
export type SkippedTag = "update" | "updates";
export interface SkippedEntry {
    pts: number;
    count: number;
    receivedAt: number;
    tieBreaker: number;
    tag: SkippedTag;
    update?: Api.TypeUpdate;
    updates?: Api.TypeUpdates;
    applyUpdate?: (update: Api.TypeUpdate) => void;
    applyUpdates?: (updates: Api.TypeUpdates) => void;
}
type Payload = Omit<SkippedEntry, "pts" | "count" | "tieBreaker" | "receivedAt">;
export interface PtsWaiterHost {
    onWaitForSkipped(ms: number): void;
    onSingleGap?(): void;
    onApplied?(pts: number): void;
}
export declare class PtsWaiter {
    private readonly host;
    private good;
    private initialized;
    private requestingFlag;
    private skippedKey;
    private readonly queue;
    constructor(host: PtsWaiterHost);
    inited(): boolean;
    current(): number;
    get pendingCount(): number;
    init(pts: number, preservePending?: boolean): void;
    requesting(): boolean;
    setRequesting(value: boolean): void;
    updated(pts: number, count: number, payload: Payload): boolean;
    updateAndApply(pts: number, count: number, payload: Payload, applyUpdate: (update: Api.TypeUpdate) => void, applyUpdates: (updates: Api.TypeUpdates) => void): boolean;
    applySkippedUpdates(applyUpdate?: (update: Api.TypeUpdate) => void, applyUpdates?: (updates: Api.TypeUpdates) => void): void;
    clearSkippedUpdates(): void;
    private armGap;
    private apply;
}
export {};
