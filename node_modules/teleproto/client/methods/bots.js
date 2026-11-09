"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.inlineQuery = inlineQuery;
exports.setBotCommands = setBotCommands;
exports.getBotCommands = getBotCommands;
exports.resetBotCommands = resetBotCommands;
exports.setBotInfo = setBotInfo;
exports.getBotInfo = getBotInfo;
exports.setBotMenuButton = setBotMenuButton;
exports.getBotMenuButton = getBotMenuButton;
exports.addBotUsername = addBotUsername;
exports.removeBotUsername = removeBotUsername;
exports.checkBotUsername = checkBotUsername;
exports.setBotVerification = setBotVerification;
const tl_1 = require("../../tl");
const inlineResults_1 = require("../../tl/custom/inlineResults");
var GetInlineBotResults = tl_1.Api.messages.GetInlineBotResults;
const messageParse_1 = require("./messageParse");
// BotMethods
/** @hidden */
async function inlineQuery(client, bot, query, entity, offset, geoPoint) {
    bot = await client.getInputEntity(bot);
    let peer = new tl_1.Api.InputPeerSelf();
    if (entity) {
        peer = await client.getInputEntity(entity);
    }
    const result = await client.invoke(new GetInlineBotResults({
        bot: bot,
        peer: peer,
        query: query,
        offset: offset || "",
        geoPoint: geoPoint,
    }));
    return new inlineResults_1.InlineResults(client, result, entity ? peer : undefined);
}
/** @hidden */
async function setBotCommands(client, commands, params = {}) {
    return client.invoke(new tl_1.Api.bots.SetBotCommands({
        scope: params.scope ?? new tl_1.Api.BotCommandScopeDefault(),
        langCode: params.langCode ?? "",
        commands: commands.map((command) => new tl_1.Api.BotCommand({
            command: command.command,
            description: command.description,
            ephemeral: command.ephemeral,
        })),
    }));
}
/** @hidden */
async function getBotCommands(client, params = {}) {
    return client.invoke(new tl_1.Api.bots.GetBotCommands({
        scope: params.scope ?? new tl_1.Api.BotCommandScopeDefault(),
        langCode: params.langCode ?? "",
    }));
}
/** @hidden */
async function resetBotCommands(client, params = {}) {
    return client.invoke(new tl_1.Api.bots.ResetBotCommands({
        scope: params.scope ?? new tl_1.Api.BotCommandScopeDefault(),
        langCode: params.langCode ?? "",
    }));
}
/** @hidden */
async function setBotInfo(client, params) {
    return client.invoke(new tl_1.Api.bots.SetBotInfo({
        bot: params.bot
            ? (await client.getInputEntity(params.bot))
            : undefined,
        langCode: params.langCode ?? "",
        name: params.name,
        about: params.about,
        description: params.description,
    }));
}
/** @hidden */
async function getBotInfo(client, params = {}) {
    return client.invoke(new tl_1.Api.bots.GetBotInfo({
        bot: params.bot
            ? (await client.getInputEntity(params.bot))
            : undefined,
        langCode: params.langCode ?? "",
    }));
}
/** @hidden */
async function setBotMenuButton(client, user, button) {
    return client.invoke(new tl_1.Api.bots.SetBotMenuButton({
        userId: (await client.getInputEntity(user)),
        button: button,
    }));
}
/** @hidden */
async function getBotMenuButton(client, user) {
    return client.invoke(new tl_1.Api.bots.GetBotMenuButton({
        userId: (await client.getInputEntity(user)),
    }));
}
/** @hidden */
async function addBotUsername(client, bot, username) {
    return client.invoke(new tl_1.Api.bots.AddUsername({ bot, username }));
}
/** @hidden */
async function removeBotUsername(client, bot, username) {
    return client.invoke(new tl_1.Api.bots.RemoveUsername({ bot, username }));
}
/** @hidden */
async function checkBotUsername(client, username, params = {}) {
    return client.invoke(new tl_1.Api.bots.CheckUsername({ additional: params.additional, username }));
}
/** @hidden */
async function setBotVerification(client, peer, params = {}) {
    let customDescription;
    if (typeof params.description === "string") {
        const [text, entities] = await (0, messageParse_1._parseMessageText)(client, params.description, params.parseMode);
        customDescription = new tl_1.Api.TextWithEntities({ text, entities });
    }
    else {
        customDescription = params.description;
    }
    return client.invoke(new tl_1.Api.bots.SetCustomVerification({
        enabled: params.enabled ?? true,
        bot: params.bot,
        peer,
        customDescription,
    }));
}
