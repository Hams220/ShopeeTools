"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FIELD_VECTOR_ID = exports.FIELD_FLAGS_INDICATOR = exports.FIELD_BARE = exports.FIELD_FLAG = exports.FIELD_VECTOR = void 0;
exports.definitionName = definitionName;
exports.decodeDefinition = decodeDefinition;
exports.FIELD_VECTOR = 1;
exports.FIELD_FLAG = 2;
exports.FIELD_BARE = 4;
exports.FIELD_FLAGS_INDICATOR = 8;
exports.FIELD_VECTOR_ID = 16;
function definitionName(schema, index) {
    return schema.strings[schema.definitions[index][0]];
}
function decodeDefinition(schema, index) {
    const [fullNameIndex, constructorId, subclassOfId, result, isFunction, fields = []] = schema.definitions[index];
    const fullName = schema.strings[fullNameIndex];
    const dot = fullName.indexOf(".");
    return {
        name: dot < 0 ? fullName : fullName.slice(dot + 1),
        namespace: dot < 0 ? undefined : fullName.slice(0, dot),
        fullName,
        constructorId,
        subclassOfId,
        result: schema.strings[result],
        isFunction: isFunction === 1,
        fields: fields.map(([name, type, bits, flagField = -1, flagBit = -1]) => ({
            name: schema.strings[name],
            type: type < 0 ? null : schema.strings[type],
            isVector: (bits & exports.FIELD_VECTOR) !== 0,
            isFlag: (bits & exports.FIELD_FLAG) !== 0,
            bare: (bits & exports.FIELD_BARE) !== 0,
            isFlagsIndicator: (bits & exports.FIELD_FLAGS_INDICATOR) !== 0,
            useVectorId: (bits & exports.FIELD_VECTOR_ID) !== 0,
            flagField,
            flagBit,
        })),
    };
}
