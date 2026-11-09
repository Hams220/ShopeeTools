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
exports.getStickerSet = getStickerSet;
exports.getAllStickers = getAllStickers;
exports.installStickerSet = installStickerSet;
exports.uninstallStickerSet = uninstallStickerSet;
exports.getRecentStickers = getRecentStickers;
exports.saveRecentSticker = saveRecentSticker;
exports.clearRecentStickers = clearRecentStickers;
exports.getFavedStickers = getFavedStickers;
exports.faveSticker = faveSticker;
exports.getCustomEmojiDocuments = getCustomEmojiDocuments;
const big_integer_1 = __importDefault(require("big-integer"));
const utils = __importStar(require("../../Utils"));
const tl_1 = require("../../tl");
function _toInputStickerSet(set) {
    if (typeof set === "string") {
        return new tl_1.Api.InputStickerSetShortName({ shortName: set });
    }
    return set;
}
/** @hidden */
async function getStickerSet(client, set) {
    return client.invoke(new tl_1.Api.messages.GetStickerSet({
        stickerset: _toInputStickerSet(set),
        hash: 0,
    }));
}
/** @hidden */
async function getAllStickers(client) {
    return client.api.messages.getAllStickers({ hash: big_integer_1.default.zero });
}
/** @hidden */
async function installStickerSet(client, set, params = {}) {
    return client.invoke(new tl_1.Api.messages.InstallStickerSet({
        stickerset: _toInputStickerSet(set),
        archived: params.archived ?? false,
    }));
}
/** @hidden */
async function uninstallStickerSet(client, set) {
    return client.invoke(new tl_1.Api.messages.UninstallStickerSet({
        stickerset: _toInputStickerSet(set),
    }));
}
/** @hidden */
async function getRecentStickers(client, params = {}) {
    return client.api.messages.getRecentStickers({
        hash: big_integer_1.default.zero,
        attached: params.attached,
    });
}
/** @hidden */
async function saveRecentSticker(client, document, params = {}) {
    return client.invoke(new tl_1.Api.messages.SaveRecentSticker({
        id: utils.getInputDocument(document),
        unsave: params.unsave ?? false,
        attached: params.attached,
    }));
}
/** @hidden */
async function clearRecentStickers(client, params = {}) {
    return client.api.messages.clearRecentStickers({
        attached: params.attached,
    });
}
/** @hidden */
async function getFavedStickers(client) {
    return client.api.messages.getFavedStickers({ hash: big_integer_1.default.zero });
}
/** @hidden */
async function faveSticker(client, document, params = {}) {
    return client.invoke(new tl_1.Api.messages.FaveSticker({
        id: utils.getInputDocument(document),
        unfave: params.unfave ?? false,
    }));
}
/** @hidden */
async function getCustomEmojiDocuments(client, documentIds) {
    return client.api.messages.getCustomEmojiDocuments({
        documentId: documentIds,
    });
}
