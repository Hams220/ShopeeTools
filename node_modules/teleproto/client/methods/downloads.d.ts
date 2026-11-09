import { Api } from "../../tl";
import type { TelegramClient } from "../TelegramClient";
import { EntityLike, OutFile, ProgressCallback } from "../../define";
import bigInt from "big-integer";
export interface progressCallback {
    (downloaded: bigInt.BigInteger, fullSize: bigInt.BigInteger, ...args: any[]): void;
    isCanceled?: boolean;
    acceptsBuffer?: boolean;
}
export interface DownloadCancelParams {
    signal?: AbortSignal;
    requestTimeout?: number;
}
export interface DownloadFileParams extends DownloadCancelParams {
    outputFile?: OutFile;
    dcId?: number;
    fileSize?: bigInt.BigInteger;
    partSizeKb?: number;
    progressCallback?: progressCallback;
    msgData?: [EntityLike, number];
    verifyHashes?: boolean;
}
export interface DownloadProfilePhotoParams extends DownloadCancelParams {
    isBig?: boolean;
    outputFile?: OutFile;
}
/** @hidden */
export declare function downloadFile(client: TelegramClient, inputLocation: Api.TypeInputFileLocation, { outputFile, partSizeKb, fileSize, progressCallback, dcId, msgData, verifyHashes, signal, requestTimeout, }: DownloadFileParams): Promise<Buffer | string | undefined>;
export interface DownloadMediaInterface extends DownloadCancelParams {
    outputFile?: OutFile;
    thumb?: number | Api.TypePhotoSize;
    progressCallback?: ProgressCallback;
}
/** @hidden */
export declare function downloadMedia(client: TelegramClient, messageOrMedia: Api.Message | Api.TypeMessageMedia, outputFile?: OutFile, thumb?: number | Api.TypePhotoSize, progressCallback?: ProgressCallback, extra?: DownloadCancelParams): Promise<Buffer | string | undefined>;
/** @hidden */
export declare function _downloadDocument(client: TelegramClient, doc: Api.MessageMediaDocument | Api.TypeDocument, outputFile: OutFile | undefined, date: number, thumb?: number | string | Api.TypePhotoSize, progressCallback?: ProgressCallback, msgData?: [EntityLike, number], extra?: DownloadCancelParams): Promise<Buffer | string | undefined>;
/** @hidden */
export declare function _downloadContact(_client: TelegramClient, media: Api.MessageMediaContact, args: DownloadMediaInterface): Promise<Buffer | string | undefined>;
/** @hidden */
export declare function _downloadWebDocument(client: TelegramClient, media: Api.WebDocument | Api.WebDocumentNoProxy, args: DownloadMediaInterface): Promise<Buffer | string | undefined>;
/** @hidden */
export declare function _downloadCachedPhotoSize(size: Api.PhotoCachedSize | Api.PhotoStrippedSize, outputFile?: OutFile): Promise<string | Buffer | undefined>;
/** @hidden */
export declare function _downloadPhoto(client: TelegramClient, photo: Api.MessageMediaPhoto | Api.Photo, file?: OutFile, date?: number, thumb?: number | string | Api.TypePhotoSize, progressCallback?: progressCallback, extra?: DownloadCancelParams): Promise<Buffer | string | undefined>;
/** @hidden */
export declare function downloadProfilePhoto(client: TelegramClient, entity: EntityLike, fileParams: DownloadProfilePhotoParams): Promise<string | Buffer | undefined>;
/** Parameters for {@link TelegramClient.iterDownload}. */
export interface IterDownloadParams extends DownloadCancelParams {
    /** Byte offset to start downloading from. Must be divisible by 4096 unless `precise` handles it (it does by default). */
    offset?: bigInt.BigInteger | number;
    /** Stop after this many bytes (approximate — rounded up to whole chunks). */
    limit?: number;
    /** Size of each downloaded chunk in bytes. Must be divisible by 4096; server caps at 1 MB. Defaults to 512 KB. */
    requestSize?: number;
    /** The DC to download from. Auto-corrected on FILE_MIGRATE. */
    dcId?: number;
}
/**
 * Iterates over a file's contents chunk by chunk — streaming download
 * without buffering the whole file in memory.
 * @hidden
 */
export declare function iterDownload(client: TelegramClient, file: Api.Message | Api.MessageMediaDocument | Api.MessageMediaPhoto | Api.TypeInputFileLocation, params?: IterDownloadParams): AsyncGenerator<Buffer, void, unknown>;
