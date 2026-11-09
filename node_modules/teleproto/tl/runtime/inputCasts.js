"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.inputCastOf = inputCastOf;
exports.castInput = castInput;
const NAMED_CASTS = new Set(["chatId,long"]);
const TYPE_CASTS = new Set([
    "InputPeer",
    "InputChannel",
    "InputUser",
    "InputDialogPeer",
    "InputNotifyPeer",
    "InputMedia",
    "InputPhoto",
    "InputMessage",
    "InputDocument",
    "InputChatPhoto",
]);
function inputCastOf(field) {
    const named = `${field.name},${field.type}`;
    if (NAMED_CASTS.has(named))
        return named;
    return TYPE_CASTS.has(field.type ?? "") ? field.type : undefined;
}
async function castInput(utils, client, value, cast) {
    switch (cast) {
        case "InputPeer":
            return utils.getInputPeer(await client.getInputEntity(value));
        case "InputChannel":
            return utils.getInputChannel(await client.getInputEntity(value));
        case "InputUser":
            return utils.getInputUser(await client.getInputEntity(value));
        case "InputDialogPeer":
            return client._getInputDialog(value);
        case "InputNotifyPeer":
            return client._getInputNotify(value);
        case "InputMedia":
            return utils.getInputMedia(value);
        case "InputPhoto":
            return utils.getInputPhoto(value);
        case "InputMessage":
            return utils.getInputMessage(value);
        case "InputDocument":
            return utils.getInputDocument(value);
        case "InputChatPhoto":
            return utils.getInputChatPhoto(value);
        case "chatId,long":
            return client.getPeerId(value, false);
        default:
            throw new Error("unsupported peer type : " + cast);
    }
}
