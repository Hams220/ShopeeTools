import { Api } from "../../tl";
import type { TelegramBaseClient } from "../TelegramBaseClient";
import { ResourceManager } from "./ResourceManager";
export type TransferKind = "download" | "downloadSmall" | "upload" | "cdn";
export interface TransferBalance {
    sessions?: number;
    inFlight?: number;
    partSize?: number;
}
export interface FileTransferOptions {
    cdnSupported?: boolean;
    partSize?: number;
    sessions?: number;
    inflightPerDc?: number;
    download?: TransferBalance;
    upload?: TransferBalance;
}
export declare function transferKindFor(size: number | undefined): TransferKind;
export declare class FileTransfers {
    private readonly client;
    private readonly opts;
    private readonly managers;
    private readonly operations;
    private speedLimitLogged;
    private configRefresh?;
    constructor(client: TelegramBaseClient, opts?: FileTransferOptions);
    get cdnEnabled(): boolean;
    get maxPartSize(): number;
    private get premium();
    private appNumber;
    cdnReachable(dcId: number): Promise<boolean>;
    maxUploadParts(): Promise<number>;
    acquireDownload(dcId: number, size: number | undefined, signal?: AbortSignal): Promise<() => void>;
    sessionCount(kind: TransferKind, dcId: number): number;
    manager(kind: TransferKind, dcId: number): ResourceManager;
    private resourceLimit;
    private slot;
    run<R extends Api.AnyRequest>(kind: TransferKind, dcId: number, build: () => R, signal?: AbortSignal): Promise<R["__response"]>;
    private send;
    reset(): void;
}
