import type { BigInteger } from "big-integer";
import type { EntityLike } from "../../define";
import { Api } from "../../tl";
import { RequestIter } from "../../requestIter";
import { TotalList } from "../../Helpers";
import type { TelegramClient } from "../TelegramClient";
export interface GetWalletAddressesParams {
    addresses?: string[];
    force?: boolean;
}
export interface IterWalletTransactionsParams {
    inbound?: boolean;
    outbound?: boolean;
    offset?: string;
    limit?: number;
    waitTime?: number;
}
export interface IterWalletNftsParams {
    offset?: string;
    limit?: number;
    waitTime?: number;
}
export interface SendWalletTransferParams {
    data: Buffer;
    gaslessData?: Buffer;
    randomId?: BigInteger;
}
export type WalletTransactions = TotalList<Api.WalletTransaction> & {
    balance?: BigInteger;
};
interface WalletPage<T> {
    items: T[];
    next?: string;
    balance?: BigInteger;
}
type WalletPageFetcher<T> = (offset: string, limit: number) => Promise<WalletPage<T>>;
export declare class WalletCursorIter<T> extends RequestIter {
    balance?: BigInteger;
    private next?;
    private fetchPage?;
    private readonly offsets;
    _init({ offset, fetchPage }: {
        offset: string;
        fetchPage: WalletPageFetcher<T>;
    }): Promise<void>;
    _loadNextChunk(): Promise<boolean | undefined>;
    [Symbol.asyncIterator](): AsyncIterator<T>;
}
/** @hidden */
export declare function getWallet(client: TelegramClient): Promise<Api.TypeWalletState>;
/** @hidden */
export declare function getWalletAddresses(client: TelegramClient, users: EntityLike | EntityLike[], params?: GetWalletAddressesParams): Promise<Api.WalletUserAddress[]>;
/** @hidden */
export declare function iterWalletTransactions(client: TelegramClient, params?: IterWalletTransactionsParams): WalletCursorIter<Api.WalletTransaction>;
/** @hidden */
export declare function getWalletTransactions(client: TelegramClient, params?: IterWalletTransactionsParams): Promise<WalletTransactions>;
/** @hidden */
export declare function getWalletTransactionsById(client: TelegramClient, ids: string[]): Promise<Api.WalletTransaction[]>;
/** @hidden */
export declare function getWalletTransactionsByHash(client: TelegramClient, hashes: string[]): Promise<Api.WalletTransaction[]>;
/** @hidden */
export declare function iterWalletNfts(client: TelegramClient, params?: IterWalletNftsParams): WalletCursorIter<Api.wallet.NftItem>;
/** @hidden */
export declare function getWalletNfts(client: TelegramClient, params?: IterWalletNftsParams): Promise<TotalList<Api.wallet.NftItem>>;
/** @hidden */
export declare function sendWalletTransfer(client: TelegramClient, user: EntityLike, params: SendWalletTransferParams): Promise<Api.Message | undefined>;
/** @hidden */
export declare function getTonConnectSessions(client: TelegramClient): Promise<Api.TonConnectSession[]>;
/** @hidden */
export declare function closeTonConnectSession(client: TelegramClient, sessionId: BigInteger, params?: {
    body?: Buffer;
}): Promise<boolean>;
/** @hidden */
export declare function getCurrencyRates(client: TelegramClient): Promise<Map<string, number>>;
export {};
