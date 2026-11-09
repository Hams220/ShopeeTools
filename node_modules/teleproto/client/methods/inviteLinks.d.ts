import type { TelegramClient } from "../TelegramClient";
import type { EntityLike } from "../../define";
import { TotalList } from "../../Helpers";
import { RequestIter } from "../../requestIter";
import { Api } from "../../tl";
/**
 * Extracts the hash from an invite link (`t.me/+hash`, `t.me/joinchat/hash`)
 * or returns the input unchanged if it is already a bare hash.
 * @hidden
 */
export declare function _parseInviteHash(link: string): string;
/** Parameters for {@link exportChatInvite}. */
export interface ExportChatInviteParams {
    /** Human-readable title of the link (visible to admins only). */
    title?: string;
    /** Point in time when the link will expire. */
    expireDate?: number | Date;
    /** Maximum number of users that can join through this link. */
    usageLimit?: number;
    /** Whether joining via this link requires admin approval. */
    requestNeeded?: boolean;
    /** Legacy behavior: revoke the previous permanent link and create a new one. */
    legacyRevokePermanent?: boolean;
    /** Telegram Star subscription pricing for the link (paid channel subscriptions). */
    subscriptionPricing?: Api.TypeStarsSubscriptionPricing;
}
/** @hidden */
export declare function exportChatInvite(client: TelegramClient, entity: EntityLike, params?: ExportChatInviteParams): Promise<Api.TypeExportedChatInvite>;
/** Parameters for {@link editExportedChatInvite}. */
export interface EditExportedChatInviteParams {
    /** Revoke the link, preventing further joins. */
    revoked?: boolean;
    /** New expiration date. */
    expireDate?: number | Date;
    /** New usage limit. */
    usageLimit?: number;
    /** Whether joining via this link should require admin approval. */
    requestNeeded?: boolean;
    /** New link title. */
    title?: string;
}
/** @hidden */
export declare function editExportedChatInvite(client: TelegramClient, entity: EntityLike, link: string, params: EditExportedChatInviteParams): Promise<Api.messages.TypeExportedChatInvite>;
/** @hidden */
export declare function getExportedChatInvite(client: TelegramClient, entity: EntityLike, link: string): Promise<Api.messages.TypeExportedChatInvite>;
/** @hidden */
export declare function deleteExportedChatInvite(client: TelegramClient, entity: EntityLike, link: string): Promise<boolean>;
/** @hidden */
export declare function deleteRevokedExportedChatInvites(client: TelegramClient, entity: EntityLike, admin?: EntityLike): Promise<boolean>;
/** @hidden */
export declare function getAdminsWithInvites(client: TelegramClient, entity: EntityLike): Promise<Api.messages.ChatAdminsWithInvites>;
/** Parameters for {@link iterExportedChatInvites}/{@link getExportedChatInvites}. */
export interface ExportedChatInvitesParams {
    /** How many links to retrieve. Defaults to all. */
    limit?: number;
    /** Only fetch revoked links. */
    revoked?: boolean;
    /** Only fetch links created by this admin. Defaults to yourself. */
    admin?: EntityLike;
}
export declare class _ExportedChatInvitesIter extends RequestIter {
    private request?;
    _init(params: {
        entity: EntityLike;
    } & ExportedChatInvitesParams): Promise<void>;
    _loadNextChunk(): Promise<true | undefined>;
    [Symbol.asyncIterator](): AsyncIterator<Api.TypeExportedChatInvite, any, undefined>;
}
/** @hidden */
export declare function iterExportedChatInvites(client: TelegramClient, entity: EntityLike, params?: ExportedChatInvitesParams): _ExportedChatInvitesIter;
/** @hidden */
export declare function getExportedChatInvites(client: TelegramClient, entity: EntityLike, params?: ExportedChatInvitesParams): Promise<TotalList<Api.TypeExportedChatInvite>>;
/**
 * Parameters for {@link TelegramClient.iterChatInviteImporters}/{@link TelegramClient.getChatInviteImporters}.
 *
 * The server requires either `link` or `requested: true`; asking for a whole
 * chat without narrowing it down fails with `INVITE_HASH_EXPIRED`.
 */
export interface ChatInviteImportersParams {
    /** How many importers to retrieve. Defaults to all. */
    limit?: number;
    /** Only fetch users that joined via this specific link. Required unless `requested` is set. */
    link?: string;
    /** Fetch pending join requests instead of joined users. Required unless `link` is set. */
    requested?: boolean;
    /** Only fetch users whose channel subscription has expired. */
    subscriptionExpired?: boolean;
    /** Search for a user by name. */
    search?: string;
}
export declare class _ChatInviteImportersIter extends RequestIter {
    private request?;
    _init(params: {
        entity: EntityLike;
    } & ChatInviteImportersParams): Promise<void>;
    _loadNextChunk(): Promise<true | undefined>;
    [Symbol.asyncIterator](): AsyncIterator<Api.ChatInviteImporter, any, undefined>;
}
/** @hidden */
export declare function iterChatInviteImporters(client: TelegramClient, entity: EntityLike, params?: ChatInviteImportersParams): _ChatInviteImportersIter;
/** @hidden */
export declare function getChatInviteImporters(client: TelegramClient, entity: EntityLike, params?: ChatInviteImportersParams): Promise<TotalList<Api.ChatInviteImporter>>;
/** @hidden */
export declare function hideChatJoinRequest(client: TelegramClient, entity: EntityLike, user: EntityLike, params?: {
    approved?: boolean;
}): Promise<Api.TypeUpdates>;
/** @hidden */
export declare function hideAllChatJoinRequests(client: TelegramClient, entity: EntityLike, params?: {
    approved?: boolean;
    link?: string;
}): Promise<Api.TypeUpdates>;
/** @hidden */
export declare function checkChatInvite(client: TelegramClient, link: string): Promise<Api.TypeChatInvite>;
