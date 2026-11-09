export declare const FIELD_VECTOR = 1;
export declare const FIELD_FLAG = 2;
export declare const FIELD_BARE = 4;
export declare const FIELD_FLAGS_INDICATOR = 8;
export declare const FIELD_VECTOR_ID = 16;
export type CompactField = [name: number, type: number, bits: number, flagField?: number, flagBit?: number];
export type CompactDefinition = [
    fullName: number,
    constructorId: number,
    subclassOfId: number,
    result: number,
    isFunction: 0 | 1,
    fields?: CompactField[]
];
export interface CompactSchema {
    layer: number;
    strings: string[];
    definitions: CompactDefinition[];
}
export interface FieldDef {
    name: string;
    type: string | null;
    isVector: boolean;
    isFlag: boolean;
    bare: boolean;
    isFlagsIndicator: boolean;
    useVectorId: boolean;
    flagField: number;
    flagBit: number;
}
export interface ClassDef {
    name: string;
    namespace?: string;
    fullName: string;
    constructorId: number;
    subclassOfId: number;
    result: string;
    isFunction: boolean;
    fields: FieldDef[];
}
export declare function definitionName(schema: CompactSchema, index: number): string;
export declare function decodeDefinition(schema: CompactSchema, index: number): ClassDef;
