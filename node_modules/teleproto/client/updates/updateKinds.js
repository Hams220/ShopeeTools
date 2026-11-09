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
Object.defineProperty(exports, "__esModule", { value: true });
exports.isCommonPtsUpdate = isCommonPtsUpdate;
exports.isChannelPtsUpdate = isChannelPtsUpdate;
exports.hasQts = hasQts;
exports.channelIdOf = channelIdOf;
exports.requestChannelId = requestChannelId;
exports.collectEntities = collectEntities;
exports.isMessage = isMessage;
exports.nextRetryDelaySeconds = nextRetryDelaySeconds;
const tl_1 = require("../../tl");
const utils = __importStar(require("../../Utils"));
function isCommonPtsUpdate(update) {
    return (update instanceof tl_1.Api.UpdateNewMessage ||
        update instanceof tl_1.Api.UpdateDeleteMessages ||
        update instanceof tl_1.Api.UpdateReadHistoryInbox ||
        update instanceof tl_1.Api.UpdateReadHistoryOutbox ||
        update instanceof tl_1.Api.UpdateWebPage ||
        update instanceof tl_1.Api.UpdateReadMessagesContents ||
        update instanceof tl_1.Api.UpdateEditMessage ||
        update instanceof tl_1.Api.UpdateFolderPeers ||
        update instanceof tl_1.Api.UpdatePinnedMessages);
}
function isChannelPtsUpdate(update) {
    return (update instanceof tl_1.Api.UpdateNewChannelMessage ||
        update instanceof tl_1.Api.UpdateEditChannelMessage ||
        update instanceof tl_1.Api.UpdateDeleteChannelMessages ||
        update instanceof tl_1.Api.UpdateChannelWebPage ||
        update instanceof tl_1.Api.UpdatePinnedChannelMessages);
}
function hasQts(update) {
    return typeof update.qts === "number";
}
function channelIdOf(update) {
    const fields = update;
    if (fields.channelId)
        return fields.channelId.toString();
    const peer = fields.message?.peerId;
    return peer instanceof tl_1.Api.PeerChannel ? peer.channelId.toString() : undefined;
}
function requestChannelId(request) {
    let current = request;
    while (current?.classType === "request") {
        const target = current.peer ?? current.channel;
        if (target instanceof tl_1.Api.InputPeerChannel ||
            target instanceof tl_1.Api.InputChannel ||
            target instanceof tl_1.Api.InputPeerChannelFromMessage ||
            target instanceof tl_1.Api.InputChannelFromMessage) {
            return target.channelId.toString();
        }
        current = current.query;
    }
    return undefined;
}
function collectEntities(users, chats) {
    const entities = new Map();
    for (const entity of [...users, ...chats]) {
        try {
            entities.set(utils.getPeerId(entity), entity);
        }
        catch { }
    }
    return entities;
}
function isMessage(message) {
    return message instanceof tl_1.Api.Message || message instanceof tl_1.Api.MessageService;
}
function nextRetryDelaySeconds(previous) {
    if (!previous)
        return 1;
    if (previous >= 32)
        return 60 + Math.random() * 20;
    return previous * 2;
}
