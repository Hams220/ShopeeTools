import type { Api } from "../../tl";
export declare const DC_PORT = 443;
export declare const PROD_DC_IPV4: {
    readonly [id: number]: string;
};
export declare const PROD_DC_IPV6: {
    readonly [id: number]: string;
};
export declare const TEST_DC_IPV4: {
    readonly [id: number]: string;
};
export declare const TEST_DC_IPV6: {
    readonly [id: number]: string;
};
export declare const WEBSOCKET_DC_HOSTS: {
    readonly [id: number]: string;
};
export declare function webSocketDcAddress(dcId: number, mediaCluster?: boolean): string | undefined;
export declare function isTestDcAddress(address: string): boolean | undefined;
export interface DcAddress {
    id: number;
    ipAddress: string;
    port: number;
    mediaOnly?: boolean;
}
export interface DcAddressBookOptions {
    testServers: boolean;
    webSocket: boolean;
    proxied: boolean;
    ipv6: () => boolean;
}
export declare class DcAddressBook {
    private readonly env;
    private options;
    private readonly failures;
    constructor(env: DcAddressBookOptions);
    get hasConfig(): boolean;
    setOptions(options: Api.TypeDcOption[]): void;
    seed(dcId: number, ipv6?: boolean): DcAddress | undefined;
    lookup(dcId: number, media?: boolean): DcAddress | undefined;
    isCdn(dcId: number): boolean;
    cdn(dcId: number): DcAddress | undefined;
    resolve(dcId: number, media?: boolean): DcAddress;
    next(dcId: number, current: string): DcAddress;
    fail(dcId: number, media: boolean): number;
    private failureCount;
}
