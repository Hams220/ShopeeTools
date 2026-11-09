import type { EventBuilder } from "../../events/common";
import type { TelegramClient } from "../TelegramClient";
export { StopPropagation } from "../updates/StopPropagation";
export declare function on(client: TelegramClient, event?: EventBuilder): (f: (event: any) => void) => (event: any) => void;
export declare function addEventHandler(client: TelegramClient, callback: CallableFunction, event?: EventBuilder): void;
export declare function removeEventHandler(client: TelegramClient, callback: CallableFunction, event: EventBuilder): void;
export declare function listEventHandlers(client: TelegramClient): [EventBuilder, CallableFunction][];
export declare function catchUp(client: TelegramClient): Promise<void>;
