"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClientUpdates = void 0;
const events_1 = require("events");
const tl_1 = require("../../tl");
const common_1 = require("../../events/common");
const Utils_1 = require("../../Utils");
const Helpers_1 = require("../../Helpers");
const network_1 = require("../../network");
const UpdateContext_1 = require("./UpdateContext");
const fieldsOf = (update) => (update ?? {});
function nameOf(update) {
    const className = fieldsOf(update).className;
    if (!className) {
        return update instanceof network_1.UpdateConnectionState
            ? "connectionState"
            : undefined;
    }
    const bare = className.startsWith("Update")
        ? className.slice("Update".length)
        : className;
    return (bare.charAt(0).toLowerCase() + bare.slice(1));
}
function expandShortMessage(update, selfId) {
    const short = update instanceof tl_1.Api.UpdateShortMessage ||
        update instanceof tl_1.Api.UpdateShortChatMessage;
    if (!short)
        return undefined;
    const peerId = update instanceof tl_1.Api.UpdateShortMessage
        ? new tl_1.Api.PeerUser({ userId: update.userId })
        : new tl_1.Api.PeerChat({ chatId: update.chatId });
    const fromUser = update instanceof tl_1.Api.UpdateShortMessage ? update.userId : update.fromId;
    return new tl_1.Api.UpdateNewMessage({
        message: new tl_1.Api.Message({
            out: update.out,
            mentioned: update.mentioned,
            mediaUnread: update.mediaUnread,
            silent: update.silent,
            id: update.id,
            peerId,
            fromId: new tl_1.Api.PeerUser({
                userId: update.out && selfId ? selfId : fromUser,
            }),
            message: update.message,
            date: update.date,
            fwdFrom: update.fwdFrom,
            viaBotId: update.viaBotId,
            replyTo: update.replyTo,
            entities: update.entities,
            ttlPeriod: update.ttlPeriod,
        }),
        pts: update.pts,
        ptsCount: update.ptsCount,
    });
}
function peerOf(update) {
    const fields = fieldsOf(update);
    if (fields.peer instanceof tl_1.Api.DialogPeerCommunity ||
        fields.peer instanceof tl_1.Api.NotifyCommunity) {
        return (0, Utils_1.getPeerId)(new tl_1.Api.PeerChannel({ channelId: fields.peer.communityId }));
    }
    const peer = fields.message?.peerId ??
        (fields.peer instanceof tl_1.Api.DialogPeer || fields.peer instanceof tl_1.Api.NotifyPeer
            ? fields.peer.peer : undefined) ??
        (fields.peer instanceof tl_1.Api.PeerUser ||
            fields.peer instanceof tl_1.Api.PeerChat ||
            fields.peer instanceof tl_1.Api.PeerChannel
            ? fields.peer
            : undefined);
    if (peer)
        return (0, Utils_1.getPeerId)(peer);
    if (fields.channelId) {
        return (0, Utils_1.getPeerId)(new tl_1.Api.PeerChannel({ channelId: fields.channelId }));
    }
    if (fields.chatId) {
        return (0, Utils_1.getPeerId)(new tl_1.Api.PeerChat({ chatId: fields.chatId }));
    }
    if (fields.userId) {
        return (0, Utils_1.getPeerId)(new tl_1.Api.PeerUser({ userId: fields.userId }));
    }
    return undefined;
}
/**
 * The update pipeline of a client, reachable as `client.updates`.
 *
 * Handlers form one chain: `next()` passes the update on, returning without it
 * consumes the update. {@link on} matches first, by raw schema name or by an
 * event builder; {@link watch} also polls channel differences for the chats
 * it is given.
 * `independent: true` registrations run alongside this chain and cannot consume each other's updates.
 *
 * A raw name gives the original `Api.TypeUpdate`, a builder gives its event
 * object. Direct and small-group messages arrive as the `updateShortMessage`
 * containers, which are not part of the `Update` union; the chain expands them,
 * so `"newMessage"` sees them too.
 *
 * Each update carries a `state` object for middleware to leave things in.
 * `context` exposes `chatId`, `chat`, `getChat()`, `inputChat` and `client`
 * without changing TL fields or the second argument, `next()`.
 * `chat` uses attached entities; only `getChat()` may fetch a missing chat.
 * Throws go to {@link catch}, or to the client's error handler.
 *
 * `client.addEventHandler` keeps working and runs before this chain; a
 * `StopPropagation` there ends that loop only.
 *
 * @example
 * ```ts
 * client.updates.use(async (update, next) => {
 *     const started = Date.now();
 *     await next();
 *     console.log(`${update.className} handled in ${Date.now() - started}ms`);
 * });
 *
 * client.updates.on("newChannelMessage", (update) => {
 *     console.log(update.message.id);
 * }, { chats: ["durov"] });
 *
 * client.updates.on(new NewMessage({ pattern: /^\/start/ }), (event) =>
 *     event.message.reply({ message: "hi" }));
 *
 * const stop = client.updates.watch("obitoscasino", (update) =>
 *     console.log(update.message.id));
 * ```
 * @category Updates
 */
