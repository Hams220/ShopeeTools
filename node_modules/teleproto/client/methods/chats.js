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
exports._AdminLogIter = exports._ParticipantsIter = void 0;
exports.iterParticipants = iterParticipants;
exports.getParticipants = getParticipants;
exports.kickParticipant = kickParticipant;
exports.editBanned = editBanned;
exports.editAdmin = editAdmin;
exports.editChatDefaultBannedRights = editChatDefaultBannedRights;
exports.getParticipant = getParticipant;
exports.editTitle = editTitle;
exports.editPhoto = editPhoto;
exports.editChatAbout = editChatAbout;
exports.toggleSlowMode = toggleSlowMode;
exports.createChannel = createChannel;
exports.createChat = createChat;
exports.joinChannel = joinChannel;
exports.importChatInvite = importChatInvite;
exports.leaveChannel = leaveChannel;
exports.deleteHistory = deleteHistory;
exports.editPeerFolders = editPeerFolders;
exports.setTyping = setTyping;
exports.iterAdminLog = iterAdminLog;
exports.getAdminLog = getAdminLog;
const uploads_1 = require("./uploads");
const inviteLinks_1 = require("./inviteLinks");
const Helpers_1 = require("../../Helpers");
const requestIter_1 = require("../../requestIter");
const helpers = __importStar(require("../../Helpers"));
const utils = __importStar(require("../../Utils"));
const tl_1 = require("../../tl");
const big_integer_1 = __importDefault(require("big-integer"));
const Utils_1 = require("../../Utils");
const _MAX_PARTICIPANTS_CHUNK_SIZE = 200;
const _MAX_ADMIN_LOG_CHUNK_SIZE = 100;
const _MAX_PROFILE_PHOTO_CHUNK_SIZE = 100;
/**
 * Sends a chat action (e.g. "typing…") that repeats at a fixed interval until stopped.
 *
 * Supported action strings: `"typing"`, `"contact"`, `"game"`, `"location"`,
 * `"record-audio"` / `"record-voice"`, `"record-round"`, `"record-video"`,
 * `"audio"` / `"voice"` / `"song"`, `"round"`, `"video"`, `"photo"`,
 * `"document"` / `"file"`, `"cancel"`.
 * @internal
 */
