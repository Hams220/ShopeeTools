export declare class ConnectThrottle {
    private readonly sanity;
    private readonly offline;
    private readonly onlineLimits;
    private readonly transportFlood;
    private backoffAt;
    private backoffDelayS;
    private online;
    setOnline(online: boolean): void;
    nextAttemptAt(): number;
    attempt(now?: number): void;
    transportFlooded(now?: number): void;
    connected(): void;
    networkChanged(): void;
}
