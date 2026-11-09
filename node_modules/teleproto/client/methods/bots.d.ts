import type { EntityLike } from "../../define";
import { Api } from "../../tl";
import { InlineResults } from "../../tl/custom/inlineResults";
import type { TelegramClient } from "../TelegramClient";
import { type ParseInterface } from "./messageParse";
/** @hidden */
export declare function inlineQuery(client: TelegramClient, bot: EntityLike, query: string, entity?: Api.InputPeerSelf, offset?: string, geoPoint?: Api.TypeInputGeoPoint): Promise<InlineResults>;
/** One bot command for {@link TelegramClient.setBotCommands}. */
export interface BotCommandEntry {
    /** The command itself, without the leading `/` (1-32 chars: a-z, 0-9, _). */
    command: string;
    /** Description shown in the command menu (1-256 chars). */
    description: string;
    /** L228: hide the command from the menu while still accepting it. */
    ephemeral?: boolean;
}
/** Scope/language selector for the bot command methods. */
export interface BotCommandScopeParams {
    /** Where the commands apply. Defaults to {@link Api.BotCommandScopeDefault}. */
    scope?: Api.TypeBotCommandScope;
    /** Two-letter language code the commands apply to. Defaults to all languages. */
    langCode?: string;
}
/** @hidden */
export declare function setBotCommands(client: TelegramClient, commands: BotCommandEntry[], params?: BotCommandScopeParams): Promise<boolean>;
/** @hidden */
export declare function getBotCommands(client: TelegramClient, params?: BotCommandScopeParams): Promise<Api.BotCommand[]>;
/** @hidden */
export declare function resetBotCommands(client: TelegramClient, params?: BotCommandScopeParams): Promise<boolean>;
/** Parameters for {@link TelegramClient.setBotInfo}. Only the fields you set are changed. */
export interface SetBotInfoParams {
    /** Bot owners: the owned bot to edit. Bots editing themselves can omit this. */
    bot?: EntityLike;
    /** Two-letter language code the info applies to. Defaults to all languages. */
    langCode?: string;
    /** New bot name. */
    name?: string;
    /** New short description ("about", shown on the profile page). */
    about?: string;
    /** New full description (shown on the empty chat screen). */
    description?: string;
}
/** @hidden */
export declare function setBotInfo(client: TelegramClient, params: SetBotInfoParams): Promise<boolean>;
/** @hidden */
export declare function getBotInfo(client: TelegramClient, params?: {
    bot?: EntityLike;
    langCode?: string;
}): Promise<Api.bots.BotInfo>;
/** @hidden */
export declare function setBotMenuButton(client: TelegramClient, user: EntityLike, button: Api.TypeBotMenuButton): Promise<boolean>;
/** @hidden */
export declare function getBotMenuButton(client: TelegramClient, user: EntityLike): Promise<Api.TypeBotMenuButton>;
export interface SetBotVerificationParams {
    bot?: EntityLike;
    enabled?: boolean;
    description?: string | Api.TypeTextWithEntities;
    parseMode?: false | string | ParseInterface;
}
/** @hidden */
export declare function addBotUsername(client: TelegramClient, bot: EntityLike, username: string): Promise<boolean>;
/** @hidden */
export declare function removeBotUsername(client: TelegramClient, bot: EntityLike, username: string): Promise<boolean>;
/** @hidden */
export declare function checkBotUsername(client: TelegramClient, username: string, params?: {
    additional?: boolean;
}): Promise<boolean>;
/** @hidden */
export declare function setBotVerification(client: TelegramClient, peer: EntityLike, params?: SetBotVerificationParams): Promise<boolean>;
