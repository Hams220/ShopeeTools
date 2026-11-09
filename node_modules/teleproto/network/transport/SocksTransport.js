"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SocksTransport = void 0;
exports.openSocksTunnel = openSocksTunnel;
const socks_1 = require("socks");
const Obfuscation_1 = require("../connection/Obfuscation");
const NetSocket_1 = require("./socket/NetSocket");
const ProxyRejectedError_1 = require("../../errors/ProxyRejectedError");
const Transport_1 = require("./Transport");
async function openSocksTunnel(options, ip, port) {
    try {
        const info = await socks_1.SocksClient.createConnection({
            proxy: {
                host: options.host,
                port: options.port,
                type: options.version,
                userId: options.username,
                password: options.password,
            },
            command: "connect",
            timeout: (options.timeout || 5) * 1000,
            destination: { host: ip, port },
        });
        return { socket: info.socket };
    }
    catch (error) {
        if (error instanceof Error && /Authentication failed/i.test(error.message)) {
            throw new ProxyRejectedError_1.ProxyRejectedError(`SOCKS5 proxy ${options.host}:${options.port} rejected the credentials`);
        }
        throw error;
    }
}
/** Connects to Telegram through a SOCKS4 or SOCKS5 proxy. */
class SocksTransport extends Transport_1.Transport {
    constructor(options) {
        super();
        this.options = options;
    }
    resolve(connection) {
        const options = this.options;
        class SocksSocket extends NetSocket_1.NetSocket {
            openTunnel(port, ip) {
                return openSocksTunnel(options, ip, port);
            }
        }
        return {
            connection: connection ?? Obfuscation_1.ConnectionTCPObfuscated,
            socket: SocksSocket,
            proxied: true,
        };
    }
}
exports.SocksTransport = SocksTransport;
