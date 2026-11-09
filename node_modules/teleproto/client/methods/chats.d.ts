import type { TelegramClient } from "../TelegramClient";
import type { EntitiesLike, EntityLike, FileLike, ValueOf } from "../../define";
import { TotalList } from "../../Helpers";
import { RequestIter } from "../../requestIter";
import { Api } from "../../tl";
import { BigInteger } from "big-integer";
export type UserWithParticipant = Api.User & {
    participant?: Api.TypeChannelParticipant | Api.TypeChatParticipant;
};
interface ChatActionInterface {
    delay: number;
    autoCancel: boolean;
}
/**
 * Sends a chat action (e.g. "typing…") that repeats at a fixed interval until stopped.
 *
 * Supported action strings: `"typing"`, `"contact"`, `"game"`, `"location"`,
 * `"record-audio"` / `"record-voice"`, `"record-round"`, `"record-video"`,
 * `"audio"` / `"voice"` / `"song"`, `"round"`, `"video"`, `"photo"`,
 * `"document"` / `"file"`, `"cancel"`.
 * @internal
 */
declare class _ChatAction {
    static _str_mapping: {
        typing: Api.SendMessageTypingAction;
        contact: Api.SendMessageChooseContactAction;
        game: Api.SendMessageGamePlayAction;
        location: Api.SendMessageGeoLocationAction;
        "record-audio": Api.SendMessageRecordAudioAction;
        "record-voice": Api.SendMessageRecordAudioAction;
        "record-round": Api.SendMessageRecordRoundAction;
        "record-video": Api.SendMessageRecordVideoAction;
        audio: Api.SendMessageUploadAudioAction;
        voice: Api.SendMessageUploadAudioAction;
        song: Api.SendMessageUploadAudioAction;
        round: Api.SendMessageUploadRoundAction;
        video: Api.SendMessageUploadVideoAction;
        photo: Api.SendMessageUploadPhotoAction;
        document: Api.SendMessageUploadDocumentAction;
        file: Api.SendMessageUploadDocumentAction;
        cancel: Api.SendMessageCancelAction;
    };
    private _client;
    private readonly _chat;
    private readonly _action;
    private readonly _delay;
    private readonly autoCancel;
    private _request?;
    private _task;
    private _running;
    constructor(client: TelegramClient, chat: EntityLike, action: ValueOf<typeof _ChatAction._str_mapping>, params?: ChatActionInterface);
    start(): Promise<void>;
    stop(): Promise<void>;
    _update(): Promise<void>;
    progress(current: number, total: number): void;
}
interface ParticipantsIterInterface {
    entity: EntityLike;
    filter: any;
    offset?: number;
    search?: string;
    showTotal?: boolean;
}
export declare class _ParticipantsIter extends RequestIter {
    private filterEntity;
    private request?;
    _init({ entity, filter, offset, search, showTotal, }: ParticipantsIterInterface): Promise<boolean | void>;
    _loadNextChunk(): Promise<boolean | undefined>;
    [Symbol.asyncIterator](): AsyncIterator<UserWithParticipant, any, undefined>;
}
/** Event filter for {@link TelegramClient.iterAdminLog}/{@link TelegramClient.getAdminLog}. Set only the event types you want. */
export interface AdminLogFilterParams {
    /** Join events, including joins via invite links. */
    join?: boolean;
    /** Leave events. */
    leave?: boolean;
    /** Invite events. */
    invite?: boolean;
    /** Ban events. */
    ban?: boolean;
    /** Unban events. */
    unban?: boolean;
    /** Kick events. */
    kick?: boolean;
    /** Unkick events. */
    unkick?: boolean;
    /** Admin promotion events. */
    promote?: boolean;
    /** Admin demotion events. */
    demote?: boolean;
    /** Info changes (title, about, photo…). */
    info?: boolean;
    /** Settings changes. */
    settings?: boolean;
    /** Message pin events. */
    pinned?: boolean;
    /** Message edit events. */
    edit?: boolean;
    /** Message delete events. */
    delete?: boolean;
    /** Group call events. */
    groupCall?: boolean;
    /** Invite link create/edit/revoke/delete events. */
    invites?: boolean;
    /** Message send events. */
    send?: boolean;
    /** Forum topic events. */
    forums?: boolean;
    /** Channel subscription extension events. */
    subExtend?: boolean;
    /** Admin custom-rank change events. */
    editRank?: boolean;
}
/** Parameters for {@link TelegramClient.iterAdminLog}/{@link TelegramClient.getAdminLog}. */
export interface AdminLogParams extends AdminLogFilterParams {
    /** How many events to retrieve. Defaults to all. */
    limit?: number;
    /** Search query to filter events. */
    search?: string;
    /** Only show events from these admins. */
    admins?: EntitiesLike;
    /** Minimum event ID. */
    minId?: BigInteger;
    /** Maximum event ID. */
    maxId?: BigInteger;
}
export declare class _AdminLogIter extends RequestIter {
    private entity?;
    private request?;
    _init(params: {
        entity: EntityLike;
    } & AdminLogParams): Promise<void>;
    _loadNextChunk(): Promise<true | undefined>;
    [Symbol.asyncIterator](): AsyncIterator<Api.ChannelAdminLogEvent, any, undefined>;
}
/**
 * Used in iterParticipant and getParticipant. all params are optional.
 */
