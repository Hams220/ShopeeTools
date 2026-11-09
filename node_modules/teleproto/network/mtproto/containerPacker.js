"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isContentRelated = isContentRelated;
exports.packMessages = packMessages;
const Writer_1 = require("../../tl/binary/Writer");
const core_1 = require("../../tl/core");
const RequestState_1 = require("./RequestState");
const MAX_MESSAGES = 1000;
const MAX_CONTAINER_BYTES = 32 * 1024;
const SERVICE_REQUESTS = new Set([
    "Ping",
    "PingDelayDisconnect",
    "GetFutureSalts",
    "RpcDropAnswer",
    "DestroySession",
    "DestroyAuthKey",
]);
const SOLO_REQUESTS = new Set([
    "upload.GetFile",
    "upload.GetCdnFile",
    "upload.GetWebFile",
    "upload.SaveFilePart",
    "upload.SaveBigFilePart",
]);
function isContentRelated(request) {
    return (0, RequestState_1.expectsAnswer)(request) && !SERVICE_REQUESTS.has(request.className);
}
async function packMessages(state, queues) {
    const writer = new Writer_1.Writer();
    const batch = [];
    let size = 0;
    pack: for (const queue of queues) {
        while (queue.length && batch.length < MAX_MESSAGES) {
            const request = queue[0];
            if (request.cancelled) {
                queue.shift();
                continue;
            }
            const solo = SOLO_REQUESTS.has(request.request.className);
            const bytes = request.data.length + core_1.TLMessage.SIZE_OVERHEAD;
            if (batch.length && (solo || size + bytes > MAX_CONTAINER_BYTES))
                break pack;
            queue.shift();
            if (bytes > core_1.MessageContainer.MAXIMUM_SIZE) {
                request.reject(new Error(`${request.request.className} payload of ${request.data.length} bytes is too big`));
                continue;
            }
            request.msgId = await state.writeDataAsMessage(writer, request.data, isContentRelated(request.request), request.after?.msgId, request.forcedMsgId, isContentRelated(request.request) && !solo);
            batch.push(request);
            size += bytes;
            if (solo)
                break pack;
        }
    }
    if (!batch.length)
        return undefined;
    if (batch.length === 1)
        return { batch, data: writer.finish() };
    const header = Buffer.allocUnsafe(8);
    header.writeUInt32LE(core_1.MessageContainer.CONSTRUCTOR_ID, 0);
    header.writeInt32LE(batch.length, 4);
    const container = new Writer_1.Writer();
    const containerId = await state.writeDataAsMessage(container, Buffer.concat([header, writer.finish()]), false);
    for (const request of batch)
        request.containerId = containerId;
    return { batch, data: container.finish() };
}
