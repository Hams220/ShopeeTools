import type { FieldDef } from "./schema";
export type TlUtils = {
    getInputPeer: (value: unknown) => unknown;
    getInputChannel: (value: unknown) => unknown;
    getInputUser: (value: unknown) => unknown;
    getInputMedia: (value: unknown) => unknown;
    getInputPhoto: (value: unknown) => unknown;
    getInputMessage: (value: unknown) => unknown;
    getInputDocument: (value: unknown) => unknown;
    getInputChatPhoto: (value: unknown) => unknown;
};
export type TlClient = {
    getInputEntity: (value: unknown) => Promise<unknown>;
    _getInputDialog: (value: unknown) => Promise<unknown>;
    _getInputNotify: (value: unknown) => Promise<unknown>;
    getPeerId: (value: unknown, addMark: boolean) => Promise<unknown>;
};
export declare function inputCastOf(field: FieldDef): string | undefined;
export declare function castInput(utils: TlUtils, client: TlClient, value: unknown, cast: string): Promise<unknown>;
