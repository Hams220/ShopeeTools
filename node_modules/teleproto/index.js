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
exports.events = exports.client = exports.password = exports.tl = exports.helpers = exports.extensions = exports.sessions = exports.errors = exports.utils = exports.Logger = exports.version = exports.WebProxyTransport = exports.WebSocketTransport = exports.MTProxyTransport = exports.HttpProxyTransport = exports.SocksTransport = exports.TcpTransport = exports.Transport = exports.ConnectionWebProxy = exports.Connection = exports.Keyboard = exports.ReplyKeyboard = exports.InlineKeyboard = exports.Button = exports.TelegramClient = exports.Rich = exports.Api = void 0;
var tl_1 = require("./tl");
Object.defineProperty(exports, "Api", { enumerable: true, get: function () { return tl_1.Api; } });
exports.Rich = __importStar(require("./richMessage"));
const tl = __importStar(require("./tl"));
exports.tl = tl;
var TelegramClient_1 = require("./client/TelegramClient");
Object.defineProperty(exports, "TelegramClient", { enumerable: true, get: function () { return TelegramClient_1.TelegramClient; } });
var button_1 = require("./tl/custom/button");
Object.defineProperty(exports, "Button", { enumerable: true, get: function () { return button_1.Button; } });
var keyboard_1 = require("./tl/custom/keyboard");
Object.defineProperty(exports, "InlineKeyboard", { enumerable: true, get: function () { return keyboard_1.InlineKeyboard; } });
Object.defineProperty(exports, "ReplyKeyboard", { enumerable: true, get: function () { return keyboard_1.ReplyKeyboard; } });
Object.defineProperty(exports, "Keyboard", { enumerable: true, get: function () { return keyboard_1.Keyboard; } });
var network_1 = require("./network");
Object.defineProperty(exports, "Connection", { enumerable: true, get: function () { return network_1.Connection; } });
var WebProxy_1 = require("./compat/network/connection/WebProxy");
Object.defineProperty(exports, "ConnectionWebProxy", { enumerable: true, get: function () { return WebProxy_1.ConnectionWebProxy; } });
var transport_1 = require("./network/transport");
Object.defineProperty(exports, "Transport", { enumerable: true, get: function () { return transport_1.Transport; } });
Object.defineProperty(exports, "TcpTransport", { enumerable: true, get: function () { return transport_1.TcpTransport; } });
Object.defineProperty(exports, "SocksTransport", { enumerable: true, get: function () { return transport_1.SocksTransport; } });
Object.defineProperty(exports, "HttpProxyTransport", { enumerable: true, get: function () { return transport_1.HttpProxyTransport; } });
Object.defineProperty(exports, "MTProxyTransport", { enumerable: true, get: function () { return transport_1.MTProxyTransport; } });
Object.defineProperty(exports, "WebSocketTransport", { enumerable: true, get: function () { return transport_1.WebSocketTransport; } });
Object.defineProperty(exports, "WebProxyTransport", { enumerable: true, get: function () { return transport_1.WebProxyTransport; } });
var Version_1 = require("./Version");
Object.defineProperty(exports, "version", { enumerable: true, get: function () { return Version_1.version; } });
var Logger_1 = require("./extensions/Logger");
Object.defineProperty(exports, "Logger", { enumerable: true, get: function () { return Logger_1.Logger; } });
const utils = __importStar(require("./Utils"));
exports.utils = utils;
const errors = __importStar(require("./errors"));
exports.errors = errors;
const sessions = __importStar(require("./sessions"));
exports.sessions = sessions;
const extensions = __importStar(require("./extensions"));
exports.extensions = extensions;
const helpers = __importStar(require("./Helpers"));
exports.helpers = helpers;
const client = __importStar(require("./client"));
exports.client = client;
const password = __importStar(require("./Password"));
exports.password = password;
const events = __importStar(require("./events"));
exports.events = events;
