import { Api } from "../../tl";
import type { EntityLike } from "../../define";
import type { TelegramClient } from "../TelegramClient";
import type { EventBuilder } from "../../events/common";
import type { UpdateState, ChannelPollingState } from "./UpdateManager";
import { UpdateConnectionState } from "../../network";
import { type WithUpdateContext } from "./UpdateContext";
/** Passes the update on. A handler that never calls it consumes the update. */
export type NextFn = () => Promise<void>;
/**
 * One link of the chain: receives the update and `next`.
 *
 * `next()` runs the handlers behind it and waits for them, so work can happen
 * before and after; returning without it ends the chain for that update.
 */
export type UpdateMiddleware<T = any> = (update: WithUpdateContext<T>, next: NextFn) => unknown | Promise<unknown>;
/** Removes whatever {@link ClientUpdates.use}, {@link ClientUpdates.on} or {@link ClientUpdates.watch} registered. */
export type Unsubscribe = () => void;
type BareUpdateName<K extends string> = K extends `Update${infer Rest}` ? Uncapitalize<Rest> : never;
/** Raw updates of the current layer keyed by schema name, derived from the generated API. */
export type UpdateByName = {
    [K in Api.TypeUpdate["className"] as BareUpdateName<K>]: Extract<Api.TypeUpdate, {
        className: K;
    }>;
};
/**
 * Schema constructor without the `update` prefix: `updateNewChannelMessage` is
 * `"newChannelMessage"`. Plus `"connectionState"` for connection updates.
 */
