"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createForumTopic = createForumTopic;
exports.editForumTopic = editForumTopic;
exports.updatePinnedForumTopic = updatePinnedForumTopic;
exports.reorderPinnedForumTopics = reorderPinnedForumTopics;
exports.getForumTopics = getForumTopics;
exports.getForumTopicsByID = getForumTopicsByID;
exports.toggleForum = toggleForum;
exports.toggleViewForumAsMessages = toggleViewForumAsMessages;
const Helpers_1 = require("../../Helpers");
const tl_1 = require("../../tl");
const Utils_1 = require("../../Utils");
/** @hidden */
async function createForumTopic(client, entity, params) {
    const peer = await client.getInputEntity(entity);
    return client.invoke(new tl_1.Api.messages.CreateForumTopic({
        peer: peer,
        title: params.title,
        iconColor: params.iconColor,
        iconEmojiId: params.iconEmojiId,
        titleMissing: params.titleMissing,
        randomId: (0, Helpers_1.generateRandomBigInt)(),
        sendAs: params.sendAs
            ? await client.getInputEntity(params.sendAs)
            : undefined,
    }));
}
/** @hidden */
async function editForumTopic(client, entity, topicId, params) {
    const peer = await client.getInputEntity(entity);
    return client.invoke(new tl_1.Api.messages.EditForumTopic({
        peer: peer,
        topicId: topicId,
        title: params.title,
        iconEmojiId: params.iconEmojiId,
        closed: params.closed,
        hidden: params.hidden,
    }));
}
/** @hidden */
async function updatePinnedForumTopic(client, entity, topicId, pinned) {
    const peer = await client.getInputEntity(entity);
    return client.invoke(new tl_1.Api.messages.UpdatePinnedForumTopic({
        peer: peer,
        topicId: topicId,
        pinned: pinned,
    }));
}
/** @hidden */
async function reorderPinnedForumTopics(client, entity, order, params = {}) {
    const peer = await client.getInputEntity(entity);
    return client.invoke(new tl_1.Api.messages.ReorderPinnedForumTopics({
        peer: peer,
        order: order,
        force: params.force,
    }));
}
/** @hidden */
async function getForumTopics(client, entity, params = {}) {
    const peer = await client.getInputEntity(entity);
    return client.invoke(new tl_1.Api.messages.GetForumTopics({
        peer: peer,
        q: params.search,
        offsetDate: params.offsetDate ?? 0,
        offsetId: params.offsetId ?? 0,
        offsetTopic: params.offsetTopic ?? 0,
        limit: params.limit ?? 100,
    }));
}
/** @hidden */
async function getForumTopicsByID(client, entity, topicIds) {
    const peer = await client.getInputEntity(entity);
    return client.invoke(new tl_1.Api.messages.GetForumTopicsByID({
        peer: peer,
        topics: Array.isArray(topicIds) ? topicIds : [topicIds],
    }));
}
/** @hidden */
async function toggleForum(client, entity, enabled, tabs = false) {
    const channel = await client.getInputEntity(entity);
    return client.api.channels.toggleForum({
        channel: (0, Utils_1.getInputChannel)(channel),
        enabled: enabled,
        tabs: tabs,
    });
}
/** @hidden */
async function toggleViewForumAsMessages(client, entity, enabled) {
    const channel = await client.getInputEntity(entity);
    return client.api.channels.toggleViewForumAsMessages({
        channel: (0, Utils_1.getInputChannel)(channel),
        enabled: enabled,
    });
}
