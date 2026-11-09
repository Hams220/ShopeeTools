"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendStory = sendStory;
exports.editStory = editStory;
exports.deleteStories = deleteStories;
exports.toggleStoriesPinned = toggleStoriesPinned;
exports.canSendStory = canSendStory;
exports.getAllStories = getAllStories;
exports.getPeerStories = getPeerStories;
exports.getStoriesByID = getStoriesByID;
exports.getPinnedStories = getPinnedStories;
exports.getStoriesArchive = getStoriesArchive;
exports.readStories = readStories;
exports.incrementStoryViews = incrementStoryViews;
exports.getStoryViewsList = getStoryViewsList;
exports.exportStoryLink = exportStoryLink;
exports.sendStoryReaction = sendStoryReaction;
const Helpers_1 = require("../../Helpers");
const tl_1 = require("../../tl");
const uploads_1 = require("./uploads");
const messageParse_1 = require("./messageParse");
async function _toStoryMedia(client, media) {
    const converted = await (0, uploads_1._fileToMedia)(client, { file: media });
    if (!converted.media) {
        throw new Error(`Cannot use ${media} as story media`);
    }
    return converted.media;
}
/** @hidden */
async function sendStory(client, entity, params) {
    const peer = await client.getInputEntity(entity);
    let caption = params.caption;
    let entities = params.entities;
    if (caption != undefined && entities == undefined) {
        [caption, entities] = await (0, messageParse_1._parseMessageText)(client, caption, params.parseMode);
    }
    return client.invoke(new tl_1.Api.stories.SendStory({
        peer: peer,
        media: await _toStoryMedia(client, params.media),
        caption: caption,
        entities: entities,
        privacyRules: params.privacyRules ?? [
            new tl_1.Api.InputPrivacyValueAllowAll(),
        ],
        pinned: params.pinned,
        noforwards: params.noforwards,
        period: params.period,
        mediaAreas: params.mediaAreas,
        fwdFromId: params.fwdFromId
            ? await client.getInputEntity(params.fwdFromId)
            : undefined,
        fwdFromStory: params.fwdFromStory,
        fwdModified: params.fwdModified,
        albums: params.albums,
        music: params.music,
        randomId: (0, Helpers_1.generateRandomBigInt)(),
    }));
}
/** @hidden */
async function editStory(client, entity, storyId, params) {
    const peer = await client.getInputEntity(entity);
    let caption = params.caption;
    let entities = params.entities;
    if (caption != undefined && entities == undefined) {
        [caption, entities] = await (0, messageParse_1._parseMessageText)(client, caption, params.parseMode);
    }
    return client.invoke(new tl_1.Api.stories.EditStory({
        peer: peer,
        id: storyId,
        media: params.media
            ? await _toStoryMedia(client, params.media)
            : undefined,
        caption: caption,
        entities: entities,
        privacyRules: params.privacyRules,
        mediaAreas: params.mediaAreas,
        music: params.music,
    }));
}
/** @hidden */
async function deleteStories(client, entity, ids) {
    const peer = await client.getInputEntity(entity);
    return client.invoke(new tl_1.Api.stories.DeleteStories({
        peer: peer,
        id: Array.isArray(ids) ? ids : [ids],
    }));
}
/** @hidden */
async function toggleStoriesPinned(client, entity, ids, pinned = true) {
    const peer = await client.getInputEntity(entity);
    return client.invoke(new tl_1.Api.stories.TogglePinned({
        peer: peer,
        id: Array.isArray(ids) ? ids : [ids],
        pinned: pinned,
    }));
}
/** @hidden */
async function canSendStory(client, entity) {
    const peer = await client.getInputEntity(entity);
    return client.api.stories.canSendStory({ peer: peer });
}
/** @hidden */
async function getAllStories(client, params = {}) {
    return client.api.stories.getAllStories({
        next: params.next,
        hidden: params.hidden,
        state: params.state,
    });
}
/** @hidden */
async function getPeerStories(client, entity) {
    const peer = await client.getInputEntity(entity);
    return client.api.stories.getPeerStories({ peer: peer });
}
/** @hidden */
async function getStoriesByID(client, entity, ids) {
    const peer = await client.getInputEntity(entity);
    return client.api.stories.getStoriesByID({
        peer: peer,
        id: Array.isArray(ids) ? ids : [ids],
    });
}
/** @hidden */
async function getPinnedStories(client, entity, params = {}) {
    const peer = await client.getInputEntity(entity);
    return client.api.stories.getPinnedStories({
        peer: peer,
        offsetId: params.offsetId ?? 0,
        limit: params.limit ?? 100,
    });
}
/** @hidden */
async function getStoriesArchive(client, entity, params = {}) {
    const peer = await client.getInputEntity(entity);
    return client.api.stories.getStoriesArchive({
        peer: peer,
        offsetId: params.offsetId ?? 0,
        limit: params.limit ?? 100,
    });
}
/** @hidden */
async function readStories(client, entity, maxId) {
    const peer = await client.getInputEntity(entity);
    return client.api.stories.readStories({
        peer: peer,
        maxId: maxId ?? 0,
    });
}
/** @hidden */
async function incrementStoryViews(client, entity, ids) {
    const peer = await client.getInputEntity(entity);
    return client.api.stories.incrementStoryViews({
        peer: peer,
        id: Array.isArray(ids) ? ids : [ids],
    });
}
/** @hidden */
async function getStoryViewsList(client, entity, storyId, params = {}) {
    const peer = await client.getInputEntity(entity);
    return client.invoke(new tl_1.Api.stories.GetStoryViewsList({
        peer: peer,
        id: storyId,
        justContacts: params.justContacts,
        reactionsFirst: params.reactionsFirst,
        forwardsFirst: params.forwardsFirst,
        q: params.search,
        offset: params.offset ?? "",
        limit: params.limit ?? 100,
    }));
}
/** @hidden */
async function exportStoryLink(client, entity, storyId) {
    const peer = await client.getInputEntity(entity);
    return client.api.stories.exportStoryLink({ peer: peer, id: storyId });
}
/** @hidden */
async function sendStoryReaction(client, entity, storyId, reaction, params = {}) {
    const peer = await client.getInputEntity(entity);
    let resolved;
    if (reaction == undefined) {
        resolved = new tl_1.Api.ReactionEmpty();
    }
    else if (typeof reaction === "string") {
        resolved = new tl_1.Api.ReactionEmoji({ emoticon: reaction });
    }
    else if (reaction instanceof tl_1.Api.ReactionEmoji ||
        reaction instanceof tl_1.Api.ReactionCustomEmoji ||
        reaction instanceof tl_1.Api.ReactionPaid ||
        reaction instanceof tl_1.Api.ReactionEmpty) {
        resolved = reaction;
    }
    else {
        resolved = new tl_1.Api.ReactionCustomEmoji({
            documentId: reaction,
        });
    }
    return client.invoke(new tl_1.Api.stories.SendReaction({
        peer: peer,
        storyId: storyId,
        reaction: resolved,
        addToRecent: params.addToRecent,
    }));
}
