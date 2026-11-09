export declare class ChannelPollCancelledError extends Error {
    constructor();
}
export declare class ChannelScheduler {
    private readonly interval;
    private readonly concurrency;
    private readonly queue;
    private readonly active;
    private timer?;
    private running;
    private nextStartAt;
    private pausedUntil;
    constructor(interval: number, concurrency: number);
    start(): void;
    stop(): void;
    cancel(channelId: string): void;
    pause(milliseconds: number): void;
    get state(): {
        pendingRequests: number;
        activeRequests: number;
        pausedUntil: number | undefined;
    };
    schedule<T>(channelId: string, run: () => Promise<T>): Promise<T>;
    private pump;
}
