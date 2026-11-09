"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebSocketTransport = void 0;
const Obfuscation_1 = require("../connection/Obfuscation");
const WebSocketSocket_1 = require("./socket/WebSocketSocket");
const Transport_1 = require("./Transport");
/** Connects to Telegram over secure WebSocket. */
class WebSocketTransport extends Transport_1.Transport {
    resolve(connection) {
        return {
            connection: connection ?? Obfuscation_1.ConnectionTCPObfuscated,
            socket: WebSocketSocket_1.WebSocketSocket,
            webSocket: true,
        };
    }
}
exports.WebSocketTransport = WebSocketTransport;
