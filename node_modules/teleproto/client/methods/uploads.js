"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CustomFile = void 0;
exports.uploadFile = uploadFile;
exports._resaveUploadedParts = _resaveUploadedParts;
exports._toQuickReplyShortcut = _toQuickReplyShortcut;
exports._toReplyObject = _toReplyObject;
exports._fileToMedia = _fileToMedia;
exports._sendAlbum = _sendAlbum;
exports.sendFile = sendFile;
const tl_1 = require("../../tl");
const Helpers_1 = require("../../Helpers");
const Utils_1 = require("../../Utils");
const path_1 = __importDefault(require("path"));
const fs_1 = require("fs");
const crypto_1 = require("crypto");
const utils = __importStar(require("../../Utils"));
const messageParse_1 = require("./messageParse");
const errors_1 = require("../../errors");
const FileUploader_1 = require("../files/FileUploader");
const uploadRegistry_1 = require("../files/uploadRegistry");
const PartsManager_1 = require("../files/PartsManager");
function isNamedBlob(value) {
    return (typeof value === "object" &&
        value !== null &&
        typeof value.arrayBuffer === "function" &&
        typeof value.name === "string" &&
        typeof value.size === "number");
}
/**
 * A custom file class compatible with File-like upload shape.<br/>
 * You should use this whenever you want to upload a file.
 */
