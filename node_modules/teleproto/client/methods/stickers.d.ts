import type { TelegramClient } from "../TelegramClient";
import type { BigInteger } from "big-integer";
import { Api } from "../../tl";
/** A sticker set reference: its short name (from the t.me/addstickers link) or a raw {@link Api.TypeInputStickerSet}. */
export type InputStickerSetLike = string | Api.TypeInputStickerSet;
/** @hidden */
export declare function getStickerSet(client: TelegramClient, set: InputStickerSetLike): Promise<Api.messages.TypeStickerSet>;
/** @hidden */
export declare function getAllStickers(client: TelegramClient): Promise<Api.messages.TypeAllStickers>;
/** @hidden */
export declare function installStickerSet(client: TelegramClient, set: InputStickerSetLike, params?: {
    archived?: boolean;
}): Promise<Api.messages.TypeStickerSetInstallResult>;
/** @hidden */
export declare function uninstallStickerSet(client: TelegramClient, set: InputStickerSetLike): Promise<boolean>;
/** @hidden */
export declare function getRecentStickers(client: TelegramClient, params?: {
    attached?: boolean;
}): Promise<Api.messages.TypeRecentStickers>;
/** @hidden */
export declare function saveRecentSticker(client: TelegramClient, document: Api.TypeInputDocument | Api.Document, params?: {
    unsave?: boolean;
    attached?: boolean;
}): Promise<boolean>;
/** @hidden */
export declare function clearRecentStickers(client: TelegramClient, params?: {
    attached?: boolean;
}): Promise<boolean>;
/** @hidden */
export declare function getFavedStickers(client: TelegramClient): Promise<Api.messages.TypeFavedStickers>;
/** @hidden */
export declare function faveSticker(client: TelegramClient, document: Api.TypeInputDocument | Api.Document, params?: {
    unfave?: boolean;
}): Promise<boolean>;
/** @hidden */
export declare function getCustomEmojiDocuments(client: TelegramClient, documentIds: BigInteger[]): Promise<Api.TypeDocument[]>;
