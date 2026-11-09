import type { BigInteger } from "big-integer";
export declare class Writer {
    private buffer;
    private offset;
    constructor(initial?: Buffer);
    private reserve;
    int(value: number): void;
    uint(value: number): void;
    long(value: BigInteger): void;
    largeInt(value: BigInteger, bytes: number): void;
    double(value: number): void;
    bytes(value: Buffer | string): void;
    raw(data: Buffer): void;
    write(data: Buffer): void;
    getValue(): Buffer;
    finish(): Buffer;
}
