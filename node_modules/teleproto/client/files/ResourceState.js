"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResourceState = void 0;
class ResourceState {
    constructor(unitSize) {
        this.unitSize = unitSize;
        this.limit = 0;
        this.using = 0;
        this.used = 0;
        this.estimatedLimit = 0;
    }
    get activeLimit() {
        return this.limit - this.used;
    }
    get unused() {
        return this.limit - this.using - this.used;
    }
    get estimatedExtra() {
        const wanted = Math.max(this.limit, this.estimatedLimit) - this.using - this.used;
        const rounded = Math.ceil(wanted / this.unitSize) * this.unitSize;
        return rounded + this.using + this.used - this.limit;
    }
    startUse(bytes) {
        this.using += bytes;
    }
    stopUse(bytes) {
        this.using -= bytes;
        this.used += bytes;
    }
    updateEstimatedLimit(extra) {
        let estimated = this.used + this.using + extra - Math.min(this.using, extra);
        if (estimated < this.limit) {
            this.used += this.limit - estimated;
            estimated = this.limit;
        }
        if (estimated === this.estimatedLimit)
            return false;
        this.estimatedLimit = estimated;
        return true;
    }
}
exports.ResourceState = ResourceState;
