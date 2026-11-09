import type { TelegramClient } from "../TelegramClient";
export declare class UpdateLoop {
    private readonly client;
    private controller?;
    constructor(client: TelegramClient);
    get running(): boolean;
    start(catchUp?: boolean): void;
    stop(): void;
    private run;
}
