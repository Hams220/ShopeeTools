import { Api } from "../../tl";
import type { FileTransfers, TransferKind } from "./FileTransfers";
import { PartsManager } from "./PartsManager";
import { ResourceState } from "./ResourceState";
import type { ResourceConsumer } from "./ResourceManager";
export interface PartSink {
    write(offset: number, data: Buffer): Promise<void> | void;
}
export interface DownloadOptions {
    location: Api.TypeInputFileLocation;
    dcId: number;
    kind: TransferKind;
    size?: number;
    partSize: number;
    offset?: number;
    limit?: number;
    precise?: boolean;
    cdn?: boolean;
    stagger?: boolean;
    priority?: number;
    signal?: AbortSignal;
    sink: PartSink;
    onBytes?: (bytes: number) => Promise<void> | void;
    onMigrate?: (dcId: number) => void;
    onCdnUnavailable?: (dcId: number) => void;
    refreshLocation?: () => Promise<Api.TypeInputFileLocation | undefined>;
}
export declare class FileDownloader implements ResourceConsumer {
    private readonly transfers;
    private readonly opts;
    readonly resource: ResourceState;
    readonly parts: PartsManager;
    private readonly manager;
    private readonly done;
    private location;
    private dcId;
    private inflight;
    private finished;
    private refresh?;
    private cdn?;
    private cdnDisabled;
    private nextStartAt;
    private staggerMs;
    constructor(transfers: FileTransfers, opts: DownloadOptions);
    run(): Promise<void>;
    onResources(): void;
    setAheadLimit(offset: number): void;
    private readonly onAbort;
    private loop;
    private waitStagger;
    private fetch;
    private download;
    private downloadCdn;
    private recover;
    private finish;
    private fail;
    private release;
}
