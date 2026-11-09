"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PromisedWebSockets = void 0;
const WebSocketSocket_1 = require("../../network/transport/socket/WebSocketSocket");
const ALL = 0x7fffffff;
/** @deprecated Use {@link WebSocketTransport}. */
class PromisedWebSockets extends WebSocketSocket_1.WebSocketSocket {
    static { this.isWebSocket = true; }
    constructor(proxy, _keepAliveInterval) {
        super();
        if (proxy && !("MTProxy" in proxy))
            throw new Error("Socks proxies are not supported over the WebSocket transport");
    }
    readAll() {
        return this.read(ALL);
    }
    toString() {
        return "PromisedWebSockets";
    }
}
exports.PromisedWebSockets = PromisedWebSockets;
