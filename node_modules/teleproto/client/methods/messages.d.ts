import { Api } from "../../tl";
import type { DateLike, EntityLike, FileLike, MarkupLike, MessageIDLike, MessageLike } from "../../define";
import { RequestIter } from "../../requestIter";
import { TotalList } from "../../Helpers";
import type { TelegramClient } from "../TelegramClient";
import { BigInteger } from "big-integer";
import { SendFileInterface } from "./uploads";
interface MessageIterParams {
    entity: EntityLike;
    offsetId: number;
    minId: number;
    maxId: number;
    fromUser?: EntityLike;
    offsetDate: DateLike;
    addOffset: number;
    filter: any;
    search: string;
    replyTo: MessageIDLike;
    topMsgId?: number;
    savedPeerId?: EntityLike;
    community?: EntityLike;
}
/**
 * Async iterator over messages in a chat.
 *
 * Fetches messages in chunks from the Telegram API, supporting forward/reverse
 * iteration, date offsets, sender filtering, text search, and reply threading.
 * Used internally by `iterMessages` / `getMessages`.
 * @internal
 */
export declare class _MessagesIter extends RequestIter {
    entity?: Api.TypeInputPeer;
    request?: Api.messages.SearchGlobal | Api.messages.GetReplies | Api.messages.GetHistory | Api.messages.Search;
    addOffset?: number;
    maxId?: number;
    minId?: number;
    lastId?: number;
    _init({ entity, offsetId, minId, maxId, fromUser, offsetDate, addOffset, filter, search, replyTo, topMsgId, savedPeerId, community, }: MessageIterParams): Promise<boolean | undefined>;
    _loadNextChunk(): Promise<true | undefined>;
    _messageInRange(message: Api.Message): boolean;
    [Symbol.asyncIterator](): AsyncIterator<Api.Message, any, undefined>;
    _updateOffset(lastMessage: Api.Message, response: any): void;
}
interface IDsIterInterface {
    entity: EntityLike;
    ids: Api.TypeInputMessage[];
}
export declare class _IDsIter extends RequestIter {
    _ids?: Api.TypeInputMessage[];
    _offset?: number;
    _ty: number | undefined;
    private _entity;
    _init({ entity, ids }: IDsIterInterface): Promise<void>;
    [Symbol.asyncIterator](): AsyncIterator<Api.Message, any, undefined>;
    _loadNextChunk(): Promise<false | undefined>;
}
/**
 * Interface for iterating over messages. used in both {@link TelegramClient.iterMessages} and {@link TelegramClient.getMessages}.
 */
