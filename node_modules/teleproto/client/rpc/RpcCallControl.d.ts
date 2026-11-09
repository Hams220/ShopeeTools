import type { Api } from "../../tl";
export declare class RpcCallControl {
    private readonly options;
    private readonly controller;
    private timer?;
    private readonly onAbort;
    constructor(options: Api.ApiCallOptions);
    get signal(): AbortSignal;
    check(): void;
    wait<T>(promise: PromiseLike<T> | T): Promise<T>;
    sleep(ms: number): Promise<void>;
    dispose(): void;
}
