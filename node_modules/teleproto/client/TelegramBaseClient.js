"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TelegramBaseClient = exports.webSocketDcAddress = exports.WEBSOCKET_DC_HOSTS = exports.TEST_DC_IPV6 = exports.TEST_DC_IPV4 = exports.PROD_DC_IPV6 = exports.PROD_DC_IPV4 = void 0;
const LegacySocketTransport_1 = require("../compat/LegacySocketTransport");
const TCPMTProxy_1 = require("../compat/network/connection/TCPMTProxy");
const Version_1 = require("../Version");
const sessions_1 = require("../sessions");
const extensions_1 = require("../extensions");
const tl_1 = require("../tl");
const os_1 = __importDefault(require("os"));
const AuthKey_1 = require("../crypto/AuthKey");
const RSA_1 = require("../crypto/RSA");
const IGE_1 = require("../crypto/IGE");
const entityCache_1 = require("../entityCache");
const markdown_1 = require("../extensions/markdown");
const Session_1 = require("../network/session/Session");
const DcState_1 = require("../network/dc/DcState");
const SessionPool_1 = require("../network/dc/SessionPool");
const DcAddressBook_1 = require("../network/dc/DcAddressBook");
const FileTransfers_1 = require("./files/FileTransfers");
const Deferred_1 = __importDefault(require("../extensions/Deferred"));
const UpdateManager_1 = require("./updates/UpdateManager");
const UpdateDispatcher_1 = require("./updates/UpdateDispatcher");
const UpdateLoop_1 = require("./updates/UpdateLoop");
const TcpTransport_1 = require("../network/transport/TcpTransport");
const SocksTransport_1 = require("../network/transport/SocksTransport");
const MTProxyTransport_1 = require("../network/transport/MTProxyTransport");
const WebProxyTransport_1 = require("../network/transport/WebProxyTransport");
const SESSION_IDLE_TIMEOUT_MS = 300_000;
const SESSION_STARTUP_DELAY_MS = 800;
const PROD_DEFAULT_DC_ID = 2;
const TEST_DEFAULT_DC_ID = 2;
var DcAddressBook_2 = require("../network/dc/DcAddressBook");
Object.defineProperty(exports, "PROD_DC_IPV4", { enumerable: true, get: function () { return DcAddressBook_2.PROD_DC_IPV4; } });
Object.defineProperty(exports, "PROD_DC_IPV6", { enumerable: true, get: function () { return DcAddressBook_2.PROD_DC_IPV6; } });
Object.defineProperty(exports, "TEST_DC_IPV4", { enumerable: true, get: function () { return DcAddressBook_2.TEST_DC_IPV4; } });
Object.defineProperty(exports, "TEST_DC_IPV6", { enumerable: true, get: function () { return DcAddressBook_2.TEST_DC_IPV6; } });
Object.defineProperty(exports, "WEBSOCKET_DC_HOSTS", { enumerable: true, get: function () { return DcAddressBook_2.WEBSOCKET_DC_HOSTS; } });
Object.defineProperty(exports, "webSocketDcAddress", { enumerable: true, get: function () { return DcAddressBook_2.webSocketDcAddress; } });
function proxyTransport(proxy) {
    if ("WEB" in proxy) {
        const { WEB: _, ...options } = proxy;
        return new WebProxyTransport_1.WebProxyTransport(options);
    }
    if ("MTProxy" in proxy) {
        return new MTProxyTransport_1.MTProxyTransport({ host: proxy.ip, port: proxy.port, secret: proxy.secret });
    }
    return new SocksTransport_1.SocksTransport({
        host: proxy.ip,
        port: proxy.port,
        version: proxy.socksType,
        username: proxy.username,
        password: proxy.password,
        timeout: proxy.timeout,
    });
}
/**
 * Interface for creating a new client.
 * All of these have a default value and you should only change those if you know what you are doing.
 */