class _ChatAction {
    static { this._str_mapping = {
        typing: new tl_1.Api.SendMessageTypingAction(),
        contact: new tl_1.Api.SendMessageChooseContactAction(),
        game: new tl_1.Api.SendMessageGamePlayAction(),
        location: new tl_1.Api.SendMessageGeoLocationAction(),
        "record-audio": new tl_1.Api.SendMessageRecordAudioAction(),
        "record-voice": new tl_1.Api.SendMessageRecordAudioAction(), //alias
        "record-round": new tl_1.Api.SendMessageRecordRoundAction(),
        "record-video": new tl_1.Api.SendMessageRecordVideoAction(),
        audio: new tl_1.Api.SendMessageUploadAudioAction({ progress: 1 }),
        voice: new tl_1.Api.SendMessageUploadAudioAction({ progress: 1 }), // alias
        song: new tl_1.Api.SendMessageUploadAudioAction({ progress: 1 }), // alias
        round: new tl_1.Api.SendMessageUploadRoundAction({ progress: 1 }),
        video: new tl_1.Api.SendMessageUploadVideoAction({ progress: 1 }),
        photo: new tl_1.Api.SendMessageUploadPhotoAction({ progress: 1 }),
        document: new tl_1.Api.SendMessageUploadDocumentAction({ progress: 1 }),
        file: new tl_1.Api.SendMessageUploadDocumentAction({ progress: 1 }), // alias
        cancel: new tl_1.Api.SendMessageCancelAction(),
    }; }
    constructor(client, chat, action, params = {
        delay: 4,
        autoCancel: true,
    }) {
        this._client = client;
        this._chat = chat;
        this._action = action;
        this._delay = params.delay;
        this.autoCancel = params.autoCancel;
        this._request = undefined;
        this._task = null;
        this._running = false;
    }
    async start() {
        this._request = new tl_1.Api.messages.SetTyping({
            peer: this._chat,
            action: this._action,
        });
        this._running = true;
        this._update();
    }
    async stop() {
        this._running = false;
        if (this.autoCancel) {
            await this._client.invoke(new tl_1.Api.messages.SetTyping({
                peer: this._chat,
                action: new tl_1.Api.SendMessageCancelAction(),
            }));
        }
    }
    async _update() {
        while (this._running) {
            if (this._request != undefined) {
                await this._client.invoke(this._request);
            }
            await (0, Helpers_1.sleep)(this._delay * 1000);
        }
    }
    progress(current, total) {
        if ("progress" in this._action) {
            this._action.progress = 100 * Math.round(current / total);
        }
    }
}
class _ParticipantsIter extends requestIter_1.RequestIter {
    async _init({ entity, filter, offset, search, showTotal, }) {
        if (!offset) {
            offset = 0;
        }
        if (filter && filter.constructor === Function) {
            if ([
                tl_1.Api.ChannelParticipantsBanned,
                tl_1.Api.ChannelParticipantsKicked,
                tl_1.Api.ChannelParticipantsSearch,
                tl_1.Api.ChannelParticipantsContacts,
            ].includes(filter)) {
                filter = new filter({
                    q: "",
                });
            }
            else {
                filter = new filter();
            }
        }
        entity = await this.client.getInputEntity(entity);
        const ty = helpers._entityType(entity);
        if (search && (filter || ty != helpers._EntityType.CHANNEL)) {
            // We need to 'search' ourselves unless we have a PeerChannel
            search = search.toLowerCase();
            this.filterEntity = (entity) => {
                return (utils
                    .getDisplayName(entity)
                    .toLowerCase()
                    .includes(search) ||
                    ("username" in entity ? entity.username || "" : "")
                        .toLowerCase()
                        .includes(search));
            };
        }
        else {
            this.filterEntity = (entity) => true;
        }
        // Only used for channels, but we should always set the attribute
        this.request = undefined;
        if (ty == helpers._EntityType.CHANNEL) {
            if (showTotal) {
                const channel = await this.client.api.channels.getFullChannel({ channel: utils.getInputChannel(entity) });
                if (channel.fullChat instanceof tl_1.Api.ChannelFull) {
                    this.total = channel.fullChat.participantsCount;
                }
            }
            if (this.total && this.total <= 0) {
                return false;
            }
            this.request = new tl_1.Api.channels.GetParticipants({
                channel: entity,
                filter: filter ||
                    new tl_1.Api.ChannelParticipantsSearch({
                        q: search || "",
                    }),
                offset,
                limit: _MAX_PARTICIPANTS_CHUNK_SIZE,
                hash: big_integer_1.default.zero,
            });
        }
        else if (ty == helpers._EntityType.CHAT) {
            if (!("chatId" in entity)) {
                throw new Error("Found chat without id " + JSON.stringify(entity));
            }
            const full = await this.client.api.messages.getFullChat({
                chatId: entity.chatId,
            });
            if (full.fullChat instanceof tl_1.Api.ChatFull) {
                if (!(full.fullChat.participants instanceof
                    tl_1.Api.ChatParticipantsForbidden)) {
                    this.total = full.fullChat.participants.participants.length;
                }
                else {
                    this.total = 0;
                    return false;
                }
                const users = new Map();
                for (const user of full.users) {
                    users.set(user.id.toString(), user);
                }
                for (const participant of full.fullChat.participants
                    .participants) {
                    const user = users.get(participant.userId.toString());
                    if (!user || !this.filterEntity(user)) {
                        continue;
                    }
                    user.participant = participant;
                    this.buffer?.push(user);
                }
                return true;
            }
        }
        else {
            this.total = 1;
            if (this.limit != 0) {
                const user = await this.client.getEntity(entity);
                if (this.filterEntity(user)) {
                    user.participant = undefined;
                    this.buffer?.push(user);
                }
            }
            return true;
        }
    }
    async _loadNextChunk() {
        while (this.request) {
            const request = this.request;
            request.limit = Math.min(this.left, _MAX_PARTICIPANTS_CHUNK_SIZE);
            const participants = await this.client.invoke(request);
            if (participants instanceof
                tl_1.Api.channels.ChannelParticipantsNotModified ||
                !participants.participants.length) {
                this.request = undefined;
                return true;
            }
            request.offset += participants.participants.length;
            const users = new Map();
            for (const user of participants.users) {
                users.set(user.id.toString(), user);
            }
            for (const participant of participants.participants) {
                const userId = "userId" in participant
                    ? participant.userId
                    : "peer" in participant && participant.peer instanceof tl_1.Api.PeerUser
                        ? participant.peer.userId
                        : undefined;
                const user = userId && users.get(userId.toString());
                if (!user || (this.filterEntity && !this.filterEntity(user))) {
                    continue;
                }
                user.participant = participant;
                this.buffer?.push(user);
            }
            if (this.buffer?.length)
                return undefined;
        }
        return true;
    }
    [Symbol.asyncIterator]() {
        return super[Symbol.asyncIterator]();
    }
}
exports._ParticipantsIter = _ParticipantsIter;
class _AdminLogIter extends requestIter_1.RequestIter {
    async _init(params) {
        const { entity, search, admins, minId, maxId, limit, ...filterArgs } = params;
        let eventsFilter = undefined;
        if (Object.values(filterArgs).find((element) => element === true)) {
            eventsFilter = new tl_1.Api.ChannelAdminLogEventsFilter({
                ...filterArgs,
            });
        }
        this.entity = await this.client.getInputEntity(entity);
        let adminList = undefined;
        if (admins) {
            adminList = [];
            for (const admin of admins) {
                adminList.push(await this.client.getInputEntity(admin));
            }
        }
        this.request = new tl_1.Api.channels.GetAdminLog({
            channel: this.entity,
            q: search || "",
            minId: minId ?? big_integer_1.default.zero,
            maxId: maxId ?? big_integer_1.default.zero,
            limit: 0,
            eventsFilter: eventsFilter,
            admins: adminList,
        });
    }
    async _loadNextChunk() {
        if (!this.request) {
            return true;
        }
        this.request.limit = Math.min(this.left, _MAX_ADMIN_LOG_CHUNK_SIZE);
        const r = await this.client.invoke(this.request);
        if (!r.events.length) {
            return true;
        }
        const entities = new Map();
        for (const entity of [...r.users, ...r.chats]) {
            entities.set(utils.getPeerId(entity), entity);
        }
        const eventIds = [];
        for (const e of r.events) {
            eventIds.push(e.id);
        }
        this.request.maxId = (0, Helpers_1.getMinBigInt)(eventIds);
        for (const ev of r.events) {
            if (ev.action instanceof tl_1.Api.ChannelAdminLogEventActionEditMessage) {
                try {
                    ev.action.prevMessage._finishInit?.(this.client, entities, this.entity);
                    ev.action.newMessage._finishInit?.(this.client, entities, this.entity);
                }
                catch (e) { }
            }
            this.buffer?.push(ev);
        }
        if (r.events.length < this.request.limit) {
            return true;
        }
    }
    [Symbol.asyncIterator]() {
        return super[Symbol.asyncIterator]();
    }
}
exports._AdminLogIter = _AdminLogIter;
/** @hidden */
function iterParticipants(client, entity, { limit, offset, search, filter, showTotal = true }) {
    return new _ParticipantsIter(client, limit ?? Number.MAX_SAFE_INTEGER, {}, {
        entity: entity,
        filter: filter,
        offset: offset ?? 0,
        search: search,
        showTotal: showTotal,
    });
}
/** @hidden */
async function getParticipants(client, entity, params) {
    const it = client.iterParticipants(entity, params);
    return (await it.collect());
}
/** @hidden */
async function kickParticipant(client, entity, participant) {
    const peer = await client.getInputEntity(entity);
    const user = await client.getInputEntity(participant);
    let resp;
    let request;
    const type = helpers._entityType(peer);
    if (type === helpers._EntityType.CHAT) {
        request = new tl_1.Api.messages.DeleteChatUser({
            chatId: (0, Helpers_1.returnBigInt)((0, Utils_1.getPeerId)(entity)),
            userId: (0, Helpers_1.returnBigInt)((0, Utils_1.getPeerId)(participant)),
        });
        resp = await client.invoke(request);
    }
    else if (type === helpers._EntityType.CHANNEL) {
        if (user instanceof tl_1.Api.InputPeerSelf) {
            request = new tl_1.Api.channels.LeaveChannel({
                channel: peer,
            });
            resp = await client.invoke(request);
        }
        else {
            request = new tl_1.Api.channels.EditBanned({
                channel: peer,
                participant: user,
                bannedRights: new tl_1.Api.ChatBannedRights({
                    untilDate: 0,
                    viewMessages: true,
                }),
            });
            resp = await client.invoke(request);
            await (0, Helpers_1.sleep)(500);
            await client.invoke(new tl_1.Api.channels.EditBanned({
                channel: peer,
                participant: user,
                bannedRights: new tl_1.Api.ChatBannedRights({ untilDate: 0 }),
            }));
        }
    }
    else {
        throw new Error("You must pass either a channel or a chat");
    }
    return client._getResponseMessage(request, resp, entity);
}
function _toBannedRights(params) {
    if (params instanceof tl_1.Api.ChatBannedRights) {
        return params;
    }
    const { untilDate, ...rights } = params;
    return new tl_1.Api.ChatBannedRights({
        ...rights,
        untilDate: untilDate instanceof Date
            ? Math.floor(untilDate.getTime() / 1000)
            : untilDate || 0,
    });
}
/** @hidden */
async function editBanned(client, entity, participant, params = { viewMessages: true }) {
    const channel = await client.getInputEntity(entity);
    const peer = await client.getInputEntity(participant);
    return client.invoke(new tl_1.Api.channels.EditBanned({
        channel: channel,
        participant: peer,
        bannedRights: _toBannedRights(params),
    }));
}
/** @hidden */
async function editAdmin(client, entity, participant, params) {
    const peer = await client.getInputEntity(entity);
    const user = await client.getInputEntity(participant);
    const type = helpers._entityType(peer);
    if (type === helpers._EntityType.CHAT) {
        const isAdmin = params instanceof tl_1.Api.ChatAdminRights ||
            Object.entries(params).some(([key, value]) => key !== "rank" && value === true);
        return client.invoke(new tl_1.Api.messages.EditChatAdmin({
            chatId: (0, Helpers_1.returnBigInt)(utils.getPeerId(peer, false)),
            userId: user,
            isAdmin: isAdmin,
        }));
    }
    let rights;
    let rank;
    if (params instanceof tl_1.Api.ChatAdminRights) {
        rights = params;
    }
    else {
        const { rank: paramsRank, ...flags } = params;
        rank = paramsRank;
        rights = new tl_1.Api.ChatAdminRights({ ...flags });
    }
    return client.invoke(new tl_1.Api.channels.EditAdmin({
        channel: peer,
        userId: user,
        adminRights: rights,
        rank: rank,
    }));
}
/** @hidden */
async function editChatDefaultBannedRights(client, entity, params) {
    const peer = await client.getInputEntity(entity);
    return client.invoke(new tl_1.Api.messages.EditChatDefaultBannedRights({
        peer: peer,
        bannedRights: _toBannedRights(params),
    }));
}
/** @hidden */
async function getParticipant(client, entity, participant) {
    const channel = await client.getInputEntity(entity);
    if (helpers._entityType(channel) !== helpers._EntityType.CHANNEL) {
        throw new Error("getParticipant is only available for channels and supergroups; use getParticipants for small group chats");
    }
    const peer = await client.getInputEntity(participant);
    return client.api.channels.getParticipant({
        channel: utils.getInputChannel(channel),
        participant: peer,
    });
}
// endregion
// region chat info
/** @hidden */
async function editTitle(client, entity, title) {
    const peer = await client.getInputEntity(entity);
    if (helpers._entityType(peer) === helpers._EntityType.CHAT) {
        return client.invoke(new tl_1.Api.messages.EditChatTitle({
            chatId: (0, Helpers_1.returnBigInt)(utils.getPeerId(peer, false)),
            title: title,
        }));
    }
    return client.api.channels.editTitle({ channel: utils.getInputChannel(peer), title: title });
}
/** @hidden */
async function editPhoto(client, entity, photo) {
    const peer = await client.getInputEntity(entity);
    let chatPhoto;
    if (photo == undefined) {
        chatPhoto = new tl_1.Api.InputChatPhotoEmpty();
    }
    else if (photo instanceof tl_1.Api.InputChatPhotoEmpty ||
        photo instanceof tl_1.Api.InputChatUploadedPhoto ||
        photo instanceof tl_1.Api.InputChatPhoto) {
        chatPhoto = photo;
    }
    else {
        const { fileHandle } = await (0, uploads_1._fileToMedia)(client, {
            file: photo,
            asImage: true,
        });
        if (!fileHandle) {
            throw new Error(`Cannot use ${photo} as a chat photo`);
        }
        chatPhoto = new tl_1.Api.InputChatUploadedPhoto({ file: fileHandle });
    }
    if (helpers._entityType(peer) === helpers._EntityType.CHAT) {
        return client.invoke(new tl_1.Api.messages.EditChatPhoto({
            chatId: (0, Helpers_1.returnBigInt)(utils.getPeerId(peer, false)),
            photo: chatPhoto,
        }));
    }
    return client.invoke(new tl_1.Api.channels.EditPhoto({ channel: peer, photo: chatPhoto }));
}
/** @hidden */
async function editChatAbout(client, entity, about) {
    const peer = await client.getInputEntity(entity);
    return client.api.messages.editChatAbout({ peer: peer, about: about });
}
/** @hidden */
async function toggleSlowMode(client, entity, seconds = 0) {
    const channel = await client.getInputEntity(entity);
    return client.api.channels.toggleSlowMode({
        channel: utils.getInputChannel(channel),
        seconds: seconds,
    });
}
/** @hidden */
async function createChannel(client, params) {
    const result = await client.invoke(new tl_1.Api.channels.CreateChannel({
        title: params.title,
        about: params.about || "",
        broadcast: !params.megagroup,
        megagroup: params.megagroup,
        forum: params.forum,
        forImport: params.forImport,
        geoPoint: params.geoPoint,
        address: params.address,
        ttlPeriod: params.ttlPeriod,
    }));
    if ("chats" in result) {
        for (const chat of result.chats) {
            if (chat instanceof tl_1.Api.Channel) {
                return chat;
            }
        }
    }
    throw new Error("Could not find the created channel in the response");
}
/** @hidden */
async function createChat(client, params) {
    const users = [];
    for (const user of params.users) {
        users.push((await client.getInputEntity(user)));
    }
    const result = await client.invoke(new tl_1.Api.messages.CreateChat({
        title: params.title,
        users: users,
        ttlPeriod: params.ttlPeriod,
    }));
    if ("chats" in result.updates) {
        for (const chat of result.updates.chats) {
            if (chat instanceof tl_1.Api.Chat) {
                return { chat, missingInvitees: result.missingInvitees };
            }
        }
    }
    throw new Error("Could not find the created chat in the response");
}
/** @hidden */
async function joinChannel(client, entity) {
    const channel = await client.getInputEntity(entity);
    return client.api.channels.joinChannel({ channel: utils.getInputChannel(channel) });
}
/** @hidden */
async function importChatInvite(client, link) {
    return client.api.messages.importChatInvite({
        hash: (0, inviteLinks_1._parseInviteHash)(link),
    });
}
/** @hidden */
async function leaveChannel(client, entity) {
    const channel = await client.getInputEntity(entity);
    return client.api.channels.leaveChannel({ channel: utils.getInputChannel(channel) });
}
/** @hidden */
async function deleteHistory(client, entity, params = {}) {
    const peer = await client.getInputEntity(entity);
    if (helpers._entityType(peer) === helpers._EntityType.CHANNEL) {
        return client.api.channels.deleteHistory({
            channel: utils.getInputChannel(peer),
            maxId: params.maxId ?? 0,
            forEveryone: params.revoke,
        });
    }
    return client.api.messages.deleteHistory({
        peer: peer,
        maxId: params.maxId ?? 0,
        revoke: params.revoke,
        justClear: params.justClear,
        minDate: params.minDate,
        maxDate: params.maxDate,
    });
}
/** @hidden */
async function editPeerFolders(client, entity, folderId) {
    const entities = Array.isArray(entity) ? entity : [entity];
    const folderPeers = [];
    for (const e of entities) {
        folderPeers.push(new tl_1.Api.InputFolderPeer({
            peer: await client.getInputEntity(e),
            folderId: folderId,
        }));
    }
    return client.invoke(new tl_1.Api.folders.EditPeerFolders({ folderPeers: folderPeers }));
}
/** @hidden */
async function setTyping(client, entity, action = "typing", params = {}) {
    const peer = await client.getInputEntity(entity);
    let resolved;
    if (typeof action === "string") {
        resolved = _ChatAction._str_mapping[action];
        if (!resolved) {
            throw new Error(`Unknown chat action: ${action}`);
        }
    }
    else {
        resolved = action;
    }
    return client.invoke(new tl_1.Api.messages.SetTyping({
        peer: peer,
        action: resolved,
        topMsgId: params.topMsgId,
    }));
}
/** @hidden */
function iterAdminLog(client, entity, params = {}) {
    return new _AdminLogIter(client, params.limit ?? Number.MAX_SAFE_INTEGER, {}, {
        entity: entity,
        ...params,
    });
}
/** @hidden */
async function getAdminLog(client, entity, params = {}) {
    return (await iterAdminLog(client, entity, params).collect());
}
