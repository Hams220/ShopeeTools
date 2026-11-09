import { type BigInteger } from "big-integer";
export declare class Reader {
    private readonly stream;
    offset: number;
    private last?;
    constructor(data: Buffer);
    private ensure;
    readByte(): number;
    readInt(signed?: boolean): number;
    readLong(signed?: boolean): BigInteger;
    readFloat(): number;
    readDouble(): number;
    readLargeInt(bits: number, signed?: boolean): BigInteger;
    read(length?: number, checkLength?: boolean): Buffer;
    getBuffer(): Buffer;
    tgReadBytes(): Buffer;
    tgReadString(): string;
    tgReadBool(): boolean;
    tgReadDate(): Date;
    tgReadObject(): any;
    tgReadVector(): unknown[];
    tellPosition(): number;
    setPosition(position: number): void;
    seek(offset: number): void;
}
