"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DcStateRegistry = exports.DcState = void 0;
const big_integer_1 = __importDefault(require("big-integer"));
const AuthKey_1 = require("../../crypto/AuthKey");
const SaltPool_1 = require("../mtproto/SaltPool");
const ConnectThrottle_1 = require("../session/ConnectThrottle");
class DcState {
    constructor(dcId, authKey) {
        this.dcId = dcId;
        this.salts = new SaltPool_1.SaltPool();
        this.throttle = new ConnectThrottle_1.ConnectThrottle();
        this.mediaThrottle = new ConnectThrottle_1.ConnectThrottle();
        this.salt = big_integer_1.default.zero;
        this.pfsFailed = false;
        this.authKey = authKey ?? new AuthKey_1.AuthKey();
        this.authorized = !!this.authKey.getKey();
    }
    updateSalt(salt) {
        if (salt && !salt.isZero())
            this.salt = salt;
    }
    unauthorize() {
        this.authorized = false;
    }
    authorize(importAuthorization) {
        if (this.authorized)
            return Promise.resolve();
        this.importing ??= importAuthorization()
            .then(() => {
            this.authorized = true;
        })
            .finally(() => {
            this.importing = undefined;
        });
        return this.importing;
    }
}
exports.DcState = DcState;
class DcStateRegistry {
    constructor() {
        this.states = new Map();
    }
    get(dcId, seedKey) {
        let state = this.states.get(dcId);
        if (!state) {
            state = new DcState(dcId, seedKey);
            this.states.set(dcId, state);
        }
        return state;
    }
    clear() {
        this.states.clear();
    }
}
exports.DcStateRegistry = DcStateRegistry;
