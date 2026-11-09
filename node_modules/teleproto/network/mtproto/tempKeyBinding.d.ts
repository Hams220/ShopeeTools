import bigInt from "big-integer";
import { Api } from "../../tl";
import { AuthKey } from "../../crypto/AuthKey";
export declare function tempKeyLifetime(): number;
export declare function buildBindTempAuthKeyRequest(permKey: AuthKey, tempKey: AuthKey, tempSessionId: bigInt.BigInteger, msgId: bigInt.BigInteger, expiresAt: number): Api.auth.BindTempAuthKey;
