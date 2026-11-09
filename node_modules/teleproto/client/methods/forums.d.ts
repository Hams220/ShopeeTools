import type { TelegramClient } from "../TelegramClient";
import type { EntityLike } from "../../define";
import type { BigInteger } from "big-integer";
import { Api } from "../../tl";
/** Parameters for {@link createForumTopic}. */
export interface CreateForumTopicParams {
    /** The topic title. */
    title: string;
    /** RGB color of the fallback topic icon. */
    iconColor?: number;
    /** ID of a custom emoji to use as the topic icon. */
    iconEmojiId?: BigInteger;
    /** Create the topic without a name (direct-messages channels). */
    titleMissing?: boolean;
    /** Send the topic-creation message as a specific peer. */
    sendAs?: EntityLike;
}
/** @hidden */
export declare function createForumTopic(client: TelegramClient, entity: EntityLike, params: CreateForumTopicParams): Promise<Api.TypeUpdates>;
/** Parameters for {@link editForumTopic}. Only the fields you set are changed. */
export interface EditForumTopicParams {
    /** New topic title. */
    title?: string;
    /** ID of a custom emoji to use as the new topic icon. Pass `0` as BigInteger to remove it. */
    iconEmojiId?: BigInteger;
    /** Close or reopen the topic. */
    closed?: boolean;
    /** Hide or unhide the topic (only for the "General" topic). */
    hidden?: boolean;
}
/** @hidden */
export declare function editForumTopic(client: TelegramClient, entity: EntityLike, topicId: number, params: EditForumTopicParams): Promise<Api.TypeUpdates>;
/** @hidden */
export declare function updatePinnedForumTopic(client: TelegramClient, entity: EntityLike, topicId: number, pinned: boolean): Promise<Api.TypeUpdates>;
/** @hidden */
export declare function reorderPinnedForumTopics(client: TelegramClient, entity: EntityLike, order: number[], params?: {
    force?: boolean;
}): Promise<Api.TypeUpdates>;
/** Parameters for {@link getForumTopics}. */
export interface GetForumTopicsParams {
    /** Search query for topic titles. */
    search?: string;
    /** Offset date for pagination. */
    offsetDate?: number;
    /** Offset message ID for pagination. */
    offsetId?: number;
    /** Offset topic ID for pagination. */
    offsetTopic?: number;
    /** Maximum number of topics to return. */
    limit?: number;
}
/** @hidden */
export declare function getForumTopics(client: TelegramClient, entity: EntityLike, params?: GetForumTopicsParams): Promise<Api.messages.ForumTopics>;
/** @hidden */
export declare function getForumTopicsByID(client: TelegramClient, entity: EntityLike, topicIds: number | number[]): Promise<Api.messages.ForumTopics>;
/** @hidden */
export declare function toggleForum(client: TelegramClient, entity: EntityLike, enabled: boolean, tabs?: boolean): Promise<Api.TypeUpdates>;
/** @hidden */
export declare function toggleViewForumAsMessages(client: TelegramClient, entity: EntityLike, enabled: boolean): Promise<Api.TypeUpdates>;
