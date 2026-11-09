declare class IGE {
    private readonly cipher;
    private readonly iv;
    constructor(key: Buffer, iv: Buffer);
    encryptIge(plainText: Buffer, output?: Buffer): Buffer;
    decryptIge(cipherText: Buffer, output?: Buffer): Buffer;
    static backend(): string;
    dispose(): void;
}
export { IGE };
