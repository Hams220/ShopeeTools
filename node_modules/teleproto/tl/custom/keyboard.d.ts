import type { BigInteger } from "big-integer";
import type { EntityLike } from "../../define";
import { Api } from "../api";
import { Button } from "./button";
/** Background colour of a button, mapping to the `bg_*` flags of the schema. */
export type ButtonColor = "primary" | "danger" | "success";
/** Shorthand for {@link Api.KeyboardButtonStyle}. */
export interface ButtonStyleOptions {
    /** Background colour. */
    color?: ButtonColor;
    /** Custom emoji shown on the button. */
    icon?: BigInteger | string | number;
}
/** A ready style, or the shorthand that builds one. */
export type ButtonStyleLike = Api.KeyboardButtonStyle | ButtonStyleOptions;
/** Accepted by every button method of both keyboards. */
export interface ButtonOptions {
    style?: ButtonStyleLike;
}
/** Options of {@link InlineKeyboard.callback}. */
export interface CallbackButtonOptions extends ButtonOptions {
    /** Ask the user for their 2FA password before the query is sent. */
    requiresPassword?: boolean;
}
/** Options of {@link InlineKeyboard.urlAuth}. */
export interface UrlAuthButtonOptions extends ButtonOptions {
    /** Bot that will receive the authorization; makes the button an input one. */
    bot?: EntityLike;
    /** Whether the bot may write to the user after the authorization. */
    writeAccess?: boolean;
    /** Text shown instead of the default when the message is forwarded. */
    fwdText?: string;
    /** Id echoed back in `messages.requestUrlAuth`, for non-input buttons. */
    buttonId?: number;
}
/** Options of {@link InlineKeyboard.switchInline}. */
export interface SwitchInlineButtonOptions extends ButtonOptions {
    /** Inline query inserted into the input field. */
    query?: string;
    /** Insert the query in the current chat instead of asking for one. */
    samePeer?: boolean;
    /** Chat types offered to the user when picking a chat. */
    peerTypes?: Api.TypeInlineQueryPeerType[];
}
/** Options of {@link ReplyKeyboard.requestPoll}. */
export interface RequestPollButtonOptions extends ButtonOptions {
    /** Force a quiz, or a regular poll when `false`; omit to let the user choose. */
    quiz?: boolean;
}
/** Options of {@link ReplyKeyboard.requestPeer}. */
export interface RequestPeerButtonOptions extends ButtonOptions {
    /** Id echoed back in the `messages.sendBotRequestedPeer` the user triggers. */
    buttonId: number;
    /** Which peers the user may pick. */
    peerType: Api.TypeRequestPeerType;
    /** How many peers may be picked, `1` by default. */
    max?: number;
    /** Ask the user to also share the peer's name. */
    nameRequested?: boolean;
    /** Ask the user to also share the peer's username. */
    usernameRequested?: boolean;
    /** Ask the user to also share the peer's photo. */
    photoRequested?: boolean;
}
/** Options of the keyboard shown in place of the input field. */
export interface ReplyKeyboardOptions {
    /** Resize the keyboard to fit its buttons. */
    resize?: boolean;
    /** Hide the keyboard after one use. */
    singleUse?: boolean;
    /** Show it only to the users mentioned or replied to by the message. */
    selective?: boolean;
    /** Keep it open instead of collapsing it to the input field. */
    persistent?: boolean;
    /** Focus the input field, as a force reply does. */
    forceReply?: boolean;
    /** Placeholder shown in the input field while the keyboard is open. */
    placeholder?: string;
}
/** Options of the keyboard attached to a message. */
export interface InlineKeyboardOptions {
    /** Focus the input field, as a force reply does. */
    forceReply?: boolean;
}
/** Options of {@link Keyboard.hide}. */
export interface HideKeyboardOptions {
    /** Hide it only for the users mentioned or replied to by the message. */
    selective?: boolean;
}
/** Options of {@link Keyboard.forceReply}. */
export interface ForceReplyOptions {
    /** Force a reply from one user only. */
    singleUse?: boolean;
    /** Ask only the users mentioned or replied to by the message. */
    selective?: boolean;
    /** Placeholder shown in the input field. */
    placeholder?: string;
}
declare abstract class KeyboardBuilder<TButton> {
    protected readonly rows: TButton[][];
    protected constructor(rows?: TButton[][]);
    /** Starts a new row; empty rows are dropped when the keyboard is built. */
    row(): this;
    /** Appends ready buttons to the current row. */
    add(...buttons: TButton[]): this;
    /** Reflows every button into rows of at most `count` buttons. */
    columns(count: number): this;
    /** How many buttons the keyboard holds. */
    get size(): number;
    protected current(): TButton[];
    protected filled(): TButton[][];
}
/**
 * Keyboard attached to a message, built either from a grid or by chaining.
 *
 * @example
 * ```ts
 * const keyboard = new InlineKeyboard()
 *     .callback("Yes", "yes", { style: { color: "success" } })
 *     .callback("No", "no", { style: { color: "danger" } })
 *     .row()
 *     .url("Open", "https://t.me/durov");
 *
 * await client.sendMessage(chat, { message: "Well?", buttons: keyboard });
 * ```
 * @category Messages
 */
