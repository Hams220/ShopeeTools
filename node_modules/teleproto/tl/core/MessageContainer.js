"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessageContainer = void 0;
const TLMessage_1 = require("./TLMessage");
class MessageContainer {
    static { this.CONSTRUCTOR_ID = 0x73f1f8dc; }
    static { this.classType = "constructor"; }
    static { this.MAXIMUM_SIZE = 1044456 - 8; }
    static { this.MAXIMUM_LENGTH = 100; }
    constructor(messages) {
        this.messages = messages;
        this.CONSTRUCTOR_ID = MessageContainer.CONSTRUCTOR_ID;
        this.classType = "constructor";
    }
    static fromReader(reader) {
        const count = reader.readInt();
        const messages = new Array(count);
        for (let i = 0; i < count; i++) {
            const msgId = reader.readLong();
            const seqNo = reader.readInt();
            const length = reader.readInt();
            const start = reader.tellPosition();
            const obj = reader.tgReadObject();
            reader.setPosition(start + length);
            messages[i] = new TLMessage_1.TLMessage(msgId, seqNo, obj);
        }
        return new MessageContainer(messages);
    }
}
exports.MessageContainer = MessageContainer;
