"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.tlobjects = exports.LAYER = exports.registry = exports.Registry = void 0;
const big_integer_1 = __importDefault(require("big-integer"));
const schema_1 = __importDefault(require("../generated/schema"));
const core_1 = require("../core");
const defineClass_1 = require("./defineClass");
const bases_1 = require("./bases");
const schema_2 = require("./schema");
function lowerFirst(value) {
    return value ? value[0].toLowerCase() + value.slice(1) : value;
}
class Registry {
    constructor(schema, bases = {}) {
        this.schema = schema;
        this.bases = bases;
        this.api = {};
        this.byId = new Map();
        this.byName = new Map();
        this.byTag = new Map();
        this.byResult = new Map();
        this.classes = new Array(schema.definitions.length);
        schema.definitions.forEach(([, constructorId, , result], index) => {
            const fullName = (0, schema_2.definitionName)(schema, index);
            const dot = fullName.indexOf(".");
            const namespace = dot < 0 ? undefined : fullName.slice(0, dot);
            const name = dot < 0 ? fullName : fullName.slice(dot + 1);
            this.byId.set(constructorId >>> 0, index);
            this.byName.set(fullName, index);
            this.byTag.set(namespace ? `${namespace}.${lowerFirst(name)}` : lowerFirst(name), index);
            const resultName = schema.strings[result];
            const same = this.byResult.get(resultName);
            if (same)
                same.push(index);
            else
                this.byResult.set(resultName, [index]);
            Object.defineProperty(this.namespaceOf(namespace), name, {
                configurable: true,
                enumerable: true,
                get: () => this.classAt(index),
            });
        });
    }
    get layer() {
        return this.schema.layer;
    }
    get constructorIds() {
        return [...this.byId.keys()];
    }
    classById(constructorId) {
        const index = this.byId.get(constructorId >>> 0);
        return index === undefined ? undefined : this.classAt(index);
    }
    readerFor(constructorId) {
        return this.classById(constructorId) ?? core_1.coreObjects.get(constructorId >>> 0);
    }
    byFullName(name) {
        const index = this.byName.get(name);
        return index === undefined ? undefined : this.classAt(index);
    }
    bareType(name) {
        return this.byFullName(name);
    }
    isTlType(type) {
        return this.byResult.has(type);
    }
    coerce(value, expectedType) {
        if (!value ||
            typeof value !== "object" ||
            Array.isArray(value) ||
            big_integer_1.default.isInstance(value) ||
            Buffer.isBuffer(value) ||
            typeof value.getBytes === "function") {
            return value;
        }
        const tag = value._;
        let index;
        if (tag) {
            index = this.byTag.get(tag);
            if (index === undefined)
                throw new Error(`Unknown TL "_" tag: ${JSON.stringify(tag)}`);
        }
        else if (expectedType) {
            const candidates = this.byResult.get(expectedType);
            if (candidates && candidates.length > 1) {
                throw new Error(`Ambiguous type "${expectedType}" — add "_" to pick a constructor ` +
                    `(one of: ${candidates.map((i) => (0, schema_2.definitionName)(this.schema, i)).join(", ")})`);
            }
            index = candidates?.[0];
        }
        return index === undefined ? value : new (this.classAt(index))(value);
    }
    namespaceOf(namespace) {
        return namespace ? (this.api[namespace] ??= {}) : this.api;
    }
    classAt(index) {
        let cls = this.classes[index];
        if (cls)
            return cls;
        const def = (0, schema_2.decodeDefinition)(this.schema, index);
        cls = (0, defineClass_1.defineClass)(this, def, this.bases[def.fullName]?.());
        this.classes[index] = cls;
        Object.defineProperty(this.namespaceOf(def.namespace), def.name, {
            configurable: true,
            enumerable: true,
            writable: true,
            value: cls,
        });
        return cls;
    }
}
exports.Registry = Registry;
exports.registry = new Registry(schema_1.default, bases_1.tlBases);
exports.LAYER = exports.registry.layer;
exports.tlobjects = new Proxy({}, {
    get(_target, key) {
        return typeof key === "string" && /^\d+$/.test(key) ? exports.registry.classById(Number(key)) : undefined;
    },
    has(_target, key) {
        return typeof key === "string" && /^\d+$/.test(key) && !!exports.registry.classById(Number(key));
    },
    ownKeys() {
        return exports.registry.constructorIds.map(String);
    },
    getOwnPropertyDescriptor(_target, key) {
        const value = typeof key === "string" && /^\d+$/.test(key) ? exports.registry.classById(Number(key)) : undefined;
        return value ? { value, enumerable: true, configurable: true, writable: false } : undefined;
    },
});
