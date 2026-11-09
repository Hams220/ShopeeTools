"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Session = void 0;
class Session {
    constructor() {
        /**
         * Creates a clone of this session file
         * @param toInstance {Session|null}
         * @returns {Session}
         */
        /**
         * Whether this session is bound to Telegram's test environment.
         * Sessions are not portable between test and production.
         */
        this.__testServers = false;
    }
    get testServers() {
        return this.__testServers;
    }
    set testServers(value) {
        this.__testServers = value;
    }
    /**
     * Returns an ID of the takeout process initialized for this session,
     * or `None` if there's no were any unfinished takeout requests.
     */
    /*CONTEST
    get takeoutId() {
        throw new Error('Not Implemented')
    }
    */
    /**
     * Sets the ID of the unfinished takeout process for this session.
     * @param value
     */
    /*CONTEST
    set takeoutId(value) {
        throw new Error('Not Implemented')
    }
    */
    /**
     * Returns the update state saved by {@link setUpdateState}, if any.
     */
    getUpdateState() {
        return undefined;
    }
    /**
     * Persists the update state (common pts/qts/date/seq and per-channel pts)
     * so the client can fetch updates missed while it was offline.
     */
    setUpdateState(_state) { }
}
exports.Session = Session;
