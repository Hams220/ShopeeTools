export declare const MIN_PART_SIZE: number;
export declare const MAX_PART_SIZE: number;
export declare const MAX_PART_COUNT = 4000;
export declare const MAX_PART_COUNT_PREMIUM = 8000;
export interface Part {
    id: number;
    offset: number;
    size: number;
}
export declare function choosePartSize(size: number | undefined, maxPartSize?: number): number;
export interface PartsOptions {
    size?: number;
    partSize: number;
    offset?: number;
    limit?: number;
}
export declare class PartsManager {
    readonly partSize: number;
    private size?;
    private readonly origin;
    private readonly firstPart;
    private endPart;
    private readonly status;
    private cursor;
    private readyBytes;
    private aheadLimit;
    constructor(opts: PartsOptions);
    get knownSize(): number | undefined;
    get downloadedBytes(): number;
    get partCount(): number | undefined;
    setAheadLimit(offset: number): void;
    startPart(): Part | undefined;
    onPartOk(part: Part, received: number): void;
    onPartFailed(part: Part): void;
    isReady(): boolean;
    remainingBytes(): number;
    private readyPrefixPart;
}
