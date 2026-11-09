import type { TelegramClient } from "../../../client/TelegramClient";
import type { UpdateConnectionState } from "../../../network";
import type { Api } from "../../../tl";
export { on, addEventHandler, removeEventHandler, listEventHandlers, catchUp } from "../../../client/methods/updates";
export { StopPropagation } from "../../../client/updates/StopPropagation";
/** @hidden @deprecated */
export declare function _handleUpdate(client: TelegramClient, update: Api.TypeUpdate | Api.TypeUpdates | UpdateConnectionState | number): void;
/** @hidden @deprecated */
export declare function _dispatchUpdate(client: TelegramClient, args: {
    update: unknown;
}): Promise<void>;
/** @hidden @deprecated */
export declare function _clearUpdateQueue(client: TelegramClient): void;
/** @hidden @deprecated */
export declare function _stopUpdateLoop(client: TelegramClient): void;
/** @hidden @deprecated */
export declare function _updateLoop(client: TelegramClient, catchUp?: boolean): Promise<void>;
