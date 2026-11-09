"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileDownloader = void 0;
const big_integer_1 = __importDefault(require("big-integer"));
const tl_1 = require("../../tl");
const errors_1 = require("../../errors");
const CdnSource_1 = require("./CdnSource");
const Deferred_1 = __importDefault(require("../../extensions/Deferred"));
const PartsManager_1 = require("./PartsManager");
const ResourceState_1 = require("./ResourceState");
const STAGGER_START_MS = 50;
const STAGGER_MIN_MS = 3;
const STAGGER_FACTOR = 0.8;
class FileDownloader {
    constructor(transfers, opts) {
        this.transfers = transfers;
        this.opts = opts;
        this.done = new Deferred_1.default();
        this.inflight = 0;
        this.finished = false;
        this.cdnDisabled = false;
        this.nextStartAt = 0;
        this.staggerMs = STAGGER_START_MS;
        this.onAbort = () => this.fail(new errors_1.MediaAbortError());
        this.location = opts.location;
        this.dcId = opts.dcId;
        this.parts = new PartsManager_1.PartsManager({ size: opts.size, partSize: opts.partSize, offset: opts.offset, limit: opts.limit });
        this.resource = new ResourceState_1.ResourceState(opts.partSize);
        this.manager = transfers.manager(opts.kind, opts.dcId);
        this.done.promise.catch(() => { });
    }
    run() {
        if (this.opts.signal?.aborted)
            return Promise.reject(new errors_1.MediaAbortError());
        this.opts.signal?.addEventListener("abort", this.onAbort, { once: true });
        this.manager.register(this, this.opts.priority ?? 1);
        this.loop();
        return this.done.promise;
    }
    onResources() {
        this.loop();
    }
    setAheadLimit(offset) {
        this.parts.setAheadLimit(offset);
        this.loop();
    }
    loop() {
        if (this.finished)
            return;
        if (this.parts.isReady() && this.inflight === 0)
            return this.finish();
        while (this.resource.unused >= this.parts.partSize) {
            const part = this.parts.startPart();
            if (!part)
                break;
            this.resource.startUse(this.parts.partSize);
            this.inflight++;
            void this.fetch(part);
        }
        if (this.resource.updateEstimatedLimit(this.parts.remainingBytes()))
            this.manager.update();
    }
    async waitStagger() {
        if (!this.opts.stagger)
            return;
        const now = Date.now();
        const at = Math.max(now, this.nextStartAt);
        this.nextStartAt = at + this.staggerMs;
        this.staggerMs = Math.max(STAGGER_MIN_MS, this.staggerMs * STAGGER_FACTOR);
        if (at > now)
            await new Promise((resolve) => setTimeout(resolve, at - now));
    }
    async fetch(part) {
        let ok = false;
        const location = this.location;
        try {
            await this.waitStagger();
            if (this.finished)
                return;
            const bytes = await this.download(part, location);
            if (this.finished)
                return;
            this.parts.onPartOk(part, bytes.length);
            if (bytes.length) {
                await this.opts.sink.write(part.offset, bytes);
                await this.opts.onBytes?.(bytes.length);
            }
            ok = true;
        }
        catch (error) {
            if (this.finished)
                return;
            this.parts.onPartFailed(part);
            if (!(await this.recover(error, location)))
                this.fail(error);
        }
        finally {
            this.inflight--;
            this.resource.stopUse(this.parts.partSize);
            this.manager.update();
            if (ok || !this.finished)
                this.loop();
        }
    }
    async download(part, location) {
        if (this.cdn)
            return this.downloadCdn(part, this.cdn);
        const result = await this.transfers.run(this.opts.kind, this.dcId, () => new tl_1.Api.upload.GetFile({
            location,
            offset: (0, big_integer_1.default)(part.offset),
            limit: this.parts.partSize,
            precise: this.opts.precise,
            cdnSupported: this.opts.cdn && !this.cdnDisabled ? true : undefined,
        }), this.opts.signal);
        if (!(result instanceof tl_1.Api.upload.FileCdnRedirect))
            return result.bytes;
        const redirect = result;
        if (!(await this.transfers.cdnReachable(redirect.dcId))) {
            this.cdnDisabled = true;
            this.opts.onCdnUnavailable?.(redirect.dcId);
            return this.download(part, location);
        }
        let cdn = this.cdn;
        if (!cdn || !cdn.fileToken.equals(redirect.fileToken)) {
            cdn = this.cdn = new CdnSource_1.CdnSource(redirect, (offset) => this.transfers.run(this.opts.kind, this.dcId, () => new tl_1.Api.upload.GetCdnFileHashes({ fileToken: redirect.fileToken, offset: (0, big_integer_1.default)(offset) }), this.opts.signal));
        }
        return this.downloadCdn(part, cdn);
    }
    async downloadCdn(part, cdn) {
        for (;;) {
            const result = await this.transfers.run("cdn", cdn.dcId, () => new tl_1.Api.upload.GetCdnFile({ fileToken: cdn.fileToken, offset: (0, big_integer_1.default)(part.offset), limit: this.parts.partSize }), this.opts.signal);
            if (result instanceof tl_1.Api.upload.CdnFile) {
                const bytes = cdn.decrypt(part.offset, result.bytes);
                await cdn.verify(part.offset, bytes);
                return bytes;
            }
            const hashes = await this.transfers.run(this.opts.kind, this.dcId, () => new tl_1.Api.upload.ReuploadCdnFile({ fileToken: cdn.fileToken, requestToken: result.requestToken }), this.opts.signal);
            cdn.addHashes(hashes);
        }
    }
    async recover(error, used) {
        if (error instanceof errors_1.FileMigrateError) {
            this.dcId = error.newDc;
            this.opts.onMigrate?.(error.newDc);
            return true;
        }
        const message = error?.errorMessage ?? "";
        if (message === "FILE_TOKEN_INVALID") {
            this.cdn = undefined;
            this.cdnDisabled = true;
            return true;
        }
        if (message === "REQUEST_TOKEN_INVALID")
            return true;
        if (!message.startsWith("FILE_REFERENCE_"))
            return false;
        if (used !== this.location)
            return true;
        const refreshLocation = this.opts.refreshLocation;
        if (!refreshLocation)
            return false;
        this.refresh ??= refreshLocation()
            .then((location) => {
            if (location)
                this.location = location;
            return !!location;
        })
            .catch(() => false);
        return (await this.refresh) && used !== this.location;
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
exports.FileDownloader = FileDownloader;
