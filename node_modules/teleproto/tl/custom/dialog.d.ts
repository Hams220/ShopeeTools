import type { TelegramClient } from "../../client/TelegramClient";
import { Api } from "../api";
import type { Entity } from "../../define";
import { Draft } from "./draft";
import bigInt from "big-integer";
import type { SendMessageParams } from "../../client/methods/messages";
import type { DeleteHistoryParams } from "../../client/methods/chats";
export declare class Dialog<D extends Api.Dialog | Api.DialogCommunity = Api.Dialog> {
    _client: TelegramClient;
    dialog: D;
    pinned: boolean;
    folderId?: number;
    archived: boolean;
    message?: Api.Message;
    date?: number;
    entity?: Entity;
    inputEntity: Api.TypeInputPeer;
    id?: bigInt.BigInteger;
    name?: string;
    title?: string;
    unreadCount: number;
    unreadMentionsCount: number;
    draft: Draft;
    isUser: boolean;
    isGroup: boolean;
    isChannel: boolean;
    /** Whether this row represents a community instead of a conversation. */
    isCommunity: boolean;
    constructor(client: TelegramClient, dialog: D, entities: Map<string, Entity>, message?: Api.Message);
    /** Input dialog reference, including the distinct community constructor. */
    get inputDialog(): Api.TypeInputDialogPeer;
    /** Groups or expands a community row; unavailable for ordinary dialogs. */
    setCollapsed(collapsed: boolean): Promise<Api.TypeUpdates>;
    /** Sends a message to this dialog. A bare string is used as the message text. */
    send(params: string | SendMessageParams): Promise<Api.Message>;
    /** Marks all messages in this dialog as read (clearing mentions too when asked). */
    markAsRead(params?: {
        clearMentions?: boolean;
    }): Promise<boolean>;
    /** Moves this dialog to the archive folder. */
    archive(): Promise<Api.TypeUpdates>;
    /** Moves this dialog back to the main chat list. */
    unarchive(): Promise<Api.TypeUpdates>;
    /** Pins or unpins this dialog in the chat list (`messages.toggleDialogPin`). */
    pin(pinned?: boolean): Promise<boolean>;
    /** Unpins this dialog in the chat list. */
    unpin(): Promise<boolean>;
    /**
     * Deletes this dialog: leaves channels/supergroups, or deletes the
     * message history of private chats and small groups (see {@link DeleteHistoryParams}).
     */
    delete(params?: DeleteHistoryParams): Promise<Api.TypeUpdates | Api.messages.AffectedHistory>;
}
