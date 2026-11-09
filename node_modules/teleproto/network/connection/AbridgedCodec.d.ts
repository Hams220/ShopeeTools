import { Connection, PacketCodec } from "./Connection";
import type { PacketReader } from "../transport/socket/types";
export declare class AbridgedPacketCodec extends PacketCodec {
    static readonly tag: Buffer<ArrayBuffer>;
    static readonly obfuscateTag: Buffer<ArrayBuffer>;
    encodePacket(data: Buffer): Buffer;
    readPacket(reader: PacketReader): Promise<Buffer>;
}
export declare class ConnectionTCPAbridged extends Connection {
    PacketCodecClass: typeof AbridgedPacketCodec;
}
