"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Keyboard = exports.ReplyKeyboard = exports.InlineKeyboard = void 0;
const Helpers_1 = require("../../Helpers");
const Utils_1 = require("../../Utils");
const api_1 = require("../api");
const button_1 = require("./button");
function toStyle(style) {
    if (!style)
        return undefined;
    if (style instanceof api_1.Api.KeyboardButtonStyle)
        return style;
    return new api_1.Api.KeyboardButtonStyle({
        bgPrimary: style.color === "primary" || undefined,
        bgDanger: style.color === "danger" || undefined,
        bgSuccess: style.color === "success" || undefined,
        icon: style.icon === undefined ? undefined : (0, Helpers_1.returnBigInt)(style.icon),
    });
}
class KeyboardBuilder {
    constructor(rows = []) {
        this.rows = rows.map((row) => [...row]);
    }
    /** Starts a new row; empty rows are dropped when the keyboard is built. */
    row() {
        this.rows.push([]);
        return this;
    }
    /** Appends ready buttons to the current row. */
    add(...buttons) {
        this.current().push(...buttons);
        return this;
    }
    /** Reflows every button into rows of at most `count` buttons. */
    columns(count) {
        if (count < 1)
            throw new Error("A keyboard row needs at least one button");
        const flat = this.rows.flat();
        this.rows.length = 0;
        for (let i = 0; i < flat.length; i += count) {
            this.rows.push(flat.slice(i, i + count));
        }
        return this;
    }
    /** How many buttons the keyboard holds. */
    get size() {
        return this.rows.reduce((total, row) => total + row.length, 0);
    }
    current() {
        if (!this.rows.length)
            this.rows.push([]);
        return this.rows[this.rows.length - 1];
    }
    filled() {
        return this.rows.filter((row) => row.length > 0);
    }
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
class InlineKeyboard extends KeyboardBuilder {
    constructor(rows = [], options = {}) {
        super(rows.map((row) => row.map((button) => {
            const raw = button instanceof button_1.Button ? button.button : button;
            if (!(raw instanceof api_1.Api.KeyboardInlineButton)) {
                throw new Error("An inline keyboard takes inline buttons only");
            }
            return raw;
        })));
        this.options = options;
    }
    /** Sends `data` back as a callback query when pressed. */
    callback(text, data, options = {}) {
        const payload = typeof data === "string" ? Buffer.from(data, "utf-8") : data;
        if (payload.length > 64) {
            throw new Error("Callback data must not exceed 64 bytes");
        }
        return this.push(text, new api_1.Api.InlineButtonTypeCallback({
            data: payload,
            requiresPassword: options.requiresPassword,
        }), options);
    }
    /** Opens a link. */
    url(text, url, options = {}) {
        return this.push(text, new api_1.Api.InlineButtonTypeUrl({ url }), options);
    }
    /** Logs the user into a website, optionally letting a bot write to them. */
    urlAuth(text, url, options = {}) {
        const type = options.bot !== undefined || options.writeAccess !== undefined
            ? new api_1.Api.InputInlineButtonTypeUrlAuth({
                url,
                bot: (0, Utils_1.getInputUser)(options.bot ?? new api_1.Api.InputUserSelf()),
                requestWriteAccess: options.writeAccess,
                fwdText: options.fwdText,
            })
            : new api_1.Api.InlineButtonTypeUrlAuth({
                url,
                fwdText: options.fwdText,
                buttonId: options.buttonId ?? 0,
            });
        return this.push(text, type, options);
    }
    /** Opens a web app. */
    webApp(text, url, options = {}) {
        return this.push(text, new api_1.Api.InlineButtonTypeWebView({ url }), options);
    }
    /** Asks the user for a chat and starts an inline query there. */
    switchInline(text, options = {}) {
        return this.push(text, new api_1.Api.InlineButtonTypeSwitchInline({
            query: options.query ?? "",
            samePeer: options.samePeer,
            peerTypes: options.peerTypes,
        }), options);
    }
    /** Opens a user's profile. */
    userProfile(text, user, options = {}) {
        return this.push(text, new api_1.Api.InputInlineButtonTypeUserProfile({ userId: (0, Utils_1.getInputUser)(user) }), options);
    }
    /** Copies text to the clipboard. */
    copy(text, copyText, options = {}) {
        return this.push(text, new api_1.Api.InlineButtonTypeCopy({ copyText }), options);
    }
    /** Starts the game attached to the message. */
    game(text, options = {}) {
        return this.push(text, new api_1.Api.InlineButtonTypeGame(), options);
    }
    /** Pays the invoice attached to the message. */
    buy(text, options = {}) {
        return this.push(text, new api_1.Api.InlineButtonTypeBuy(), options);
    }
    /** Shown greyed out and does nothing when pressed. */
    disabled(text, options = {}) {
        return this.push(text, new api_1.Api.InlineButtonTypeDisabled(), options);
    }
    /** Focuses the input field when the message arrives. */
    forceReply(forceReply = true) {
        this.options = { ...this.options, forceReply };
        return this;
    }
    /** Builds the markup sent to Telegram. */
    build() {
        return new api_1.Api.ReplyInlineMarkup({
            rows: this.filled().map((buttons) => new api_1.Api.KeyboardInlineButtonRow({ buttons })),
            forceReply: this.options.forceReply,
        });
    }
    push(text, type, options) {
        return this.add(new api_1.Api.KeyboardInlineButton({
            text,
            type,
            style: toStyle(options.style),
        }));
    }
}
exports.InlineKeyboard = InlineKeyboard;
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
class ReplyKeyboard extends KeyboardBuilder {
    constructor(rows = [], options = {}) {
        super(rows.map((row) => row.map((button) => {
            const raw = button instanceof button_1.Button ? button.button : button;
            if (!(raw instanceof api_1.Api.KeyboardButton)) {
                throw new Error("A reply keyboard takes plain buttons only");
            }
            return raw;
        })));
        this.options = options;
    }
    /** Sends its own text as a message. */
    text(text, options = {}) {
        return this.push(text, new api_1.Api.ButtonTypeDefault(), options);
    }
    /** Asks the user to share their phone number. */
    requestPhone(text, options = {}) {
        return this.push(text, new api_1.Api.ButtonTypeRequestPhone(), options);
    }
    /** Asks the user to share their location. */
    requestLocation(text, options = {}) {
        return this.push(text, new api_1.Api.ButtonTypeRequestGeoLocation(), options);
    }
    /** Opens the poll composer. */
    requestPoll(text, options = {}) {
        return this.push(text, new api_1.Api.ButtonTypeRequestPoll({ quiz: options.quiz }), options);
    }
    /** Asks the user to pick a chat, user or channel. */
    requestPeer(text, options) {
        return this.push(text, new api_1.Api.InputButtonTypeRequestPeer({
            buttonId: options.buttonId,
            peerType: options.peerType,
            maxQuantity: options.max ?? 1,
            nameRequested: options.nameRequested,
            usernameRequested: options.usernameRequested,
            photoRequested: options.photoRequested,
        }), options);
    }
    /** Opens a web app. */
    webApp(text, url, options = {}) {
        return this.push(text, new api_1.Api.ButtonTypeSimpleWebView({ url }), options);
    }
    /** Changes the keyboard's own options. */
    set(options) {
        this.options = { ...this.options, ...options };
        return this;
    }
    /** Builds the markup sent to Telegram. */
    build() {
        return new api_1.Api.ReplyKeyboardMarkup({
            rows: this.filled().map((buttons) => new api_1.Api.KeyboardButtonRow({ buttons })),
            resize: this.options.resize,
            singleUse: this.options.singleUse,
            selective: this.options.selective,
            persistent: this.options.persistent,
            forceReply: this.options.forceReply,
            placeholder: this.options.placeholder,
        });
    }
    push(text, type, options) {
        return this.add(new api_1.Api.KeyboardButton({
            text,
            type,
            style: toStyle(options.style),
        }));
    }
}
exports.ReplyKeyboard = ReplyKeyboard;
/** The markups that carry no buttons. */
exports.Keyboard = {
    /** Removes the keyboard shown in place of the input field. */
    hide(options = {}) {
        return new api_1.Api.ReplyKeyboardHide({ selective: options.selective });
    },
    /** Focuses the input field, asking the user to reply. */
    forceReply(options = {}) {
        return new api_1.Api.ReplyKeyboardForceReply({
            singleUse: options.singleUse,
            selective: options.selective,
            placeholder: options.placeholder,
        });
    },
};
