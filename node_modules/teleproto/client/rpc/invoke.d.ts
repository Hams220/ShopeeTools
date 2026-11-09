import { Api } from "../../tl";
import type { TelegramClient } from "../TelegramClient";
import { MTProtoSender } from "../../network";
import type { SessionLease } from "../../network/dc/SessionPool";
export declare function invoke<R extends Api.AnyRequest>(client: TelegramClient, request: R, dcId?: number, otherSender?: MTProtoSender | SessionLease, options?: Api.ApiCallOptions): Promise<R["__response"]>;
