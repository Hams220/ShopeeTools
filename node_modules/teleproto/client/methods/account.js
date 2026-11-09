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
exports.updateProfile = updateProfile;
exports.updateUsername = updateUsername;
exports.updateStatus = updateStatus;
exports.uploadProfilePhoto = uploadProfilePhoto;
exports.updateProfilePhoto = updateProfilePhoto;
exports.deleteProfilePhotos = deleteProfilePhotos;
exports.getUserPhotos = getUserPhotos;
exports.getAuthorizations = getAuthorizations;
exports.resetAuthorization = resetAuthorization;
exports.getPrivacy = getPrivacy;
exports.setPrivacy = setPrivacy;
exports.getNotifySettings = getNotifySettings;
exports.updateNotifySettings = updateNotifySettings;
exports.getAccountTTL = getAccountTTL;
exports.setAccountTTL = setAccountTTL;
exports.getGlobalPrivacySettings = getGlobalPrivacySettings;
exports.setGlobalPrivacySettings = setGlobalPrivacySettings;
const Helpers_1 = require("../../Helpers");
const utils = __importStar(require("../../Utils"));
const tl_1 = require("../../tl");
const uploads_1 = require("./uploads");
/** @hidden */
async function updateProfile(client, params) {
    return client.api.account.updateProfile({
        firstName: params.firstName,
        lastName: params.lastName,
        about: params.about,
    });
}
/** @hidden */
async function updateUsername(client, username) {
    return client.api.account.updateUsername({ username: username });
}
/** @hidden */
async function updateStatus(client, online = true) {
    return client.api.account.updateStatus({ offline: !online });
}
async function _toInputFile(client, file) {
    const { fileHandle } = await (0, uploads_1._fileToMedia)(client, {
        file: file,
        asImage: true,
    });
    if (!fileHandle) {
        throw new Error(`Cannot upload ${file} as a profile photo`);
    }
    return fileHandle;
}
/** @hidden */
async function uploadProfilePhoto(client, params) {
    return client.invoke(new tl_1.Api.photos.UploadProfilePhoto({
        file: params.file
            ? await _toInputFile(client, params.file)
            : undefined,
        video: params.video
            ? await _toInputFile(client, params.video)
            : undefined,
        videoStartTs: params.videoStartTs,
        videoEmojiMarkup: params.videoEmojiMarkup,
        fallback: params.fallback,
        bot: params.bot
            ? (await client.getInputEntity(params.bot))
            : undefined,
    }));
}
/** @hidden */
async function updateProfilePhoto(client, photo, params = {}) {
    return client.invoke(new tl_1.Api.photos.UpdateProfilePhoto({
        id: utils.getInputPhoto(photo),
        fallback: params.fallback,
        bot: params.bot
            ? (await client.getInputEntity(params.bot))
            : undefined,
    }));
}
/** @hidden */
async function deleteProfilePhotos(client, photos) {
    return client.invoke(new tl_1.Api.photos.DeletePhotos({
        id: photos.map((photo) => utils.getInputPhoto(photo)),
    }));
}
/** @hidden */
async function getUserPhotos(client, entity, params = {}) {
    const user = await client.getInputEntity(entity);
    const result = await client.invoke(new tl_1.Api.photos.GetUserPhotos({
        userId: user,
        offset: params.offset ?? 0,
        maxId: params.maxId,
        limit: params.limit ?? 100,
    }));
    const photos = new Helpers_1.TotalList();
    photos.push(...result.photos);
    photos.total =
        result instanceof tl_1.Api.photos.PhotosSlice
            ? result.count
            : result.photos.length;
    return photos;
}
// region sessions, privacy & settings
/** @hidden */
async function getAuthorizations(client) {
    return client.api.account.getAuthorizations({});
}
/**
 * Terminates a session from {@link getAuthorizations}. Pass no hash (or zero)
 * to terminate ALL other sessions.
 * @hidden
 */
async function resetAuthorization(client, hash) {
    if (hash == undefined || hash.isZero()) {
        return client.api.auth.resetAuthorizations({});
    }
    return client.api.account.resetAuthorization({ hash: hash });
}
/** @hidden */
async function getPrivacy(client, key) {
    return client.invoke(new tl_1.Api.account.GetPrivacy({ key: key }));
}
/** @hidden */
async function setPrivacy(client, key, rules) {
    return client.invoke(new tl_1.Api.account.SetPrivacy({ key: key, rules: rules }));
}
/** @hidden */
async function getNotifySettings(client, entity) {
    return client.invoke(new tl_1.Api.account.GetNotifySettings({
        peer: await client._getInputNotify(entity),
    }));
}
/** @hidden */
async function updateNotifySettings(client, entity, params) {
    return client.invoke(new tl_1.Api.account.UpdateNotifySettings({
        peer: await client._getInputNotify(entity),
        settings: new tl_1.Api.InputPeerNotifySettings({
            showPreviews: params.showPreviews,
            silent: params.silent,
            muteUntil: params.muteUntil,
            sound: params.sound,
            storiesMuted: params.storiesMuted,
            storiesHideSender: params.storiesHideSender,
            storiesSound: params.storiesSound,
        }),
    }));
}
/** @hidden */
async function getAccountTTL(client) {
    const result = await client.api.account.getAccountTTL({});
    return result.days;
}
/** @hidden */
async function setAccountTTL(client, days) {
    return client.invoke(new tl_1.Api.account.SetAccountTTL({
        ttl: new tl_1.Api.AccountDaysTTL({ days: days }),
    }));
}
/** @hidden */
async function getGlobalPrivacySettings(client) {
    return client.api.account.getGlobalPrivacySettings({});
}
/** @hidden */
async function setGlobalPrivacySettings(client, settings) {
    return client.invoke(new tl_1.Api.account.SetGlobalPrivacySettings({ settings: settings }));
}
// endregion
