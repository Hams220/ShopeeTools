import type bigInt from "big-integer";
import { Api } from "../../tl";
export interface UploadSource {
    read(offset: number, length: number): Promise<Buffer>;
    close(): Promise<void>;
}
export interface UploadedFile {
    fileId: bigInt.BigInteger;
    size: number;
    partSize: number;
    partCount: number;
    isBig: boolean;
    dcId: number;
    open(): Promise<UploadSource>;
}
export declare function rememberUpload(input: Api.InputFile | Api.InputFileBig, file: UploadedFile): void;
export declare function findUploads(request: unknown): UploadedFile[];
