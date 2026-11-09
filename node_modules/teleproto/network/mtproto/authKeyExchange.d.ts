import type { PlainSender } from "./PlainSender";
import type { Logger } from "../../extensions/Logger";
import bigInt from "big-integer";
import { AuthKey } from "../../crypto/AuthKey";
export declare function isDhValueInRange(value: bigint, prime: bigint): boolean;
export declare function checkDhParams(prime: bigint, g: number, gA: bigint): void;
export interface TempKeyParams {
    expiresIn: number;
    dc: number;
}
export interface AuthKeyExchangeResult {
    authKey: AuthKey;
    timeOffset: number;
    serverSalt: bigInt.BigInteger;
}
export declare function doAuthentication(sender: PlainSender, log: Logger, temp?: TempKeyParams): Promise<AuthKeyExchangeResult>;
