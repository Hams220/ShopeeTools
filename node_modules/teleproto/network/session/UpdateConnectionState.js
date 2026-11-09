"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateConnectionState = void 0;
class UpdateConnectionState {
    static { this.disconnected = -1; }
    static { this.connected = 1; }
    static { this.broken = 0; }
    constructor(state) {
        this.state = state;
    }
}
exports.UpdateConnectionState = UpdateConnectionState;
