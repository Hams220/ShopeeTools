"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConnectionWebProxy = exports.createWebProxySocket = void 0;
const TCPMTProxy_1 = require("./TCPMTProxy");
var WebProxyTransport_1 = require("../../../network/transport/WebProxyTransport");
Object.defineProperty(exports, "createWebProxySocket", { enumerable: true, get: function () { return WebProxyTransport_1.createWebProxySocket; } });
/** @deprecated The WEB proxy picks its own framing: pass `proxy.WEB` or a `WebProxyTransport` without `connection`. */
class ConnectionWebProxy extends TCPMTProxy_1.TCPMTProxy {
}
exports.ConnectionWebProxy = ConnectionWebProxy;
