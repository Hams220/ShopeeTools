import type { TelegramClient } from "../TelegramClient";
import type { EntityLike, FileLike } from "../../define";
import type { BigInteger } from "big-integer";
import { Api } from "../../tl";
/** Parameters for {@link sendStory}. */
export interface SendStoryParams {
    /** The story photo/video (path, Buffer, uploaded file, or raw {@link Api.TypeInputMedia}). */
    media: FileLike;
    /** Story caption. Parsed with the client parse mode. */
    caption?: string;
    /** Formatting entities for the caption. When provided, parsing is skipped. */
    entities?: Api.TypeMessageEntity[];
    /** Parse mode override for the caption. */
    parseMode?: any;
    /** Privacy rules for the story. Defaults to everyone. */
    privacyRules?: Api.TypeInputPrivacyRule[];
    /** Pin the story to the profile after it expires. */
    pinned?: boolean;
    /** Disallow forwarding/screenshotting the story. */
    noforwards?: boolean;
    /** Story lifetime in seconds (86400, 2×86400, 3×86400 or 7×86400; Premium only except 86400). */
    period?: number;
    /** Clickable areas over the story (locations, reactions, links…). */
    mediaAreas?: Api.TypeMediaArea[];
    /** When reposting: the peer the original story belongs to. */
    fwdFromId?: EntityLike;
    /** When reposting: the ID of the original story. */
    fwdFromStory?: number;
    /** Set when the reposted story was modified before sending. */
    fwdModified?: boolean;
    /** IDs of story albums to add the story to. */
    albums?: number[];
    /** Music track attached to the story. */
    music?: Api.TypeInputDocument;
}
/** @hidden */
export declare function sendStory(client: TelegramClient, entity: EntityLike, params: SendStoryParams): Promise<Api.TypeUpdates>;
/** Parameters for {@link editStory}. Only the fields you set are changed. */
export interface EditStoryParams {
    /** New story media. */
    media?: FileLike;
    /** New caption. Parsed with the client parse mode. */
    caption?: string;
    /** Formatting entities for the caption. When provided, parsing is skipped. */
    entities?: Api.TypeMessageEntity[];
    /** Parse mode override for the caption. */
    parseMode?: any;
    /** New privacy rules. */
    privacyRules?: Api.TypeInputPrivacyRule[];
    /** New clickable areas. */
    mediaAreas?: Api.TypeMediaArea[];
    /** New music track. */
    music?: Api.TypeInputDocument;
}
/** @hidden */
export declare function editStory(client: TelegramClient, entity: EntityLike, storyId: number, params: EditStoryParams): Promise<Api.TypeUpdates>;
/** @hidden */
export declare function deleteStories(client: TelegramClient, entity: EntityLike, ids: number | number[]): Promise<number[]>;
/** @hidden */
export declare function toggleStoriesPinned(client: TelegramClient, entity: EntityLike, ids: number | number[], pinned?: boolean): Promise<number[]>;
/** @hidden */
export declare function canSendStory(client: TelegramClient, entity: EntityLike): Promise<Api.stories.CanSendStoryCount>;
/** Parameters for {@link getAllStories}. */
export interface GetAllStoriesParams {
    /** Fetch the next chunk, using the `state` from the previous response. */
    next?: boolean;
    /** Fetch stories from peers whose stories are hidden from the main list. */
    hidden?: boolean;
    /** State token from the previous {@link Api.stories.AllStories} response. */
    state?: string;
}
/** @hidden */
export declare function getAllStories(client: TelegramClient, params?: GetAllStoriesParams): Promise<Api.stories.TypeAllStories>;
/** @hidden */
export declare function getPeerStories(client: TelegramClient, entity: EntityLike): Promise<Api.stories.PeerStories>;
/** @hidden */
export declare function getStoriesByID(client: TelegramClient, entity: EntityLike, ids: number | number[]): Promise<Api.stories.Stories>;
/** Pagination parameters for {@link getPinnedStories}/{@link getStoriesArchive}. */
export interface GetStoriesPageParams {
    /** Only return stories with IDs lower than this one. */
    offsetId?: number;
    /** Maximum number of stories to return. */
    limit?: number;
}
/** @hidden */
export declare function getPinnedStories(client: TelegramClient, entity: EntityLike, params?: GetStoriesPageParams): Promise<Api.stories.Stories>;
/** @hidden */
export declare function getStoriesArchive(client: TelegramClient, entity: EntityLike, params?: GetStoriesPageParams): Promise<Api.stories.Stories>;
/** @hidden */
export declare function readStories(client: TelegramClient, entity: EntityLike, maxId?: number): Promise<number[]>;
/** @hidden */
export declare function incrementStoryViews(client: TelegramClient, entity: EntityLike, ids: number | number[]): Promise<boolean>;
/** Parameters for {@link getStoryViewsList}. */
export interface GetStoryViewsListParams {
    /** Only fetch views from your contacts. */
    justContacts?: boolean;
    /** Sort viewers that reacted first. */
    reactionsFirst?: boolean;
    /** Sort viewers that forwarded/reposted first. */
    forwardsFirst?: boolean;
    /** Search viewers by name. */
    search?: string;
    /** Pagination offset from the previous response's `nextOffset`. */
    offset?: string;
    /** Maximum number of viewers to return. */
    limit?: number;
}
/** @hidden */
export declare function getStoryViewsList(client: TelegramClient, entity: EntityLike, storyId: number, params?: GetStoryViewsListParams): Promise<Api.stories.StoryViewsList>;
/** @hidden */
export declare function exportStoryLink(client: TelegramClient, entity: EntityLike, storyId: number): Promise<Api.ExportedStoryLink>;
/** @hidden */
export declare function sendStoryReaction(client: TelegramClient, entity: EntityLike, storyId: number, reaction?: string | BigInteger | Api.TypeReaction, params?: {
    addToRecent?: boolean;
}): Promise<Api.TypeUpdates>;
