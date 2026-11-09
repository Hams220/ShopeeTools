"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.HttpProxyTransport = void 0;
const http = __importStar(require("node:http"));
const https = __importStar(require("node:https"));
const Obfuscation_1 = require("../connection/Obfuscation");
const NetSocket_1 = require("./socket/NetSocket");
const ProxyRejectedError_1 = require("../../errors/ProxyRejectedError");
const Transport_1 = require("./Transport");
function openHttpTunnel(options, ip, port) {
    const target = ip.includes(":") ? `[${ip}]:${port}` : `${ip}:${port}`;
    const headers = { Host: target };
    if (options.username !== undefined) {
        const credentials = `${options.username}:${options.password ?? ""}`;
        headers["Proxy-Authorization"] = `Basic ${Buffer.from(credentials).toString("base64")}`;
    }
    const seconds = options.timeout || 5;
    const request = (options.tls ? https : http).request({
        host: options.host,
        port: options.port,
        method: "CONNECT",
        path: target,
        headers,
        agent: false,
    });
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            request.destroy(new Error(`HTTP proxy ${options.host}:${options.port} did not answer within ${seconds}s`));
        }, seconds * 1000);
        request.once("connect", (response, socket, head) => {
            clearTimeout(timer);
            if (response.statusCode !== 200) {
                socket.destroy();
                const message = `HTTP proxy refused CONNECT to ${target}: ${response.statusCode} ${response.statusMessage ?? ""}`.trim();
                const permanent = response.statusCode === 407 || response.statusCode === 403;
                reject(permanent ? new ProxyRejectedError_1.ProxyRejectedError(message) : new Error(message));
                return;
            }
            resolve({ socket, head });
        });
        request.once("error", (error) => {
            clearTimeout(timer);
            reject(error);
        });
        request.end();
    });
}
/** Connects to Telegram through an HTTP proxy that supports CONNECT tunnels. */
class HttpProxyTransport extends Transport_1.Transport {
    constructor(options) {
        super();
        this.options = options;
    }
    resolve(connection) {
        const options = this.options;
        class HttpProxySocket extends NetSocket_1.NetSocket {
            openTunnel(port, ip) {
                return openHttpTunnel(options, ip, port);
            }
        }
        return { connection: connection ?? Obfuscation_1.ConnectionTCPObfuscated, socket: HttpProxySocket, proxied: true };
    }
}
exports.HttpProxyTransport = HttpProxyTransport;
