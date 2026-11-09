"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateContext = void 0;
const common_1 = require("../../events/common");
const Utils_1 = require("../../Utils");
const big_integer_1 = __importDefault(require("big-integer"));
/** Chat access for raw updates; entity fetching is deferred until `getChat()`. */
class UpdateContext extends common_1.EventCommon {
    constructor(client, peerId, entities) {
        super({ chatPeer: peerId === undefined ? undefined : (0, Utils_1.getPeer)((0, big_integer_1.default)(peerId)) });
        this._entities = entities ?? new Map();
        this._setClient(client);
    }
    /** Attached users and chats keyed by marked peer ID; reading never makes an RPC. */
    get peers() {
        return this._entities;
    }
    /** Returns the attached chat or fetches it, sharing concurrent calls within this update. */
    async getChat() {
        if (!this.pendingChat) {
            this.pendingChat = super.getChat();
        }
        const pending = this.pendingChat;
        try {
            return await pending;
        }
        finally {
            if (this.pendingChat === pending)
                this.pendingChat = undefined;
        }
    }
}
exports.UpdateContext = UpdateContext;
