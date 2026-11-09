import type { RequestState } from "../mtproto/RequestState";
export declare class RequestQueue {
    readonly requests: RequestState[];
    readonly service: RequestState[];
    private readonly serviceStates;
    private wake?;
    get size(): number;
    isService(state: RequestState): boolean;
    push(state: RequestState): void;
    pushService(state: RequestState): void;
    requeue(states: RequestState[]): void;
    remove(state: RequestState): void;
    next(includeRequests: boolean): RequestState[] | undefined;
    waitForWork(): Promise<void>;
    notify(): void;
    rejectAll(error: Error): void;
}
