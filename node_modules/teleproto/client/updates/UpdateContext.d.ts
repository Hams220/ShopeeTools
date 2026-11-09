import type { TelegramClient } from "../TelegramClient";
import type { Entity } from "../../define";
import { EventCommon } from "../../events/common";
/** Chat access for raw updates; entity fetching is deferred until `getChat()`. */
export declare class UpdateContext extends EventCommon {
    private pendingChat?;
    constructor(client: TelegramClient, peerId?: string, entities?: Map<string, Entity>);
    /** Attached users and chats keyed by marked peer ID; reading never makes an RPC. */
    get peers(): ReadonlyMap<string, Entity>;
    /** Returns the attached chat or fetches it, sharing concurrent calls within this update. */
    getChat(): Promise<Entity | undefined>;
}
/** The original event with a non-enumerable chat context. */
export type WithUpdateContext<T> = T & {
    readonly context: UpdateContext;
};
