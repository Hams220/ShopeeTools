"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WalletCursorIter = void 0;
exports.getWallet = getWallet;
exports.getWalletAddresses = getWalletAddresses;
exports.iterWalletTransactions = iterWalletTransactions;
exports.getWalletTransactions = getWalletTransactions;
exports.getWalletTransactionsById = getWalletTransactionsById;
exports.getWalletTransactionsByHash = getWalletTransactionsByHash;
exports.iterWalletNfts = iterWalletNfts;
exports.getWalletNfts = getWalletNfts;
exports.sendWalletTransfer = sendWalletTransfer;
exports.getTonConnectSessions = getTonConnectSessions;
exports.closeTonConnectSession = closeTonConnectSession;
exports.getCurrencyRates = getCurrencyRates;
const tl_1 = require("../../tl");
const requestIter_1 = require("../../requestIter");
const Helpers_1 = require("../../Helpers");
const PAGE_LIMIT = 100;
class WalletCursorIter extends requestIter_1.RequestIter {
    constructor() {
        super(...arguments);
        this.offsets = new Set();
    }
    async _init({ offset, fetchPage }) {
        this.next = offset;
        this.fetchPage = fetchPage;
        this.offsets.clear();
    }
    async _loadNextChunk() {
        while (this.next !== undefined) {
            const offset = this.next;
            this.offsets.add(offset);
            const page = await this.fetchPage(offset, Math.min(this.left, PAGE_LIMIT));
            if (page.balance !== undefined)
                this.balance = page.balance;
            this.buffer.push(...page.items);
            this.next = page.next && !this.offsets.has(page.next) ? page.next : undefined;
            if (this.next === undefined)
                return true;
            if (page.items.length)
                return undefined;
        }
        return true;
    }
    [Symbol.asyncIterator]() {
        return super[Symbol.asyncIterator]();
    }
}
exports.WalletCursorIter = WalletCursorIter;
/** @hidden */
async function getWallet(client) {
    return client.invoke(new tl_1.Api.wallet.GetState());
}
/** @hidden */
async function getWalletAddresses(client, users, params = {}) {
    const result = await client.invoke(new tl_1.Api.wallet.GetUserAddresses({
        force: params.force,
        id: Array.isArray(users) ? users : [users],
        addresses: params.addresses ?? [],
    }));
    return result.addresses;
}
/** @hidden */
function iterWalletTransactions(client, params = {}) {
    const fetchPage = async (offset, limit) => {
        const result = await client.invoke(new tl_1.Api.wallet.GetTransactions({
            inbound: params.inbound,
            outbound: params.outbound,
            offset,
            limit,
        }));
        return {
            items: result.transactions,
            next: result.nextOffset,
            balance: result.balance,
        };
    };
    return new WalletCursorIter(client, params.limit, { waitTime: params.waitTime }, { offset: params.offset ?? "", fetchPage });
}
/** @hidden */
async function getWalletTransactions(client, params = {}) {
    const iter = iterWalletTransactions(client, params);
    const list = (await iter.collect());
    list.balance = iter.balance;
    return list;
}
/** @hidden */
async function getWalletTransactionsById(client, ids) {
    const result = await client.invoke(new tl_1.Api.wallet.GetTransactionsByIDs({ id: ids }));
    return result.transactions;
}
/** @hidden */
async function getWalletTransactionsByHash(client, hashes) {
    const result = await client.invoke(new tl_1.Api.wallet.GetTransactionsByMsgHash({ msgHash: hashes }));
    return result.transactions;
}
/** @hidden */
function iterWalletNfts(client, params = {}) {
    const fetchPage = async (offset, limit) => {
        const result = await client.invoke(new tl_1.Api.wallet.GetNfts({ offset, limit }));
        return { items: result.items, next: result.nextOffset };
    };
    return new WalletCursorIter(client, params.limit, { waitTime: params.waitTime }, { offset: params.offset ?? "", fetchPage });
}
/** @hidden */
async function getWalletNfts(client, params = {}) {
    return (await iterWalletNfts(client, params).collect());
}
/** @hidden */
async function sendWalletTransfer(client, user, params) {
    const entity = await client.getInputEntity(user);
    const request = new tl_1.Api.wallet.SendTransfer({
        dataNormal: params.data,
        dataGasless: params.gaslessData,
        userId: entity,
        randomId: params.randomId ?? (0, Helpers_1.generateRandomLong)(),
    });
    const result = await client.invoke(request);
    return client._getResponseMessage(request, result, entity);
}
/** @hidden */
async function getTonConnectSessions(client) {
    const result = await client.invoke(new tl_1.Api.wallet.TonConnectGetSessions());
    return result.sessions;
}
/** @hidden */
async function closeTonConnectSession(client, sessionId, params = {}) {
    return client.invoke(new tl_1.Api.wallet.TonConnectCloseSession({ sessionId, body: params.body }));
}
/** @hidden */
async function getCurrencyRates(client) {
    const result = await client.invoke(new tl_1.Api.payments.GetCurrencyRates());
    return new Map(result.rates.map((rate) => [rate.currency, rate.rate]));
}
