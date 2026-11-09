"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Transport = void 0;
exports.ownFraming = ownFraming;
/** How the client reaches Telegram: directly, through a proxy or over WebSocket. */
class Transport {
}
exports.Transport = Transport;
function ownFraming(transport, framing, requested) {
    if (requested && requested !== framing) {
        throw new Error(`${transport} uses its own packet framing: remove the connection option`);
    }
    return framing;
}
