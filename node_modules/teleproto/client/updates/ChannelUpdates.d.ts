import { Api } from "../../tl";
import type { TelegramClient } from "../TelegramClient";
import { type DispatchPayload, type PtsUpdate } from "./updateKinds";
export interface ChannelPollingState {
    pendingRequests: number;
    activeRequests: number;
    pausedUntil?: number;
    channels: {
        channelId: string;
        lastPolledAt?: number;
        lastDelayMs?: number;
        nextPollAt?: number;
    }[];
}
export interface ChannelUpdatesHost {
    readonly client: TelegramClient;
    readonly generation: number;
    isCurrent(generation: number): boolean;
    dispatch(update: Api.TypeUpdate, payload: DispatchPayload): void;
    saveEntities(tlo: unknown): Promise<void>;
    saveState(): void;
    requestDifference(): void;
}
export declare class ChannelUpdates {
    private readonly host;
    private readonly trackers;
    private readonly stored;
    private readonly watched;
    private readonly scheduler;
    private readonly requests;
    constructor(host: ChannelUpdatesHost);
    private get client();
    start(): void;
    stop(): void;
    reset(): void;
    restore(channels: Record<string, number> | undefined): void;
    snapshot(): Record<string, number>;
    feed(update: PtsUpdate, payload: DispatchPayload): void;
    applyAffected(channelId: string, pts: number, ptsCount: number): void;
    tooLong(update: Api.UpdateChannelTooLong, fromDifference: boolean): void;
    watch(channelId: string, inputChannel: Api.TypeInputChannel, signal?: AbortSignal): Promise<void>;
    release(channelId: string): void;
    watchedIds(): string[];
    get polling(): ChannelPollingState;
    handleFloodWait(request: object, seconds: number): boolean;
    private tracker;
    private invoke;
    private readPts;
    private fetchDifference;
    private fetchDifferenceOnce;
    private applyDifference;
    private scheduleRetry;
    private schedulePoll;
    private resolve;
    private drop;
}
