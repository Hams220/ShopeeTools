"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports._ChatInviteImportersIter = exports._ExportedChatInvitesIter = void 0;
exports._parseInviteHash = _parseInviteHash;
exports.exportChatInvite = exportChatInvite;
exports.editExportedChatInvite = editExportedChatInvite;
exports.getExportedChatInvite = getExportedChatInvite;
exports.deleteExportedChatInvite = deleteExportedChatInvite;
exports.deleteRevokedExportedChatInvites = deleteRevokedExportedChatInvites;
exports.getAdminsWithInvites = getAdminsWithInvites;
exports.iterExportedChatInvites = iterExportedChatInvites;
exports.getExportedChatInvites = getExportedChatInvites;
exports.iterChatInviteImporters = iterChatInviteImporters;
exports.getChatInviteImporters = getChatInviteImporters;
exports.hideChatJoinRequest = hideChatJoinRequest;
exports.hideAllChatJoinRequests = hideAllChatJoinRequests;
exports.checkChatInvite = checkChatInvite;
const requestIter_1 = require("../../requestIter");
const tl_1 = require("../../tl");
const _MAX_INVITES_CHUNK_SIZE = 100;
const _MAX_IMPORTERS_CHUNK_SIZE = 100;
/**
 * Extracts the hash from an invite link (`t.me/+hash`, `t.me/joinchat/hash`)
 * or returns the input unchanged if it is already a bare hash.
 * @hidden
 */
