export declare class CTR {
    private readonly state;
    constructor(key: Buffer, iv: Buffer);
    encrypt(data: Uint8Array): Buffer;
    encryptInPlace(data: Buffer): Buffer;
    dispose(): void;
}