class ClientUpdates {
    constructor(client) {
        this.chain = [];
        this.independent = new Set();
        this.registrations = new Map();
        this.watches = new Set();
        this.client = client;
    }
    /**
     * Adds a middleware to the end of the chain. It sees every update, so this
     * is the place for logging, timing or authentication.
     *
     * @param middleware - see {@link UpdateMiddleware}.
     * @returns A function that removes it.
     * @example
     * ```ts
     * client.updates.use(async (update, next) => {
     *     update.state.user = await db.findUser(update);
     *     await next();
     * });
     * ```
     */
    use(middleware) {
        if (this.client._destroyed)
            throw new Error("Cannot subscribe to a destroyed client");
        if (typeof middleware !== "function") {
            throw new TypeError("Update middleware must be a function");
        }
        this.chain.push(middleware);
        return () => this.remove(middleware);
    }
    on(target, handler, options = {}) {
        const run = compose(handler);
        if (typeof target !== "string" && !Array.isArray(target)) {
            return this.register(this.builderMiddleware(target, run, options), handler, options.independent);
        }
        const names = new Set((Array.isArray(target) ? target : [target]).map((name) => name.charAt(0).toLowerCase() + name.slice(1)));
        const matchesChat = this.chatMatcher(options);
        return this.register(async (update, next) => {
            const name = nameOf(update);
            if (!name || !names.has(name))
                return next();
            if (!(await matchesChat(update)))
                return next();
            if (options.func && !(await options.func(update)))
                return next();
            await run(update, next);
        }, handler, options.independent);
    }
    watch(chats, handler, options = {}) {
        if (this.client._destroyed)
            throw new Error("Cannot subscribe to a destroyed client");
        const wanted = (0, Helpers_1.isArrayLike)(chats)
            ? chats
            : [chats];
        let offHandler;
        if (handler) {
            const events = options.events ?? ["newMessage", "newChannelMessage"];
            offHandler =
                typeof events === "string" || Array.isArray(events)
                    ? this.on(events, handler, {
                        chats: wanted,
                        func: options.func,
                        independent: options.independent,
                    })
                    : this.on(events, handler, {
                        chats: wanted,
                        func: options.func,
                        independent: options.independent,
                    });
        }
        const entry = {
            chats: wanted,
            channels: new Set(),
            stopped: false,
            controller: watchController(),
            retryDelay: 1000,
        };
        this.watches.add(entry);
        void this.arm(entry);
        return () => {
            if (entry.stopped)
                return;
            entry.stopped = true;
            this.watches.delete(entry);
            offHandler?.();
            entry.controller.abort();
            if (entry.retryTimer)
                clearTimeout(entry.retryTimer);
            entry.channels.clear();
        };
    }
    async arm(entry) {
        if (entry.stopped || entry.arming || this.blockedAuthorization || !this.client.updateManager.isRunning)
            return;
        const controller = entry.controller;
        const active = () => !controller.signal.aborted && !entry.stopped;
        const task = (async () => {
            await this.client._connectedDeferred.promise;
            if (!active() || !this.client.updateManager.isRunning)
                return;
            let retry = false;
            const pending = [];
            const pendingChannels = new Set();
            const failed = async (error) => {
                if (!active())
                    return;
                if (this._suspendAuthorization(error))
                    return;
                const code = error.errorMessage;
                retry ||= !(error instanceof TypeError || error instanceof RangeError) &&
                    !["CHANNEL_PRIVATE", "CHANNEL_INVALID", "USERNAME_INVALID", "USERNAME_NOT_OCCUPIED", "PEER_ID_INVALID"].includes(code ?? "");
                await this.reportError(error, undefined);
            };
            for (const chat of entry.chats) {
                if (!active())
                    return;
                try {
                    const input = await this.client.getInputEntity(chat);
                    if (!active())
                        return;
                    if (!(input instanceof tl_1.Api.InputPeerChannel))
                        continue;
                    const channelId = input.channelId.toString();
                    if (entry.channels.has(channelId) || pendingChannels.has(channelId))
                        continue;
                    pendingChannels.add(channelId);
                    const subscription = this.client.updateManager.watchChannel(channelId, new tl_1.Api.InputChannel({
                        channelId: input.channelId,
                        accessHash: input.accessHash,
                    }), controller.signal);
                    pending.push(subscription.then(() => {
                        if (active())
                            entry.channels.add(channelId);
                    }).catch(failed));
                }
                catch (error) {
                    await failed(error);
                }
            }
            await Promise.all(pending);
            if (retry && active()) {
                entry.retryTimer = setTimeout(() => {
                    entry.retryTimer = undefined;
                    void this.arm(entry);
                }, entry.retryDelay);
                entry.retryTimer.unref?.();
                entry.retryDelay = Math.min(entry.retryDelay * 2, 64000);
            }
            else {
                entry.retryDelay = 1000;
            }
        })();
        entry.arming = task;
        try {
            await task;
        }
        catch (error) {
            this.client._log.error(`Error arming channel watch: ${error}`);
        }
        finally {
            if (entry.arming === task)
                entry.arming = undefined;
        }
    }
    /** @hidden */
    _pause() {
        for (const entry of this.watches) {
            entry.controller.abort();
            entry.controller = watchController();
            entry.channels.clear();
            entry.arming = undefined;
            if (entry.retryTimer)
                clearTimeout(entry.retryTimer);
            entry.retryTimer = undefined;
        }
    }
    /** @hidden */
    _resume() {
        if (this.blockedAuthorization)
            return;
        const alive = new Set(this.client.updateManager.watchedChannelIds());
        for (const entry of this.watches) {
            if (entry.stopped)
                continue;
            for (const channelId of [...entry.channels]) {
                if (!alive.has(channelId))
                    entry.channels.delete(channelId);
            }
            if (entry.retryTimer)
                clearTimeout(entry.retryTimer);
            entry.retryTimer = undefined;
            if (entry.channels.size < entry.chats.length)
                void this.arm(entry);
        }
    }
    /** Permanent authorization error that suspended polling; cleared after successful authorization. */
    get authorizationError() {
        return this.blockedAuthorization;
    }
    /** @hidden */
    _suspendAuthorization(error) {
        const code = error?.errorMessage;
        if (![
            "AUTH_KEY_UNREGISTERED", "AUTH_KEY_INVALID", "AUTH_KEY_DUPLICATED",
            "SESSION_REVOKED", "SESSION_EXPIRED", "USER_DEACTIVATED", "USER_DEACTIVATED_BAN",
        ].includes(code ?? ""))
            return false;
        if (!this.blockedAuthorization) {
            this.blockedAuthorization = error;
            this._pause();
            if (this.client._selfInputPeer)
                void this.reportError(error);
            else
                this.client._log.debug(`Updates wait for authorization: ${code}`);
        }
        return true;
    }
    /** @hidden */
    _resumeAuthorization() {
        if (this.client._destroyed)
            return;
        this.blockedAuthorization = undefined;
        this._resume();
        void this.client.updateManager.catchUp();
    }
    /** Ids of channels registered for polling by {@link watch}, including pending initialization. */
    get watched() {
        return this.client.updateManager.watchedChannelIds();
    }
    /** Shared polling load and per-channel request timing; returns a detached snapshot. */
    get polling() {
        return this.client.updateManager.polling;
    }
    /** Removes a middleware or handler from the chain. */
    off(middleware) {
        this.remove(middleware);
        for (const [registered, handlers] of this.registrations) {
            if (handlers.includes(middleware))
                this.remove(registered);
        }
    }
    /** Installs the handler for anything thrown inside the chain. */
    catch(handler) {
        this.onError = handler;
        return this;
    }
    /** Registered chain handlers followed by independent subscriptions. */
    get handlers() {
        return [...this.chain, ...this.independent];
    }
    /** @hidden */
    _destroy() {
        for (const entry of this.watches) {
            entry.stopped = true;
            entry.controller.abort();
            if (entry.retryTimer)
                clearTimeout(entry.retryTimer);
            entry.channels.clear();
        }
        this.watches.clear();
        this.chain.length = 0;
        this.independent.clear();
        this.registrations.clear();
        this.onError = undefined;
        this.blockedAuthorization = undefined;
    }
    /** A copy of the local update state: `pts`, `qts`, `date` and `seq`. */
    get state() {
        const state = this.client.updateManager.state;
        return state ? { ...state } : undefined;
    }
    /** Fetches everything missed since the last known state. */
    async catchUp() {
        await this.client.updateManager.catchUp();
    }
    /** Delivers a local update without changing protocol checkpoints. In sequential mode, do not await this inside a handler. */
    async dispatch(update, peers) {
        if (this.client._destroyed)
            throw new Error("Cannot dispatch through a destroyed client");
        if (peers)
            fieldsOf(update)._entities = new Map(peers);
        await this.client._updateDispatcher.dispatch(update);
    }
    async _dispatch(update) {
        if (update instanceof network_1.UpdateConnectionState &&
            update.state === network_1.UpdateConnectionState.connected) {
            this._resume();
        }
        if (!this.chain.length && !this.independent.size)
            return;
        const expanded = expandShortMessage(update, this.client._selfInputPeer?.userId);
        if (expanded) {
            fieldsOf(expanded)._entities = fieldsOf(update)._entities;
            update = expanded;
        }
        const message = fieldsOf(update).message;
        if ((message instanceof tl_1.Api.Message || message instanceof tl_1.Api.MessageService) &&
            message._client !== this.client) {
            message._finishInit(this.client, fieldsOf(update)._entities ?? new Map());
        }
        if (update && typeof update === "object" && !("state" in update)) {
            Object.defineProperty(update, "state", {
                value: {},
                enumerable: false,
                writable: true,
            });
        }
        this.attachContext(update);
        const chain = [...this.chain];
        const branches = [...this.independent];
        const deliver = async (handlers) => {
            try {
                await runChain(handlers, update, async () => { });
            }
            catch (e) {
                await this.reportError(e, update);
            }
        };
        await Promise.all([deliver(chain), ...branches.map((handler) => deliver([handler]))]);
    }
    attachContext(event, update = event) {
        if ("context" in event)
            return;
        let context;
        Object.defineProperty(event, "context", {
            get: () => context ??= new UpdateContext_1.UpdateContext(this.client, peerOf(update), fieldsOf(update)._entities),
            enumerable: false,
        });
    }
    register(middleware, handler, independent = false) {
        if (this.client._destroyed)
            throw new Error("Cannot subscribe to a destroyed client");
        this.registrations.set(middleware, Array.isArray(handler) ? handler.slice() : [handler]);
        if (independent) {
            this.independent.add(middleware);
            return () => this.remove(middleware);
        }
        return this.use(middleware);
    }
    remove(middleware) {
        this.registrations.delete(middleware);
        this.independent.delete(middleware);
        const index = this.chain.indexOf(middleware);
        if (index >= 0)
            this.chain.splice(index, 1);
    }
    async reportError(error, update) {
        if (this.onError) {
            try {
                await this.onError(error, update);
                return;
            }
            catch (e) {
                error = e;
            }
        }
        if (this.client._errorHandler) {
            try {
                await this.client._errorHandler(error);
                return;
            }
            catch (handlerError) {
                error = handlerError;
            }
        }
        this.client._log.error(`Error in the update chain: ${error}`);
    }
    chatMatcher(options) {
        if (options.chats === undefined)
            return async () => true;
        let ids;
        const wanted = (0, Helpers_1.isArrayLike)(options.chats)
            ? options.chats
            : [options.chats];
        return async (update) => {
            if (!ids) {
                ids = new Set((await (0, common_1._intoIdSet)(this.client, wanted)) ?? []);
            }
            const peer = peerOf(update);
            const listed = peer !== undefined && ids.has(peer);
            return options.blacklistChats ? !listed : listed;
        };
    }
    builderMiddleware(builder, run, options) {
        const matchesChat = this.chatMatcher(options);
        builder.client = this.client;
        return async (update, next) => {
            if (!builder.resolved)
                await builder.resolve(this.client);
            let event = builder.build(update, undefined, this.client._selfInputPeer
                ? this.client._selfInputPeer.userId
                : undefined);
            if (!event)
                return next();
            event._client = this.client;
            if ("_eventName" in event) {
                event.originalUpdate = update;
                event._entities = update._entities ?? new Map();
                event._setClient(this.client);
            }
            this.attachContext(event, update);
            if (!(await builder.filter(event)))
                return next();
            if (!(await matchesChat(update)))
                return next();
            if (options.func && !(await options.func(update)))
                return next();
            await run(event, next);
        };
    }
}
exports.ClientUpdates = ClientUpdates;
function compose(handler) {
    if (!Array.isArray(handler)) {
        if (typeof handler !== "function") {
            throw new TypeError("Update handler must be a function");
        }
        return handler;
    }
    const handlers = handler.slice();
    for (const item of handlers) {
        if (typeof item !== "function") {
            throw new TypeError("Update handler must be a function");
        }
    }
    return (update, next) => runChain(handlers, update, next);
}
async function runChain(handlers, update, next) {
    let last = -1;
    const run = async (index) => {
        if (index <= last)
            throw new Error("next() called multiple times");
        last = index;
        if (index >= handlers.length)
            return next();
        await handlers[index](update, () => run(index + 1));
    };
    await run(0);
}
function watchController() {
    const controller = new AbortController();
    (0, events_1.setMaxListeners)(0, controller.signal);
    return controller;
}
