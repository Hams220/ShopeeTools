"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Button = void 0;
const api_1 = require("../api");
const Utils_1 = require("../../Utils");
class Button {
    constructor(button, resize, singleUse, selective) {
        this.button = button;
        this.resize = resize;
        this.singleUse = singleUse;
        this.selective = selective;
    }
    static _isInline(button) {
        return button instanceof api_1.Api.KeyboardInlineButton;
    }
    static inline(text, data, style) {
        if (!data) {
            data = Buffer.from(text, "utf-8");
        }
        if (data.length > 64) {
            throw new Error("Too many bytes for the data");
        }
        return new api_1.Api.KeyboardInlineButton({
            text: text,
            type: new api_1.Api.InlineButtonTypeCallback({
                data: data,
            }),
            style: style,
        });
    }
    static switchInline(text, query = "", samePeer = false, style) {
        return new api_1.Api.KeyboardInlineButton({
            text,
            type: new api_1.Api.InlineButtonTypeSwitchInline({
                query,
                samePeer,
            }),
            style,
        });
    }
    static url(text, url, style) {
        return new api_1.Api.KeyboardInlineButton({
            text: text,
            type: new api_1.Api.InlineButtonTypeUrl({
                url: url || text,
            }),
            style,
        });
    }
    static auth(text, url, bot, writeAccess, fwdText, style) {
        return new api_1.Api.KeyboardInlineButton({
            text,
            type: new api_1.Api.InputInlineButtonTypeUrlAuth({
                url: url || text,
                bot: (0, Utils_1.getInputUser)(bot || new api_1.Api.InputUserSelf()),
                requestWriteAccess: writeAccess,
                fwdText: fwdText,
            }),
            style,
        });
    }
    static text(text, resize, singleUse, selective) {
        return new this(new api_1.Api.KeyboardButton({
            text,
            type: new api_1.Api.ButtonTypeDefault(),
        }), resize, singleUse, selective);
    }
    static requestLocation(text, resize, singleUse, selective) {
        return new this(new api_1.Api.KeyboardButton({
            text,
            type: new api_1.Api.ButtonTypeRequestGeoLocation(),
        }), resize, singleUse, selective);
    }
    static requestPhone(text, resize, singleUse, selective) {
        return new this(new api_1.Api.KeyboardButton({
            text,
            type: new api_1.Api.ButtonTypeRequestPhone(),
        }), resize, singleUse, selective);
    }
    static requestPoll(text, resize, singleUse, selective) {
        return new this(new api_1.Api.KeyboardButton({
            text,
            type: new api_1.Api.ButtonTypeRequestPoll({}),
        }), resize, singleUse, selective);
    }
    static webView(text, url, style) {
        return new api_1.Api.KeyboardInlineButton({
            text,
            type: new api_1.Api.InlineButtonTypeWebView({
                url,
            }),
            style,
        });
    }
    static simpleWebView(text, url, style) {
        return new api_1.Api.KeyboardButton({
            text,
            type: new api_1.Api.ButtonTypeSimpleWebView({
                url,
            }),
            style,
        });
    }
    static copy(text, copyText, style) {
        return new api_1.Api.KeyboardInlineButton({
            text,
            type: new api_1.Api.InlineButtonTypeCopy({
                copyText,
            }),
            style,
        });
    }
    static game(text, style) {
        return new api_1.Api.KeyboardInlineButton({
            text,
            type: new api_1.Api.InlineButtonTypeGame(),
            style,
        });
    }
    static buy(text, style) {
        return new api_1.Api.KeyboardInlineButton({
            text,
            type: new api_1.Api.InlineButtonTypeBuy(),
            style,
        });
    }
    static disabled(text, style) {
        return new api_1.Api.KeyboardInlineButton({
            text,
            type: new api_1.Api.InlineButtonTypeDisabled(),
            style,
        });
    }
    static userProfile(text, user, style) {
        return new api_1.Api.KeyboardInlineButton({
            text,
            type: new api_1.Api.InputInlineButtonTypeUserProfile({
                userId: (0, Utils_1.getInputUser)(user),
            }),
            style,
        });
    }
    static requestPeer(text, buttonId, peerType, maxCount, style) {
        return new api_1.Api.KeyboardButton({
            text,
            type: new api_1.Api.InputButtonTypeRequestPeer({
                buttonId,
                peerType,
                maxQuantity: maxCount || 1,
            }),
            style,
        });
    }
    static { this.style = Object.assign((opts) => {
        return new api_1.Api.KeyboardButtonStyle(opts || {});
    }, {
        primary: () => new api_1.Api.KeyboardButtonStyle({ bgPrimary: true }),
        danger: () => new api_1.Api.KeyboardButtonStyle({ bgDanger: true }),
        success: () => new api_1.Api.KeyboardButtonStyle({ bgSuccess: true }),
    }); }
    static clear() {
        return new api_1.Api.ReplyKeyboardHide({});
    }
    static forceReply() {
        return new api_1.Api.ReplyKeyboardForceReply({});
    }
}
exports.Button = Button;
