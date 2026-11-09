import bigInt from "big-integer";
import { AuthKey } from "../../crypto/AuthKey";
import { SaltPool } from "../mtproto/SaltPool";
import { ConnectThrottle } from "../session/ConnectThrottle";
export declare class DcState {
    readonly dcId: number;
    readonly authKey: AuthKey;
    readonly salts: SaltPool;
    readonly throttle: ConnectThrottle;
    readonly mediaThrottle: ConnectThrottle;
    salt: bigInt.BigInteger;
    authorized: boolean;
    private importing?;
    pfsFailed: boolean;
    constructor(dcId: number, authKey?: AuthKey);
    updateSalt(salt: bigInt.BigInteger | undefined): void;
    unauthorize(): void;
    authorize(importAuthorization: () => Promise<void>): Promise<void>;
}
export declare class DcStateRegistry {
    private readonly states;
    get(dcId: number, seedKey?: AuthKey): DcState;
    clear(): void;
}
