import type bigInt from "big-integer";
import type { Api } from "../../tl";
export interface FutureSalt {
    validSince: number;
    validUntil: number;
    salt: bigInt.BigInteger;
}
export declare class SaltPool {
    private salts;
    private refilling;
    private refilledAt;
    current(serverNow: number): bigInt.BigInteger | undefined;
    needsRefill(now?: number): boolean;
    beginRefill(now?: number): void;
    endRefill(result?: Api.FutureSalts): void;
    get count(): number;
    clear(): void;
}
