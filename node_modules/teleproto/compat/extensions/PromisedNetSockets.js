"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PromisedNetSockets = void 0;
const NetSocket_1 = require("../../network/transport/socket/NetSocket");
const SocksTransport_1 = require("../../network/transport/SocksTransport");
const ALL = 0x7fffffff;
/** @deprecated Use {@link TcpTransport} or {@link SocksTransport}. */
class PromisedNetSockets extends NetSocket_1.NetSocket {
    constructor(proxy, keepAliveInterval) {
        super(keepAliveInterval);
        this.proxy = proxy;
    }
    async openTunnel(port, ip) {
        const proxy = this.proxy;
        if (!proxy || !("socksType" in proxy))
            return undefined;
        return (0, SocksTransport_1.openSocksTunnel)({
            host: proxy.ip,
            port: proxy.port,
            version: proxy.socksType,
            username: proxy.username,
            password: proxy.password,
            timeout: proxy.timeout,
        }, ip, port);
    }
    readAll() {
        return this.read(ALL);
    }
    toString() {
        return "PromisedNetSockets";
    }
}
exports.PromisedNetSockets = PromisedNetSockets;
