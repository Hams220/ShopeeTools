import type { Api } from "../tl";
export declare class MediaAbortError extends Error {
    constructor();
}
export declare class CdnRedirectError extends Error {
    readonly redirect: Api.upload.FileCdnRedirect;
    constructor(redirect: Api.upload.FileCdnRedirect);
}
