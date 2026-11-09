"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.defineClass = defineClass;
const Helpers_1 = require("../../Helpers");
const Writer_1 = require("../binary/Writer");
const fieldCodec_1 = require("./fieldCodec");
const inputCasts_1 = require("./inputCasts");
const INSPECT_CUSTOM = Symbol.for("nodejs.util.inspect.custom");
class TlBase {
    constructor(args) {
        this.init(args);
    }
    init(_args) { }
}
const baseInit = TlBase.prototype.init;
function defineClass(context, def, base) {
    const { fields, fullName, constructorId, subclassOfId, isFunction, result } = def;
    const classType = isFunction ? "request" : "constructor";
    const flagSiblings = fields.map((field, index) => field.isFlag && field.type !== "true"
        ? fields.flatMap((other, otherIndex) => otherIndex !== index && other.isFlag && other.flagField === field.flagField && other.flagBit === field.flagBit
            ? [otherIndex]
            : [])
        : []);
    const flagMembers = fields.map((field, index) => field.isFlagsIndicator ? fields.flatMap((other, otherIndex) => (other.flagField === index ? [otherIndex] : [])) : []);
    const resultVector = /Vector<(int|long)>/.exec(result)?.[1];
    let readFields;
    let copyFields;
    const Base = (base ?? TlBase);
    class TlConstructor extends Base {
        static { this.CONSTRUCTOR_ID = constructorId; }
        static { this.SUBCLASS_OF_ID = subclassOfId; }
        static { this.className = fullName; }
        static { this.classType = classType; }
        static { this.hasParameters = fields.some((field) => !field.isFlagsIndicator); }
        constructor(args) {
            args = args || {};
            super(args);
            const self = this;
            self.originalArgs = args;
            for (const field of fields) {
                const name = field.name;
                if (name === "randomId" && !args[name]) {
                    self[name] = field.isVector
                        ? (args.id || []).map(() => (0, Helpers_1.generateRandomLong)(true))
                        : (0, Helpers_1.generateRandomLong)(true);
                }
                else {
                    self[name] = args[name];
                }
            }
        }
        static fromReader(reader) {
            const object = Object.create(this.prototype);
            readFields ??= (0, fieldCodec_1.compileFieldsReader)(context, fields);
            if (object.init === baseInit) {
                readFields(reader, object);
                return object;
            }
            const args = {};
            readFields(reader, args);
            object.init(args);
            (copyFields ??= (0, fieldCodec_1.compileFieldsCopier)(fields))(object, args);
            return object;
        }
        _coerceArgs() {
            const self = this;
            for (const field of fields) {
                const value = self[field.name];
                const normalized = (0, fieldCodec_1.normalizeField)(context, field, value);
                if (normalized !== value)
                    self[field.name] = normalized;
            }
        }
        _write(writer, boxed = true) {
            this._coerceArgs();
            const self = this;
            if (boxed)
                writer.uint(constructorId);
            fields.forEach((field, index) => {
                if (field.isFlagsIndicator) {
                    let flags = 0;
                    for (const member of flagMembers[index]) {
                        if (!(0, fieldCodec_1.isAbsent)(fields[member], self[fields[member].name]))
                            flags |= 1 << fields[member].flagBit;
                    }
                    writer.uint(flags);
                    return;
                }
                let value = self[field.name];
                if (field.isFlag) {
                    if (field.type === "true")
                        return;
                    if ((0, fieldCodec_1.isAbsent)(field, value)) {
                        if (!flagSiblings[index].some((other) => !(0, fieldCodec_1.isAbsent)(fields[other], self[fields[other].name])))
                            return;
                        value = (0, fieldCodec_1.emptyValue)(field);
                    }
                }
                (0, fieldCodec_1.writeField)(writer, fullName, field, value);
            });
        }
        getBytes() {
            const writer = new Writer_1.Writer();
            this._write(writer);
            return writer.finish();
        }
        readResult(reader) {
            if (!isFunction)
                throw new Error("`readResult()` called for non-request instance");
            if (result === "X") {
                this._coerceArgs();
                const query = this.query;
                if (typeof query?.readResult !== "function")
                    throw new TypeError("query must be a TL request");
                return query.readResult(reader);
            }
            if (resultVector) {
                reader.readInt();
                const length = reader.readInt();
                const values = new Array(length);
                for (let i = 0; i < length; i++)
                    values[i] = resultVector === "int" ? reader.readInt() : reader.readLong();
                return values;
            }
            return reader.tgReadObject();
        }
        async resolve(client, utils, seen = new Set()) {
            if (!isFunction && seen.size === 0)
                throw new Error("`resolve()` called for non-request instance");
            if (seen.has(this))
                return;
            seen.add(this);
            this._coerceArgs();
            const self = this;
            for (const field of fields) {
                if (field.isFlagsIndicator || self[field.name] == null)
                    continue;
                const cast = (0, inputCasts_1.inputCastOf)(field);
                if (!cast && field.type !== "X" && !context.isTlType(field.type ?? ""))
                    continue;
                const resolveItem = async (item) => {
                    const nested = item;
                    if (nested && typeof nested === "object" && typeof nested.resolve === "function") {
                        await nested.resolve(client, utils, seen);
                    }
                    return cast ? (0, inputCasts_1.castInput)(utils, client, item, cast) : item;
                };
                const value = self[field.name];
                if (field.isVector && Array.isArray(value)) {
                    const resolved = [];
                    for (const item of value)
                        resolved.push(await resolveItem(item));
                    self[field.name] = resolved;
                }
                else {
                    self[field.name] = await resolveItem(value);
                }
            }
        }
        toJSON() {
            return { ...this.originalArgs, className: fullName };
        }
    }
    const prototype = TlConstructor.prototype;
    Object.defineProperties(prototype, {
        CONSTRUCTOR_ID: { value: constructorId, writable: true, configurable: true },
        SUBCLASS_OF_ID: { value: subclassOfId, writable: true, configurable: true },
        className: { value: fullName, writable: true, configurable: true },
        classType: { value: classType, writable: true, configurable: true },
        originalArgs: {
            configurable: true,
            get() {
                const args = {};
                for (const field of fields)
                    if (this[field.name] !== undefined)
                        args[field.name] = this[field.name];
                return args;
            },
            set(value) {
                Object.defineProperty(this, "originalArgs", { value, writable: true, enumerable: true, configurable: true });
            },
        },
    });
    prototype[INSPECT_CUSTOM] = function (_depth, options, inspect) {
        const view = {};
        for (const field of fields) {
            const value = this[field.name];
            if (value !== null && value !== undefined)
                view[field.name] = value;
        }
        return `${fullName} ${(inspect ?? ((value) => JSON.stringify(value)))(view, options)}`;
    };
    Object.defineProperty(TlConstructor, "name", { value: fullName, configurable: true });
    return TlConstructor;
}