export interface IterParticipantsParams {
    /** how many members to retrieve. defaults to Number.MAX_SAFE_INTEGER (everyone) */
    limit?: number;
    /** how many members to skip. defaults to 0 */
    offset?: number;
    /** a query string to filter participants based on their display names and usernames. defaults to "" (everyone) */
    search?: string;
    /** optional filter to be used. E.g only admins filter or only banned members filter. PS : some filters need more permissions. */
    filter?: Api.TypeChannelParticipantsFilter;
    /** whether to call an extra request (GetFullChannel) to show the total of users in the group/channel. if set to false total will be 0 */
    showTotal?: boolean;
}
/** @hidden */
export declare function iterParticipants(client: TelegramClient, entity: EntityLike, { limit, offset, search, filter, showTotal }: IterParticipantsParams): _ParticipantsIter;
/** @hidden */
export declare function getParticipants(client: TelegramClient, entity: EntityLike, params: IterParticipantsParams): Promise<TotalList<UserWithParticipant>>;
/** @hidden */
export declare function kickParticipant(client: TelegramClient, entity: EntityLike, participant: EntityLike): Promise<Api.TypeMessage | Map<number, Api.Message> | (Api.Message | undefined)[] | undefined>;
/** Restrictions to apply with {@link TelegramClient.editBanned}. Every unset right stays allowed. */
export interface EditBannedParams {
    /** Until when the restrictions apply. Defaults to forever. */
    untilDate?: number | Date;
    /** Disallow viewing messages (a full ban — kicks the participant). */
    viewMessages?: boolean;
    /** Disallow sending messages of any kind. */
    sendMessages?: boolean;
    /** Disallow sending any media. */
    sendMedia?: boolean;
    /** Disallow sending stickers. */
    sendStickers?: boolean;
    /** Disallow sending GIFs. */
    sendGifs?: boolean;
    /** Disallow sending games. */
    sendGames?: boolean;
    /** Disallow using inline bots. */
    sendInline?: boolean;
    /** Disallow embedding link previews. */
    embedLinks?: boolean;
    /** Disallow sending polls. */
    sendPolls?: boolean;
    /** Disallow sending photos. */
    sendPhotos?: boolean;
    /** Disallow sending videos. */
    sendVideos?: boolean;
    /** Disallow sending round videos. */
    sendRoundvideos?: boolean;
    /** Disallow sending audio files. */
    sendAudios?: boolean;
    /** Disallow sending voice messages. */
    sendVoices?: boolean;
    /** Disallow sending documents. */
    sendDocs?: boolean;
    /** Disallow sending plain text messages. */
    sendPlain?: boolean;
    /** Disallow sending reactions. */
    sendReactions?: boolean;
    /** Disallow changing the chat info. */
    changeInfo?: boolean;
    /** Disallow inviting users. */
    inviteUsers?: boolean;
    /** Disallow pinning messages. */
    pinMessages?: boolean;
    /** Disallow managing forum topics. */
    manageTopics?: boolean;
    /** Disallow changing own rank. */
    editRank?: boolean;
    /** Disallow managing linked peers. */
    manageLinkedPeers?: boolean;
}
/** @hidden */
export declare function editBanned(client: TelegramClient, entity: EntityLike, participant: EntityLike, params?: EditBannedParams | Api.ChatBannedRights): Promise<Api.TypeUpdates>;
/** Admin rights to grant with {@link TelegramClient.editAdmin}. Every unset right stays revoked. */
export interface EditAdminParams {
    /** Allow changing the chat info. */
    changeInfo?: boolean;
    /** Allow posting messages (channels only). */
    postMessages?: boolean;
    /** Allow editing messages (channels only). */
    editMessages?: boolean;
    /** Allow deleting messages of other users. */
    deleteMessages?: boolean;
    /** Allow banning users. */
    banUsers?: boolean;
    /** Allow inviting users. */
    inviteUsers?: boolean;
    /** Allow pinning messages. */
    pinMessages?: boolean;
    /** Allow adding other admins. */
    addAdmins?: boolean;
    /** Send messages anonymously, as the group itself (supergroups only). */
    anonymous?: boolean;
    /** Allow managing group calls. */
    manageCall?: boolean;
    /** Set for admins with no other rights, to display them in the admin list. */
    other?: boolean;
    /** Allow managing forum topics. */
    manageTopics?: boolean;
    /** Allow posting stories. */
    postStories?: boolean;
    /** Allow editing stories. */
    editStories?: boolean;
    /** Allow deleting stories. */
    deleteStories?: boolean;
    /** Allow managing direct-messages channels. */
    manageDirectMessages?: boolean;
    /** Allow changing admin ranks. */
    manageRanks?: boolean;
    /** Allow managing linked peers. */
    manageLinkedPeers?: boolean;
    /** Custom admin rank (badge shown instead of "admin"). */
    rank?: string;
}
/** @hidden */
export declare function editAdmin(client: TelegramClient, entity: EntityLike, participant: EntityLike, params: EditAdminParams | Api.ChatAdminRights): Promise<boolean | Api.TypeUpdates>;
/** @hidden */
export declare function editChatDefaultBannedRights(client: TelegramClient, entity: EntityLike, params: EditBannedParams | Api.ChatBannedRights): Promise<Api.TypeUpdates>;
/** @hidden */
export declare function getParticipant(client: TelegramClient, entity: EntityLike, participant: EntityLike): Promise<Api.channels.ChannelParticipant>;
/** @hidden */
export declare function editTitle(client: TelegramClient, entity: EntityLike, title: string): Promise<Api.TypeUpdates>;
/** @hidden */
export declare function editPhoto(client: TelegramClient, entity: EntityLike, photo?: FileLike | Api.TypeInputChatPhoto): Promise<Api.TypeUpdates>;
/** @hidden */
export declare function editChatAbout(client: TelegramClient, entity: EntityLike, about: string): Promise<boolean>;
/** @hidden */
export declare function toggleSlowMode(client: TelegramClient, entity: EntityLike, seconds?: number): Promise<Api.TypeUpdates>;
/** Parameters for {@link TelegramClient.createChannel}. */
export interface CreateChannelParams {
    /** The channel title. */
    title: string;
    /** The channel description. */
    about?: string;
    /** Create a supergroup instead of a broadcast channel. */
    megagroup?: boolean;
    /** Create a forum (requires `megagroup`). */
    forum?: boolean;
    /** Whether the group will be used to import messages from a foreign chat service. */
    forImport?: boolean;
    /** Geolocation of the supergroup (for geo chats). Requires `address`. */
    geoPoint?: Api.TypeInputGeoPoint;
    /** Physical address of the geo chat. */
    address?: string;
    /** Time-to-live of all messages that will be sent in the channel, in seconds. */
    ttlPeriod?: number;
}
/** @hidden */
export declare function createChannel(client: TelegramClient, params: CreateChannelParams): Promise<Api.Channel>;
/** Parameters for {@link TelegramClient.createChat} (small group chats). */
export interface CreateChatParams {
    /** The chat title. */
    title: string;
    /** The users to invite into the chat. */
    users: EntitiesLike;
    /** Time-to-live of all messages that will be sent in the chat, in seconds. */
    ttlPeriod?: number;
}
/** @hidden */
export declare function createChat(client: TelegramClient, params: CreateChatParams): Promise<{
    chat: Api.Chat;
    missingInvitees: Api.TypeMissingInvitee[];
}>;
/** @hidden */
export declare function joinChannel(client: TelegramClient, entity: EntityLike): Promise<Api.messages.TypeChatInviteJoinResult>;
/** @hidden */
export declare function importChatInvite(client: TelegramClient, link: string): Promise<Api.messages.TypeChatInviteJoinResult>;
/** @hidden */
export declare function leaveChannel(client: TelegramClient, entity: EntityLike): Promise<Api.TypeUpdates>;
/** Parameters for {@link TelegramClient.deleteHistory}. */
export interface DeleteHistoryParams {
    /** Delete only messages with IDs up to and including this one. Defaults to all. */
    maxId?: number;
    /** Delete the history for the other side as well (private chats and small groups: `revoke`; channels and supergroups: `forEveryone`). */
    revoke?: boolean;
    /** Only clear the history for the current user, without leaving the chat (private chats and small groups only). */
    justClear?: boolean;
    /** Only delete messages sent after this date (private chats and small groups only). */
    minDate?: number;
    /** Only delete messages sent before this date (private chats and small groups only). */
    maxDate?: number;
}
/** @hidden */
export declare function deleteHistory(client: TelegramClient, entity: EntityLike, params?: DeleteHistoryParams): Promise<Api.TypeUpdates | Api.messages.AffectedHistory>;
/** @hidden */
export declare function editPeerFolders(client: TelegramClient, entity: EntityLike | EntityLike[], folderId: number): Promise<Api.TypeUpdates>;
/** Chat action names accepted by {@link TelegramClient.setTyping}. */
export type ChatActionType = keyof typeof _ChatAction._str_mapping;
/** @hidden */
export declare function setTyping(client: TelegramClient, entity: EntityLike, action?: ChatActionType | Api.TypeSendMessageAction, params?: {
    topMsgId?: number;
}): Promise<boolean>;
/** @hidden */
export declare function iterAdminLog(client: TelegramClient, entity: EntityLike, params?: AdminLogParams): _AdminLogIter;
/** @hidden */
export declare function getAdminLog(client: TelegramClient, entity: EntityLike, params?: AdminLogParams): Promise<TotalList<Api.ChannelAdminLogEvent>>;
export {};