export interface IterMessagesParams {
    /** Number of messages to be retrieved.<br/>
     * Due to limitations with the API retrieving more than 3000 messages will take longer than half a minute. (might even take longer)<br/>
     * if undefined is passed instead of a number the library will try to retrieve all the messages.*/
    limit?: number;
    /** Offset date (messages previous to this date will be retrieved). Exclusive. */
    offsetDate?: DateLike;
    /** Offset message ID (only messages previous to the given ID will be retrieved). Exclusive. */
    offsetId: number;
    /** All the messages with a higher (newer) ID or equal to this will be excluded. */
    maxId: number;
    /** All the messages with a lower (older) ID or equal to this will be excluded. */
    minId: number;
    /** Additional message offset (all of the specified offsets + this offset = older messages). */
    addOffset: number;
    /** The string to be used as a search query. */
    search?: string;
    /** The filter to use when returning messages.<br/>
     * For instance, InputMessagesFilterPhotos would yield only messages containing photos.
     */
    filter?: Api.TypeMessagesFilter | Api.TypeMessagesFilter[];
    /** Only messages from this user will be returned. */
    fromUser?: EntityLike;
    /** Wait time (in seconds) between different GetHistory requests.<br/>
     * Use this parameter to avoid hitting the FloodWaitError as needed.<br/>
     * If left to undefined, it will default to 1 second only if the number of messages is higher than 3000.
     * If the ids parameter is used, this time will default to 10 seconds only if the amount of IDs is higher than 300.
     */
    waitTime?: number;
    /** A single integer ID (or several IDs) for the message that should be returned.<br/>
     * This parameter takes precedence over the rest (which will be ignored if this is set).<br/>
     * This can for instance be used to get the message with ID 123 from a channel.<br/>
     * **Note** that if the message doesn"t exist, undefined will appear in its place.
     */
    ids?: number | number[] | Api.TypeInputMessage | Api.TypeInputMessage[];
    /** If set to `true`, the messages will be returned in reverse order (from oldest to newest, instead of the default newest to oldest).<br/>
     * This also means that the meaning of offsetId and offsetDate parameters is reversed, although they will still be exclusive.<br/>
     * `minId` becomes equivalent to `offsetId` instead of being `maxId` as well since messages are returned in ascending order.<br/>
     * You cannot use this if both entity and ids are undefined.
     */
    reverse?: boolean;
    /** If set to a message ID, the messages that reply to this ID will be returned.<br/>
     * This feature is also known as comments in posts of broadcast channels, or viewing threads in groups.<br/>
     * This feature can only be used in broadcast channels and their linked supergroups. Using it in a chat or private conversation will result in PEER_ID_INVALID error.<br/>
     * When using this parameter, the filter and search parameters have no effect, since Telegram's API doesn't support searching messages in replies.
     */
    replyTo?: number;
    /** If set to `true`, messages which are scheduled will be returned.
     *  All other parameters will be ignored for this, except `entity`.
     */
    scheduled: boolean;
    /** Restrict results to a forum topic by its top message ID. Only takes effect when combined with `search`, `filter` or `fromUser` (server-side search). */
    topMsgId?: number;
    /** When searching your Saved Messages, restrict results to messages originally sent by this peer. */
    savedPeerId?: EntityLike;
    /** Restricts global search to a community; leave the entity unspecified. */
    community?: EntityLike;
}
/**
 * Interface for sending a message. only message is required
 */
