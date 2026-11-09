import type { TelegramClient } from "../TelegramClient";
import { Api } from "../../tl";
/** @hidden */
export declare function getDialogFilters(client: TelegramClient): Promise<Api.messages.DialogFilters>;
/**
 * Creates, updates or deletes a dialog filter (chat folder).
 * Pass `filter: undefined` to delete the folder with the given ID.
 * @hidden
 */
export declare function updateDialogFilter(client: TelegramClient, id: number, filter?: Api.TypeDialogFilter): Promise<boolean>;
/** @hidden */
export declare function updateDialogFiltersOrder(client: TelegramClient, order: number[]): Promise<boolean>;
