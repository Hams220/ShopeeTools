import { Connection, PacketCodec } from "./Connection";
import type { PacketReader } from "../transport/socket/types";
export declare class FullPacketCodec extends PacketCodec {
    private sendCounter;
    encodePacket(data: Buffer): Buffer;
    readPacket(reader: PacketReader): Promise<Buffer>;
}
export declare class ConnectionTCPFull extends Connection {
    PacketCodecClass: typeof FullPacketCodec;
}