function _parseInviteHash(link) {
    const trimmed = link.trim();
    const match = trimmed.match(/(?:t\.me\/|telegram\.me\/|telegram\.dog\/)?(?:joinchat\/|\+)([a-zA-Z0-9_-]+)\/?$/);
    return match ? match[1] : trimmed;
}
function _toDate(value) {
    return value instanceof Date
        ? Math.floor(value.getTime() / 1000)
        : value;
}
/** @hidden */
async function exportChatInvite(client, entity, params = {}) {
    const peer = await client.getInputEntity(entity);
    return client.invoke(new tl_1.Api.messages.ExportChatInvite({
        peer: peer,
        title: params.title,
        expireDate: _toDate(params.expireDate),
        usageLimit: params.usageLimit,
        requestNeeded: params.requestNeeded,
        legacyRevokePermanent: params.legacyRevokePermanent,
        subscriptionPricing: params.subscriptionPricing,
    }));
}
/** @hidden */
async function editExportedChatInvite(client, entity, link, params) {
    const peer = await client.getInputEntity(entity);
    return client.invoke(new tl_1.Api.messages.EditExportedChatInvite({
        peer: peer,
        link: link,
        revoked: params.revoked,
        expireDate: _toDate(params.expireDate),
        usageLimit: params.usageLimit,
        requestNeeded: params.requestNeeded,
        title: params.title,
    }));
}
/** @hidden */
async function getExportedChatInvite(client, entity, link) {
    const peer = await client.getInputEntity(entity);
    return client.api.messages.getExportedChatInvite({
        peer: peer,
        link: link,
    });
}
/** @hidden */
async function deleteExportedChatInvite(client, entity, link) {
    const peer = await client.getInputEntity(entity);
    return client.api.messages.deleteExportedChatInvite({
        peer: peer,
        link: link,
    });
}
/** @hidden */
async function deleteRevokedExportedChatInvites(client, entity, admin) {
    const peer = await client.getInputEntity(entity);
    const adminId = admin
        ? await client.getInputEntity(admin)
        : new tl_1.Api.InputUserSelf();
    return client.invoke(new tl_1.Api.messages.DeleteRevokedExportedChatInvites({
        peer: peer,
        adminId: adminId,
    }));
}
/** @hidden */
async function getAdminsWithInvites(client, entity) {
    const peer = await client.getInputEntity(entity);
    return client.api.messages.getAdminsWithInvites({ peer: peer });
}
class _ExportedChatInvitesIter extends requestIter_1.RequestIter {
    async _init(params) {
        const peer = await this.client.getInputEntity(params.entity);
        const adminId = params.admin
            ? await this.client.getInputEntity(params.admin)
            : new tl_1.Api.InputUserSelf();
        this.request = new tl_1.Api.messages.GetExportedChatInvites({
            peer: peer,
            adminId: adminId,
            revoked: params.revoked,
            limit: 0,
        });
    }
    async _loadNextChunk() {
        if (!this.request) {
            return true;
        }
        this.request.limit = Math.min(this.left, _MAX_INVITES_CHUNK_SIZE);
        const result = await this.client.invoke(this.request);
        this.total = result.count;
        if (!result.invites.length) {
            return true;
        }
        for (const invite of result.invites) {
            this.buffer?.push(invite);
        }
        const last = result.invites[result.invites.length - 1];
        if (!(last instanceof tl_1.Api.ChatInviteExported)) {
            return true;
        }
        this.request.offsetDate = last.date;
        this.request.offsetLink = last.link;
        if (result.invites.length < this.request.limit) {
            return true;
        }
    }
    [Symbol.asyncIterator]() {
        return super[Symbol.asyncIterator]();
    }
}
exports._ExportedChatInvitesIter = _ExportedChatInvitesIter;
/** @hidden */
function iterExportedChatInvites(client, entity, params = {}) {
    return new _ExportedChatInvitesIter(client, params.limit ?? Number.MAX_SAFE_INTEGER, {}, { entity: entity, ...params });
}
/** @hidden */
async function getExportedChatInvites(client, entity, params = {}) {
    return (await iterExportedChatInvites(client, entity, params).collect());
}
class _ChatInviteImportersIter extends requestIter_1.RequestIter {
    async _init(params) {
        const peer = await this.client.getInputEntity(params.entity);
        this.request = new tl_1.Api.messages.GetChatInviteImporters({
            peer: peer,
            link: params.link,
            requested: params.requested,
            subscriptionExpired: params.subscriptionExpired,
            q: params.search,
            offsetDate: 0,
            offsetUser: new tl_1.Api.InputUserEmpty(),
            limit: 0,
        });
    }
    async _loadNextChunk() {
        if (!this.request) {
            return true;
        }
        this.request.limit = Math.min(this.left, _MAX_IMPORTERS_CHUNK_SIZE);
        const result = await this.client.invoke(this.request);
        this.total = result.count;
        if (!result.importers.length) {
            return true;
        }
        for (const importer of result.importers) {
            this.buffer?.push(importer);
        }
        const last = result.importers[result.importers.length - 1];
        this.request.offsetDate = last.date;
        this.request.offsetUser = (await this.client.getInputEntity(last.userId));
        if (result.importers.length < this.request.limit) {
            return true;
        }
    }
    [Symbol.asyncIterator]() {
        return super[Symbol.asyncIterator]();
    }
}
exports._ChatInviteImportersIter = _ChatInviteImportersIter;
/** @hidden */
function iterChatInviteImporters(client, entity, params = {}) {
    return new _ChatInviteImportersIter(client, params.limit ?? Number.MAX_SAFE_INTEGER, {}, { entity: entity, ...params });
}
/** @hidden */
async function getChatInviteImporters(client, entity, params = {}) {
    return (await iterChatInviteImporters(client, entity, params).collect());
}
/** @hidden */
async function hideChatJoinRequest(client, entity, user, params = {}) {
    const peer = await client.getInputEntity(entity);
    const userId = await client.getInputEntity(user);
    return client.invoke(new tl_1.Api.messages.HideChatJoinRequest({
        peer: peer,
        userId: userId,
        approved: params.approved,
    }));
}
/** @hidden */
async function hideAllChatJoinRequests(client, entity, params = {}) {
    const peer = await client.getInputEntity(entity);
    return client.invoke(new tl_1.Api.messages.HideAllChatJoinRequests({
        peer: peer,
        approved: params.approved,
        link: params.link,
    }));
}
/** @hidden */
async function checkChatInvite(client, link) {
    return client.api.messages.checkChatInvite({
        hash: _parseInviteHash(link),
    });
}