export interface SendMessageParams {
    /**  The message to be sent, or another message object to resend as a copy.<br/>
     * The maximum length for a message is 35,000 bytes or 4,096 characters.<br/>
     * Longer messages will not be sliced automatically, and you should slice them manually if the text to send is longer than said length. */
    message?: MessageLike;
    /** Whether to reply to a message or not. If an integer is provided, it should be the ID of the message that it should reply to.<br/>
     * Also accepts a raw {@link Api.TypeInputReplyTo} for full control (stories, monoforums, todo items). */
    replyTo?: number | Api.Message | Api.TypeInputReplyTo;
    /** Quoted part of the message being replied to. Requires `replyTo`. */
    quoteText?: string;
    /** Formatting entities of the quote. Offsets are relative to `quoteText`. */
    quoteEntities?: Api.TypeMessageEntity[];
    /** Offset of the quote within the original message (UTF-16 code units). */
    quoteOffset?: number;
    /** Chat where the quoted message was sent, for quoting messages from other chats. */
    replyToPeerId?: EntityLike;
    /** Optional attributes that override the inferred ones, like DocumentAttributeFilename and so on. */
    attributes?: Api.TypeDocumentAttribute[];
    /** See the {@link parseMode} property for allowed values. Markdown parsing will be used by default. */
    parseMode?: any;
    /** A list of message formatting entities. When provided, the parseMode is ignored. */
    formattingEntities?: Api.TypeMessageEntity[];
    /** Should the link preview be shown? */
    linkPreview?: boolean;
    /** Sends a message with a file attached (e.g. a photo, video, audio or document). The message may be empty. */
    file?: FileLike | FileLike[];
    /** Optional JPEG thumbnail (for documents). Telegram will ignore this parameter unless you pass a .jpg file!<br/>
     * The file must also be small in dimensions and in disk size. Successful thumbnails were files below 20kB and 320x320px.<br/>
     *  Width/height and dimensions/size ratios may be important.
     *  For Telegram to accept a thumbnail, you must provide the dimensions of the underlying media through `attributes:` with DocumentAttributesVideo.
     */
    thumb?: FileLike;
    /** Whether to send the given file as a document or not. */
    forceDocument?: boolean;
    /** Whether the existing draft should be cleared or not. */
    clearDraft?: boolean;
    /** The matrix (list of lists), row list or button to be shown after sending the message.<br/>
     *  This parameter will only work if you have signed in as a bot. You can also pass your own ReplyMarkup here.<br/>
     *  <br/>
     *  All the following limits apply together:
     *   - There can be 100 buttons at most (any more are ignored).
     *   - There can be 8 buttons per row at most (more are ignored).
     *   - The maximum callback data per button is 64 bytes.
     *   - The maximum data that can be embedded in total is just over 4KB, shared between inline callback data and text.
     */
    buttons?: MarkupLike;
    /** Whether the message should notify people in a broadcast channel or not. Defaults to false, which means it will notify them. Set it to True to alter this behaviour. */
    silent?: boolean;
    /** Whether the sent video supports streaming or not.<br/>
     *  Note that Telegram only recognizes as streamable some formats like MP4, and others like AVI or MKV will not work.<br/>
     *  You should convert these to MP4 before sending if you want them to be streamable. Unsupported formats will result in VideoContentTypeError. */
    supportStreaming?: boolean;
    /** If set, the message won't send immediately, and instead it will be scheduled to be automatically sent at a later time. */
    schedule?: DateLike;
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
    /** Send the message as a specific entity (channel/user). */
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
    /** Repeat period (in seconds) for recurring scheduled messages. Requires `schedule`. */
    scheduleRepeatPeriod?: number;
    /** Add the message to a quick-reply shortcut instead of sending it. A shortcut name, shortcut ID, or a raw {@link Api.TypeInputQuickReplyShortcut}. */
    quickReplyShortcut?: string | number | Api.TypeInputQuickReplyShortcut;
    /** Suggested-post metadata for direct-messages channels. */
    suggestedPost?: Api.TypeSuggestedPost;
    /** Rich message content (Layer 228): tables, headings, lists, inline media.<br/>
     * Build it with the `Rich` helpers — `Rich.markdown("# hi")`, `Rich.html("<h1>hi</h1>")` (server-side parsing), or `Rich.blocks([...])`. Only for plain text messages. */
    richMessage?: Api.TypeInputRichMessage;
}
/** interface used for forwarding messages */
export interface ForwardMessagesParams {
    /** The message(s) to forward, or their integer IDs. */
    messages: MessageIDLike | MessageIDLike[];
    /** If the given messages are integer IDs and not instances of the Message class, this must be specified in order for the forward to work.<br/> */
    fromPeer: EntityLike;
    /** Whether the message should notify people with sound or not.<br/>
     * Defaults to false (send with a notification sound unless the person has the chat muted). Set it to true to alter this behaviour. */
    silent?: boolean;
    /** If set, the message(s) won't forward immediately, and instead they will be scheduled to be automatically sent at a later time. */
    schedule?: DateLike;
    dropAuthor?: boolean;
    noforwards?: boolean;
    /** Used for threads to reply to a specific thread */
    topMsgId?: number | Api.Message;
    /** Send the forwarded message as a specific entity (channel/user). */
    sendAs?: EntityLike;
    /** Message effect ID (animation/visual effect). */
    effect?: BigInteger;
    /** If true, drop media captions when forwarding. */
    dropMediaCaptions?: boolean;
    /** If true, forward the game score along with the message. */
    withMyScore?: boolean;
    /** Send the forward as a background message. */
    background?: boolean;
    /** Bots only: if set, allows sending up to 1000 messages per second past the flood limits, at a Stars cost. */
    allowPaidFloodskip?: boolean;
    /** Stars to pay for sending a paid message, when the recipient charges for messages. */
    allowPaidStars?: BigInteger;
    /** Start playback timestamp (in seconds) for the forwarded video. */
    videoTimestamp?: number;
    /** Repeat period (in seconds) for recurring scheduled messages. Requires `schedule`. */
    scheduleRepeatPeriod?: number;
    /** Add the forward to a quick-reply shortcut instead of sending it. A shortcut name, shortcut ID, or a raw {@link Api.TypeInputQuickReplyShortcut}. */
    quickReplyShortcut?: string | number | Api.TypeInputQuickReplyShortcut;
    /** Suggested-post metadata for direct-messages channels. */
    suggestedPost?: Api.TypeSuggestedPost;
    /** Send the forwarded messages as a reply to this message. Accepts a message ID, a Message, or a raw {@link Api.TypeInputReplyTo}. */
    replyTo?: number | Api.Message | Api.TypeInputReplyTo;
}
/** Interface for editing messages */
export interface EditMessageParams {
    /** The ID of the message (or Message itself) to be edited. If the entity was a Message, then this message will be treated as the new text. */
    message: Api.Message | number;
    /** The new text of the message. Does nothing if the entity was a Message. */
    text?: string;
    /** See the {@link TelegramClient.parseMode} property for allowed values. Markdown parsing will be used by default. */
    parseMode?: any;
    /** A list of message formatting entities. When provided, the parseMode is ignored. */
    formattingEntities?: Api.TypeMessageEntity[];
    /** Should the link preview be shown? */
    linkPreview?: boolean;
    /** The file object that should replace the existing media in the message. Does nothing if entity was a Message */
    file?: FileLike;
    /** Whether to send the given file as a document or not. */
    forceDocument?: boolean;
    /** The matrix (list of lists), row list or button to be shown after sending the message.<br/>
     *  This parameter will only work if you have signed in as a bot. You can also pass your own ReplyMarkup here.<br/>
     *  <br/>
     *  All the following limits apply together:
     *   - There can be 100 buttons at most (any more are ignored).
     *   - There can be 8 buttons per row at most (more are ignored).
     *   - The maximum callback data per button is 64 bytes.
     *   - The maximum data that can be embedded in total is just over 4KB, shared between inline callback data and text.
     */
    buttons?: MarkupLike;
    /** If set, the message won't be edited immediately, and instead it will be scheduled to be automatically edited at a later time. */
    schedule?: DateLike;
    /** If true, media will be shown below the text instead of above. */
    invertMedia?: boolean;
    /** Repeat period (in seconds) for recurring scheduled messages. Requires `schedule`. */
    scheduleRepeatPeriod?: number;
    /** If editing a message inside a quick-reply shortcut, the ID of that shortcut. */
    quickReplyShortcutId?: number;
    /** New rich message content (Layer 228 page-block tree). */
    richMessage?: Api.TypeInputRichMessage;
}
/** Interface for editing messages */
export interface UpdatePinMessageParams {
    /** Whether the pin should notify people or not. <br />
     *  By default it has the opposite behavior of official clients, it will not notify members.
     */
    notify?: boolean;
    /** Whether the message should be pinned for everyone or not. <br />
     *  By default it has the opposite behavior of official clients, and it will pin the message for both sides, in private chats.
     */
    pmOneSide?: boolean;
    /** When unpinning all messages: only unpin within this forum topic (its top message ID). */
    topMsgId?: number;
    /** When unpinning all messages in your Saved Messages: only unpin messages saved from this peer. */
    savedPeerId?: EntityLike;
}
/** Interface for mark message as read */
export interface MarkAsReadParams {
    /**
     * Until which message should the read acknowledge be sent for. <br />
     * This has priority over the `message` parameter.
     */
    maxId?: number;
    /**
     * Whether the mention badge should be cleared (so that there are no more mentions) or not for the given entity. <br />
     * If no message is provided, this will be the only action taken.
     */
    clearMentions?: boolean;
    /** When clearing mentions: only clear within this forum topic (its top message ID). */
    topMsgId?: number;
}
/** @hidden */
export declare function iterMessages(client: TelegramClient, entity: EntityLike | undefined, options: Partial<IterMessagesParams>): _IDsIter | _MessagesIter;
/** @hidden */
export declare function getMessages(client: TelegramClient, entity: EntityLike | undefined, params: Partial<IterMessagesParams>): Promise<TotalList<Api.Message>>;
/** @hidden */
export declare function sendMessage(client: TelegramClient, 
/** To who will it be sent. */
entity: EntityLike, 
/**  The message to be sent, or another message object to resend as a copy.<br/>
 * The maximum length for a message is 35,000 bytes or 4,096 characters.<br/>
 * Longer messages will not be sliced automatically, and you should slice them manually if the text to send is longer than said length. */
{ message, replyTo, attributes, parseMode, formattingEntities, linkPreview, file, thumb, forceDocument, clearDraft, buttons, silent, supportStreaming, schedule, noforwards, commentTo, topMsgId, sendAs, effect, invertMedia, background, updateStickersetsOrder, allowPaidFloodskip, allowPaidStars, scheduleRepeatPeriod, quickReplyShortcut, suggestedPost, richMessage, quoteText, quoteEntities, quoteOffset, replyToPeerId, }?: SendMessageParams): Promise<Api.Message>;
/** @hidden */
export declare function forwardMessages(client: TelegramClient, entity: EntityLike, { messages, fromPeer, silent, schedule, noforwards, dropAuthor, topMsgId, sendAs, effect, dropMediaCaptions, withMyScore, background, allowPaidFloodskip, allowPaidStars, videoTimestamp, scheduleRepeatPeriod, quickReplyShortcut, suggestedPost, replyTo, }: ForwardMessagesParams & {
    topMsgId?: number | Api.Message;
}): Promise<Api.Message[]>;
/** @hidden */
export declare function editMessage(client: TelegramClient, entity: EntityLike, { message, text, parseMode, formattingEntities, linkPreview, file, forceDocument, buttons, schedule, invertMedia, scheduleRepeatPeriod, quickReplyShortcutId, richMessage, }: EditMessageParams): Promise<Api.Message>;
/** @hidden */
export declare function deleteMessages(client: TelegramClient, entity: EntityLike | undefined, messageIds: MessageIDLike[], { revoke }: {
    revoke?: boolean | undefined;
}): Promise<Api.messages.AffectedMessages[]>;
/** @hidden */
export declare function pinMessage(client: TelegramClient, entity: EntityLike, message?: MessageIDLike, pinMessageParams?: UpdatePinMessageParams): Promise<Api.messages.AffectedHistory | Api.Message | undefined>;
/** @hidden */
export declare function unpinMessage(client: TelegramClient, entity: EntityLike, message?: MessageIDLike, unpinMessageParams?: UpdatePinMessageParams): Promise<Api.messages.AffectedHistory | Api.Message | undefined>;
/** @hidden */
export declare function _pin(client: TelegramClient, entity: EntityLike, message: MessageIDLike | undefined, unpin: boolean, notify?: boolean, pmOneSide?: boolean, params?: UpdatePinMessageParams): Promise<Api.messages.AffectedHistory | Api.Message | undefined>;
/** @hidden */
export declare function markAsRead(client: TelegramClient, entity: EntityLike, message?: MessageIDLike | MessageIDLike[], markAsReadParams?: MarkAsReadParams): Promise<boolean>;
/** @hidden */
export declare function getCommentData(client: TelegramClient, entity: EntityLike, message: number | Api.Message): Promise<{
    entity: Api.TypeInputPeer;
    replyTo: number;
}>;
/** @hidden */
export declare function sendReaction(client: TelegramClient, entity: EntityLike, messageId: number, reaction?: Api.TypeReaction[], big?: boolean, addToRecent?: boolean): Promise<Api.TypeUpdates>;
/** @hidden */
export declare function getReactionUsers(client: TelegramClient, entity: EntityLike, messageId: number, params?: {
    reaction?: string | Api.TypeReaction;
    limit?: number;
    offset?: string;
}): Promise<Api.messages.MessageReactionsList>;
export interface SendPollAnswer {
    text: string;
    media?: Api.TypeInputMedia;
}
/** Poll definition for {@link TelegramClient.sendPoll}. */
export interface SendPollParams {
    /** The poll question. Parsed with the client parse mode — only custom emoji entities are allowed here (Premium users only). */
    question: string;
    answers: (string | SendPollAnswer)[];
    /** Whether multiple options can be chosen as answer. */
    multipleChoice?: boolean;
    /** Send as a quiz (with wrong and correct answers) — requires `correctAnswers`. */
    quiz?: boolean;
    /** 0-based index(es) of the correct answer(s) in `answers`, for quizzes. */
    correctAnswers?: number | number[];
    /** Whether cast votes are publicly visible to all users (non-anonymous poll). */
    publicVoters?: boolean;
    /** Amount of time in seconds the poll will be active after creation, up to the `poll_close_period_max` server limit (currently 600). Mutually exclusive with `closeDate`. */
    closePeriod?: number;
    /** Point in time when the poll will be automatically closed. Mutually exclusive with `closePeriod`. */
    closeDate?: DateLike;
    /** Text shown when a user chooses an incorrect quiz answer or taps the lamp icon; 0-200 characters with at most 2 line feeds. Parsed with the client parse mode. */
    solution?: string;
    /** Formatting entities for `solution`. When provided, parsing is skipped. */
    solutionEntities?: Api.TypeMessageEntity[];
    /** Optional media attachment shown alongside the quiz solution explanation. */
    solutionMedia?: Api.TypeInputMedia;
    /** Optional media attachment displayed alongside the poll. */
    attachedMedia?: Api.TypeInputMedia;
    /** Whether users can add new answer options after the poll is created. */
    openAnswers?: boolean;
    /** Whether answer options are displayed in a randomized order to each user. */
    shuffleAnswers?: boolean;
    /** Whether vote results are hidden from all participants until the poll is closed. */
    hideResultsUntilClose?: boolean;
    /** If set, users cannot change their vote after casting it. */
    revotingDisabled?: boolean;
    /** Whether only subscribers can vote: a user may vote only while currently a member of the channel/supergroup. */
    subscribersOnly?: boolean;
    /** If set, only users from the specified ISO 3166-1 alpha-2 country codes may vote. */
    countriesIso2?: string[];
    /** Parse mode override for question/answers/solution. */
    parseMode?: any;
}
/** @hidden */
export declare function sendPoll(client: TelegramClient, entity: EntityLike, poll: SendPollParams, params?: Omit<SendFileInterface, "file" | "caption">): Promise<Api.Message>;
/** @hidden */
export declare function vote(client: TelegramClient, entity: EntityLike, message: MessageIDLike, options: number | number[] | Buffer | Buffer[]): Promise<Api.TypeUpdates>;
/** @hidden */
export declare function closePoll(client: TelegramClient, entity: EntityLike, message: MessageIDLike): Promise<Api.Poll>;
/** @hidden */
export declare function getScheduledMessages(client: TelegramClient, entity: EntityLike, ids?: number | number[]): Promise<Api.Message[]>;
/** @hidden */
export declare function sendScheduledMessages(client: TelegramClient, entity: EntityLike, ids: number | number[]): Promise<Api.Message[]>;
/** @hidden */
export declare function deleteScheduledMessages(client: TelegramClient, entity: EntityLike, ids: number | number[]): Promise<void>;
/** @hidden */
export declare function copyMessages(client: TelegramClient, entity: EntityLike, params: Omit<ForwardMessagesParams, "dropAuthor">): Promise<Api.Message[]>;
/** Interface for saving a draft with {@link TelegramClient.saveDraft}. */
export interface SaveDraftParams {
    /** The draft text. An empty string (the default) clears the draft. */
    message?: string;
    /** See the {@link TelegramClient.parseMode} property for allowed values. */
    parseMode?: any;
    /** A list of message formatting entities. When provided, the parseMode is ignored. */
    formattingEntities?: Api.TypeMessageEntity[];
    /** Should the link preview be shown? */
    linkPreview?: boolean;
    /** The message to reply to. Accepts a message ID, a Message, or a raw {@link Api.TypeInputReplyTo}. */
    replyTo?: number | Api.Message | Api.TypeInputReplyTo;
    /** Quoted part of the message being replied to. Requires `replyTo`. */
    quoteText?: string;
    /** Formatting entities of the quote. */
    quoteEntities?: Api.TypeMessageEntity[];
    /** Offset of the quote within the original message. */
    quoteOffset?: number;
    /** Chat where the quoted message was sent, for quoting messages from other chats. */
    replyToPeerId?: EntityLike;
    /** Used for threads to save the draft in a specific topic. */
    topMsgId?: number | Api.Message;
    /** If true, media will be shown below the text instead of above. */
    invertMedia?: boolean;
    /** Media attached to the draft. */
    media?: Api.TypeInputMedia;
    /** Message effect ID (animation/visual effect). */
    effect?: BigInteger;
    /** Suggested-post metadata for direct-messages channels. */
    suggestedPost?: Api.TypeSuggestedPost;
    /** Rich message content (Layer 228). Build it with the `Rich` helpers (`Rich.markdown`, `Rich.html`, `Rich.blocks`). */
    richMessage?: Api.TypeInputRichMessage;
}
/** @hidden */
export declare function saveDraft(client: TelegramClient, entity: EntityLike, params?: SaveDraftParams): Promise<boolean>;
/** @hidden */
export declare function clearDraft(client: TelegramClient, entity: EntityLike): Promise<boolean>;
/** @hidden */
export declare function clearAllDrafts(client: TelegramClient): Promise<boolean>;
interface ParsedMessageLink {
    username?: string;
    channelId?: string;
    msgId: number;
    thread?: number;
    comment?: number;
}
/** @hidden */
export declare function _parseMessageLink(link: string): ParsedMessageLink | undefined;
/** @hidden */
export declare function getMessageByLink(client: TelegramClient, link: string): Promise<Api.Message | undefined>;
/** Parameters for {@link TelegramClient.translateText}: either messages of a chat, or raw text. */
export interface TranslateTextParams {
    /** Target language: a two-letter ISO 639-1 code (e.g. `"en"`, `"ru"`). */
    toLang: string;
    /** AI translation tone (Premium). */
    tone?: string;
    /** The chat with the messages to translate. Requires `ids`. */
    entity?: EntityLike;
    /** ID(s) of the messages to translate. Requires `entity`. */
    ids?: number | number[];
    /** Raw text(s) to translate instead of messages. */
    text?: string | string[];
}
/** @hidden */
export declare function translateText(client: TelegramClient, params: TranslateTextParams): Promise<Api.messages.TypeTranslatedText>;
/** @hidden */
export declare function getMessagesViews(client: TelegramClient, entity: EntityLike, ids: number | number[], increment?: boolean): Promise<Api.messages.MessageViews>;
/** @hidden */
export declare function getOutboxReadDate(client: TelegramClient, entity: EntityLike, message: MessageIDLike): Promise<Api.TypeOutboxReadDate>;
/** @hidden */
export declare function getMessageReadParticipants(client: TelegramClient, entity: EntityLike, message: MessageIDLike): Promise<Api.TypeReadParticipantDate[]>;
/**
 * Fetches the full content of a rich message whose delivery was truncated
 * (`richMessage.part` set).
 * @hidden
 */
export declare function getRichMessage(client: TelegramClient, entity: EntityLike, message: MessageIDLike): Promise<Api.Message | undefined>;
/** @hidden */
export declare function getDiscussionMessage(client: TelegramClient, entity: EntityLike, message: MessageIDLike): Promise<Api.Message | undefined>;
export {};
