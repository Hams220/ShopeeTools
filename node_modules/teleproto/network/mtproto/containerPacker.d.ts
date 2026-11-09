import type { SessionState } from "./SessionState";
import { type OutgoingObject, type RequestState } from "./RequestState";
export interface PackedMessages {
    batch: RequestState[];
    data: Buffer;
}
export declare function isContentRelated(request: OutgoingObject): boolean;
export declare function packMessages(state: SessionState, queues: RequestState[][]): Promise<PackedMessages | undefined>;
