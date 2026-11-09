"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports._IDsIter = exports._MessagesIter = void 0;
exports.iterMessages = iterMessages;
exports.getMessages = getMessages;
exports.sendMessage = sendMessage;
exports.forwardMessages = forwardMessages;
exports.editMessage = editMessage;
exports.deleteMessages = deleteMessages;
exports.pinMessage = pinMessage;
exports.unpinMessage = unpinMessage;
exports._pin = _pin;
exports.markAsRead = markAsRead;
exports.getCommentData = getCommentData;
exports.sendReaction = sendReaction;
exports.getReactionUsers = getReactionUsers;
exports.sendPoll = sendPoll;
exports.vote = vote;
exports.closePoll = closePoll;
exports.getScheduledMessages = getScheduledMessages;
exports.sendScheduledMessages = sendScheduledMessages;
exports.deleteScheduledMessages = deleteScheduledMessages;
exports.copyMessages = copyMessages;
exports.saveDraft = saveDraft;
exports.clearDraft = clearDraft;
exports.clearAllDrafts = clearAllDrafts;
exports._parseMessageLink = _parseMessageLink;
exports.getMessageByLink = getMessageByLink;
exports.translateText = translateText;
exports.getMessagesViews = getMessagesViews;
exports.getOutboxReadDate = getOutboxReadDate;
exports.getMessageReadParticipants = getMessageReadParticipants;
exports.getRichMessage = getRichMessage;
exports.getDiscussionMessage = getDiscussionMessage;
const tl_1 = require("../../tl");
const requestIter_1 = require("../../requestIter");
const Helpers_1 = require("../../Helpers");
const Utils_1 = require("../../Utils");
const utils = __importStar(require("../../Utils"));
const messageParse_1 = require("./messageParse");
const users_1 = require("./users");
const big_integer_1 = __importDefault(require("big-integer"));
const uploads_1 = require("./uploads");
const _MAX_CHUNK_SIZE = 100;
/**
 * Async iterator over messages in a chat.
 *
 * Fetches messages in chunks from the Telegram API, supporting forward/reverse
 * iteration, date offsets, sender filtering, text search, and reply threading.
 * Used internally by `iterMessages` / `getMessages`.
 * @internal
 */
