"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tlBases = void 0;
const customMessage = () => require("../custom/message").CustomMessage;
exports.tlBases = {
    Message: customMessage,
    MessageService: customMessage,
    MessageEmpty: customMessage,
};
