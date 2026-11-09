import type { ButtonLike, EntityLike } from "../../define";
import { Api } from "../api";
import type { BigInteger } from "big-integer";
export declare class Button {
    button: ButtonLike;
    resize: boolean | undefined;
    selective: boolean | undefined;
    singleUse: boolean | undefined;
    constructor(button: Api.TypeKeyboardButton, resize?: boolean, singleUse?: boolean, selective?: boolean);
    static _isInline(button: ButtonLike): button is Api.KeyboardInlineButton;
    static inline(text: string, data?: Buffer, style?: Api.KeyboardButtonStyle): Api.KeyboardInlineButton;
    static switchInline(text: string, query?: string, samePeer?: boolean, style?: Api.KeyboardButtonStyle): Api.KeyboardInlineButton;
    static url(text: string, url?: string, style?: Api.KeyboardButtonStyle): Api.KeyboardInlineButton;
    static auth(text: string, url?: string, bot?: EntityLike, writeAccess?: boolean, fwdText?: string, style?: Api.KeyboardButtonStyle): Api.KeyboardInlineButton;
    static text(text: string, resize?: boolean, singleUse?: boolean, selective?: boolean): Button;
    static requestLocation(text: string, resize?: boolean, singleUse?: boolean, selective?: boolean): Button;
    static requestPhone(text: string, resize?: boolean, singleUse?: boolean, selective?: boolean): Button;
    static requestPoll(text: string, resize?: boolean, singleUse?: boolean, selective?: boolean): Button;
    static webView(text: string, url: string, style?: Api.KeyboardButtonStyle): Api.KeyboardInlineButton;
    static simpleWebView(text: string, url: string, style?: Api.KeyboardButtonStyle): Api.KeyboardButton;
    static copy(text: string, copyText: string, style?: Api.KeyboardButtonStyle): Api.KeyboardInlineButton;
    static game(text: string, style?: Api.KeyboardButtonStyle): Api.KeyboardInlineButton;
    static buy(text: string, style?: Api.KeyboardButtonStyle): Api.KeyboardInlineButton;
    static disabled(text: string, style?: Api.KeyboardButtonStyle): Api.KeyboardInlineButton;
    static userProfile(text: string, user: EntityLike, style?: Api.KeyboardButtonStyle): Api.KeyboardInlineButton;
    static requestPeer(text: string, buttonId: number, peerType: Api.TypeRequestPeerType, maxCount?: number, style?: Api.KeyboardButtonStyle): Api.KeyboardButton;
    static style: StyleFunction;
    static clear(): Api.ReplyKeyboardHide;
    static forceReply(): Api.ReplyKeyboardForceReply;
}
interface StyleFunction {
    (opts?: {
        bgPrimary?: boolean;
        bgDanger?: boolean;
        bgSuccess?: boolean;
        icon?: BigInteger;
    }): Api.KeyboardButtonStyle;
    primary(): Api.KeyboardButtonStyle;
    danger(): Api.KeyboardButtonStyle;
    success(): Api.KeyboardButtonStyle;
}
export {};
