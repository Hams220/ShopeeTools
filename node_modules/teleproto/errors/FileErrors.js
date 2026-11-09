"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CdnRedirectError = exports.MediaAbortError = void 0;
class MediaAbortError extends Error {
    constructor() {
        super("Media operation aborted");
        this.name = "MediaAbortError";
    }
}
exports.MediaAbortError = MediaAbortError;
class CdnRedirectError extends Error {
    constructor(redirect) {
        super("upload.fileCdnRedirect");
        this.redirect = redirect;
        this.name = "CdnRedirectError";
    }
}
exports.CdnRedirectError = CdnRedirectError;
