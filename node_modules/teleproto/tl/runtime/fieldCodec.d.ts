import type { Reader } from "../binary/Reader";
import type { Writer } from "../binary/Writer";
import type { FieldDef } from "./schema";
export interface BareReader {
    fromReader(reader: Reader): unknown;
}
export interface WritableObject {
    _write?(writer: Writer, boxed?: boolean): void;
    getBytes?(): Buffer;
}
export interface CodecContext {
    bareType(name: string): BareReader | undefined;
    coerce(value: unknown, expectedType: string | null): unknown;
}
export declare function isAbsent(field: FieldDef, value: unknown): boolean;
export declare function emptyValue(field: FieldDef): unknown;
export declare function readField(context: CodecContext, reader: Reader, field: FieldDef): unknown;
export declare function writeField(writer: Writer, owner: string, field: FieldDef, value: unknown): void;
export declare function normalizeField(context: CodecContext, field: FieldDef, value: unknown): unknown;
export type FieldsReader = (reader: Reader, target: Record<string, unknown>) => void;
export type FieldsCopier = (target: Record<string, unknown>, source: Record<string, unknown>) => void;
export declare function compileFieldsReader(context: CodecContext, fields: FieldDef[]): FieldsReader;
export declare function compileFieldsCopier(fields: FieldDef[]): FieldsCopier;
