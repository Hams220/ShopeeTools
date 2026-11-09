import { Connection } from "../network";
import type { SocketFactory as LegacySocketFactory } from "../compat/extensions/SocketInterface";
import { Session } from "../sessions";
import { Logger } from "../extensions";
import { Api } from "../tl";
import { AuthKey } from "../crypto/AuthKey";
import { EntityCache } from "../entityCache";
import type { EntityCacheOptions } from "../entityCache";
import type { ParseInterface } from "./methods/messageParse";
import type { EventBuilder } from "../events/common";
import { Session as MTProtoSender, type ConnectionBreakReason, type SenderTempBinding } from "../network/session/Session";
import { DcStateRegistry } from "../network/dc/DcState";
import { SessionPool } from "../network/dc/SessionPool";
import type { SessionLease } from "../network/dc/SessionPool";
import { DcAddressBook, type DcAddress } from "../network/dc/DcAddressBook";
import { FileTransfers, type TransferBalance } from "./files/FileTransfers";
import { LogLevel } from "../extensions/Logger";
import Deferred from "../extensions/Deferred";
import { UpdateManager } from "./updates/UpdateManager";
import { UpdateDispatcher } from "./updates/UpdateDispatcher";
import { UpdateLoop } from "./updates/UpdateLoop";
import type { ClientUpdates } from "./updates/ClientUpdates";
import type { ResolvedTransport, Transport } from "../network/transport/Transport";
import { type WebProxyOptions } from "../network/transport/WebProxyTransport";
type LifecycleEvent = "connecting" | "connect" | "disconnect" | "reconnecting" | "reconnect" | "destroy";
type LifecycleHandler = () => void | Promise<void>;
export { PROD_DC_IPV4, PROD_DC_IPV6, TEST_DC_IPV4, TEST_DC_IPV6, WEBSOCKET_DC_HOSTS, webSocketDcAddress, } from "../network/dc/DcAddressBook";
/** @deprecated Use the `transport` client option. */
export type WebProxyType = WebProxyOptions & {
    WEB: true;
};
/** @deprecated Use the `transport` client option. */
export type ProxyInterface = {
    MTProxy: true;
    ip: string;
    port: number;
    secret: string;
    timeout?: number;
} | {
    socksType: 4 | 5;
    ip: string;
    port: number;
    username?: string;
    password?: string;
    timeout?: number;
} | WebProxyType;
export interface DownloadPoolOptions {
    partSize?: number;
    sessions?: number;
    inflightPerDc?: number;
    download?: TransferBalance & Record<string, unknown>;
    upload?: TransferBalance & Record<string, unknown>;
    idleTimeoutMs?: number;
    sessionStartupDelayMs?: number;
    maxSessions?: number;
    requestRetries?: number;
    requestDeadlineMs?: number;
    cdnSupported?: boolean;
}
export interface TelegramClientParams {
    /** MTProto packet framing. Defaults to {@link ConnectionTCPObfuscated}. */
    connection?: typeof Connection;
    /**
     * Whether to connect to the servers through IPv6 or not. By default this is false.
     */
    useIPV6?: boolean;
    /**
     * Whether to connect to Telegram's test environment instead of production.
     *
     * When `true`:
     * - The client starts from test DC2 (`149.154.167.40`). DC routing follows the same
     *   path as production: `help.GetConfig` is the runtime source of truth, with the
     *   built-in test seed table (DC1/DC2/DC3) used as a fallback.
     * - You must use a test phone number of the form `99966<dc><4 digits>`; the login
     *   code is the DC digit repeated 5 times (e.g. `22222` for DC2).
     * - Test sessions are not interchangeable with production sessions.
     *
     * Defaults to `false`.
     */
    testServers?: boolean;
    /**
     * The timeout in seconds for establishing a TCP connection to a DC.
     * An address that exceeds it is closed, the attempt fails fast and the
     * next attempt rotates to an alternative address of that DC.
     */
    timeout?: number;
    /**
     * How many times a request should be retried.<br/>
     * Request are retried when Telegram is having internal issues (due to INTERNAL error or RPC_CALL_FAIL error),<br/>
     * when there is a errors.FloodWaitError less than floodSleepThreshold, or when there's a migrate error.<br/>
     * defaults to 5.
     */
    requestRetries?: number;
    /**
     * How many times the connection should retry, either on the initial connection or when Telegram disconnects us.<br/>
     * May be set to a negative or undefined value for infinite retries, but this is not recommended, since the program can get stuck in an infinite loop.<br/>
     * defaults to 5
     */
    connectionRetries?: number;
    /**
     * How many times to reconnect before giving up. This happens after the initial connection is finished<br/>
     * defaults to infinity
     */
    reconnectRetries?: number;
    /**
     * How the client reaches Telegram: `TcpTransport` (default), `SocksTransport`, `HttpProxyTransport`,
     * `MTProxyTransport`, `WebSocketTransport` or `WebProxyTransport`.
     */
    transport?: Transport;
    /** @deprecated Use `transport`: `MTProxyTransport`, `SocksTransport` or `WebProxyTransport`. */
    proxy?: ProxyInterface;
    /** @deprecated Use `transport`: `TcpTransport`, `WebSocketTransport`, `SocksTransport`, or your own `Transport`. */
    networkSocket?: LegacySocketFactory;
    /**
     * How many times we should retry borrowing a sender from another DC when it fails. defaults to 5
     */
    downloadRetries?: number;
    /** The delay in milliseconds to sleep between automatic reconnections. defaults to 1000*/
    retryDelay?: number;
    /**Whether reconnection should be retried connection_retries times automatically if Telegram disconnects us or not. defaults to true */
    autoReconnect?: boolean;
    /** Deliver updates one at a time, awaiting all handlers. Defaults to false. Slow handlers accumulate queued updates; destroy clears pending work. */
    sequentialUpdates?: boolean;
    /** The threshold below which the library should automatically sleep on flood wait and slow mode wait errors (inclusive).<br/>
     *  For instance, if a FloodWaitError for 17s occurs and floodSleepThreshold is 20s, the library will sleep automatically.<br/>
     *  If the error was for 21s, it would raise FloodWaitError instead. defaults to 60 sec.*/
    floodSleepThreshold?: number;
    /**
     * Device model to be sent when creating the initial connection. Defaults to os.type().toString().
     */
    deviceModel?: string;
    /**
     * System version to be sent when creating the initial connection. defaults to os.release().toString() -.
     */
    systemVersion?: string;
    /**
     * App version to be sent when creating the initial connection. Defaults to 1.0.
     */
    appVersion?: string;
    /**
     * Language code to be sent when creating the initial connection. Defaults to 'en'.
     */
    langCode?: string;
    /**
     * Language pack of the app. `langCode` is sent only together with it. Defaults to empty.
     */
    langPack?: string;
    /**
     * Use temporary auth keys (perfect forward secrecy) for file transfers. Defaults to false;
     * also turned on when Telegram asks for it with `tmp_sessions` in the config.
     */
    pfs?: boolean;
    /**
     * System lang code to be sent when creating the initial connection. Defaults to 'en'.
     */
    systemLangCode?: string;
    /**
     * Instance of Logger to use. <br />
     * If a `Logger` is given, it'll be used directly. If nothing is given, the default logger will be used. <br />
     * To create your own Logger make sure you extends teleproto logger {@link Logger} and override `log` method.
     */
    baseLogger?: Logger;
    /**
     * Limits how many downloads happen at the same time.
     */
    maxConcurrentDownloads?: number;
    /**
     * Whether to check for tampering in messages or not.
     */
    securityChecks?: boolean;
    /**
     * TCP keep-alive probe interval in milliseconds. Defaults to 30000.
     * Set to 0 to disable keep-alive probes.
     */
    keepAliveInterval?: number;
    /**
     * Callback for handling reCAPTCHA verification.
     * It should return the token obtained after solving the CAPTCHA.
     */
    reCaptchaCallback?: (siteKey: string) => Promise<string>;
    downloadPool?: DownloadPoolOptions;
    /** Channel polling fallback in milliseconds when Telegram omits timeout. Defaults to 1000. */
    channelPollInterval?: number;
    /** Minimum spacing in milliseconds between scheduled channel RPCs. Defaults to 250; not a Telegram rate guarantee. */
    channelPollRequestInterval?: number;
    /** Maximum concurrent scheduled channel RPCs. Defaults to 2. More watched channels increase polling latency. */
    channelPollConcurrency?: number;
    /**
     * Bounds the in-memory entity cache (the hot working set of resolved
     * peers; the session remains the storage tier).
     *
     * omitted / `true` - default limit (4096 peers per user/chat segment);
     * `false` - disabled, peers are resolved straight from the session store;
     * `{ max?, ttl? }` - explicit policy, `ttl` in milliseconds, `{ max: 0 }` for an unbounded cache.
     */
    entityCache?: EntityCacheOptions;
}
export declare abstract class TelegramBaseClient<S extends Session = Session> {
    /** The current teleproto version. */
    __version__: string;
    /** @hidden */
    _config?: Api.Config;
    private _tzOffset;
    private readonly _pfs;
    private _configTimer?;
    /** @hidden */
    _appConfig?: {
        [key: string]: unknown;
    };
    private _appConfigTask?;
    private _cdnKeysTask?;
    /** @hidden */
    _log: Logger;
    /** @hidden */
    _floodSleepThreshold: number;
    session: S;
    apiHash: string;
    apiId: number;
    /** @hidden */
    _requestRetries: number;
    /** @hidden */
    _downloadRetries: number;
    /** @hidden */
    _connectionRetries: number;
    /** @hidden */
    _reconnectRetries: number;
    /** @hidden */
    _retryDelay: number;
    /** @hidden */
    _timeout: number;
    /** @hidden */
    _autoReconnect: boolean;
    /** @hidden */
    _transport: ResolvedTransport;
    /** @deprecated The socket factory passed as `networkSocket`; use `transport`. */
    networkSocket?: LegacySocketFactory;
    /** @hidden */
    _initRequest: Api.InitConnection;
    /** @hidden */
    _sender?: MTProtoSender;
    /** @hidden */
    _floodWaitedRequests: any;
    /** @hidden */
    _bot?: boolean;
    /** @hidden */
    _premium?: boolean;
    /** @hidden */
    _useIPV6: boolean;
    /** @hidden */
    _testServers: boolean;
    /** @hidden */
    _selfInputPeer?: Api.InputPeerUser;
    /** @hidden */
    _errorHandler?: (error: Error) => Promise<void>;
    /** @hidden */
    _eventBuilders: [EventBuilder, CallableFunction][];
    /** @hidden */
    _entityCache: EntityCache;
    /** @hidden */
    _channelPollInterval: number;
    /** @hidden */
    _channelPollRequestInterval: number;
    /** @hidden */
    _channelPollConcurrency: number;
    /** @hidden */
    readonly _sequentialUpdates: boolean;
    _lastRequest?: number;
    /**
     * Epoch ms of the last message decrypted on ANY session. Distinguishes a
     * genuinely dead main connection from a ping that merely timed out because
     * the single JS thread was busy decrypting media — if data is still
     * arriving, the stack is alive and a ping hiccup must not force a reconnect.
     * @hidden
     */
    _lastReceivedAt: number;
    /** @hidden */
    _parseMode?: ParseInterface;
    /** @hidden */
    _reCaptchaCallback?: (siteKey: string) => Promise<string>;
    /** @hidden */
    _ALBUMS: Map<string, [NodeJS.Timeout, Api.TypeUpdate[]]>;
    /** All MTProto sessions, keyed by ShiftedDcId. @hidden */
    _network: SessionPool;
    /** @hidden */
    _addresses: DcAddressBook;
    /** File-part scheduler shared by downloads and uploads. @hidden */
    _files: FileTransfers;
    /**
     * Shared per-DC state (auth key + server salt).
     * Every sender of one DC reads/writes here so fresh sessions start with a
     * valid salt and share one auth key.
     * @hidden
     */
    readonly _dcenters: DcStateRegistry;
    /** @hidden */
    _destroyed: boolean;
    protected _updates?: ClientUpdates;
    private readonly _lifecycleHandlers;
    private _connectionEvent;
    private _destroyTask?;
    /**
     * Retained for contract compatibility; concurrency of file transfers is
     * governed by the download pool (MediaScheduler), not this number.
     * @hidden
     */
    _maxConcurrentDownloads: number;
    /** @hidden */
    _securityChecks: boolean;
    /** @hidden */
    _keepAliveInterval?: number;
    _connectedDeferred: Deferred<void>;
    /** Centralised pts/qts/seq tracker and gap recovery driver. */
    updateManager: UpdateManager;
    /** @hidden */
    _updateDispatcher: UpdateDispatcher;
    /** @hidden */
    _updateLoop: UpdateLoop;
    constructor(session: string | S, apiId: number, apiHash: string, clientParams: TelegramClientParams);
    /**
     * The in-memory entity cache. Exposes `size`, `has`, `delete` and
     * `clear` so stale peers can be invalidated without touching internals.
     * See {@link TelegramClientParams.entityCache} for bounding it.
     */
    get entityCache(): EntityCache;
    get floodSleepThreshold(): number;
    set floodSleepThreshold(value: number);
    set maxConcurrentDownloads(value: number);
    _initSession(): Promise<void>;
    get connected(): boolean | undefined;
    /** Runs when the main sender starts connecting, including reconnections. */
    onConnecting(handler: LifecycleHandler): () => void;
    /** Runs when the main transport connects; account sign-in may still be required. */
    onConnect(handler: LifecycleHandler): () => void;
    /** Runs when the main transport disconnects, manually or during recovery. */
    onDisconnect(handler: LifecycleHandler): () => void;
    /** Runs once when an automatic reconnect cycle starts. */
    onReconnecting(handler: LifecycleHandler): () => void;
    /** Runs after automatic reconnection, the client probe and a catch-up attempt; does not await application handlers. */
    onReconnect(handler: LifecycleHandler): () => void;
    /** Runs once after client resources and subscriptions have been released. */
    onDestroy(handler: LifecycleHandler): () => void;
    private _subscribeLifecycle;
    /** @hidden */
    _handleConnectionLifecycle(event: "connecting" | "connect" | "disconnect" | "reconnecting"): void;
    protected _emitLifecycle(event: LifecycleEvent): void;
    disconnect(): Promise<void>;
    /** @hidden */
    _teardownUpdateState(): void;
    get disconnected(): boolean;
    _disconnect(): Promise<void>;
    /**
     * Disconnects all senders and removes all handlers
     * Disconnect is safer as it will not remove your event handlers
     */
    destroy(): Promise<void>;
    /** @hidden */
    _authKeyCallback(authKey: AuthKey | undefined, dcId: number): Promise<void>;
    /** @hidden */
    _createConnection(address: DcAddress, dcId?: number): Connection;
    /** @hidden */
    _ensureCdnKeys(): Promise<void>;
    /** @hidden */
    _connectSender(sender: MTProtoSender, dcId: number, connection?: Connection, mediaCluster?: boolean): Promise<MTProtoSender>;
    /** @hidden */
    _validateAuthKey(dcId: number, permAuthKey: AuthKey, template: Connection): Promise<boolean | undefined>;
    /** @hidden */
    _getAppConfig(): Promise<{
        [key: string]: unknown;
    }>;
    /** @hidden */
    _usePfs(): boolean;
    /** @hidden */
    _buildInitConnection(query: Api.AnyRequest): Api.InitConnection;
    /** @hidden */
    _setConfig(config: Api.Config): void;
    private _scheduleConfigReload;
    /** @hidden */
    _reloadConfig(): Promise<void>;
    /** @hidden */
    _makeSender(dcId: number, onBreak: (dcId: number, reason?: ConnectionBreakReason) => void, authKey?: AuthKey, autoReconnect?: boolean, tempBinding?: SenderTempBinding, media?: boolean): MTProtoSender;
    /** @hidden */
    getSender(dcId: number): Promise<MTProtoSender>;
    _leaseSender(dcId: number): Promise<SessionLease>;
    getDC(dcId: number, download: boolean): Promise<DcAddress>;
    invoke<R extends Api.AnyRequest>(request: R): Promise<R["__response"]>;
    setLogLevel(level: LogLevel): void;
    get logger(): Logger;
    /**
     * Custom error handler for the client
     * @example
     * ```ts
     * client.onError = async (error)=>{
     *         console.log("error is",error)
     *     }
     * ```
     */
    set onError(handler: (error: Error) => Promise<void>);
}
