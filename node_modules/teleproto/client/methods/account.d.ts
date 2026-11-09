import type { TelegramClient } from "../TelegramClient";
import type { EntityLike, FileLike } from "../../define";
import type { BigInteger } from "big-integer";
import { TotalList } from "../../Helpers";
import { Api } from "../../tl";
/** Parameters for {@link updateProfile}. Only the fields you set are changed. */
export interface UpdateProfileParams {
    /** New first name. */
    firstName?: string;
    /** New last name. Pass an empty string to remove it. */
    lastName?: string;
    /** New bio ("about"). Pass an empty string to remove it. */
    about?: string;
}
/** @hidden */
export declare function updateProfile(client: TelegramClient, params: UpdateProfileParams): Promise<Api.TypeUser>;
/** @hidden */
export declare function updateUsername(client: TelegramClient, username: string): Promise<Api.TypeUser>;
/** @hidden */
export declare function updateStatus(client: TelegramClient, online?: boolean): Promise<boolean>;
/** Parameters for {@link uploadProfilePhoto}. */
export interface UploadProfilePhotoParams {
    /** The photo to upload (path, Buffer, File, or an uploaded {@link Api.TypeInputFile}). */
    file?: FileLike;
    /** An animated profile video to upload instead of a photo. */
    video?: FileLike;
    /** Timestamp (in seconds) of the video frame to use as the static preview. */
    videoStartTs?: number;
    /** Sticker/custom-emoji markup to generate an animated photo instead of uploading one. */
    videoEmojiMarkup?: Api.TypeVideoSize;
    /** Set as the fallback photo, shown to users prevented from seeing the main one by privacy settings. */
    fallback?: boolean;
    /** Bot owners: change the photo of an owned bot instead. */
    bot?: EntityLike;
}
/** @hidden */
export declare function uploadProfilePhoto(client: TelegramClient, params: UploadProfilePhotoParams): Promise<Api.photos.Photo>;
/** @hidden */
export declare function updateProfilePhoto(client: TelegramClient, photo: Api.TypeInputPhoto | Api.TypePhoto, params?: {
    fallback?: boolean;
    bot?: EntityLike;
}): Promise<Api.photos.Photo>;
/** @hidden */
export declare function deleteProfilePhotos(client: TelegramClient, photos: (Api.TypeInputPhoto | Api.TypePhoto)[]): Promise<BigInteger[]>;
/** Parameters for {@link getUserPhotos}. */
export interface GetUserPhotosParams {
    /** Number of photos to skip. */
    offset?: number;
    /** Only return photos with IDs lower than this one. */
    maxId?: BigInteger;
    /** Maximum number of photos to return (server caps at 100 per request). */
    limit?: number;
}
/** @hidden */
export declare function getUserPhotos(client: TelegramClient, entity: EntityLike, params?: GetUserPhotosParams): Promise<TotalList<Api.TypePhoto>>;
/** @hidden */
export declare function getAuthorizations(client: TelegramClient): Promise<Api.account.Authorizations>;
/**
 * Terminates a session from {@link getAuthorizations}. Pass no hash (or zero)
 * to terminate ALL other sessions.
 * @hidden
 */
export declare function resetAuthorization(client: TelegramClient, hash?: BigInteger): Promise<boolean>;
/** @hidden */
export declare function getPrivacy(client: TelegramClient, key: Api.TypeInputPrivacyKey): Promise<Api.account.PrivacyRules>;
/** @hidden */
export declare function setPrivacy(client: TelegramClient, key: Api.TypeInputPrivacyKey, rules: Api.TypeInputPrivacyRule[]): Promise<Api.account.PrivacyRules>;
/** @hidden */
export declare function getNotifySettings(client: TelegramClient, entity: EntityLike | Api.TypeInputNotifyPeer): Promise<Api.TypePeerNotifySettings>;
/** New notification settings for {@link updateNotifySettings}. Only the fields you set are changed. */
export interface UpdateNotifySettingsParams {
    /** Whether to show message previews in notifications. */
    showPreviews?: boolean;
    /** Whether to deliver notifications without sound. */
    silent?: boolean;
    /** Mute the peer until this Unix time. Use a far-future value (e.g. `2147483647`) to mute forever, `0` to unmute. */
    muteUntil?: number;
    /** Notification sound. */
    sound?: Api.TypeNotificationSound;
    /** Mute stories from this peer. */
    storiesMuted?: boolean;
    /** Hide the sender name on story notifications. */
    storiesHideSender?: boolean;
    /** Notification sound for stories. */
    storiesSound?: Api.TypeNotificationSound;
}
/** @hidden */
export declare function updateNotifySettings(client: TelegramClient, entity: EntityLike | Api.TypeInputNotifyPeer, params: UpdateNotifySettingsParams): Promise<boolean>;
/** @hidden */
export declare function getAccountTTL(client: TelegramClient): Promise<number>;
/** @hidden */
export declare function setAccountTTL(client: TelegramClient, days: number): Promise<boolean>;
/** @hidden */
export declare function getGlobalPrivacySettings(client: TelegramClient): Promise<Api.TypeGlobalPrivacySettings>;
/** @hidden */
export declare function setGlobalPrivacySettings(client: TelegramClient, settings: Api.TypeGlobalPrivacySettings): Promise<Api.TypeGlobalPrivacySettings>;
