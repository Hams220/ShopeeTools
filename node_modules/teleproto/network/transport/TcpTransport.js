"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TcpTransport = void 0;
const Obfuscation_1 = require("../connection/Obfuscation");
const NetSocket_1 = require("./socket/NetSocket");
const Transport_1 = require("./Transport");
/** Connects to Telegram directly over TCP. This is the default transport. */
class TcpTransport extends Transport_1.Transport {
    resolve(connection) {
        return { connection: connection ?? Obfuscation_1.ConnectionTCPObfuscated, socket: NetSocket_1.NetSocket };
    }
}
exports.TcpTransport = TcpTransport;
