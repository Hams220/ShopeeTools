"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StopPropagation = void 0;
exports.on = on;
exports.addEventHandler = addEventHandler;
exports.removeEventHandler = removeEventHandler;
exports.listEventHandlers = listEventHandlers;
exports.catchUp = catchUp;
const Raw_1 = require("../../events/Raw");
var StopPropagation_1 = require("../updates/StopPropagation");
Object.defineProperty(exports, "StopPropagation", { enumerable: true, get: function () { return StopPropagation_1.StopPropagation; } });
function on(client, event) {
    return (f) => {
        client.addEventHandler(f, event);
        return f;
    };
}
function addEventHandler(client, callback, event) {
    event ??= new Raw_1.Raw({});
    event.client = client;
    client._eventBuilders.push([event, callback]);
}
function removeEventHandler(client, callback, event) {
    client._eventBuilders = client._eventBuilders.filter((item) => item[0] !== event && item[1] !== callback);
}
function listEventHandlers(client) {
    return client._eventBuilders;
}
async function catchUp(client) {
    await client.updateManager.catchUp();
}
