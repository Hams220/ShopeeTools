import { Writer } from "../binary/Writer";
import type { Reader } from "../binary/Reader";
import { type CodecContext } from "./fieldCodec";
import type { ClassDef } from "./schema";
export type Fields = Record<string, unknown>;
export interface TlObject extends Fields {
    _write(writer: Writer, boxed?: boolean): void;
    _coerceArgs(): void;
    init(args: Fields): void;
}
export interface TlClass {
    new (args?: Fields): TlObject;
    readonly CONSTRUCTOR_ID: number;
    readonly SUBCLASS_OF_ID: number;
    readonly className: string;
    readonly classType: "constructor" | "request";
    readonly hasParameters: boolean;
    fromReader(reader: Reader): TlObject;
}
export type TlBaseClass = new (args: Fields) => object;
export interface ClassContext extends CodecContext {
    isTlType(type: string): boolean;
}
export declare function defineClass(context: ClassContext, def: ClassDef, base?: TlBaseClass): TlClass;
