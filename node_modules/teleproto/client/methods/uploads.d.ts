import { Api } from "../../tl";
import type { TelegramClient } from "../TelegramClient";
import { EntityLike, FileLike, MarkupLike, MessageIDLike } from "../../define";
import { BigInteger } from "big-integer";
interface OnProgress {
    (progress: number): void;
    isCanceled?: boolean;
}
/**
 * interface for uploading files.
 */
export interface UploadFileParams {
    /** A {@link CustomFile}, or any File / Blob that has a `name`.
     */
    file: NamedBlob | CustomFile;
    /** Parts to keep in flight. Defaults to a parallel value when omitted;
     * anything above 16 is unstable. */
    workers?: number;
    /** a progress callback for the upload. */
    onProgress?: OnProgress;
    maxBufferSize?: number;
}
export interface NamedBlob {
    name: string;
    size: number;
    arrayBuffer(): Promise<ArrayBuffer>;
}
/**
 * A custom file class compatible with File-like upload shape.<br/>
 * You should use this whenever you want to upload a file.
 */
export declare class CustomFile {
    /** The name of the file to be uploaded. This is what will be shown in telegram */
    name: string;
    /** The size of the file. this should be the exact size to not lose any information */
    size: number;
    /** The full path on the system to where the file is. this will be used to read the file from.<br/>
     * Can be left empty to use a buffer instead
     */
    path: string;
    /** in case of the no path a buffer can instead be passed instead to upload. */
    buffer?: Buffer;
    constructor(name: string, size: number, path: string, buffer?: Buffer);
}
/** @hidden */
export declare function uploadFile(client: TelegramClient, fileParams: UploadFileParams): Promise<Api.InputFile | Api.InputFileBig>;
/** @hidden */
export declare function _resaveUploadedParts(client: TelegramClient, request: unknown, part: number | "all"): Promise<boolean>;
/**
 * Interface for sending files to a chat.
 */
