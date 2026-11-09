"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Dialog = void 0;
const api_1 = require("../api");
const Utils_1 = require("../../Utils");
const draft_1 = require("./draft");
const Helpers_1 = require("../../Helpers");
class Dialog {
    constructor(client, dialog, entities, message) {
        this._client = client;
        this.dialog = dialog;
        this.pinned = !!dialog.pinned;
        this.folderId = dialog instanceof api_1.Api.Dialog ? dialog.folderId : undefined;
        this.archived = this.folderId != undefined;
        this.message = message;
        this.date = this.message?.date;
        const peer = dialog instanceof api_1.Api.DialogCommunity
            ? new api_1.Api.PeerChannel({ channelId: dialog.communityId })
            : dialog.peer;
        this.entity = entities.get((0, Utils_1.getPeerId)(peer));
        this.inputEntity = (0, Utils_1.getInputPeer)(this.entity);
        if (this.entity) {
            this.id = (0, Helpers_1.returnBigInt)((0, Utils_1.getPeerId)(this.entity)); // ^ May be InputPeerSelf();
            this.name = this.title = (0, Utils_1.getDisplayName)(this.entity);
        }
        this.unreadCount = dialog instanceof api_1.Api.Dialog ? dialog.unreadCount : 0;
        this.unreadMentionsCount = dialog instanceof api_1.Api.Dialog ? dialog.unreadMentionsCount : 0;
        if (!this.entity) {
            throw new Error("Entity not found for dialog");
        }
        this.draft = new draft_1.Draft(client, this.entity, dialog instanceof api_1.Api.Dialog ? dialog.draft : undefined);
        this.isUser = this.entity instanceof api_1.Api.User;
        this.isGroup = !!(this.entity instanceof api_1.Api.Chat ||
            this.entity instanceof api_1.Api.ChatForbidden ||
            (this.entity instanceof api_1.Api.Channel && this.entity.megagroup));
        this.isChannel = this.entity instanceof api_1.Api.Channel;
        this.isCommunity = dialog instanceof api_1.Api.DialogCommunity;
    }
    /** Input dialog reference, including the distinct community constructor. */
    get inputDialog() {
        return this.isCommunity
            ? new api_1.Api.InputDialogPeerCommunity({ community: (0, Utils_1.getInputChannel)(this.inputEntity) })
            : new api_1.Api.InputDialogPeer({ peer: this.inputEntity });
    }
    /** Groups or expands a community row; unavailable for ordinary dialogs. */
    async setCollapsed(collapsed) {
        if (!this.isCommunity)
            throw new Error("The dialog is not a community");
        const result = await this._client.setCommunityCollapsed(this.inputEntity, collapsed);
        if (this.entity instanceof api_1.Api.Community) {
            this.entity.collapsedInDialogs = collapsed || undefined;
        }
        return result;
    }
    /** Sends a message to this dialog. A bare string is used as the message text. */
    async send(params) {
        return this._client.sendMessage(this.inputEntity, typeof params === "string" ? { message: params } : params);
    }
    /** Marks all messages in this dialog as read (clearing mentions too when asked). */
    async markAsRead(params) {
        return this._client.markAsRead(this.inputEntity, undefined, params);
    }
    /** Moves this dialog to the archive folder. */
    async archive() {
        this.archived = true;
        this.folderId = 1;
        return this._client.editPeerFolders(this.inputEntity, 1);
    }
    /** Moves this dialog back to the main chat list. */
    async unarchive() {
        this.archived = false;
        this.folderId = 0;
        return this._client.editPeerFolders(this.inputEntity, 0);
    }
    /** Pins or unpins this dialog in the chat list (`messages.toggleDialogPin`). */
    async pin(pinned = true) {
        const result = await this._client.invoke(new api_1.Api.messages.ToggleDialogPin({
            peer: this.inputDialog,
            pinned: pinned || undefined,
        }));
        this.pinned = pinned;
        return result;
    }
    /** Unpins this dialog in the chat list. */
    async unpin() {
        return this.pin(false);
    }
    /**
     * Deletes this dialog: leaves channels/supergroups, or deletes the
     * message history of private chats and small groups (see {@link DeleteHistoryParams}).
     */
    async delete(params) {
        if (this.isChannel || this.isCommunity) {
            return this._client.leaveChannel(this.inputEntity);
        }
        return this._client.deleteHistory(this.inputEntity, params);
    }
}
exports.Dialog = Dialog;