class _MessagesIter extends requestIter_1.RequestIter {
    async _init({ entity, offsetId, minId, maxId, fromUser, offsetDate, addOffset, filter, search, replyTo, topMsgId, savedPeerId, community, }) {
        if (entity) {
            this.entity = await this.client.getInputEntity(entity);
        }
        else {
            this.entity = undefined;
            if (this.reverse) {
                throw new Error("Cannot reverse global search");
            }
        }
        if (this.reverse) {
            offsetId = Math.max(offsetId, minId);
            if (offsetId && maxId) {
                if (maxId - offsetId <= 1) {
                    return true;
                }
            }
            if (!maxId) {
                maxId = Number.MAX_SAFE_INTEGER;
            }
        }
        else {
            offsetId = Math.max(offsetId, maxId);
            if (offsetId && minId) {
                if (offsetId - minId <= 1) {
                    return true;
                }
            }
        }
        if (this.reverse) {
            if (offsetId) {
                offsetId += 1;
            }
            else if (!offsetDate) {
                offsetId = 1;
            }
        }
        if (fromUser) {
            fromUser = await this.client.getInputEntity(fromUser);
        }
        if (!this.entity && fromUser) {
            this.entity = new tl_1.Api.InputPeerEmpty();
        }
        if (!filter) {
            filter = new tl_1.Api.InputMessagesFilterEmpty();
        }
        if (!this.entity) {
            this.request = new tl_1.Api.messages.SearchGlobal({
                community: community === undefined
                    ? undefined
                    : utils.getInputChannel(await this.client.getInputEntity(community)),
                q: search || "",
                filter: filter,
                minDate: 0,
                maxDate: offsetDate ?? 0,
                offsetRate: 0,
                offsetPeer: new tl_1.Api.InputPeerEmpty(),
                offsetId: offsetId,
                limit: 1,
            });
        }
        else if (replyTo !== undefined) {
            this.request = new tl_1.Api.messages.GetReplies({
                peer: this.entity,
                msgId: replyTo,
                offsetId: offsetId,
                offsetDate: offsetDate ?? 0,
                addOffset: addOffset,
                limit: 0,
                maxId: 0,
                minId: 0,
                hash: big_integer_1.default.zero,
            });
        }
        else if (search !== undefined ||
            !(filter instanceof tl_1.Api.InputMessagesFilterEmpty) ||
            fromUser !== undefined ||
            topMsgId !== undefined ||
            savedPeerId !== undefined) {
            this.request = new tl_1.Api.messages.Search({
                peer: this.entity,
                q: search || "",
                filter: typeof filter === "function" ? new filter() : filter,
                minDate: 0,
                maxDate: offsetDate ?? 0,
                offsetId: offsetId,
                addOffset: addOffset,
                limit: 0,
                maxId: 0,
                minId: 0,
                hash: (0, Helpers_1.generateRandomBigInt)(),
                fromId: fromUser,
                topMsgId: topMsgId,
                savedPeerId: savedPeerId
                    ? await this.client.getInputEntity(savedPeerId)
                    : undefined,
            });
            if (!(filter instanceof tl_1.Api.InputMessagesFilterEmpty) &&
                offsetDate &&
                !search &&
                !offsetId) {
                for await (const m of this.client.iterMessages(this.entity, {
                    limit: 1,
                    offsetDate: offsetDate,
                })) {
                    this.request.offsetId = m.id + 1;
                }
            }
        }
        else {
            this.request = new tl_1.Api.messages.GetHistory({
                peer: this.entity,
                limit: 1,
                offsetDate: offsetDate ?? 0,
                offsetId: offsetId,
                minId: 0,
                maxId: 0,
                addOffset: addOffset,
                hash: big_integer_1.default.zero,
            });
        }
        if (this.limit <= 0) {
            const result = await this.client.invoke(this.request);
            if (result instanceof tl_1.Api.messages.MessagesNotModified) {
                this.total = result.count;
            }
            else {
                if ("count" in result) {
                    this.total = result.count;
                }
                else {
                    this.total = result.messages.length;
                }
            }
            return false;
        }
        if (!this.waitTime) {
            this.waitTime = this.limit > 3000 ? 1 : 0;
        }
        if (this.reverse &&
            !(this.request instanceof tl_1.Api.messages.SearchGlobal)) {
            this.request.addOffset -= _MAX_CHUNK_SIZE;
        }
        this.addOffset = addOffset;
        this.maxId = maxId;
        this.minId = minId;
        this.lastId = this.reverse ? 0 : Number.MAX_SAFE_INTEGER;
    }
    async _loadNextChunk() {
        if (!this.request) {
            throw new Error("Request not set yet");
        }
        this.request.limit = Math.min(this.left, _MAX_CHUNK_SIZE);
        if (this.reverse && this.request.limit != _MAX_CHUNK_SIZE) {
            if (!(this.request instanceof tl_1.Api.messages.SearchGlobal)) {
                this.request.addOffset = this.addOffset - this.request.limit;
            }
        }
        const r = await this.client.invoke(this.request);
        if (r instanceof tl_1.Api.messages.MessagesNotModified) {
            return true;
        }
        if ("count" in r) {
            this.total = r.count;
        }
        else {
            this.total = r.messages.length;
        }
        const entities = new Map();
        for (const x of [...r.users, ...r.chats]) {
            entities.set((0, Utils_1.getPeerId)(x), x);
        }
        const messages = this.reverse
            ? r.messages.reverse()
            : r.messages;
        for (const message of messages) {
            if (!this._messageInRange(message)) {
                return true;
            }
            this.lastId = message.id;
            try {
                // if this fails it shouldn't be a big problem
                message._finishInit(this.client, entities, this.entity);
            }
            catch (e) { }
            message._entities = entities;
            this.buffer?.push(message);
        }
        if (r.messages.length < this.request.limit) {
            return true;
        }
        if (this.buffer) {
            this._updateOffset(this.buffer[this.buffer.length - 1], r);
        }
        else {
            return true;
        }
    }
    _messageInRange(message) {
        if (this.entity) {
            if (this.reverse) {
                if (message.id <= this.lastId || message.id >= this.maxId) {
                    return false;
                }
            }
            else {
                if (message.id >= this.lastId || message.id <= this.minId) {
                    return false;
                }
            }
        }
        return true;
    }
    [Symbol.asyncIterator]() {
        return super[Symbol.asyncIterator]();
    }
    _updateOffset(lastMessage, response) {
        if (!this.request) {
            throw new Error("Request not set yet");
        }
        this.request.offsetId = Number(lastMessage.id);
        if (this.reverse) {
            this.request.offsetId += 1;
        }
        if (this.request instanceof tl_1.Api.messages.Search) {
            this.request.maxDate = -1;
        }
        else {
            if (!(this.request instanceof tl_1.Api.messages.SearchGlobal)) {
                this.request.offsetDate = lastMessage.date;
            }
        }
        if (this.request instanceof tl_1.Api.messages.SearchGlobal) {
            if (lastMessage.inputChat) {
                this.request.offsetPeer = lastMessage.inputChat;
            }
            else {
                this.request.offsetPeer = new tl_1.Api.InputPeerEmpty();
            }
            this.request.offsetRate = response.nextRate;
        }
    }
}
exports._MessagesIter = _MessagesIter;
class _IDsIter extends requestIter_1.RequestIter {
    async _init({ entity, ids }) {
        this.total = ids.length;
        this._ids = this.reverse ? ids.reverse() : ids;
        this._offset = 0;
        this._entity = entity
            ? await this.client.getInputEntity(entity)
            : undefined;
        this._ty = this._entity ? (0, Helpers_1._entityType)(this._entity) : undefined;
        if (!this.waitTime) {
            this.waitTime = this.limit > 300 ? 10 : 0;
        }
    }
    [Symbol.asyncIterator]() {
        return super[Symbol.asyncIterator]();
    }
    async _loadNextChunk() {
        const ids = this._ids.slice(this._offset, this._offset + _MAX_CHUNK_SIZE);
        if (!ids.length) {
            return false;
        }
        this._offset += _MAX_CHUNK_SIZE;
        let fromId;
        let r;
        if (this._ty == Helpers_1._EntityType.CHANNEL) {
            try {
                r = await this.client.invoke(new tl_1.Api.channels.GetMessages({
                    channel: this._entity,
                    id: ids,
                }));
            }
            catch (e) {
                if (e.errorMessage == "MESSAGE_IDS_EMPTY") {
                    r = new tl_1.Api.messages.MessagesNotModified({
                        count: ids.length,
                    });
                }
                else {
                    throw e;
                }
            }
        }
        else {
            r = await this.client.invoke(new tl_1.Api.messages.GetMessages({
                id: ids,
            }));
            if (this._entity) {
                fromId = await (0, users_1._getPeer)(this.client, this._entity);
            }
        }
        if (r instanceof tl_1.Api.messages.MessagesNotModified) {
            this.buffer?.push(...Array(ids.length));
            return;
        }
        const entities = new Map();
        for (const entity of [...r.users, ...r.chats]) {
            entities.set(utils.getPeerId(entity), entity);
        }
        let message;
        for (message of r.messages) {
            if (message instanceof tl_1.Api.MessageEmpty ||
                (fromId &&
                    utils.getPeerId(message.peerId) != utils.getPeerId(fromId))) {
                this.buffer?.push(undefined);
            }
            else {
                const temp = message;
                temp._finishInit(this.client, entities, this._entity);
                temp._entities = entities;
                this.buffer?.push(temp);
            }
        }
    }
}
exports._IDsIter = _IDsIter;
const IterMessagesDefaults = {
    limit: undefined,
    offsetDate: undefined,
    offsetId: 0,
    maxId: 0,
    minId: 0,
    addOffset: 0,
    search: undefined,
    filter: undefined,
    fromUser: undefined,
    waitTime: undefined,
    ids: undefined,
    reverse: false,
    replyTo: undefined,
    scheduled: false,
    topMsgId: undefined,
    savedPeerId: undefined,
};
/** @hidden */
function iterMessages(client, entity, options) {
    const { limit, offsetDate, offsetId, maxId, minId, addOffset, search, filter, fromUser, waitTime, ids, reverse, replyTo, topMsgId, savedPeerId, community, } = { ...IterMessagesDefaults, ...options };
    if (community !== undefined && (entity !== undefined || ids !== undefined || fromUser !== undefined ||
        replyTo !== undefined || topMsgId !== undefined || savedPeerId !== undefined)) {
        throw new Error("Community search requires global search without a peer, message IDs or thread filters");
    }
    if (ids) {
        let idsArray;
        if (!(0, Helpers_1.isArrayLike)(ids)) {
            idsArray = [ids];
        }
        else {
            idsArray = ids;
        }
        return new _IDsIter(client, idsArray.length, {
            reverse: reverse,
            waitTime: waitTime,
        }, {
            entity: entity,
            ids: idsArray,
        });
    }
    return new _MessagesIter(client, limit, {
        waitTime: waitTime,
        reverse: reverse,
    }, {
        entity: entity,
        offsetId: offsetId,
        minId: minId,
        maxId: maxId,
        fromUser: fromUser,
        offsetDate: offsetDate,
        addOffset: addOffset,
        filter: filter,
        search: search,
        replyTo: replyTo,
        topMsgId: topMsgId,
        savedPeerId: savedPeerId,
        community,
    });
}
/** @hidden */
async function getMessages(client, entity, params) {
    if (Object.keys(params).length == 1 && params.limit === undefined) {
        if (params.minId === undefined && params.maxId === undefined) {
            params.limit = undefined;
        }
        else {
            params.limit = 1;
        }
    }
    const it = client.iterMessages(entity, params);
    const ids = params.ids;
    if (ids && !(0, Helpers_1.isArrayLike)(ids)) {
        for await (const message of it) {
            return [message];
        }
        return [];
    }
    return (await it.collect());
}
// region Message
/** @hidden */
async function sendMessage(client, 
/** To who will it be sent. */
entity, 
/**  The message to be sent, or another message object to resend as a copy.<br/>
 * The maximum length for a message is 35,000 bytes or 4,096 characters.<br/>
 * Longer messages will not be sliced automatically, and you should slice them manually if the text to send is longer than said length. */
{ message, replyTo, attributes, parseMode, formattingEntities, linkPreview = true, file, thumb, forceDocument, clearDraft, buttons, silent, supportStreaming, schedule, noforwards, commentTo, topMsgId, sendAs, effect, invertMedia, background, updateStickersetsOrder, allowPaidFloodskip, allowPaidStars, scheduleRepeatPeriod, quickReplyShortcut, suggestedPost, richMessage, quoteText, quoteEntities, quoteOffset, replyToPeerId, } = {}) {
    if (file) {
        return client.sendFile(entity, {
            file: file,
            caption: message
                ? typeof message == "string"
                    ? message
                    : message.message
                : "",
            forceDocument: forceDocument,
            clearDraft: clearDraft,
            replyTo: replyTo,
            attributes: attributes,
            thumb: thumb,
            supportsStreaming: supportStreaming,
            parseMode: parseMode,
            formattingEntities: formattingEntities,
            silent: silent,
            scheduleDate: schedule,
            buttons: buttons,
            noforwards: noforwards,
            commentTo: commentTo,
            topMsgId: topMsgId,
            sendAs: sendAs,
            effect: effect,
            invertMedia: invertMedia,
            background: background,
            updateStickersetsOrder: updateStickersetsOrder,
            allowPaidFloodskip: allowPaidFloodskip,
            allowPaidStars: allowPaidStars,
            scheduleRepeatPeriod: scheduleRepeatPeriod,
            quickReplyShortcut: quickReplyShortcut,
            suggestedPost: suggestedPost,
            quoteText: quoteText,
            quoteEntities: quoteEntities,
            quoteOffset: quoteOffset,
            replyToPeerId: replyToPeerId,
        });
    }
    entity = await client.getInputEntity(entity);
    if (commentTo != undefined) {
        const discussionData = await getCommentData(client, entity, commentTo);
        entity = discussionData.entity;
        replyTo = discussionData.replyTo;
    }
    let markup, request;
    const replyObject = await (0, uploads_1._toReplyObject)(client, replyTo, topMsgId, {
        quoteText,
        quoteEntities,
        quoteOffset,
        replyToPeerId,
    });
    if (message && message instanceof tl_1.Api.Message) {
        if (buttons == undefined) {
            markup = message.replyMarkup;
        }
        else {
            markup = client.buildReplyMarkup(buttons);
        }
        if (silent == undefined) {
            silent = message.silent;
        }
        if (message.media &&
            !(message.media instanceof tl_1.Api.MessageMediaWebPage)) {
            return client.sendFile(entity, {
                file: message.media,
                caption: message.message,
                silent: silent,
                replyTo: replyTo,
                buttons: markup,
                formattingEntities: message.entities,
                scheduleDate: schedule,
                clearDraft: clearDraft,
                noforwards: noforwards,
                topMsgId: topMsgId,
                sendAs: sendAs,
                effect: effect,
                invertMedia: invertMedia,
                background: background,
                allowPaidStars: allowPaidStars,
                quoteText: quoteText,
                quoteEntities: quoteEntities,
                quoteOffset: quoteOffset,
                replyToPeerId: replyToPeerId,
            });
        }
        request = new tl_1.Api.messages.SendMessage({
            peer: entity,
            message: message.message || "",
            silent: silent,
            replyTo: replyObject,
            replyMarkup: markup,
            entities: message.entities,
            clearDraft: clearDraft,
            noWebpage: !(message.media instanceof tl_1.Api.MessageMediaWebPage),
            scheduleDate: schedule,
            scheduleRepeatPeriod: scheduleRepeatPeriod,
            noforwards: noforwards,
            background: background,
            updateStickersetsOrder: updateStickersetsOrder,
            allowPaidFloodskip: allowPaidFloodskip,
            allowPaidStars: allowPaidStars,
            quickReplyShortcut: (0, uploads_1._toQuickReplyShortcut)(quickReplyShortcut),
            suggestedPost: suggestedPost,
            richMessage: richMessage,
            sendAs: sendAs
                ? await client.getInputEntity(sendAs)
                : undefined,
            effect: effect,
            invertMedia: invertMedia,
        });
        message = message.message;
    }
    else {
        if (formattingEntities == undefined) {
            [message, formattingEntities] = await (0, messageParse_1._parseMessageText)(client, message || "", parseMode);
        }
        if (!message && !richMessage) {
            throw new Error("The message cannot be empty unless a file is provided");
        }
        request = new tl_1.Api.messages.SendMessage({
            peer: entity,
            message: message ? message.toString() : "",
            entities: formattingEntities,
            noWebpage: !linkPreview,
            replyTo: replyObject,
            clearDraft: clearDraft,
            silent: silent,
            replyMarkup: client.buildReplyMarkup(buttons),
            scheduleDate: schedule,
            scheduleRepeatPeriod: scheduleRepeatPeriod,
            noforwards: noforwards,
            background: background,
            updateStickersetsOrder: updateStickersetsOrder,
            allowPaidFloodskip: allowPaidFloodskip,
            allowPaidStars: allowPaidStars,
            quickReplyShortcut: (0, uploads_1._toQuickReplyShortcut)(quickReplyShortcut),
            suggestedPost: suggestedPost,
            richMessage: richMessage,
            sendAs: sendAs
                ? await client.getInputEntity(sendAs)
                : undefined,
            effect: effect,
            invertMedia: invertMedia,
        });
    }
    const result = await client.invoke(request);
    if (result instanceof tl_1.Api.UpdateShortSentMessage) {
        const msg = new tl_1.Api.Message({
            id: result.id,
            peerId: await (0, users_1._getPeer)(client, entity),
            message: message,
            date: result.date,
            out: result.out,
            media: result.media,
            entities: result.entities,
            replyMarkup: request.replyMarkup,
            ttlPeriod: result.ttlPeriod,
        });
        msg._finishInit(client, new Map(), entity);
        return msg;
    }
    return client._getResponseMessage(request, result, entity);
}
/** @hidden */
async function forwardMessages(client, entity, { messages, fromPeer, silent, schedule, noforwards, dropAuthor, topMsgId, sendAs, effect, dropMediaCaptions, withMyScore, background, allowPaidFloodskip, allowPaidStars, videoTimestamp, scheduleRepeatPeriod, quickReplyShortcut, suggestedPost, replyTo, }) {
    if (!(0, Helpers_1.isArrayLike)(messages)) {
        messages = [messages];
    }
    entity = await client.getInputEntity(entity);
    let fromPeerId;
    if (fromPeer) {
        fromPeer = await client.getInputEntity(fromPeer);
        fromPeerId = await client.getPeerId(fromPeer);
    }
    const getKey = (m) => {
        if (m instanceof tl_1.Api.Message) {
            return m.chatId;
        }
        let msgId = (0, Utils_1.parseID)(m);
        if (msgId) {
            if (fromPeerId !== undefined)
                return fromPeerId;
            throw new Error("fromPeer must be given if integer IDs are used");
        }
        else {
            throw new Error(`Cannot forward ${m}`);
        }
    };
    const sent = [];
    for (let [chatId, chunk] of (0, Helpers_1.groupBy)(messages, getKey)) {
        let chat;
        let numbers = [];
        if (typeof chunk[0] == "number") {
            chat = fromPeer;
            numbers = chunk;
        }
        else {
            chat = await chunk[0].getInputChat();
            numbers = chunk.map((m) => m.id);
        }
        const request = new tl_1.Api.messages.ForwardMessages({
            fromPeer: chat,
            id: numbers,
            toPeer: entity,
            silent: silent,
            scheduleDate: schedule,
            scheduleRepeatPeriod: scheduleRepeatPeriod,
            noforwards: noforwards,
            dropAuthor: dropAuthor,
            topMsgId: topMsgId ? (0, Utils_1.getMessageId)(topMsgId) : undefined,
            replyTo: await (0, uploads_1._toReplyObject)(client, replyTo, undefined),
            sendAs: sendAs
                ? await client.getInputEntity(sendAs)
                : undefined,
            effect: effect,
            dropMediaCaptions: dropMediaCaptions,
            withMyScore: withMyScore,
            background: background,
            allowPaidFloodskip: allowPaidFloodskip,
            allowPaidStars: allowPaidStars,
            videoTimestamp: videoTimestamp,
            quickReplyShortcut: (0, uploads_1._toQuickReplyShortcut)(quickReplyShortcut),
            suggestedPost: suggestedPost,
        });
        const result = await client.invoke(request);
        sent.push(...client._getResponseMessage(request, result, entity));
    }
    return sent;
}
/** @hidden */
async function editMessage(client, entity, { message, text, parseMode, formattingEntities, linkPreview = true, file, forceDocument, buttons, schedule, invertMedia, scheduleRepeatPeriod, quickReplyShortcutId, richMessage, }) {
    if (typeof message === "number" &&
        typeof text === "undefined" &&
        !file &&
        !schedule &&
        !richMessage) {
        throw Error("You have to provide either file or text or schedule property.");
    }
    entity = await client.getInputEntity(entity);
    let id;
    let markup;
    let entities;
    let inputMedia;
    if (file) {
        const { fileHandle, media, image } = await (0, uploads_1._fileToMedia)(client, {
            file,
            forceDocument,
        });
        inputMedia = media;
    }
    if (message instanceof tl_1.Api.Message) {
        id = (0, Utils_1.getMessageId)(message);
        text = message.message;
        entities = message.entities;
        if (buttons == undefined) {
            markup = message.replyMarkup;
        }
        else {
            markup = client.buildReplyMarkup(buttons);
        }
        if (message.media) {
            inputMedia = (0, Utils_1.getInputMedia)(message.media, { forceDocument });
        }
    }
    else {
        if (typeof message !== "number") {
            throw Error("editMessageParams.message must be either a number or a Api.Message type");
        }
        id = message;
        if (formattingEntities == undefined) {
            [text, entities] = await (0, messageParse_1._parseMessageText)(client, text || "", parseMode);
        }
        else {
            entities = formattingEntities;
        }
        markup = client.buildReplyMarkup(buttons);
    }
    const request = new tl_1.Api.messages.EditMessage({
        peer: entity,
        id,
        message: text,
        noWebpage: !linkPreview,
        entities,
        media: inputMedia,
        replyMarkup: markup,
        scheduleDate: schedule,
        scheduleRepeatPeriod: scheduleRepeatPeriod,
        quickReplyShortcutId: quickReplyShortcutId,
        richMessage: richMessage,
        invertMedia: invertMedia,
    });
    const result = await client.invoke(request);
    return client._getResponseMessage(request, result, entity);
}
/** @hidden */
async function deleteMessages(client, entity, messageIds, { revoke = true }) {
    let ty = Helpers_1._EntityType.USER;
    if (entity) {
        entity = await client.getInputEntity(entity);
        ty = (0, Helpers_1._entityType)(entity);
    }
    const ids = [];
    for (const messageId of messageIds) {
        if (messageId instanceof tl_1.Api.Message ||
            messageId instanceof tl_1.Api.MessageService ||
            messageId instanceof tl_1.Api.MessageEmpty) {
            ids.push(messageId.id);
        }
        else if (typeof messageId === "number") {
            ids.push(messageId);
        }
        else {
            throw new Error(`Cannot convert ${messageId} to an integer`);
        }
    }
    const results = [];
    if (ty == Helpers_1._EntityType.CHANNEL) {
        for (const chunk of utils.chunks(ids)) {
            results.push(client.api.channels.deleteMessages({
                channel: utils.getInputChannel(entity),
                id: chunk,
            }));
        }
    }
    else {
        for (const chunk of utils.chunks(ids)) {
            results.push(client.api.messages.deleteMessages({
                id: chunk,
                revoke: revoke,
            }));
        }
    }
    return Promise.all(results);
}
/** @hidden */
async function pinMessage(client, entity, message, pinMessageParams) {
    return await _pin(client, entity, message, false, pinMessageParams?.notify, pinMessageParams?.pmOneSide, pinMessageParams);
}
/** @hidden */
async function unpinMessage(client, entity, message, unpinMessageParams) {
    return await _pin(client, entity, message, true, unpinMessageParams?.notify, unpinMessageParams?.pmOneSide, unpinMessageParams);
}
/** @hidden */
async function _pin(client, entity, message, unpin, notify = false, pmOneSide = false, params) {
    message = utils.getMessageId(message) || 0;
    if (message === 0) {
        return await client.api.messages.unpinAllMessages({
            peer: entity,
            topMsgId: params?.topMsgId,
            savedPeerId: params?.savedPeerId
                ? await client.getInputEntity(params.savedPeerId)
                : undefined,
        });
    }
    entity = await client.getInputEntity(entity);
    const request = new tl_1.Api.messages.UpdatePinnedMessage({
        silent: !notify,
        unpin,
        pmOneside: pmOneSide,
        peer: entity,
        id: message,
    });
    const result = await client.invoke(request);
    /**
     * Unpinning does not produce a service message.
     * Pinning a message that was already pinned also produces no service message.
     * Pinning a message in your own chat does not produce a service message,
     * but pinning on a private conversation with someone else does.
     */
    if (unpin ||
        !("updates" in result) ||
        ("updates" in result && !result.updates)) {
        return;
    }
    // Pinning a message that doesn't exist would RPC-error earlier
    return client._getResponseMessage(request, result, entity);
}
/** @hidden */
async function markAsRead(client, entity, message, markAsReadParams) {
    let maxId = markAsReadParams?.maxId || 0;
    const maxIdIsUndefined = markAsReadParams?.maxId === undefined;
    if (maxIdIsUndefined) {
        if (message) {
            if (Array.isArray(message)) {
                maxId = Math.max(...message.map((v) => utils.getMessageId(v)));
            }
            else {
                maxId = utils.getMessageId(message);
            }
        }
    }
    entity = await client.getInputEntity(entity);
    if (markAsReadParams && markAsReadParams.clearMentions) {
        await client.invoke(new tl_1.Api.messages.ReadMentions({
            peer: entity,
            topMsgId: markAsReadParams.topMsgId,
        }));
        if (maxIdIsUndefined && message === undefined) {
            return true;
        }
    }
    if ((0, Helpers_1._entityType)(entity) === Helpers_1._EntityType.CHANNEL) {
        return await client.api.channels.readHistory({
            channel: utils.getInputChannel(entity),
            maxId,
        });
    }
    else {
        await client.api.messages.readHistory({ peer: entity, maxId });
        return true;
    }
}
/** @hidden */
async function getCommentData(client, entity, message) {
    const msgId = utils.getMessageId(message);
    if (msgId == undefined) {
        throw new Error(`Cannot convert ${message} to a message ID`);
    }
    const result = await client.api.messages.getDiscussionMessage({
        peer: entity,
        msgId,
    });
    const relevantMessage = result.messages.reduce((p, c) => (p && p.id < c.id ? p : c));
    let chat;
    for (const c of result.chats) {
        if (relevantMessage.peerId instanceof tl_1.Api.PeerChannel &&
            c.id.eq(relevantMessage.peerId.channelId)) {
            chat = c;
            break;
        }
    }
    return {
        entity: utils.getInputPeer(chat),
        replyTo: relevantMessage.id,
    };
}
// TODO do the rest
/** @hidden */
async function sendReaction(client, entity, messageId, reaction, big, addToRecent) {
    return client.invoke(new tl_1.Api.messages.SendReaction({
        peer: entity,
        msgId: messageId,
        reaction: reaction || [],
        big: big,
        addToRecent: addToRecent,
    }));
}
/** @hidden */
async function getReactionUsers(client, entity, messageId, params) {
    const { reaction, limit = 100, offset = "" } = params || {};
    return client.invoke(new tl_1.Api.messages.GetMessageReactionsList({
        peer: entity,
        id: messageId,
        limit: limit,
        offset: offset,
        reaction: typeof reaction === "string"
            ? new tl_1.Api.ReactionEmoji({ emoticon: reaction })
            : reaction,
    }));
}
async function _pollText(client, text, parseMode) {
    const [parsed, entities] = await (0, messageParse_1._parseMessageText)(client, text, parseMode);
    return new tl_1.Api.TextWithEntities({ text: parsed, entities: entities });
}
/** @hidden */
async function sendPoll(client, entity, poll, params = {}) {
    let solution;
    let solutionEntities = poll.solutionEntities;
    if (poll.solution != undefined) {
        if (solutionEntities == undefined) {
            [solution, solutionEntities] = await (0, messageParse_1._parseMessageText)(client, poll.solution, poll.parseMode);
        }
        else {
            solution = poll.solution;
        }
    }
    const correctAnswers = poll.correctAnswers == undefined
        ? undefined
        : Array.isArray(poll.correctAnswers)
            ? poll.correctAnswers
            : [poll.correctAnswers];
    const media = new tl_1.Api.InputMediaPoll({
        poll: new tl_1.Api.Poll({
            id: big_integer_1.default.zero,
            question: await _pollText(client, poll.question, poll.parseMode),
            answers: await Promise.all(poll.answers.map(async (answer) => {
                const item = typeof answer === "string" ? { text: answer } : answer;
                return new tl_1.Api.InputPollAnswer({
                    text: await _pollText(client, item.text, poll.parseMode),
                    media: item.media,
                });
            })),
            multipleChoice: poll.multipleChoice,
            quiz: poll.quiz,
            publicVoters: poll.publicVoters,
            closePeriod: poll.closePeriod,
            closeDate: poll.closeDate,
            openAnswers: poll.openAnswers,
            shuffleAnswers: poll.shuffleAnswers,
            hideResultsUntilClose: poll.hideResultsUntilClose,
            revotingDisabled: poll.revotingDisabled,
            subscribersOnly: poll.subscribersOnly,
            countriesIso2: poll.countriesIso2,
            hash: big_integer_1.default.zero,
        }),
        correctAnswers: correctAnswers,
        solution: solution,
        solutionEntities: solution != undefined ? solutionEntities : undefined,
        solutionMedia: poll.solutionMedia,
        attachedMedia: poll.attachedMedia,
    });
    return client.sendFile(entity, { ...params, file: media });
}
async function _getMessagePoll(client, entity, message) {
    let msg = message instanceof tl_1.Api.Message ? message : undefined;
    if (!msg || !(msg.media instanceof tl_1.Api.MessageMediaPoll)) {
        const id = utils.getMessageId(message);
        if (id == undefined) {
            throw new Error(`Cannot convert ${message} to a message ID`);
        }
        msg = (await getMessages(client, entity, { ids: id }))[0];
    }
    if (!msg || !(msg.media instanceof tl_1.Api.MessageMediaPoll)) {
        throw new Error("The message does not contain a poll");
    }
    return msg.media.poll;
}
/** @hidden */
async function vote(client, entity, message, options) {
    const peer = await client.getInputEntity(entity);
    const msgId = utils.getMessageId(message);
    if (msgId == undefined) {
        throw new Error(`Cannot convert ${message} to a message ID`);
    }
    const list = Array.isArray(options) ? options : [options];
    let bytes;
    if (list.every((option) => typeof option === "number")) {
        const poll = await _getMessagePoll(client, peer, message);
        bytes = list.map((index) => {
            const answer = poll.answers[index];
            if (!answer || !(answer instanceof tl_1.Api.PollAnswer)) {
                throw new Error(`Poll has no answer with index ${index}`);
            }
            return answer.option;
        });
    }
    else {
        bytes = list;
    }
    return client.invoke(new tl_1.Api.messages.SendVote({
        peer: peer,
        msgId: msgId,
        options: bytes,
    }));
}
/** @hidden */
async function closePoll(client, entity, message) {
    const peer = await client.getInputEntity(entity);
    const msgId = utils.getMessageId(message);
    if (msgId == undefined) {
        throw new Error(`Cannot convert ${message} to a message ID`);
    }
    const poll = await _getMessagePoll(client, peer, message);
    const request = new tl_1.Api.messages.EditMessage({
        peer: peer,
        id: msgId,
        media: new tl_1.Api.InputMediaPoll({
            poll: new tl_1.Api.Poll({
                id: poll.id,
                closed: true,
                question: poll.question,
                answers: poll.answers,
                multipleChoice: poll.multipleChoice,
                quiz: poll.quiz,
                publicVoters: poll.publicVoters,
                hash: poll.hash,
            }),
        }),
    });
    const result = await client.invoke(request);
    if ("updates" in result) {
        for (const update of result.updates) {
            if (update instanceof tl_1.Api.UpdateMessagePoll && update.poll) {
                return update.poll;
            }
        }
    }
    return _getMessagePoll(client, peer, msgId);
}
// endregion
// region scheduled messages
function _collectMessages(client, messages, users, chats) {
    const entities = new Map();
    for (const x of [...users, ...chats]) {
        entities.set(utils.getPeerId(x), x);
    }
    const out = [];
    for (const m of messages) {
        if (m instanceof tl_1.Api.MessageEmpty) {
            continue;
        }
        const msg = m;
        try {
            msg._finishInit(client, entities, undefined);
        }
        catch (e) { }
        msg._entities = entities;
        out.push(msg);
    }
    return out;
}
/** @hidden */
async function getScheduledMessages(client, entity, ids) {
    const peer = await client.getInputEntity(entity);
    const result = ids == undefined
        ? await client.api.messages.getScheduledHistory({
            peer: peer,
            hash: big_integer_1.default.zero,
        })
        : await client.api.messages.getScheduledMessages({
            peer: peer,
            id: Array.isArray(ids) ? ids : [ids],
        });
    if (!("messages" in result)) {
        return [];
    }
    return _collectMessages(client, result.messages, result.users, result.chats);
}
/** @hidden */
async function sendScheduledMessages(client, entity, ids) {
    const peer = await client.getInputEntity(entity);
    const result = await client.api.messages.sendScheduledMessages({
        peer: peer,
        id: Array.isArray(ids) ? ids : [ids],
    });
    if (!("updates" in result)) {
        return [];
    }
    const messages = [];
    for (const update of result.updates) {
        if (update instanceof tl_1.Api.UpdateNewMessage ||
            update instanceof tl_1.Api.UpdateNewChannelMessage ||
            update instanceof tl_1.Api.UpdateNewScheduledMessage) {
            messages.push(update.message);
        }
    }
    return _collectMessages(client, messages, result.users, result.chats);
}
/** @hidden */
async function deleteScheduledMessages(client, entity, ids) {
    const peer = await client.getInputEntity(entity);
    await client.api.messages.deleteScheduledMessages({
        peer: peer,
        id: Array.isArray(ids) ? ids : [ids],
    });
}
// endregion
// region copy / drafts / links
/** @hidden */
async function copyMessages(client, entity, params) {
    return forwardMessages(client, entity, { ...params, dropAuthor: true });
}
/** @hidden */
async function saveDraft(client, entity, params = {}) {
    const peer = await client.getInputEntity(entity);
    let message = params.message || "";
    let entities = params.formattingEntities;
    if (entities == undefined && message) {
        [message, entities] = await (0, messageParse_1._parseMessageText)(client, message, params.parseMode);
    }
    const replyTo = await (0, uploads_1._toReplyObject)(client, params.replyTo, params.topMsgId, {
        quoteText: params.quoteText,
        quoteEntities: params.quoteEntities,
        quoteOffset: params.quoteOffset,
        replyToPeerId: params.replyToPeerId,
    });
    return client.invoke(new tl_1.Api.messages.SaveDraft({
        peer: peer,
        message: message.toString(),
        entities: entities,
        noWebpage: params.linkPreview === undefined
            ? undefined
            : !params.linkPreview,
        replyTo: replyTo,
        invertMedia: params.invertMedia,
        media: params.media,
        effect: params.effect,
        suggestedPost: params.suggestedPost,
        richMessage: params.richMessage,
    }));
}
/** @hidden */
async function clearDraft(client, entity) {
    return saveDraft(client, entity, {});
}
/** @hidden */
async function clearAllDrafts(client) {
    return client.api.messages.clearAllDrafts({});
}
function _linkInt(value) {
    if (!value || !/^\d+$/.test(value)) {
        return undefined;
    }
    const n = parseInt(value, 10);
    return isNaN(n) ? undefined : n;
}
/** @hidden */
function _parseMessageLink(link) {
    let raw = link.trim();
    if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(raw)) {
        raw = "https://" + raw;
    }
    let url;
    try {
        url = new URL(raw);
    }
    catch (e) {
        return undefined;
    }
    const query = url.searchParams;
    if (url.protocol === "tg:") {
        const host = url.host || url.pathname.replace(/^\/+/, "");
        const post = _linkInt(query.get("post"));
        if (post == undefined) {
            return undefined;
        }
        const common = {
            msgId: post,
            thread: _linkInt(query.get("thread")),
            comment: _linkInt(query.get("comment")),
        };
        if (host === "resolve" && query.get("domain")) {
            return { username: query.get("domain"), ...common };
        }
        if (host === "privatepost" && _linkInt(query.get("channel"))) {
            return { channelId: query.get("channel"), ...common };
        }
        return undefined;
    }
    if (!/^(t\.me|telegram\.me|telegram\.dog)$/i.test(url.hostname)) {
        return undefined;
    }
    const parts = url.pathname.split("/").filter(Boolean);
    if (parts[0] === "s") {
        parts.shift();
    }
    if (parts.length < 2) {
        return undefined;
    }
    const msgId = _linkInt(parts[parts.length - 1]);
    if (msgId == undefined) {
        return undefined;
    }
    const thread = parts.length >= 3 ? _linkInt(parts[1]) : _linkInt(query.get("thread"));
    const comment = _linkInt(query.get("comment"));
    if (parts[0] === "c") {
        const channelId = parts[1];
        if (parts.length < 3 || !/^\d+$/.test(channelId)) {
            return undefined;
        }
        return {
            channelId,
            msgId,
            thread: parts.length >= 4 ? _linkInt(parts[2]) : thread,
            comment,
        };
    }
    const username = parts[0];
    if (username.startsWith("+") || username.startsWith("joinchat")) {
        return undefined;
    }
    return { username, msgId, thread, comment };
}
/** @hidden */
async function getMessageByLink(client, link) {
    const parsed = _parseMessageLink(link);
    if (!parsed) {
        throw new Error(`Cannot parse message link: ${link}`);
    }
    const peer = await client.getInputEntity(parsed.channelId != undefined ? "-100" + parsed.channelId : parsed.username);
    if (parsed.comment != undefined) {
        const discussion = await getCommentData(client, peer, parsed.msgId);
        return (await getMessages(client, discussion.entity, {
            ids: parsed.comment,
        }))[0];
    }
    return (await getMessages(client, peer, { ids: parsed.msgId }))[0];
}
/** @hidden */
async function translateText(client, params) {
    const { toLang, tone, entity, ids, text } = params;
    if ((entity == undefined) !== (ids == undefined)) {
        throw new Error("translateText: entity and ids must be used together");
    }
    if ((entity == undefined) === (text == undefined)) {
        throw new Error("translateText: provide either entity+ids or text, not both");
    }
    return client.invoke(new tl_1.Api.messages.TranslateText({
        toLang: toLang,
        tone: tone,
        peer: entity ? await client.getInputEntity(entity) : undefined,
        id: ids == undefined ? undefined : Array.isArray(ids) ? ids : [ids],
        text: text == undefined
            ? undefined
            : (Array.isArray(text) ? text : [text]).map((t) => new tl_1.Api.TextWithEntities({
                text: t,
                entities: [],
            })),
    }));
}
/** @hidden */
async function getMessagesViews(client, entity, ids, increment = false) {
    const peer = await client.getInputEntity(entity);
    return client.api.messages.getMessagesViews({
        peer: peer,
        id: Array.isArray(ids) ? ids : [ids],
        increment: increment,
    });
}
/** @hidden */
async function getOutboxReadDate(client, entity, message) {
    const peer = await client.getInputEntity(entity);
    const msgId = utils.getMessageId(message);
    if (msgId == undefined) {
        throw new Error(`Cannot convert ${message} to a message ID`);
    }
    return client.api.messages.getOutboxReadDate({
        peer: peer,
        msgId: msgId,
    });
}
/** @hidden */
async function getMessageReadParticipants(client, entity, message) {
    const peer = await client.getInputEntity(entity);
    const msgId = utils.getMessageId(message);
    if (msgId == undefined) {
        throw new Error(`Cannot convert ${message} to a message ID`);
    }
    return client.api.messages.getMessageReadParticipants({
        peer: peer,
        msgId: msgId,
    });
}
/**
 * Fetches the full content of a rich message whose delivery was truncated
 * (`richMessage.part` set).
 * @hidden
 */
async function getRichMessage(client, entity, message) {
    const peer = await client.getInputEntity(entity);
    const msgId = utils.getMessageId(message);
    if (msgId == undefined) {
        throw new Error(`Cannot convert ${message} to a message ID`);
    }
    const result = await client.api.messages.getRichMessage({
        peer: peer,
        id: msgId,
    });
    if (!("messages" in result)) {
        return undefined;
    }
    const collected = _collectMessages(client, result.messages, result.users, result.chats);
    return collected.find((m) => m.id === msgId) ?? collected[0];
}
/** @hidden */
async function getDiscussionMessage(client, entity, message) {
    const peer = await client.getInputEntity(entity);
    const msgId = utils.getMessageId(message);
    if (msgId == undefined) {
        throw new Error(`Cannot convert ${message} to a message ID`);
    }
    const result = await client.api.messages.getDiscussionMessage({
        peer: peer,
        msgId: msgId,
    });
    const collected = _collectMessages(client, result.messages, result.users, result.chats);
    if (!collected.length) {
        return undefined;
    }
    return collected.reduce((a, b) => (a.id < b.id ? a : b));
}
// endregion
