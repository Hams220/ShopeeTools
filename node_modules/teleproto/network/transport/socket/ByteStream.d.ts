import type { PacketReader } from "./types";
export declare class ByteQueue {
    private chunks;
    private head;
    private offset;
    bytes: number;
    get items(): number;
    push(data: Buffer): void;
    take(count: number): Buffer;
    clear(): void;
}
export declare class SocketClosedError extends Error {
    constructor(message?: string);
}
export declare class ByteStream implements PacketReader {
    private readonly queue;
    private wake?;
    private error?;
    lastDataAt: number;
    get closed(): boolean;
    push(data: Buffer): void;
    end(error?: Error): void;
    read(n: number): Promise<Buffer>;
    readExactly(n: number): Promise<Buffer>;
    private waitFor;
    private notify;
}
