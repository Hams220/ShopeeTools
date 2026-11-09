export declare class ResourceState {
    readonly unitSize: number;
    limit: number;
    using: number;
    used: number;
    estimatedLimit: number;
    constructor(unitSize: number);
    get activeLimit(): number;
    get unused(): number;
    get estimatedExtra(): number;
    startUse(bytes: number): void;
    stopUse(bytes: number): void;
    updateEstimatedLimit(extra: number): boolean;
}
