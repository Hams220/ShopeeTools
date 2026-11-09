import type bigInt from "big-integer";
import type { FileTransfers } from "./FileTransfers";
import { PartsManager } from "./PartsManager";
import { ResourceState } from "./ResourceState";
import type { ResourceConsumer } from "./ResourceManager";
export declare const BIG_FILE_SIZE: number;
export interface UploadOptions {
    fileId: bigInt.BigInteger;
    size: number;
    partSize: number;
    dcId: number;
    maxInflight?: number;
    read(offset: number, length: number): Promise<Buffer>;
    signal?: AbortSignal;
    onPart?: () => void;
}
export declare class FileUploader implements ResourceConsumer {
    private readonly transfers;
    private readonly opts;
    readonly resource: ResourceState;
    readonly parts: PartsManager;
    readonly isBig: boolean;
    private readonly manager;
    private readonly done;
    private inflight;
    private finished;
    constructor(transfers: FileTransfers, opts: UploadOptions);
    get partCount(): number;
    run(): Promise<void>;
    onResources(): void;
    private readonly onAbort;
    private loop;
    private send;
    private finish;
    private fail;
    private release;
}