export type UpdateName = (keyof UpdateByName & string) | "connectionState";
/** Anything the chain can carry: a raw update or a connection update. */
export type AnyUpdate = Api.TypeUpdate | UpdateConnectionState;
/** The update a handler subscribed to `Name` receives. */
export type UpdateOf<Name extends UpdateName> = WithUpdateContext<Name extends keyof UpdateByName ? UpdateByName[Name] : UpdateConnectionState>;
/** Options of {@link ClientUpdates.watch}. */
export interface WatchOptions {
    /** Receives matching updates independently of the middleware chain. Defaults to false. */
    independent?: boolean;
    /**
     * Which updates to hand the handler - raw names or an event builder.
     * Defaults to new messages, i.e. `["newMessage", "newChannelMessage"]`.
     */
    events?: UpdateName | UpdateName[] | EventBuilder;
    /** Extra predicate; the handler runs only when it returns a truthy value. */
    func?: (update: WithUpdateContext<AnyUpdate>) => unknown | Promise<unknown>;
}
/** Filters accepted by {@link ClientUpdates.on}, mirroring the event builders. */
export interface OnOptions {
    /** Bypasses the middleware chain; `next()` only advances this registration's handler array. */
    independent?: boolean;
    /**
     * Only handle updates coming from these chats - a username, an id or an
     * entity. Updates that carry no peer at all (`updateDcOptions`,
     * `updatePrivacy` and the like) never match this filter.
     */
    chats?: EntityLike | EntityLike[];
    /** Treat `chats` as a blacklist instead of a whitelist. */
    blacklistChats?: boolean;
    /** Extra predicate; the handler runs only when it returns a truthy value. */
    func?: (update: WithUpdateContext<AnyUpdate>) => unknown | Promise<unknown>;
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
export declare class ClientUpdates {
    private readonly client;
    private readonly chain;
    private readonly independent;
    private readonly registrations;
    private readonly watches;
    private onError?;
    private blockedAuthorization?;
    constructor(client: TelegramClient);
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
    use<T = any>(middleware: UpdateMiddleware<T>): Unsubscribe;
    /**
     * Handles updates of the given raw names, or the events of a builder.
     *
     * A raw name gives the original update typed as its schema class; a
     * builder gives that builder's event object, as `addEventHandler` does. An
     * array of handlers runs in order, each deciding with `next()` whether the
     * rest of them run.
     *
     * @param names - Raw update names, or an event builder.
     * @param handler - One handler or an ordered array of them.
     * @param options - Chat and predicate filters, see {@link OnOptions}.
     * @returns A function that removes the handler.
     * @example
     * ```ts
     * client.updates.on("newChannelMessage", (update) => console.log(update.message.id));
     * client.updates.on(["newMessage", "newChannelMessage"], handler);
     * client.updates.on("botCallbackQuery", [checkAuth, handleClick]);
     * client.updates.on("newChannelMessage", handler, { chats: ["durov"] });
     * client.updates.on(new NewMessage({}), (event) => event.message.reply({ message: "hi" }));
     * ```
     */
    on<Name extends UpdateName>(names: Name | Name[], handler: UpdateMiddleware<UpdateOf<Name>> | UpdateMiddleware<UpdateOf<Name>>[], options?: OnOptions): Unsubscribe;
    on<T = any>(builder: EventBuilder, handler: UpdateMiddleware<T> | UpdateMiddleware<T>[], options?: OnOptions): Unsubscribe;
    /**
     * Handles updates from the given chats and polls channel differences.
     *
     * Registration is synchronous and may precede `start()`. Channels resume
     * from their saved pts after reconnect; unsubscribing releases their polling slot.
     * All channels share `channelPollRequestInterval` and `channelPollConcurrency`,
     * including channel initialization and difference pages. More channels increase
     * delay; server timeouts are minimum intervals, not delivery deadlines.
     * Without a server timeout, polling uses `channelPollInterval` (1000 ms by default).
     * Flood waits pause the shared budget. Inspect {@link polling} for queue delays.
     * Delayed polling may interrupt passive delivery from channels you have not joined;
     * differences resume while server history is available. No channel-count cap is imposed.
     * Expired history yields a recent snapshot, not every missed event.
     * Messages recovered from differences use synthetic updates with `pts = ptsCount = 0`.
     *
     * Read `update.context.chat` or await `update.context.getChat()` for the source chat.
     * Chat information is absent for updates without a peer.
     * Permanent authorization failures suspend polling and reach `catch` once.
     * Polling resumes after login or a successful `updates.getState` call; see {@link authorizationError}.
     *
     * @param chats - Chats to listen to: usernames, ids or entities.
     * @param handler - Optional handler; without it only the subscription is kept.
     * @param options - Which updates to handle, see {@link WatchOptions}.
     * @returns A function that stops watching and removes the handler.
     * @example
     * ```ts
     * const stop = client.updates.watch(
     *     ["obitoscasino", "toporlive"],
     *     (update) => console.log(update.message.id),
     * );
     * stop();
     * ```
     */
    watch(chats: EntityLike | EntityLike[], handler?: UpdateMiddleware<UpdateOf<"newMessage" | "newChannelMessage">> | UpdateMiddleware<UpdateOf<"newMessage" | "newChannelMessage">>[], options?: WatchOptions & {
        events?: undefined;
    }): Unsubscribe;
    watch<Name extends UpdateName>(chats: EntityLike | EntityLike[], handler: UpdateMiddleware<UpdateOf<Name>> | UpdateMiddleware<UpdateOf<Name>>[], options: WatchOptions & {
        events: Name | Name[];
    }): Unsubscribe;
    watch<T = any>(chats: EntityLike | EntityLike[], handler?: UpdateMiddleware<T> | UpdateMiddleware<T>[], options?: WatchOptions): Unsubscribe;
    private arm;
    /** @hidden */
    _pause(): void;
    /** @hidden */
    _resume(): void;
    /** Permanent authorization error that suspended polling; cleared after successful authorization. */
    get authorizationError(): Error | undefined;
    /** @hidden */
    _suspendAuthorization(error: unknown): boolean;
    /** @hidden */
    _resumeAuthorization(): void;
    /** Ids of channels registered for polling by {@link watch}, including pending initialization. */
    get watched(): string[];
    /** Shared polling load and per-channel request timing; returns a detached snapshot. */
    get polling(): ChannelPollingState;
    /** Removes a middleware or handler from the chain. */
    off(middleware: UpdateMiddleware): void;
    /** Installs the handler for anything thrown inside the chain. */
    catch(handler: (error: Error, update?: AnyUpdate) => unknown): this;
    /** Registered chain handlers followed by independent subscriptions. */
    get handlers(): readonly UpdateMiddleware[];
    /** @hidden */
    _destroy(): void;
    /** A copy of the local update state: `pts`, `qts`, `date` and `seq`. */
    get state(): UpdateState | undefined;
    /** Fetches everything missed since the last known state. */
    catchUp(): Promise<void>;
    /** Delivers a local update without changing protocol checkpoints. In sequential mode, do not await this inside a handler. */
    dispatch(update: AnyUpdate, peers?: ReadonlyMap<string, Api.TypeUser | Api.TypeChat>): Promise<void>;
    _dispatch(update: AnyUpdate): Promise<void>;
    private attachContext;
    private register;
    private remove;
    private reportError;
    private chatMatcher;
    private builderMiddleware;
}
export {};
