import { Api } from "../../tl";
export type PtsUpdate = Api.TypeUpdate & {
    pts: number;
    ptsCount: number;
};
export type EntityMap = Map<string, Api.TypeUser | Api.TypeChat>;
export interface DispatchPayload {
    others: Api.TypeUpdate[] | null;
    entities?: EntityMap;
}
export declare function isCommonPtsUpdate(update: Api.TypeUpdate): update is PtsUpdate;
export declare function isChannelPtsUpdate(update: Api.TypeUpdate): update is PtsUpdate;
export declare function hasQts(update: Api.TypeUpdate): update is Api.TypeUpdate & {
    qts: number;
};
export declare function channelIdOf(update: Api.TypeUpdate): string | undefined;
export declare function requestChannelId(request: unknown): string | undefined;
export declare function collectEntities(users: Api.TypeUser[], chats: Api.TypeChat[]): EntityMap;
export declare function isMessage(message: Api.TypeMessage): message is Api.Message | Api.MessageService;
export declare function nextRetryDelaySeconds(previous: number): number;
