"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConnectionTCPMTProxyAbridged = exports.TCPMTProxy = exports.PaddedIntermediatePacketCodec = void 0;
exports.isLegacyProxyConnection = isLegacyProxyConnection;
const Obfuscation_1 = require("../../../network/connection/Obfuscation");
var IntermediateCodec_1 = require("../../../network/connection/IntermediateCodec");
Object.defineProperty(exports, "PaddedIntermediatePacketCodec", { enumerable: true, get: function () { return IntermediateCodec_1.PaddedIntermediatePacketCodec; } });
/** @deprecated The proxy picks its own framing: pass `proxy` or an `MTProxyTransport` without `connection`. */
class TCPMTProxy extends Obfuscation_1.ConnectionTCPObfuscated {
}
exports.TCPMTProxy = TCPMTProxy;
/** @deprecated The proxy picks its own framing: pass `proxy` or an `MTProxyTransport` without `connection`. */
class ConnectionTCPMTProxyAbridged extends TCPMTProxy {
}
exports.ConnectionTCPMTProxyAbridged = ConnectionTCPMTProxyAbridged;
function isLegacyProxyConnection(connection) {
    return typeof connection === "function" && connection.prototype instanceof TCPMTProxy;
}
