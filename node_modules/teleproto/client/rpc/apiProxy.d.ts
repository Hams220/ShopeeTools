import type { Api } from "../../tl/api";
type Invoker = (request: Api.AnyRequest, dcId?: number, options?: Api.ApiCallOptions) => Promise<unknown>;
/** Builds cached method helpers and a typed raw-object entry point. */
export declare function createApiProxy(api: Record<string, unknown>, invoke: Invoker): unknown;
export {};
