"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateLoop = void 0;
const promises_1 = require("node:timers/promises");
const STALE_CHECK_INTERVAL_MS = 9000;
class UpdateLoop {
    constructor(client) {
        this.client = client;
    }
    get running() {
        return this.controller !== undefined;
    }
    start(catchUp = true) {
        if (this.controller || this.client._destroyed)
            return;
        void this.run(catchUp);
    }
    stop() {
        this.controller?.abort();
        this.controller = undefined;
    }
    async run(catchUp) {
        const client = this.client;
        const controller = new AbortController();
        this.controller = controller;
        const active = () => !controller.signal.aborted && !client._destroyed;
        client.updateManager.start();
        if (catchUp)
            await client.updateManager.catchUp();
        while (active()) {
            try {
                await (0, promises_1.setTimeout)(STALE_CHECK_INTERVAL_MS, undefined, { signal: controller.signal, ref: false });
            }
            catch {
                break;
            }
            if (!active())
                break;
            const sender = client._sender;
            if (sender?.userDisconnected)
                break;
            if (!sender?.isConnected())
                continue;
            await client.updateManager.recoverIfStale();
        }
        if (this.controller === controller) {
            this.controller = undefined;
            if (client._destroyed)
                await client.disconnect();
        }
    }
}
exports.UpdateLoop = UpdateLoop;
