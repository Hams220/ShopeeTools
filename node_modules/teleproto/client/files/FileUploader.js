"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileUploader = exports.BIG_FILE_SIZE = void 0;
const tl_1 = require("../../tl");
const errors_1 = require("../../errors");
const Deferred_1 = __importDefault(require("../../extensions/Deferred"));
const PartsManager_1 = require("./PartsManager");
const ResourceState_1 = require("./ResourceState");
exports.BIG_FILE_SIZE = 10 * 1024 * 1024;
class FileUploader {
    constructor(transfers, opts) {
        this.transfers = transfers;
        this.opts = opts;
        this.done = new Deferred_1.default();
        this.inflight = 0;
        this.finished = false;
        this.onAbort = () => this.fail(new errors_1.MediaAbortError());
        this.isBig = opts.size > exports.BIG_FILE_SIZE;
        this.parts = new PartsManager_1.PartsManager({ size: opts.size, partSize: opts.partSize });
        this.resource = new ResourceState_1.ResourceState(opts.partSize);
        this.manager = transfers.manager("upload", opts.dcId);
        this.done.promise.catch(() => { });
    }
    get partCount() {
        return Math.ceil(this.opts.size / this.opts.partSize);
    }
    run() {
        if (this.opts.signal?.aborted)
            return Promise.reject(new errors_1.MediaAbortError());
        this.opts.signal?.addEventListener("abort", this.onAbort, { once: true });
        this.manager.register(this, -1);
        this.loop();
        return this.done.promise;
    }
    onResources() {
        this.loop();
    }
    loop() {
        if (this.finished)
            return;
        if (this.parts.isReady() && this.inflight === 0)
            return this.finish();
        while (this.resource.unused >= this.parts.partSize && this.inflight < (this.opts.maxInflight ?? Infinity)) {
            const part = this.parts.startPart();
            if (!part)
                break;
            this.resource.startUse(this.parts.partSize);
            this.inflight++;
            void this.send(part);
        }
        if (this.resource.updateEstimatedLimit(this.parts.remainingBytes()))
            this.manager.update();
    }
    async send(part) {
        try {
            const bytes = await this.opts.read(part.offset, part.size);
            if (this.finished)
                return;
            const { fileId } = this.opts;
            const ok = await this.transfers.run("upload", this.opts.dcId, () => this.isBig
                ? new tl_1.Api.upload.SaveBigFilePart({ fileId, filePart: part.id, fileTotalParts: this.partCount, bytes })
                : new tl_1.Api.upload.SaveFilePart({ fileId, filePart: part.id, bytes }), this.opts.signal);
            if (this.finished)
                return;
            if (ok !== true)
                throw new Error(`Telegram refused upload part ${part.id}`);
            this.parts.onPartOk(part, bytes.length);
            this.opts.onPart?.();
        }
        catch (error) {
            this.parts.onPartFailed(part);
            this.fail(error);
        }
        finally {
            this.inflight--;
            this.resource.stopUse(this.parts.partSize);
            this.manager.update();
            this.loop();
        }
    }
    finish() {
        if (this.finished)
            return;
        this.finished = true;
        this.release();
        this.done.resolve();
    }
    fail(error) {
        if (this.finished)
            return;
        this.finished = true;
        this.release();
        this.done.reject(error);
    }
    release() {
        this.opts.signal?.removeEventListener("abort", this.onAbort);
        this.manager.unregister(this);
    }
}
exports.FileUploader = FileUploader;