class CustomFile {
    constructor(name, size, path, buffer) {
        this.name = name;
        this.size = size;
        this.path = path;
        this.buffer = buffer;
    }
}
exports.CustomFile = CustomFile;
const BUFFER_SIZE_20MB = 20 * 1024 * 1024;
async function openUploadSource(file, size, maxBufferSize) {
    if (size > maxBufferSize && file instanceof CustomFile && file.path) {
        const handle = await fs_1.promises.open(file.path, "r");
        return {
            async read(offset, length) {
                const buffer = Buffer.allocUnsafe(length);
                let read = 0;
                while (read < length) {
                    const { bytesRead } = await handle.read(buffer, read, length - read, offset + read);
                    if (!bytesRead)
                        throw new Error(`${file.path} ended at ${offset + read} bytes, expected ${size}`);
                    read += bytesRead;
                }
                return buffer;
            },
            close: () => handle.close(),
        };
    }
    const buffer = Buffer.from(await fileToBuffer(file));
    return {
        read: async (offset, length) => buffer.subarray(offset, offset + length),
        close: async () => { },
    };
}
/** @hidden */
async function uploadFile(client, fileParams) {
    const { file, onProgress, workers } = fileParams;
    const { name, size } = file;
    const fileId = (0, Helpers_1.generateRandomLong)(true);
    let partSize = (0, PartsManager_1.choosePartSize)(size, client._files.maxPartSize);
    const maxParts = await client._files.maxUploadParts();
    if (Math.ceil(size / PartsManager_1.MAX_PART_SIZE) > maxParts) {
        throw new Error(`${name} is ${size} bytes, larger than the ${maxParts * PartsManager_1.MAX_PART_SIZE} bytes this account can upload`);
    }
    if (Math.ceil(size / partSize) > maxParts)
        partSize = PartsManager_1.MAX_PART_SIZE;
    const maxBufferSize = fileParams.maxBufferSize || BUFFER_SIZE_20MB - 1;
    const source = await openUploadSource(file, size, maxBufferSize);
    const abort = new AbortController();
    let uploaded = 0;
    onProgress?.(0);
    const uploader = new FileUploader_1.FileUploader(client._files, {
        fileId,
        size,
        partSize,
        dcId: client.session.dcId,
        maxInflight: workers && workers > 0 ? workers : undefined,
        read: (offset, length) => source.read(offset, length),
        signal: abort.signal,
        onPart: () => {
            if (!onProgress)
                return;
            if (onProgress.isCanceled) {
                abort.abort();
                return;
            }
            onProgress(++uploaded / uploader.partCount);
        },
    });
    try {
        await uploader.run();
        const parts = uploader.partCount;
        const input = uploader.isBig
            ? new tl_1.Api.InputFileBig({ id: fileId, parts, name })
            : new tl_1.Api.InputFile({ id: fileId, parts, name, md5Checksum: (0, crypto_1.createHash)("md5").update(await source.read(0, size)).digest("hex") });
        (0, uploadRegistry_1.rememberUpload)(input, {
            fileId,
            size,
            partSize,
            partCount: parts,
            isBig: uploader.isBig,
            dcId: client.session.dcId,
            open: () => openUploadSource(file, size, maxBufferSize),
        });
        return input;
    }
    catch (error) {
        if (error instanceof errors_1.MediaAbortError && onProgress?.isCanceled)
            throw new Error("USER_CANCELED");
        throw error;
    }
    finally {
        await source.close();
    }
}
/** @hidden */
async function _resaveUploadedParts(client, request, part) {
    const files = (0, uploadRegistry_1.findUploads)(request);
    if (!files.length)
        return false;
    for (const file of files) {
        if (part !== "all" && part >= file.partCount)
            continue;
        const source = await file.open();
        try {
            if (part === "all") {
                await new FileUploader_1.FileUploader(client._files, { ...file, read: (offset, length) => source.read(offset, length) }).run();
                continue;
            }
            const offset = part * file.partSize;
            const bytes = await source.read(offset, Math.min(file.partSize, file.size - offset));
            await client._files.run("upload", file.dcId, () => file.isBig
                ? new tl_1.Api.upload.SaveBigFilePart({ fileId: file.fileId, filePart: part, fileTotalParts: file.partCount, bytes })
                : new tl_1.Api.upload.SaveFilePart({ fileId: file.fileId, filePart: part, bytes }));
        }
        finally {
            await source.close();
        }
    }
    client._log.info(`Re-saved ${part === "all" ? "all parts" : `part ${part}`} of ${files.length} uploaded file(s)`);
    return true;
}
/** @hidden */
function _toQuickReplyShortcut(shortcut) {
    if (shortcut == undefined) {
        return undefined;
    }
    if (typeof shortcut === "string") {
        return new tl_1.Api.InputQuickReplyShortcut({ shortcut });
    }
    if (typeof shortcut === "number") {
        return new tl_1.Api.InputQuickReplyShortcutId({ shortcutId: shortcut });
    }
    return shortcut;
}
/** @hidden */
async function _toReplyObject(client, replyTo, topMsgId, quote) {
    if (replyTo != undefined &&
        typeof replyTo === "object" &&
        replyTo.SUBCLASS_OF_ID === (0, Helpers_1.unionId)("InputReplyTo")) {
        return replyTo;
    }
    const replyToMsgId = replyTo != undefined
        ? (0, Utils_1.getMessageId)(replyTo)
        : (0, Utils_1.getMessageId)(topMsgId);
    if (replyToMsgId == undefined) {
        return undefined;
    }
    return new tl_1.Api.InputReplyToMessage({
        replyToMsgId,
        topMsgId: replyTo != undefined ? (0, Utils_1.getMessageId)(topMsgId) : undefined,
        quoteText: quote?.quoteText,
        quoteEntities: quote?.quoteEntities,
        quoteOffset: quote?.quoteOffset,
        replyToPeerId: quote?.replyToPeerId
            ? await client.getInputEntity(quote.replyToPeerId)
            : undefined,
    });
}
/** @hidden */
async function _fileToMedia(client, { file, forceDocument, fileSize, progressCallback, attributes, thumb, voiceNote = false, videoNote = false, supportsStreaming = false, mimeType, asImage, workers, spoiler, ttlSeconds, nosoundVideo, videoCover, videoTimestamp, }) {
    if (!file) {
        return { fileHandle: undefined, media: undefined, image: undefined };
    }
    const isImage = utils.isImage(file);
    if (asImage == undefined) {
        asImage = isImage && !forceDocument;
    }
    if (typeof file == "object" &&
        !Buffer.isBuffer(file) &&
        !(file instanceof tl_1.Api.InputFile) &&
        !(file instanceof tl_1.Api.InputFileBig) &&
        !(file instanceof CustomFile) &&
        !isNamedBlob(file) &&
        !("read" in file)) {
        try {
            return {
                fileHandle: undefined,
                media: utils.getInputMedia(file, {
                    isPhoto: asImage,
                    attributes: attributes,
                    forceDocument: forceDocument,
                    voiceNote: voiceNote,
                    videoNote: videoNote,
                    supportsStreaming: supportsStreaming,
                    spoiler: spoiler,
                    ttlSeconds: ttlSeconds,
                    nosoundVideo: nosoundVideo,
                    videoCover: videoCover,
                    videoTimestamp: videoTimestamp,
                }),
                image: asImage,
            };
        }
        catch (e) {
            return {
                fileHandle: undefined,
                media: undefined,
                image: isImage,
            };
        }
    }
    let media;
    let fileHandle;
    let createdFile;
    if (file instanceof tl_1.Api.InputFile || file instanceof tl_1.Api.InputFileBig) {
        fileHandle = file;
    }
    else if (typeof file == "string" &&
        (file.startsWith("https://") || file.startsWith("http://"))) {
        if (asImage) {
            media = new tl_1.Api.InputMediaPhotoExternal({
                url: file,
                spoiler: spoiler,
                ttlSeconds: ttlSeconds,
            });
        }
        else {
            media = new tl_1.Api.InputMediaDocumentExternal({
                url: file,
                spoiler: spoiler,
                ttlSeconds: ttlSeconds,
                videoCover: videoCover,
                videoTimestamp: videoTimestamp,
            });
        }
    }
    else if (!(typeof file == "string") || (await fs_1.promises.lstat(file)).isFile()) {
        if (typeof file == "string") {
            createdFile = new CustomFile(path_1.default.basename(file), (await fs_1.promises.stat(file)).size, file);
        }
        else if (isNamedBlob(file) || file instanceof CustomFile) {
            createdFile = file;
        }
        else {
            const name = "name" in file && typeof file.name === "string"
                ? file.name
                : "unnamed";
            if (Buffer.isBuffer(file)) {
                createdFile = new CustomFile(name, file.length, "", file);
            }
        }
        if (!createdFile) {
            throw new Error(`Could not create file from ${JSON.stringify(file)}`);
        }
        fileHandle = await uploadFile(client, {
            file: createdFile,
            onProgress: progressCallback,
            workers: workers,
        });
    }
    else {
        throw new Error(`"Not a valid path nor a url ${file}`);
    }
    if (media != undefined) {
    }
    else if (fileHandle == undefined) {
        throw new Error(`Failed to convert ${file} to media. Not an existing file or an HTTP URL`);
    }
    else if (asImage) {
        media = new tl_1.Api.InputMediaUploadedPhoto({
            file: fileHandle,
            spoiler: spoiler,
            ttlSeconds: ttlSeconds,
        });
    }
    else {
        // @ts-ignore
        let res = utils.getAttributes(file, {
            mimeType: mimeType,
            attributes: attributes,
            forceDocument: forceDocument && !isImage,
            voiceNote: voiceNote,
            videoNote: videoNote,
            supportsStreaming: supportsStreaming,
            thumb: thumb,
        });
        attributes = res.attrs;
        mimeType = res.mimeType;
        let uploadedThumb;
        if (!thumb) {
            uploadedThumb = undefined;
        }
        else {
            // todo refactor
            if (typeof thumb == "string") {
                uploadedThumb = new CustomFile(path_1.default.basename(thumb), (await fs_1.promises.stat(thumb)).size, thumb);
            }
            else if (isNamedBlob(thumb)) {
                uploadedThumb = thumb;
            }
            else {
                let name;
                if ("name" in thumb) {
                    name = thumb.name;
                }
                else {
                    name = "unnamed";
                }
                if (Buffer.isBuffer(thumb)) {
                    uploadedThumb = new CustomFile(name, thumb.length, "", thumb);
                }
            }
            if (!uploadedThumb) {
                throw new Error(`Could not create file from ${file}`);
            }
            uploadedThumb = await uploadFile(client, {
                file: uploadedThumb,
                workers: 1,
            });
        }
        media = new tl_1.Api.InputMediaUploadedDocument({
            file: fileHandle,
            mimeType: mimeType,
            attributes: attributes,
            thumb: uploadedThumb,
            forceFile: forceDocument && !isImage,
            spoiler: spoiler,
            ttlSeconds: ttlSeconds,
            nosoundVideo: nosoundVideo,
            videoCover: videoCover,
            videoTimestamp: videoTimestamp,
        });
    }
    return {
        fileHandle: fileHandle,
        media: media,
        image: asImage,
    };
}
/** @hidden */
async function _sendAlbum(client, entity, { file, caption, formattingEntities, forceDocument = false, fileSize, clearDraft = false, progressCallback, replyTo, attributes, thumb, parseMode, voiceNote = false, videoNote = false, silent, supportsStreaming = false, scheduleDate, workers, noforwards, commentTo, topMsgId, sendAs, effect, invertMedia, background, updateStickersetsOrder, allowPaidFloodskip, allowPaidStars, quickReplyShortcut, quoteText, quoteEntities, quoteOffset, replyToPeerId, spoiler, ttlSeconds, nosoundVideo, videoCover, videoTimestamp, }) {
    entity = await client.getInputEntity(entity);
    let files = [];
    if (!Array.isArray(file)) {
        files = [file];
    }
    else {
        files = file;
    }
    if (!Array.isArray(caption)) {
        if (!caption) {
            caption = "";
        }
        caption = [caption];
    }
    const captions = [];
    for (const [i, c] of caption.entries()) {
        if (i === 0 && formattingEntities) {
            captions.push([c || "", formattingEntities]);
        }
        else {
            captions.push(await (0, messageParse_1._parseMessageText)(client, c, parseMode));
        }
    }
    if (commentTo != undefined) {
        const discussionData = await client.getCommentData(entity, commentTo);
        entity = discussionData.entity;
        replyTo = discussionData.replyTo;
    }
    if (!attributes) {
        attributes = [];
    }
    let index = 0;
    const albumFiles = [];
    for (const file of files) {
        let { fileHandle, media, image } = await _fileToMedia(client, {
            file: file,
            forceDocument: forceDocument,
            fileSize: fileSize,
            progressCallback: progressCallback,
            // @ts-ignore
            attributes: attributes[index],
            thumb: thumb,
            voiceNote: voiceNote,
            videoNote: videoNote,
            supportsStreaming: supportsStreaming,
            workers: workers,
            spoiler: spoiler,
            ttlSeconds: ttlSeconds,
            nosoundVideo: nosoundVideo,
            videoCover: videoCover,
            videoTimestamp: videoTimestamp,
        });
        index++;
        if (media instanceof tl_1.Api.InputMediaUploadedPhoto ||
            media instanceof tl_1.Api.InputMediaPhotoExternal) {
            const r = await client.invoke(new tl_1.Api.messages.UploadMedia({
                peer: entity,
                media,
            }));
            if (r instanceof tl_1.Api.MessageMediaPhoto) {
                media = (0, Utils_1.getInputMedia)(r.photo, {
                    spoiler: spoiler,
                    ttlSeconds: ttlSeconds,
                });
            }
        }
        else if (media instanceof tl_1.Api.InputMediaUploadedDocument) {
            const r = await client.invoke(new tl_1.Api.messages.UploadMedia({
                peer: entity,
                media,
            }));
            if (r instanceof tl_1.Api.MessageMediaDocument) {
                media = (0, Utils_1.getInputMedia)(r.document, {
                    spoiler: spoiler,
                    ttlSeconds: ttlSeconds,
                    videoCover: videoCover,
                    videoTimestamp: videoTimestamp,
                });
            }
        }
        let text = "";
        let msgEntities = [];
        if (captions.length) {
            [text, msgEntities] = captions.shift();
        }
        albumFiles.push(new tl_1.Api.InputSingleMedia({
            media: media,
            message: text,
            entities: msgEntities,
        }));
    }
    const replyObject = await _toReplyObject(client, replyTo, topMsgId, {
        quoteText,
        quoteEntities,
        quoteOffset,
        replyToPeerId,
    });
    const result = await client.invoke(new tl_1.Api.messages.SendMultiMedia({
        peer: entity,
        replyTo: replyObject,
        multiMedia: albumFiles,
        silent: silent,
        scheduleDate: scheduleDate,
        clearDraft: clearDraft,
        noforwards: noforwards,
        background: background,
        updateStickersetsOrder: updateStickersetsOrder,
        allowPaidFloodskip: allowPaidFloodskip,
        allowPaidStars: allowPaidStars,
        quickReplyShortcut: _toQuickReplyShortcut(quickReplyShortcut),
        sendAs: sendAs
            ? await client.getInputEntity(sendAs)
            : undefined,
        effect: effect,
        invertMedia: invertMedia,
    }));
    const randomIds = albumFiles.map((m) => m.randomId);
    return client._getResponseMessage(randomIds, result, entity);
}
/** @hidden */
async function sendFile(client, entity, { file, caption, forceDocument = false, fileSize, clearDraft = false, progressCallback, replyTo, attributes, thumb, parseMode, formattingEntities, voiceNote = false, videoNote = false, buttons, silent, supportsStreaming = false, scheduleDate, workers, noforwards, commentTo, topMsgId, sendAs, effect, invertMedia, background, updateStickersetsOrder, allowPaidFloodskip, allowPaidStars, scheduleRepeatPeriod, quickReplyShortcut, suggestedPost, quoteText, quoteEntities, quoteOffset, replyToPeerId, spoiler, ttlSeconds, nosoundVideo, videoCover, videoTimestamp, }) {
    if (!file) {
        throw new Error("You need to specify a file");
    }
    if (!caption) {
        caption = "";
    }
    entity = await client.getInputEntity(entity);
    if (commentTo != undefined) {
        const discussionData = await client.getCommentData(entity, commentTo);
        entity = discussionData.entity;
        replyTo = discussionData.replyTo;
    }
    if (Array.isArray(file)) {
        return await _sendAlbum(client, entity, {
            file: file,
            caption: caption,
            formattingEntities: formattingEntities,
            replyTo: replyTo,
            parseMode: parseMode,
            attributes: attributes,
            silent: silent,
            scheduleDate: scheduleDate,
            supportsStreaming: supportsStreaming,
            clearDraft: clearDraft,
            forceDocument: forceDocument,
            noforwards: noforwards,
            topMsgId: topMsgId,
            fileSize: fileSize,
            progressCallback: progressCallback,
            workers: workers,
            thumb: thumb,
            voiceNote: voiceNote,
            videoNote: videoNote,
            sendAs: sendAs,
            effect: effect,
            invertMedia: invertMedia,
            background: background,
            updateStickersetsOrder: updateStickersetsOrder,
            allowPaidFloodskip: allowPaidFloodskip,
            allowPaidStars: allowPaidStars,
            quickReplyShortcut: quickReplyShortcut,
            quoteText: quoteText,
            quoteEntities: quoteEntities,
            quoteOffset: quoteOffset,
            replyToPeerId: replyToPeerId,
            spoiler: spoiler,
            ttlSeconds: ttlSeconds,
            nosoundVideo: nosoundVideo,
            videoCover: videoCover,
            videoTimestamp: videoTimestamp,
        });
    }
    if (Array.isArray(caption)) {
        caption = caption[0] || "";
    }
    let msgEntities;
    if (formattingEntities != undefined) {
        msgEntities = formattingEntities;
    }
    else {
        [caption, msgEntities] = await (0, messageParse_1._parseMessageText)(client, caption, parseMode);
    }
    const { fileHandle, media, image } = await _fileToMedia(client, {
        file: file,
        forceDocument: forceDocument,
        fileSize: fileSize,
        progressCallback: progressCallback,
        // @ts-ignore
        attributes: attributes,
        thumb: thumb,
        voiceNote: voiceNote,
        videoNote: videoNote,
        supportsStreaming: supportsStreaming,
        workers: workers,
        spoiler: spoiler,
        ttlSeconds: ttlSeconds,
        nosoundVideo: nosoundVideo,
        videoCover: videoCover,
        videoTimestamp: videoTimestamp,
    });
    if (media == undefined) {
        throw new Error(`Cannot use ${file} as file.`);
    }
    const markup = client.buildReplyMarkup(buttons);
    const replyObject = await _toReplyObject(client, replyTo, topMsgId, {
        quoteText,
        quoteEntities,
        quoteOffset,
        replyToPeerId,
    });
    const request = new tl_1.Api.messages.SendMedia({
        peer: entity,
        media: media,
        replyTo: replyObject,
        message: caption,
        entities: msgEntities,
        replyMarkup: markup,
        silent: silent,
        scheduleDate: scheduleDate,
        scheduleRepeatPeriod: scheduleRepeatPeriod,
        clearDraft: clearDraft,
        noforwards: noforwards,
        background: background,
        updateStickersetsOrder: updateStickersetsOrder,
        allowPaidFloodskip: allowPaidFloodskip,
        allowPaidStars: allowPaidStars,
        quickReplyShortcut: _toQuickReplyShortcut(quickReplyShortcut),
        suggestedPost: suggestedPost,
        sendAs: sendAs
            ? await client.getInputEntity(sendAs)
            : undefined,
        effect: effect,
        invertMedia: invertMedia,
    });
    const result = await client.invoke(request);
    return client._getResponseMessage(request, result, entity);
}
function fileToBuffer(file) {
    if (file instanceof CustomFile) {
        if (file.buffer != undefined) {
            return file.buffer;
        }
        else {
            return fs_1.promises.readFile(file.path);
        }
    }
    else if (isNamedBlob(file)) {
        return file.arrayBuffer().then((ab) => Buffer.from(ab));
    }
    else {
        throw new Error("Could not create buffer from file " + file);
    }
}