export interface SendFileInterface {
    /** a file like object.
     *   - can be a localpath. the file name will be used.
     *   - can be a Buffer with a ".name" attribute to use as the file name.
     *   - can be an external direct URL. Telegram will download the file and send it.
     *   - can be an existing media from another message.
     *   - can be a handle to a file that was received by using {@link TelegramClient.uploadFile}
     *   - can be a list when using an album
     *   - can be {@link Api.TypeInputMedia} instance. For example if you want to send a dice you would use {@link Api.InputMediaDice}
     */
    file: FileLike | FileLike[];
    /** Optional caption for the sent media message. can be a list for albums*/
    caption?: string | string[];
    /** If left to false and the file is a path that ends with the extension of an image file or a video file, it will be sent as such. Otherwise always as a document. */
    forceDocument?: boolean;
    /** The size of the file to be uploaded if it needs to be uploaded, which will be determined automatically if not specified. */
    fileSize?: number;
    /** Whether the existing draft should be cleared or not. */
    clearDraft?: boolean;
    /** progress callback that will be called each time a new chunk is downloaded. */
    progressCallback?: OnProgress;
    /** Same as `replyTo` from {@link TelegramClient.sendMessage}. Also accepts a raw {@link Api.TypeInputReplyTo} for full control (stories, monoforums, todo items). */
    replyTo?: MessageIDLike | Api.TypeInputReplyTo;
    /** Quoted part of the message being replied to. Requires `replyTo`. */
    quoteText?: string;
    /** Formatting entities of the quote. Offsets are relative to `quoteText`. */
    quoteEntities?: Api.TypeMessageEntity[];
    /** Offset of the quote within the original message (UTF-16 code units). */
    quoteOffset?: number;
    /** Chat where the quoted message was sent, for quoting messages from other chats. */
    replyToPeerId?: EntityLike;
    /** Optional attributes that override the inferred ones, like {@link Api.DocumentAttributeFilename} and so on.*/
    attributes?: Api.TypeDocumentAttribute[] | Api.TypeDocumentAttribute[][];
    /** Optional JPEG thumbnail (for documents). Telegram will ignore this parameter unless you pass a .jpg file!<br/>
     * The file must also be small in dimensions and in disk size. Successful thumbnails were files below 20kB and 320x320px.<br/>
     *  Width/height and dimensions/size ratios may be important.
     *  For Telegram to accept a thumbnail, you must provide the dimensions of the underlying media through `attributes:` with DocumentAttributesVideo.
     */
    thumb?: FileLike;
    /** If true the audio will be sent as a voice note. */
    voiceNote?: boolean;
    /** If true the video will be sent as a video note, also known as a round video message.*/
    videoNote?: boolean;
    /** Whether the sent video supports streaming or not.<br/>
     *  Note that Telegram only recognizes as streamable some formats like MP4, and others like AVI or MKV will not work.<br/>
     *  You should convert these to MP4 before sending if you want them to be streamable. Unsupported formats will result in VideoContentTypeError. */
    supportsStreaming?: boolean;
    /** See the {@link parseMode} property for allowed values. Markdown parsing will be used by default. */
    parseMode?: any;
    /** A list of message formatting entities. When provided, the parseMode is ignored. */
    formattingEntities?: Api.TypeMessageEntity[];
    /** Whether the message should notify people in a broadcast channel or not. Defaults to false, which means it will notify them. Set it to True to alter this behaviour. */
    silent?: boolean;
    /**
     * If set, the file won't send immediately, and instead it will be scheduled to be automatically sent at a later time.
     */
    scheduleDate?: number;
    /**
     * The matrix (list of lists), row list or button to be shown after sending the message.<br/>
     * This parameter will only work if you have signed in as a bot. You can also pass your own ReplyMarkup here.
     */
    buttons?: MarkupLike;
    /** How many workers to use to upload the file. anything above 16 is unstable. */
    workers?: number;
    noforwards?: boolean;
    /** Similar to ``replyTo``, but replies in the linked group of a broadcast channel instead (effectively leaving a "comment to" the specified message).

     This parameter takes precedence over ``replyTo``.
     If there is no linked chat, `SG_ID_INVALID` is thrown.
     */
    commentTo?: number | Api.Message;
    /**
     * Used for threads to reply to a specific thread
     */
    topMsgId?: number | Api.Message;
    /** Send the file as a specific entity (channel/user). */
    sendAs?: EntityLike;
    /** Message effect ID (animation/visual effect). */
    effect?: BigInteger;
    /** If true, media will be shown below the text instead of above. */
    invertMedia?: boolean;
    /** Send this message as a background message. */
    background?: boolean;
    /** Whether the order of the user's sticker sets should be updated when a sticker is sent. */
    updateStickersetsOrder?: boolean;
    /** Bots only: if set, allows sending up to 1000 messages per second past the flood limits, at a Stars cost. */
    allowPaidFloodskip?: boolean;
    /** Stars to pay for sending a paid message, when the recipient charges for messages. */
    allowPaidStars?: BigInteger;
    /** Repeat period (in seconds) for recurring scheduled messages. Requires `scheduleDate`. */
    scheduleRepeatPeriod?: number;
    /** Add the message to a quick-reply shortcut instead of sending it. A shortcut name, shortcut ID, or a raw {@link Api.TypeInputQuickReplyShortcut}. */
    quickReplyShortcut?: string | number | Api.TypeInputQuickReplyShortcut;
    /** Suggested-post metadata for direct-messages channels. */
    suggestedPost?: Api.TypeSuggestedPost;
    /** Mark the media as spoiler (blurred until tapped). */
    spoiler?: boolean;
    /** Self-destruct timer for the media, in seconds. */
    ttlSeconds?: number;
    /** If true, the uploaded video has no sound (sent as a silent video). */
    nosoundVideo?: boolean;
    /** Custom cover photo for the video. */
    videoCover?: Api.TypeInputPhoto;
    /** Start playback timestamp of the video, in seconds. */
    videoTimestamp?: number;
}
interface FileToMediaInterface {
    file: FileLike;
    forceDocument?: boolean;
    fileSize?: number;
    progressCallback?: OnProgress;
    attributes?: Api.TypeDocumentAttribute[];
    thumb?: FileLike;
    voiceNote?: boolean;
    videoNote?: boolean;
    supportsStreaming?: boolean;
    mimeType?: string;
    asImage?: boolean;
    workers?: number;
    spoiler?: boolean;
    ttlSeconds?: number;
    nosoundVideo?: boolean;
    videoCover?: Api.TypeInputPhoto;
    videoTimestamp?: number;
}
/** @hidden */
export declare function _toQuickReplyShortcut(shortcut: string | number | Api.TypeInputQuickReplyShortcut | undefined): Api.TypeInputQuickReplyShortcut | undefined;
/** @hidden */
export declare function _toReplyObject(client: TelegramClient, replyTo: MessageIDLike | Api.TypeInputReplyTo | undefined, topMsgId?: number | Api.Message, quote?: {
    quoteText?: string;
    quoteEntities?: Api.TypeMessageEntity[];
    quoteOffset?: number;
    replyToPeerId?: EntityLike;
}): Promise<Api.TypeInputReplyTo | undefined>;
/** @hidden */
export declare function _fileToMedia(client: TelegramClient, { file, forceDocument, fileSize, progressCallback, attributes, thumb, voiceNote, videoNote, supportsStreaming, mimeType, asImage, workers, spoiler, ttlSeconds, nosoundVideo, videoCover, videoTimestamp, }: FileToMediaInterface): Promise<{
    fileHandle?: any;
    media?: Api.TypeInputMedia;
    image?: boolean;
}>;
/** @hidden */
export declare function _sendAlbum(client: TelegramClient, entity: EntityLike, { file, caption, formattingEntities, forceDocument, fileSize, clearDraft, progressCallback, replyTo, attributes, thumb, parseMode, voiceNote, videoNote, silent, supportsStreaming, scheduleDate, workers, noforwards, commentTo, topMsgId, sendAs, effect, invertMedia, background, updateStickersetsOrder, allowPaidFloodskip, allowPaidStars, quickReplyShortcut, quoteText, quoteEntities, quoteOffset, replyToPeerId, spoiler, ttlSeconds, nosoundVideo, videoCover, videoTimestamp, }: SendFileInterface): Promise<Api.Message>;
/** @hidden */
export declare function sendFile(client: TelegramClient, entity: EntityLike, { file, caption, forceDocument, fileSize, clearDraft, progressCallback, replyTo, attributes, thumb, parseMode, formattingEntities, voiceNote, videoNote, buttons, silent, supportsStreaming, scheduleDate, workers, noforwards, commentTo, topMsgId, sendAs, effect, invertMedia, background, updateStickersetsOrder, allowPaidFloodskip, allowPaidStars, scheduleRepeatPeriod, quickReplyShortcut, suggestedPost, quoteText, quoteEntities, quoteOffset, replyToPeerId, spoiler, ttlSeconds, nosoundVideo, videoCover, videoTimestamp, }: SendFileInterface): Promise<Api.Message>;
export {};
