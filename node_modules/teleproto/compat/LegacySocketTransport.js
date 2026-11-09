"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LegacySocketTransport = void 0;
const Obfuscation_1 = require("../network/connection/Obfuscation");
const MTProxyTransport_1 = require("../network/transport/MTProxyTransport");
const Transport_1 = require("../network/transport/Transport");
const TCPMTProxy_1 = require("./network/connection/TCPMTProxy");
/** Runs a legacy `networkSocket` factory as a {@link Transport}. */
class LegacySocketTransport extends Transport_1.Transport {
    constructor(factory, proxy) {
        super();
        this.factory = factory;
        this.proxy = proxy;
        if (proxy && "WEB" in proxy)
            throw new Error("WEB proxy requires its own socket: remove networkSocket");
    }
    resolve(connection) {
        const { factory, proxy } = this;
        const socket = function (keepAliveInterval) {
            return new factory(proxy, keepAliveInterval);
        };
        if (proxy && "MTProxy" in proxy) {
            if (connection && !(0, TCPMTProxy_1.isLegacyProxyConnection)(connection)) {
                throw new Error("MTProxy uses its own packet framing: remove the connection option");
            }
            return {
                connection: (0, MTProxyTransport_1.mtproxyConnection)(proxy.ip, proxy.port, (0, MTProxyTransport_1.parseProxySecret)(proxy.secret)),
                socket,
                clientProxy: { address: proxy.ip, port: proxy.port },
                proxied: true,
                webSocket: !!factory.isWebSocket,
            };
        }
        return {
            connection: connection ?? Obfuscation_1.ConnectionTCPObfuscated,
            socket,
            proxied: !!proxy,
            webSocket: !!factory.isWebSocket,
        };
    }
}
exports.LegacySocketTransport = LegacySocketTransport;
