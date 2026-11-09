"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatGetter = void 0;
const Utils_1 = require("../../Utils");
const api_1 = require("../api");
const Helpers_1 = require("../../Helpers");
class ChatGetter {
    static initChatClass(c, { chatPeer, inputChat, chat, broadcast }) {
        c._chatPeer = chatPeer;
        c._inputChat = inputChat;
        c._chat = chat;
        c._broadcast = broadcast;
        c._client = undefined;
    }
    get chat() {
        return this._chat;
    }
    async getChat() {
        if (!this._chat ||
            ("min" in this._chat && this._chat.min)) {
            try {
                await this.getInputChat();
                if (this._inputChat) {
                    this._chat = await this._client?.getEntity(this._inputChat);
                }
            }
            catch (e) {
                await this._refetchChat();
            }
        }
        return this._chat;
    }
    get inputChat() {
        if (!this._inputChat && this._chatPeer && this._client) {
            try {
                this._inputChat = this._client._entityCache.get((0, Utils_1.getPeerId)(this._chatPeer));
            }
            catch (e) { }
        }
        return this._inputChat;
    }
    async getInputChat() {
        if (!this.inputChat && this._chatPeer && this._client) {
            try {
                this._inputChat = await this._client.getInputEntity(this._chatPeer);
                return this._inputChat;
            }
            catch (e) { }
        }
        if (!this._inputChat && this.chatId && this._client) {
            try {
                const target = this.chatId;
                for await (const dialog of this._client.iterDialogs({
                    limit: 100,
                })) {
                    if (dialog.id.eq(target)) {
                        this._chat = dialog.entity;
                        this._inputChat = dialog.inputEntity;
                        break;
                    }
                }
            }
            catch (e) {
                // do nothing
            }
        }
        return this._inputChat;
    }
    get chatId() {
        return this._chatPeer
            ? (0, Helpers_1.returnBigInt)((0, Utils_1.getPeerId)(this._chatPeer))
            : undefined;
    }
    get isPrivate() {
        return this._chatPeer
            ? this._chatPeer instanceof api_1.Api.PeerUser
            : undefined;
    }
    get isGroup() {
        if (!this._broadcast && this.chat && "broadcast" in this.chat) {
            this._broadcast = Boolean(this.chat.broadcast);
        }
        if (this._chatPeer instanceof api_1.Api.PeerChannel) {
            if (this._broadcast === undefined) {
                return undefined;
            }
            else {
                return !this._broadcast;
            }
        }
        return this._chatPeer instanceof api_1.Api.PeerChat;
    }
    get isChannel() {
        return this._chatPeer instanceof api_1.Api.PeerChannel;
    }
    async _refetchChat() { }
}
exports.ChatGetter = ChatGetter;