export declare class InlineKeyboard extends KeyboardBuilder<Api.TypeKeyboardInlineButton> {
    private options;
    constructor(rows?: (Api.TypeKeyboardInlineButton | Button)[][], options?: InlineKeyboardOptions);
    /** Sends `data` back as a callback query when pressed. */
    callback(text: string, data: Buffer | string, options?: CallbackButtonOptions): this;
    /** Opens a link. */
    url(text: string, url: string, options?: ButtonOptions): this;
    /** Logs the user into a website, optionally letting a bot write to them. */
    urlAuth(text: string, url: string, options?: UrlAuthButtonOptions): this;
    /** Opens a web app. */
    webApp(text: string, url: string, options?: ButtonOptions): this;
    /** Asks the user for a chat and starts an inline query there. */
    switchInline(text: string, options?: SwitchInlineButtonOptions): this;
    /** Opens a user's profile. */
    userProfile(text: string, user: EntityLike, options?: ButtonOptions): this;
    /** Copies text to the clipboard. */
    copy(text: string, copyText: string, options?: ButtonOptions): this;
    /** Starts the game attached to the message. */
    game(text: string, options?: ButtonOptions): this;
    /** Pays the invoice attached to the message. */
    buy(text: string, options?: ButtonOptions): this;
    /** Shown greyed out and does nothing when pressed. */
    disabled(text: string, options?: ButtonOptions): this;
    /** Focuses the input field when the message arrives. */
    forceReply(forceReply?: boolean): this;
    /** Builds the markup sent to Telegram. */
    build(): Api.ReplyInlineMarkup;
    private push;
}
/**
 * Keyboard shown in place of the input field, built either from a grid or by
 * chaining.
 *
 * @example
 * ```ts
 * const keyboard = new ReplyKeyboard([], { resize: true, placeholder: "Pick one" })
 *     .text("Hi")
 *     .requestPhone("Share phone");
 *
 * await client.sendMessage(chat, { message: "Menu", buttons: keyboard });
 * ```
 * @category Messages
 */
export declare class ReplyKeyboard extends KeyboardBuilder<Api.TypeKeyboardButton> {
    private options;
    constructor(rows?: (Api.TypeKeyboardButton | Button)[][], options?: ReplyKeyboardOptions);
    /** Sends its own text as a message. */
    text(text: string, options?: ButtonOptions): this;
    /** Asks the user to share their phone number. */
    requestPhone(text: string, options?: ButtonOptions): this;
    /** Asks the user to share their location. */
    requestLocation(text: string, options?: ButtonOptions): this;
    /** Opens the poll composer. */
    requestPoll(text: string, options?: RequestPollButtonOptions): this;
    /** Asks the user to pick a chat, user or channel. */
    requestPeer(text: string, options: RequestPeerButtonOptions): this;
    /** Opens a web app. */
    webApp(text: string, url: string, options?: ButtonOptions): this;
    /** Changes the keyboard's own options. */
    set(options: ReplyKeyboardOptions): this;
    /** Builds the markup sent to Telegram. */
    build(): Api.ReplyKeyboardMarkup;
    private push;
}
/** The markups that carry no buttons. */
export declare const Keyboard: {
    /** Removes the keyboard shown in place of the input field. */
    hide(options?: HideKeyboardOptions): Api.ReplyKeyboardHide;
    /** Focuses the input field, asking the user to reply. */
    forceReply(options?: ForceReplyOptions): Api.ReplyKeyboardForceReply;
};
export {};
