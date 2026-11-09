import type { Session } from "../session/Session";
export type SenderSlotState = "idle" | "connecting" | "ready" | "dead";
export type SenderSlotDeathReason = "auth-broken" | "disconnected" | "manual" | "pool-closed";
export interface SenderSlotOptions {
    dcId: number;
    idleTimeoutMs: number;
    connect: (slot: SessionSlot) => Promise<Session>;
}
export declare class SlotRemovedError extends Error {
    readonly reason: SenderSlotDeathReason;
    constructor(reason: SenderSlotDeathReason);
}
export declare class SessionSlot {
    private readonly opts;
    readonly dcId: number;
    private dead?;
    private session?;
    private connecting?;
    private idleTimer?;
    private readonly deathListeners;
    private active;
    constructor(opts: SenderSlotOptions);
    get state(): SenderSlotState;
    get load(): number;
    get sender(): Session | undefined;
    ensureConnected(): Promise<Session>;
    private open;
    enter(): void;
    leave(): void;
    onDeath(listener: (reason: SenderSlotDeathReason) => void): () => void;
    markDead(reason: SenderSlotDeathReason): Promise<void>;
    private clearIdle;
    private armIdle;
    private idle;
}
