import type { OutFile } from "../../define";
import type { PartSink } from "./FileDownloader";
export interface DownloadTarget extends PartSink {
    close(): Promise<Buffer | string | undefined>;
    abort(): Promise<void>;
}
export declare class OrderedSink implements PartSink {
    private next;
    private readonly emit;
    private readonly stash;
    private draining;
    constructor(next: number, emit: (offset: number, data: Buffer) => Promise<void> | void);
    write(offset: number, data: Buffer): Promise<void>;
    private drain;
}
export declare function openTarget(outputFile: OutFile | undefined, size?: number): Promise<DownloadTarget>;
