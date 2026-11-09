"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResourceManager = void 0;
class ResourceManager {
    constructor(maxLimit, mode) {
        this.maxLimit = maxLimit;
        this.mode = mode;
        this.nodes = [];
        this.scheduled = false;
    }
    get size() {
        return this.nodes.length;
    }
    register(consumer, priority) {
        const rank = Math.abs(priority);
        const index = priority >= 0
            ? this.nodes.findIndex((node) => node.priority <= rank)
            : this.nodes.findIndex((node) => node.priority < rank);
        const node = { consumer, priority: rank };
        if (index < 0)
            this.nodes.push(node);
        else
            this.nodes.splice(index, 0, node);
        this.update();
    }
    unregister(consumer) {
        const index = this.nodes.findIndex((node) => node.consumer === consumer);
        if (index >= 0)
            this.nodes.splice(index, 1);
        this.update();
    }
    update() {
        if (this.scheduled)
            return;
        this.scheduled = true;
        queueMicrotask(() => {
            this.scheduled = false;
            this.loop();
        });
    }
    loop() {
        let pool = this.maxLimit;
        for (const { consumer } of this.nodes)
            pool -= Math.max(0, consumer.resource.activeLimit);
        if (this.mode === "baseline") {
            for (const { consumer } of this.nodes) {
                const left = this.satisfy(consumer, pool);
                pool = left.pool;
                if (!left.satisfied)
                    break;
            }
            return;
        }
        const waiting = new Set(this.nodes.map((node) => node.consumer));
        while (waiting.size) {
            let next;
            for (const consumer of waiting) {
                const extra = consumer.resource.estimatedExtra;
                if (extra <= 0) {
                    waiting.delete(consumer);
                    continue;
                }
                if (!next || extra < next.resource.estimatedExtra)
                    next = consumer;
            }
            if (!next)
                return;
            waiting.delete(next);
            const left = this.satisfy(next, pool);
            pool = left.pool;
            if (!left.satisfied)
                return;
        }
    }
    satisfy(consumer, pool) {
        const state = consumer.resource;
        const need = state.estimatedExtra;
        if (need <= 0)
            return { pool, satisfied: true };
        const grant = Math.floor(Math.min(need, pool) / state.unitSize) * state.unitSize;
        if (grant > 0) {
            state.limit += grant;
            pool -= grant;
            queueMicrotask(() => consumer.onResources());
        }
        return { pool, satisfied: grant >= need };
    }
}
exports.ResourceManager = ResourceManager;
