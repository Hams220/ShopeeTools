import type { TelegramClient } from "../TelegramClient";
import type { UpdateConnectionState } from "../../network";
type DispatchedUpdate = UpdateConnectionState | any;
export declare class UpdateDispatcher {
    private readonly client;
    private head?;
    private tail?;
    private draining;
    constructor(client: TelegramClient);
    dispatch(update: DispatchedUpdate): Promise<void>;
    clear(): void;
    private drain;
    private deliver;
}
export {};
