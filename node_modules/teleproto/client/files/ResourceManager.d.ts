import type { ResourceState } from "./ResourceState";
export type ResourceMode = "baseline" | "greedy";
export interface ResourceConsumer {
    readonly resource: ResourceState;
    onResources(): void;
}
export declare class ResourceManager {
    readonly maxLimit: number;
    readonly mode: ResourceMode;
    private readonly nodes;
    private scheduled;
    constructor(maxLimit: number, mode: ResourceMode);
    get size(): number;
    register(consumer: ResourceConsumer, priority: number): void;
    unregister(consumer: ResourceConsumer): void;
    update(): void;
    private loop;
    private satisfy;
}
