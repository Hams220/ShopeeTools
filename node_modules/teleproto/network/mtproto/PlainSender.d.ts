import { Api } from "../../tl";
import type { Logger } from "../../extensions/Logger";
import type { Connection } from "../connection/Connection";
export declare class PlainSender {
    private readonly connection;
    private readonly state;
    constructor(connection: Connection, log: Logger);
    send(request: Api.AnyRequest): Promise<unknown>;
}
