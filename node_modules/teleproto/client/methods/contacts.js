"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getContacts = getContacts;
exports.addContact = addContact;
exports.deleteContacts = deleteContacts;
exports.importContacts = importContacts;
exports.block = block;
exports.unblock = unblock;
exports.getBlocked = getBlocked;
const Helpers_1 = require("../../Helpers");
const tl_1 = require("../../tl");
const big_integer_1 = __importDefault(require("big-integer"));
/** @hidden */
async function getContacts(client) {
    const result = await client.api.contacts.getContacts({
        hash: big_integer_1.default.zero,
    });
    if (result instanceof tl_1.Api.contacts.ContactsNotModified) {
        return [];
    }
    return result.users.filter((user) => user instanceof tl_1.Api.User);
}
function _toNote(note) {
    if (note == undefined) {
        return undefined;
    }
    if (typeof note === "string") {
        return new tl_1.Api.TextWithEntities({ text: note, entities: [] });
    }
    return note;
}
/** @hidden */
async function addContact(client, entity, params) {
    const user = await client.getInputEntity(entity);
    return client.invoke(new tl_1.Api.contacts.AddContact({
        id: user,
        firstName: params.firstName,
        lastName: params.lastName || "",
        phone: params.phone || "",
        addPhonePrivacyException: params.addPhonePrivacyException,
        note: _toNote(params.note),
    }));
}
/** @hidden */
async function deleteContacts(client, users) {
    const list = Array.isArray(users) ? users : [users];
    const ids = [];
    for (const user of list) {
        ids.push((await client.getInputEntity(user)));
    }
    return client.invoke(new tl_1.Api.contacts.DeleteContacts({ id: ids }));
}
/** @hidden */
async function importContacts(client, contacts) {
    return client.invoke(new tl_1.Api.contacts.ImportContacts({
        contacts: contacts.map((contact, i) => new tl_1.Api.InputPhoneContact({
            clientId: (0, Helpers_1.returnBigInt)(contact.clientId ?? i),
            phone: contact.phone,
            firstName: contact.firstName,
            lastName: contact.lastName || "",
            note: _toNote(contact.note),
        })),
    }));
}
/** @hidden */
async function block(client, entity, params = {}) {
    const peer = await client.getInputEntity(entity);
    return client.api.contacts.block({
        id: peer,
        myStoriesFrom: params.myStoriesFrom,
    });
}
/** @hidden */
async function unblock(client, entity, params = {}) {
    const peer = await client.getInputEntity(entity);
    return client.api.contacts.unblock({
        id: peer,
        myStoriesFrom: params.myStoriesFrom,
    });
}
/** @hidden */
async function getBlocked(client, params = {}) {
    const result = await client.api.contacts.getBlocked({
        offset: params.offset ?? 0,
        limit: params.limit ?? 100,
        myStoriesFrom: params.myStoriesFrom,
    });
    const blocked = new Helpers_1.TotalList();
    blocked.push(...result.blocked);
    blocked.total =
        result instanceof tl_1.Api.contacts.BlockedSlice
            ? result.count
            : result.blocked.length;
    return blocked;
}
