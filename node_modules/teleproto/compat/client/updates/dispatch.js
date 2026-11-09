"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StopPropagation = exports.catchUp = exports.listEventHandlers = exports.removeEventHandler = exports.addEventHandler = exports.on = void 0;
exports._handleUpdate = _handleUpdate;
exports._dispatchUpdate = _dispatchUpdate;
exports._clearUpdateQueue = _clearUpdateQueue;
exports._stopUpdateLoop = _stopUpdateLoop;
exports._updateLoop = _updateLoop;
var updates_1 = require("../../../client/methods/updates");
Object.defineProperty(exports, "on", { enumerable: true, get: function () { return updates_1.on; } });
Object.defineProperty(exports, "addEventHandler", { enumerable: true, get: function () { return updates_1.addEventHandler; } });
Object.defineProperty(exports, "removeEventHandler", { enumerable: true, get: function () { return updates_1.removeEventHandler; } });
Object.defineProperty(exports, "listEventHandlers", { enumerable: true, get: function () { return updates_1.listEventHandlers; } });
Object.defineProperty(exports, "catchUp", { enumerable: true, get: function () { return updates_1.catchUp; } });
var StopPropagation_1 = require("../../../client/updates/StopPropagation");
Object.defineProperty(exports, "StopPropagation", { enumerable: true, get: function () { return StopPropagation_1.StopPropagation; } });
/** @hidden @deprecated */
function _handleUpdate(client, update) {
    client.updateManager.receive(update);
}
/** @hidden @deprecated */
function _dispatchUpdate(client, args) {
    return client._updateDispatcher.dispatch(args.update);
}
/** @hidden @deprecated */
function _clearUpdateQueue(client) {
    client._updateDispatcher.clear();
}
/** @hidden @deprecated */
function _stopUpdateLoop(client) {
    client._updateLoop.stop();
}
/** @hidden @deprecated */
async function _updateLoop(client, catchUp = true) {
    client._updateLoop.start(catchUp);
}
