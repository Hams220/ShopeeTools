import bigInt from "big-integer";
export declare class Factorizator {
    static gcd(a: bigInt.BigInteger, b: bigInt.BigInteger): bigInt.BigInteger;
    static factorize(pq: bigInt.BigInteger): {
        p: bigInt.BigInteger;
        q: bigInt.BigInteger;
    };
}
