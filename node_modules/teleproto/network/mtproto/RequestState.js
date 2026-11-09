"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RequestState = void 0;
exports.readResult = readResult;
exports.expectsAnswer = expectsAnswer;
const Deferred_1 = __importDefault(require("../../extensions/Deferred"));
function readResult(request, reader) {
    return request.readResult(reader);
}
function expectsAnswer(request) {
    return request.classType === "request";
}
class RequestState {
    constructor(request) {
        this.acknowledged = false;
        this.initWrapped = false;
        this.cancelled = false;
        this.finished = new Deferred_1.default();
        this.settled = true;
        this.request = request;
        this.data = request.getBytes();
        this.resetPromise();
    }
    isReady() {
        return this.after?.finished.promise ?? Promise.resolve();
    }
    resetPromise() {
        if (!this.settled)
            return;
        this.settled = false;
        this.promise = new Promise((resolve, reject) => {
            this.resolve = (value) => {
                this.settled = true;
                resolve(value);
            };
            this.reject = (reason) => {
                this.settled = true;
                reject(reason);
            };
        });
        this.promise.catch(() => { });
    }
}
exports.RequestState = RequestState;
