"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDialogFilters = getDialogFilters;
exports.updateDialogFilter = updateDialogFilter;
exports.updateDialogFiltersOrder = updateDialogFiltersOrder;
const tl_1 = require("../../tl");
/** @hidden */
async function getDialogFilters(client) {
    return client.api.messages.getDialogFilters({});
}
/**
 * Creates, updates or deletes a dialog filter (chat folder).
 * Pass `filter: undefined` to delete the folder with the given ID.
 * @hidden
 */
async function updateDialogFilter(client, id, filter) {
    return client.invoke(new tl_1.Api.messages.UpdateDialogFilter({
        id: id,
        filter: filter,
    }));
}
/** @hidden */
async function updateDialogFiltersOrder(client, order) {
    return client.api.messages.updateDialogFiltersOrder({ order: order });
}
