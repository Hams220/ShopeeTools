import { Api } from "../../tl";
export declare class CdnHashMismatchError extends Error {
    constructor(offset: number);
}
export declare class CdnSource {
    private readonly fetchHashes;
    readonly dcId: number;
    readonly fileToken: Buffer;
    private readonly key;
    private readonly iv;
    private readonly hashes;
    private readonly partial;
    private fetching?;
    constructor(redirect: Api.upload.FileCdnRedirect, fetchHashes: (offset: number) => Promise<Api.TypeFileHash[]>);
    addHashes(hashes: Api.TypeFileHash[]): void;
    decrypt(offset: number, data: Buffer): Buffer;
    verify(offset: number, data: Buffer): Promise<void>;
    private rangeAt;
    private find;
    private collect;
    private check;
}