function jsonValue(value) {
    if (value instanceof tl_1.Api.JsonObject)
        return Object.fromEntries(value.value.map((entry) => [entry.key, jsonValue(entry.value)]));
    if (value instanceof tl_1.Api.JsonArray)
        return value.value.map(jsonValue);
    if (value instanceof tl_1.Api.JsonNull)
        return null;
    return value.value;
}
const clientParamsDefault = {
    useIPV6: false,
    testServers: false,
    timeout: 10,
    requestRetries: 5,
    connectionRetries: Infinity,
    reconnectRetries: Infinity,
    retryDelay: 1000,
    downloadRetries: 5,
    autoReconnect: true,
    sequentialUpdates: false,
    floodSleepThreshold: 60,
    deviceModel: "",
    systemVersion: "",
    appVersion: "",
    langCode: "en",
    systemLangCode: "en",
    channelPollInterval: 1000,
    channelPollRequestInterval: 250,
    channelPollConcurrency: 2,
    _securityChecks: true,
};
class TelegramBaseClient {
    constructor(session, apiId, apiHash, clientParams) {
        /** The current teleproto version. */
        this.__version__ = Version_1.version;
        /**
         * Epoch ms of the last message decrypted on ANY session. Distinguishes a
         * genuinely dead main connection from a ping that merely timed out because
         * the single JS thread was busy decrypting media — if data is still
         * arriving, the stack is alive and a ping hiccup must not force a reconnect.
         * @hidden
         */
        this._lastReceivedAt = 0;
        /** @hidden */
        this._ALBUMS = new Map();
        /**
         * Shared per-DC state (auth key + server salt).
         * Every sender of one DC reads/writes here so fresh sessions start with a
         * valid salt and share one auth key.
         * @hidden
         */
        this._dcenters = new DcState_1.DcStateRegistry();
        this._lifecycleHandlers = new Map();
        this._connectionEvent = "disconnect";
        clientParams = { ...clientParamsDefault, ...clientParams };
        if (!apiId || !apiHash) {
            throw new Error("Your API ID or Hash cannot be empty or undefined");
        }
        if (clientParams.baseLogger) {
            this._log = clientParams.baseLogger;
        }
        else {
            this._log = new extensions_1.Logger();
        }
        this._log.info(`Running teleproto version ${Version_1.version} (crypto: ${IGE_1.IGE.backend()})`);
        if (session && typeof session == "string") {
            session = new sessions_1.StoreSession(session);
        }
        if (!(session instanceof sessions_1.Session)) {
            throw new Error("Only StringSession and StoreSessions are supported currently :( ");
        }
        this._floodSleepThreshold = clientParams.floodSleepThreshold;
        this.session = session;
        this.apiId = apiId;
        this.apiHash = apiHash;
        this._useIPV6 = clientParams.useIPV6;
        this._testServers = clientParams.testServers;
        this._requestRetries = clientParams.requestRetries;
        this._sequentialUpdates = !!clientParams.sequentialUpdates;
        this._downloadRetries = clientParams.downloadRetries;
        this._connectionRetries = clientParams.connectionRetries;
        this._reconnectRetries = clientParams.reconnectRetries;
        this._retryDelay = clientParams.retryDelay || 0;
        this._channelPollInterval = clientParams.channelPollInterval;
        this._channelPollRequestInterval = clientParams.channelPollRequestInterval;
        this._channelPollConcurrency = clientParams.channelPollConcurrency;
        for (const [name, value] of [
            ["channelPollInterval", this._channelPollInterval],
            ["channelPollRequestInterval", this._channelPollRequestInterval],
            ["channelPollConcurrency", this._channelPollConcurrency],
        ]) {
            if (!Number.isSafeInteger(value) || value <= 0) {
                throw new RangeError(`${name} must be a positive safe integer`);
            }
        }
        this._timeout = clientParams.timeout;
        this._autoReconnect = clientParams.autoReconnect;
        this._maxConcurrentDownloads = clientParams.maxConcurrentDownloads || 1;
        this._keepAliveInterval = clientParams.keepAliveInterval;
        this._reCaptchaCallback = clientParams.reCaptchaCallback;
        if (clientParams.connection && !(clientParams.connection instanceof Function)) {
            throw new Error("Connection should be a class not an instance");
        }
        if (clientParams.proxy && clientParams.transport) {
            throw new Error("Pass either transport or proxy, not both");
        }
        let connection = clientParams.connection;
        if ((0, TCPMTProxy_1.isLegacyProxyConnection)(connection)) {
            this._log.warn("connection: proxy connection classes are deprecated: the proxy picks its own framing, remove the connection option");
            connection = undefined;
        }
        let transport;
        if (clientParams.networkSocket) {
            if (clientParams.transport)
                throw new Error("transport replaces networkSocket: pass only transport");
            this._log.warn("networkSocket is deprecated: use the transport option (TcpTransport, WebSocketTransport, SocksTransport, HttpProxyTransport, MTProxyTransport) or your own Transport");
            this.networkSocket = clientParams.networkSocket;
            transport = new LegacySocketTransport_1.LegacySocketTransport(clientParams.networkSocket, clientParams.proxy);
        }
        else {
            transport =
                clientParams.transport ??
                    (clientParams.proxy ? proxyTransport(clientParams.proxy) : new TcpTransport_1.TcpTransport());
        }
        const route = transport.resolve(connection);
        this._transport = route;
        const initProxy = route.clientProxy
            ? new tl_1.Api.InputClientProxy(route.clientProxy)
            : undefined;
        this._initRequest = new tl_1.Api.InitConnection({
            apiId: this.apiId,
            deviceModel: clientParams.deviceModel || os_1.default.type().toString() || "Unknown",
            systemVersion: clientParams.systemVersion || os_1.default.release().toString() || "1.0",
            appVersion: clientParams.appVersion || "1.0",
            langCode: clientParams.langCode || clientParamsDefault.langCode,
            langPack: clientParams.langPack || "",
            systemLangCode: clientParams.systemLangCode ||
                clientParamsDefault.systemLangCode,
            proxy: initProxy,
        });
        this._pfs = !!clientParams.pfs;
        const tzOffset = -new Date().getTimezoneOffset() * 60;
        this._tzOffset = Math.abs(tzOffset) >= 15 * 3600 ? 0 : Math.trunc(tzOffset / 900) * 900 || 0;
        this._eventBuilders = [];
        this._floodWaitedRequests = {};
        this._bot = undefined;
        this._selfInputPeer = undefined;
        this._securityChecks = !!clientParams.securityChecks;
        this._entityCache = new entityCache_1.EntityCache(clientParams.entityCache);
        this._config = undefined;
        this._destroyed = false;
        this._connectedDeferred = new Deferred_1.default();
        this._parseMode = markdown_1.MarkdownParser;
        this.updateManager = new UpdateManager_1.UpdateManager(this);
        this._updateDispatcher = new UpdateDispatcher_1.UpdateDispatcher(this);
        this._updateLoop = new UpdateLoop_1.UpdateLoop(this);
        this._addresses = new DcAddressBook_1.DcAddressBook({
            testServers: this._testServers,
            webSocket: !!route.webSocket,
            proxied: !!route.proxied,
            ipv6: () => this._useIPV6,
        });
        this._network = new SessionPool_1.SessionPool(this, {
            idleTimeoutMs: clientParams.downloadPool?.idleTimeoutMs ??
                SESSION_IDLE_TIMEOUT_MS,
            sessionStartupDelayMs: clientParams.downloadPool?.sessionStartupDelayMs ??
                SESSION_STARTUP_DELAY_MS,
        });
        this._files = new FileTransfers_1.FileTransfers(this, clientParams.downloadPool);
    }
    /**
     * The in-memory entity cache. Exposes `size`, `has`, `delete` and
     * `clear` so stale peers can be invalidated without touching internals.
     * See {@link TelegramClientParams.entityCache} for bounding it.
     */
    get entityCache() {
        return this._entityCache;
    }
    get floodSleepThreshold() {
        return this._floodSleepThreshold;
    }
    set floodSleepThreshold(value) {
        this._floodSleepThreshold = Math.min(value || 0, 24 * 60 * 60);
    }
    set maxConcurrentDownloads(value) {
        this._maxConcurrentDownloads = value;
    }
    // region connecting
    async _initSession() {
        await this.session.load();
        this.session.testServers = this._testServers;
        if (!this.session.serverAddress) {
            const dcId = this._testServers ? TEST_DEFAULT_DC_ID : PROD_DEFAULT_DC_ID;
            const seed = this._addresses.seed(dcId, this._useIPV6);
            this.session.setDC(dcId, seed.ipAddress, seed.port);
            return;
        }
        const sessionEnv = (0, DcAddressBook_1.isTestDcAddress)(this.session.serverAddress);
        if (sessionEnv !== undefined && sessionEnv !== this._testServers) {
            this._log.warn(`testServers mismatch: client constructed with testServers=${this._testServers}, ` +
                `but the session's saved address (${this.session.serverAddress}) looks like ` +
                `${sessionEnv ? "test" : "production"}. Sessions are not portable between ` +
                `environments — use a separate session for each.`);
        }
        const webAddress = this.session.serverAddress.endsWith(".web.telegram.org");
        if (!webAddress)
            this._useIPV6 = this.session.serverAddress.includes(":");
        if (webAddress !== !!this._transport.webSocket) {
            const seed = this._addresses.seed(this.session.dcId, this._useIPV6);
            if (seed)
                this.session.setDC(this.session.dcId, seed.ipAddress, seed.port);
        }
    }
    get connected() {
        return this._sender && this._sender.isConnected();
    }
    /** Runs when the main sender starts connecting, including reconnections. */
    onConnecting(handler) {
        return this._subscribeLifecycle("connecting", handler);
    }
    /** Runs when the main transport connects; account sign-in may still be required. */
    onConnect(handler) {
        return this._subscribeLifecycle("connect", handler);
    }
    /** Runs when the main transport disconnects, manually or during recovery. */
    onDisconnect(handler) {
        return this._subscribeLifecycle("disconnect", handler);
    }
    /** Runs once when an automatic reconnect cycle starts. */
    onReconnecting(handler) {
        return this._subscribeLifecycle("reconnecting", handler);
    }
    /** Runs after automatic reconnection, the client probe and a catch-up attempt; does not await application handlers. */
    onReconnect(handler) {
        return this._subscribeLifecycle("reconnect", handler);
    }
    /** Runs once after client resources and subscriptions have been released. */
    onDestroy(handler) {
        return this._subscribeLifecycle("destroy", handler);
    }
    _subscribeLifecycle(event, handler) {
        if (typeof handler !== "function")
            throw new TypeError("Lifecycle handler must be a function");
        if (this._destroyed)
            throw new Error("Cannot subscribe to a destroyed client");
        let handlers = this._lifecycleHandlers.get(event);
        if (!handlers)
            this._lifecycleHandlers.set(event, handlers = new Set());
        handlers.add(handler);
        return () => { handlers.delete(handler); };
    }
    /** @hidden */
    _handleConnectionLifecycle(event) {
        if (this._destroyed && event !== "disconnect")
            return;
        if (event === this._connectionEvent)
            return;
        this._connectionEvent = event;
        this._emitLifecycle(event);
    }
    _emitLifecycle(event) {
        for (const handler of this._lifecycleHandlers.get(event) ?? []) {
            void Promise.resolve().then(() => {
                if (this._destroyed && event !== "destroy" && event !== "disconnect")
                    return;
                return handler();
            }).catch(async (error) => {
                this._log.error(`${event} handler failed`, error);
                if (this._errorHandler) {
                    try {
                        await this._errorHandler(error);
                    }
                    catch (handlerError) {
                        this._log.error("Lifecycle error handler failed", handlerError);
                    }
                }
            });
        }
    }
    async disconnect() {
        await this._disconnect();
        this._files.reset();
        await this._network.purge();
        this._teardownUpdateState();
    }
    /** @hidden */
    _teardownUpdateState() {
        for (const [timer] of this._ALBUMS.values()) {
            clearTimeout(timer);
        }
        this._ALBUMS.clear();
        this.updateManager.stop();
        for (const [builder] of this._eventBuilders) {
            builder.resolved = false;
        }
    }
    get disconnected() {
        return !this._sender || this._sender._disconnected;
    }
    async _disconnect() {
        this._updateLoop.stop();
        await this._sender?.disconnect();
    }
    /**
     * Disconnects all senders and removes all handlers
     * Disconnect is safer as it will not remove your event handlers
     */
    destroy() {
        if (this._destroyTask)
            return this._destroyTask;
        this._destroyed = true;
        clearTimeout(this._configTimer);
        this._updateDispatcher.clear();
        this._destroyTask = (async () => {
            await this.disconnect();
            await this._network.close();
            this._eventBuilders = [];
            this._updates?._destroy();
            this._emitLifecycle("destroy");
            this._lifecycleHandlers.clear();
        })();
        return this._destroyTask;
    }
    /** @hidden */
    async _authKeyCallback(authKey, dcId) {
        if (this._addresses.isCdn(dcId))
            return;
        if (authKey && dcId !== this.session.dcId)
            this._dcenters.get(dcId).authorized = false;
        this.session.setAuthKey(authKey, dcId);
        await this.session.save();
    }
    /** @hidden */
    _createConnection(address, dcId = address.id) {
        return new this._transport.connection({
            ip: address.ipAddress,
            port: address.port,
            dcId: address.mediaOnly ? -dcId : dcId,
            loggers: this._log,
            socket: this._transport.socket,
            keepAliveInterval: this._keepAliveInterval,
            testServers: this._testServers,
        });
    }
    /** @hidden */
    _ensureCdnKeys() {
        this._cdnKeysTask ??= this.invoke(new tl_1.Api.help.GetCdnConfig())
            .then(async (config) => {
            for (const key of config.publicKeys)
                await (0, RSA_1.addServerKey)(key.publicKey);
        })
            .catch((error) => {
            this._cdnKeysTask = undefined;
            throw error;
        });
        return this._cdnKeysTask;
    }
    /** @hidden */
    async _connectSender(sender, dcId, connection, mediaCluster = false) {
        try {
            if (!connection && this._addresses.isCdn(dcId)) {
                await this._ensureCdnKeys();
                const address = this._addresses.cdn(dcId);
                if (!address)
                    throw new Error(`No address for CDN dc ${dcId}`);
                await sender.connect(this._createConnection(address));
                return sender;
            }
            connection ??= this._createConnection(await this.getDC(dcId, mediaCluster && !!sender.authKey.getKey()));
            await sender.connect(connection);
            if (dcId !== this.session.dcId) {
                await this._dcenters.get(dcId).authorize(async () => {
                    this._log.info(`Exporting authorization for data center ${dcId}`);
                    const auth = await this.invoke(new tl_1.Api.auth.ExportAuthorization({ dcId }));
                    await sender.send(new tl_1.Api.auth.ImportAuthorization({ id: auth.id, bytes: auth.bytes }));
                });
            }
            return sender;
        }
        catch (error) {
            if (error.errorMessage === "DC_ID_INVALID")
                return sender;
            this._addresses.fail(dcId, mediaCluster);
            await sender.disconnect().catch(() => { });
            throw error;
        }
    }
    /** @hidden */
    async _validateAuthKey(dcId, permAuthKey, template) {
        let failure;
        const sender = new Session_1.Session(new AuthKey_1.AuthKey(), {
            logger: this._log,
            dcId,
            client: this,
            isMainSender: false,
            retries: 2,
            autoReconnect: false,
            connectTimeout: this._timeout,
            securityChecks: this._securityChecks,
            tempBinding: {
                permAuthKey,
                dcParam: this._testServers ? dcId + 10000 : dcId,
                expiresIn: 3600,
                onFailed: (error) => {
                    failure = error;
                },
            },
        });
        try {
            await sender.connect(template.clone());
            return failure === undefined ? true : undefined;
        }
        catch (error) {
            const message = (failure ?? error).errorMessage;
            return message === "ENCRYPTED_MESSAGE_INVALID" ? false : undefined;
        }
        finally {
            await sender.disconnect().catch(() => { });
        }
    }
    /** @hidden */
    _getAppConfig() {
        this._appConfigTask ??= this.invoke(new tl_1.Api.help.GetAppConfig({ hash: 0 }))
            .then((result) => {
            if (result instanceof tl_1.Api.help.AppConfig)
                this._appConfig = jsonValue(result.config);
            return this._appConfig ?? {};
        })
            .catch((error) => {
            this._appConfigTask = undefined;
            this._log.debug(`help.getAppConfig failed: ${error}`);
            return this._appConfig ?? {};
        });
        return this._appConfigTask;
    }
    /** @hidden */
    _usePfs() {
        return this._pfs || (this._config?.tmpSessions ?? 0) > 1;
    }
    /** @hidden */
    _buildInitConnection(query) {
        const init = this._initRequest;
        const sendLang = !!init.langPack && !init.langCode.startsWith("X");
        return new tl_1.Api.InitConnection({
            apiId: init.apiId,
            deviceModel: init.deviceModel,
            systemVersion: init.systemVersion,
            appVersion: init.appVersion,
            systemLangCode: init.systemLangCode,
            langPack: sendLang ? init.langPack : "",
            langCode: sendLang ? init.langCode || "en" : "",
            proxy: init.proxy,
            params: new tl_1.Api.JsonObject({
                value: [
                    new tl_1.Api.JsonObjectValue({
                        key: "tz_offset",
                        value: new tl_1.Api.JsonNumber({ value: this._tzOffset }),
                    }),
                ],
            }),
            query,
        });
    }
    /** @hidden */
    _setConfig(config) {
        this._config = config;
        this._addresses.setOptions(config.dcOptions);
        const seconds = Math.min(Math.max(config.expires - config.date, 60), 86400);
        this._scheduleConfigReload(seconds * (1 - Math.random() * 0.2));
    }
    _scheduleConfigReload(seconds) {
        clearTimeout(this._configTimer);
        if (this._destroyed)
            return;
        this._configTimer = setTimeout(() => void this._reloadConfig(), seconds * 1000);
        this._configTimer.unref?.();
    }
    /** @hidden */
    async _reloadConfig() {
        if (this._destroyed)
            return;
        try {
            this._setConfig(await this.invoke(new tl_1.Api.help.GetConfig()));
        }
        catch (error) {
            this._log.warn(`help.getConfig failed, retrying in 60s: ${error}`);
            this._scheduleConfigReload(60);
        }
    }
    /** @hidden */
    _makeSender(dcId, onBreak, authKey, autoReconnect = true, tempBinding, media = false) {
        const dc = this._dcenters.get(dcId);
        return new Session_1.Session(authKey ?? this.session.getAuthKey(dcId), {
            logger: this._log,
            dcId,
            client: this,
            isMainSender: false,
            retries: this._connectionRetries,
            reconnectRetries: this._reconnectRetries,
            autoReconnect: autoReconnect && this._autoReconnect,
            connectTimeout: this._timeout,
            securityChecks: this._securityChecks,
            authKeyCallback: this._authKeyCallback.bind(this),
            onConnectionBreak: onBreak,
            dcenter: dc,
            throttle: media ? dc.mediaThrottle : dc.throttle,
            tempBinding,
        });
    }
    /** @hidden */
    getSender(dcId) {
        return dcId
            ? this._network.getSession(dcId).ensureConnected()
            : Promise.resolve(this._sender);
    }
    _leaseSender(dcId) {
        return dcId
            ? this._network.lease(dcId)
            : Promise.resolve({ sender: this._sender, release: () => { } });
    }
    // endregion
    async getDC(dcId, download) {
        throw new Error("Cannot be called from here!");
    }
    invoke(request) {
        throw new Error("Cannot be called from here!");
    }
    setLogLevel(level) {
        this._log.setLevel(level);
    }
    get logger() {
        return this._log;
    }
    /**
     * Custom error handler for the client
     * @example
     * ```ts
     * client.onError = async (error)=>{
     *         console.log("error is",error)
     *     }
     * ```
     */
    set onError(handler) {
        this._errorHandler = async (error) => {
            try {
                await handler(error);
            }
            catch (e) {
                e.message = `Error ${e.message} thrown while handling top-level error: ${error.message}`;
                this._log.error(e.message, e);
            }
        };
    }
}
exports.TelegramBaseClient = TelegramBaseClient;
