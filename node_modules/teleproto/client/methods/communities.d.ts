import type { TelegramClient } from "../TelegramClient";
import type { Entity, EntityLike } from "../../define";
import { Api } from "../../tl";
import { RequestIter } from "../../requestIter";
import { TotalList } from "../../Helpers";
import type { UpdateNotifySettingsParams } from "./account";
/** Options for creating a community around an initial chat or bot. */
export interface CreateCommunityParams {
    title: string;
    peer: EntityLike;
    about?: string;
    /** Hides the initial peer inside the community. */
    hidden?: boolean;
}
/** Makes a linked peer visible, hidden or removes its link. */
export type CommunityPeerLinkAction = "visible" | "hidden" | "deleted";
/** A linked peer with its resolved entity when supplied by Telegram. */
export type CommunityPeer = Api.CommunityPeer & {
    entity?: Entity;
};
/** A pending link request with its peer and requesting user. */
export type CommunityPeerLinkRequest = Api.CommunityPeerRequest & {
    entity?: Entity;
    requestedByUser?: Api.User;
};
/** Pagination options; limit zero fetches only the total count. */
export interface IterCommunityPeerLinkRequestsParams {
    /** Opaque cursor returned by communities.getPeerLinkRequests. */
    offset?: string;
    limit?: number;
    /** Minimum interval between page requests, in seconds. */
    waitTime?: number;
}
/** Full community details together with related users and chats. */
export type FullCommunity = Api.messages.ChatFull & {
    fullChat: Api.CommunityFull;
};
/** Creates a community and returns its entity. */
export declare function createCommunity(client: TelegramClient, params: CreateCommunityParams): Promise<Api.Community>;
/** Fetches full community details and linked peers. */
export declare function getCommunity(client: TelegramClient, community: EntityLike): Promise<FullCommunity>;
/** Lists joined communities, retaining forbidden entries. */
export declare function getJoinedCommunities(client: TelegramClient): Promise<TotalList<Api.Community | Api.CommunityForbidden>>;
/** Lists linked peers with visibility and history access metadata. */
export declare function getCommunityPeers(client: TelegramClient, community: EntityLike): Promise<CommunityPeer[]>;
/** Adds, changes visibility of, or removes a peer link. */
export declare function setCommunityPeerLink(client: TelegramClient, community: EntityLike, peer: EntityLike, action: CommunityPeerLinkAction): Promise<boolean>;
/** Groups or expands the community in the dialog list. */
export declare function setCommunityCollapsed(client: TelegramClient, community: EntityLike, collapsed: boolean): Promise<Api.TypeUpdates>;
/** Iterates pending peer links using Telegram’s opaque pagination cursor. */
export declare class CommunityPeerLinkRequestsIter extends RequestIter {
    private request?;
    private readonly offsets;
    _init({ community, offset }: {
        community: EntityLike;
        offset: string;
    }): Promise<true | undefined>;
    _loadNextChunk(): Promise<boolean | undefined>;
    [Symbol.asyncIterator](): AsyncIterator<CommunityPeerLinkRequest>;
}
/** Iterates pending links with requester and peer metadata. */
export declare function iterCommunityPeerLinkRequests(client: TelegramClient, community: EntityLike, params?: IterCommunityPeerLinkRequestsParams): CommunityPeerLinkRequestsIter;
/** Collects pending peer links and their total count. */
export declare function getCommunityPeerLinkRequests(client: TelegramClient, community: EntityLike, params?: IterCommunityPeerLinkRequestsParams): Promise<TotalList<CommunityPeerLinkRequest>>;
/** Approves a peer link request, or rejects it when approved is false. */
export declare function setCommunityPeerLinkRequestApproval(client: TelegramClient, community: EntityLike, peer: EntityLike, approved: boolean): Promise<boolean>;
/** Approves or rejects all pending peer link requests. */
export declare function setAllCommunityPeerLinkRequestsApproval(client: TelegramClient, community: EntityLike, approved: boolean): Promise<boolean>;
/** Bans a participant across the community, or unbans when banned is false. */
export declare function setCommunityParticipantBanned(client: TelegramClient, community: EntityLike, participant: EntityLike, banned: boolean): Promise<boolean>;
/** Returns the community chats a participant owns or has joined. */
export declare function getCommunityParticipantJoinedChats(client: TelegramClient, community: EntityLike, participant: EntityLike): Promise<Api.communities.ParticipantJoinedChats>;
/** Pins or unpins the community's grouped dialog. */
export declare function pinCommunity(client: TelegramClient, community: EntityLike, pinned?: boolean): Promise<boolean>;
/** Fetches notification settings using the community notification scope. */
export declare function getCommunityNotifySettings(client: TelegramClient, community: EntityLike): Promise<Api.PeerNotifySettings>;
/** Updates notification settings for the community notification scope. */
export declare function updateCommunityNotifySettings(client: TelegramClient, community: EntityLike, params: UpdateNotifySettingsParams): Promise<boolean>;
