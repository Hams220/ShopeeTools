import type { BareReader } from "./fieldCodec";
import { type ClassContext, type TlBaseClass, type TlClass } from "./defineClass";
import { type CompactSchema } from "./schema";
type ApiTree = Record<string, unknown>;
export declare class Registry implements ClassContext {
    private readonly schema;
    private readonly bases;
    readonly api: ApiTree;
    private readonly classes;
    private readonly byId;
    private readonly byName;
    private readonly byTag;
    private readonly byResult;
    constructor(schema: CompactSchema, bases?: Record<string, () => TlBaseClass>);
    get layer(): number;
    get constructorIds(): number[];
    classById(constructorId: number): TlClass | undefined;
    readerFor(constructorId: number): BareReader | undefined;
    byFullName(name: string): TlClass | undefined;
    bareType(name: string): TlClass | undefined;
    isTlType(type: string): boolean;
    coerce(value: unknown, expectedType: string | null): unknown;
    private namespaceOf;
    private classAt;
}
export declare const registry: Registry;
export declare const LAYER: number;
export declare const tlobjects: Record<number, TlClass>;
export {};
