"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommunityPeerLinkRequestsIter = void 0;
exports.createCommunity = createCommunity;
exports.getCommunity = getCommunity;
exports.getJoinedCommunities = getJoinedCommunities;
exports.getCommunityPeers = getCommunityPeers;
exports.setCommunityPeerLink = setCommunityPeerLink;
exports.setCommunityCollapsed = setCommunityCollapsed;
exports.iterCommunityPeerLinkRequests = iterCommunityPeerLinkRequests;
exports.getCommunityPeerLinkRequests = getCommunityPeerLinkRequests;
exports.setCommunityPeerLinkRequestApproval = setCommunityPeerLinkRequestApproval;
exports.setAllCommunityPeerLinkRequestsApproval = setAllCommunityPeerLinkRequestsApproval;
exports.setCommunityParticipantBanned = setCommunityParticipantBanned;
exports.getCommunityParticipantJoinedChats = getCommunityParticipantJoinedChats;
exports.pinCommunity = pinCommunity;
exports.getCommunityNotifySettings = getCommunityNotifySettings;
exports.updateCommunityNotifySettings = updateCommunityNotifySettings;
const tl_1 = require("../../tl");
const Utils_1 = require("../../Utils");
const requestIter_1 = require("../../requestIter");
const Helpers_1 = require("../../Helpers");
/** Creates a community and returns its entity. */
async function createCommunity(client, params) {
    const result = await client.invoke(new tl_1.Api.communities.Create({
        title: params.title,
        peer: await client.getInputEntity(params.peer),
        about: params.about,
        hidden: params.hidden,
    }));
    if (result instanceof tl_1.Api.Updates || result instanceof tl_1.Api.UpdatesCombined) {
        const community = result.chats.find((chat) => chat instanceof tl_1.Api.Community);
        if (community)
            return community;
    }
    throw new Error("Telegram did not return the created community");
}
/** Fetches full community details and linked peers. */
async function getCommunity(client, community) {
    const result = await client.invoke(new tl_1.Api.channels.GetFullChannel({
        channel: (0, Utils_1.getInputChannel)(await client.getInputEntity(community)),
    }));
    if (!(result.fullChat instanceof tl_1.Api.CommunityFull)) {
        throw new Error("The entity is not a community");
    }
    return result;
}
/** Lists joined communities, retaining forbidden entries. */
async function getJoinedCommunities(client) {
    const result = await client.invoke(new tl_1.Api.communities.GetJoinedCommunities());
    const communities = new Helpers_1.TotalList();
    for (const chat of result.chats) {
        if (chat instanceof tl_1.Api.Community || chat instanceof tl_1.Api.CommunityForbidden) {
            communities.push(chat);
        }
    }
    communities.total = result instanceof tl_1.Api.messages.ChatsSlice
        ? result.count
        : communities.length;
    return communities;
}
/** Lists linked peers with visibility and history access metadata. */
async function getCommunityPeers(client, community) {
    const result = await getCommunity(client, community);
    const entities = new Map([...result.chats, ...result.users].map((entity) => [(0, Utils_1.getPeerId)(entity), entity]));
    return result.fullChat.linkedPeers.map((peer) => Object.assign(peer, {
        entity: entities.get((0, Utils_1.getPeerId)(peer.peer)),
    }));
}
/** Adds, changes visibility of, or removes a peer link. */
async function setCommunityPeerLink(client, community, peer, action) {
    if (!["visible", "hidden", "deleted"].includes(action)) {
        throw new Error("Community peer link action must be visible, hidden or deleted");
    }
    return client.invoke(new tl_1.Api.communities.TogglePeerLink({
        community: (0, Utils_1.getInputChannel)(await client.getInputEntity(community)),
        peer: await client.getInputEntity(peer),
        visible: action === "visible" || undefined,
        hidden: action === "hidden" || undefined,
        deleted: action === "deleted" || undefined,
    }));
}
/** Groups or expands the community in the dialog list. */
async function setCommunityCollapsed(client, community, collapsed) {
    return client.invoke(new tl_1.Api.communities.ToggleCommunityCollapsedInDialogs({
        community: (0, Utils_1.getInputChannel)(await client.getInputEntity(community)),
        collapsed: collapsed || undefined,
    }));
}
/** Iterates pending peer links using Telegram’s opaque pagination cursor. */
class CommunityPeerLinkRequestsIter extends requestIter_1.RequestIter {
    constructor() {
        super(...arguments);
        this.offsets = new Set();
    }
    async _init({ community, offset }) {
        this.offsets.clear();
        this.request = new tl_1.Api.communities.GetPeerLinkRequests({
            community: (0, Utils_1.getInputChannel)(await this.client.getInputEntity(community)),
            offset,
            limit: Math.min(this.left || 1, 100),
        });
        if (this.left === 0) {
            this.total = (await this.client.invoke(this.request)).totalCount;
            return true;
        }
    }
    async _loadNextChunk() {
        while (this.request) {
            const request = this.request;
            this.offsets.add(request.offset);
            request.limit = Math.min(this.left, 100);
            const result = await this.client.invoke(request);
            this.total = result.totalCount;
            const entities = new Map([...result.chats, ...result.users].map((entity) => [(0, Utils_1.getPeerId)(entity), entity]));
            const users = new Map(result.users.map((user) => [user.id.toString(), user]));
            for (const entry of result.requests) {
                const requestedBy = users.get(entry.requestedBy.toString());
                this.buffer.push(Object.assign(entry, {
                    entity: entities.get((0, Utils_1.getPeerId)(entry.peer)),
                    requestedByUser: requestedBy instanceof tl_1.Api.User ? requestedBy : undefined,
                }));
            }
            if (!result.nextOffset || this.offsets.has(result.nextOffset)) {
                this.request = undefined;
                return true;
            }
            request.offset = result.nextOffset;
            if (this.buffer.length)
                return undefined;
        }
        return true;
    }
    [Symbol.asyncIterator]() {
        return super[Symbol.asyncIterator]();
    }
}
exports.CommunityPeerLinkRequestsIter = CommunityPeerLinkRequestsIter;
/** Iterates pending links with requester and peer metadata. */
function iterCommunityPeerLinkRequests(client, community, params = {}) {
    return new CommunityPeerLinkRequestsIter(client, params.limit, {
        waitTime: params.waitTime,
    }, { community, offset: params.offset ?? "" });
}
/** Collects pending peer links and their total count. */
async function getCommunityPeerLinkRequests(client, community, params = {}) {
    return (await iterCommunityPeerLinkRequests(client, community, params).collect());
}
/** Approves a peer link request, or rejects it when approved is false. */
async function setCommunityPeerLinkRequestApproval(client, community, peer, approved) {
    return client.invoke(new tl_1.Api.communities.TogglePeerLinkRequestApproval({
        community: (0, Utils_1.getInputChannel)(await client.getInputEntity(community)),
        peer: await client.getInputEntity(peer),
        reject: !approved || undefined,
    }));
}
/** Approves or rejects all pending peer link requests. */
async function setAllCommunityPeerLinkRequestsApproval(client, community, approved) {
    return client.invoke(new tl_1.Api.communities.ToggleAllPeerLinkRequestApproval({
        community: (0, Utils_1.getInputChannel)(await client.getInputEntity(community)),
        reject: !approved || undefined,
    }));
}
/** Bans a participant across the community, or unbans when banned is false. */
async function setCommunityParticipantBanned(client, community, participant, banned) {
    return client.invoke(new tl_1.Api.communities.ToggleParticipantBanned({
        community: (0, Utils_1.getInputChannel)(await client.getInputEntity(community)),
        participant: await client.getInputEntity(participant),
        unban: !banned || undefined,
    }));
}
/** Returns the community chats a participant owns or has joined. */
async function getCommunityParticipantJoinedChats(client, community, participant) {
    return client.invoke(new tl_1.Api.communities.GetParticipantJoinedChats({
        community: (0, Utils_1.getInputChannel)(await client.getInputEntity(community)),
        participant: await client.getInputEntity(participant),
    }));
}
/** Pins or unpins the community's grouped dialog. */
async function pinCommunity(client, community, pinned = true) {
    return client.invoke(new tl_1.Api.messages.ToggleDialogPin({
        peer: new tl_1.Api.InputDialogPeerCommunity({
            community: (0, Utils_1.getInputChannel)(await client.getInputEntity(community)),
        }),
        pinned: pinned || undefined,
    }));
}
/** Fetches notification settings using the community notification scope. */
async function getCommunityNotifySettings(client, community) {
    return client.getNotifySettings(new tl_1.Api.InputNotifyCommunity({
        community: (0, Utils_1.getInputChannel)(await client.getInputEntity(community)),
    }));
}
/** Updates notification settings for the community notification scope. */
async function updateCommunityNotifySettings(client, community, params) {
    return client.updateNotifySettings(new tl_1.Api.InputNotifyCommunity({
        community: (0, Utils_1.getInputChannel)(await client.getInputEntity(community)),
    }), params);
}
