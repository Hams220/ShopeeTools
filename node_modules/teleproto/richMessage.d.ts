/**
 * Helpers for Telegram rich messages (Layer 228): building
 * {@link Api.TypeInputRichMessage} inputs for sending, and rendering received
 * {@link Api.RichMessage} block trees to plain text, Markdown or HTML.
 *
 * Sending — the server parses HTML/Markdown for you:
 * ```ts
 * import { Rich } from "teleproto";
 * await client.sendMessage(chat, {
 *     richMessage: Rich.markdown("# Title\n\nHello **world**"),
 * });
 * ```
 *
 * Reading:
 * ```ts
 * if (message.richMessage) console.log(Rich.toMarkdown(message.richMessage));
 * ```
 */
import { Api } from "./tl/api";
/**
 * Media referenced from HTML/Markdown content by id: map of id → uploaded
 * photo or document. Reference them from the content by that id
 * (e.g. `<img src="cover">` with `files: { cover: inputPhoto }`).
 */
export type RichFileMap = Record<string, Api.TypeInputPhoto | Api.TypeInputDocument>;
/** Common options for the rich input factories. */
export interface RichInputOptions {
    /** Right-to-left layout. */
    rtl?: boolean;
    /** Disable automatic linking of URLs, emails and phone numbers. */
    noAutolink?: boolean;
    /** Media referenced from the content by id, see {@link RichFileMap}. */
    files?: RichFileMap;
}
/** Builds a rich message from HTML. The server parses it into blocks. */
export declare function html(content: string, options?: RichInputOptions): Api.InputRichMessageHTML;
/** Builds a rich message from Markdown. The server parses it into blocks. */
export declare function markdown(content: string, options?: RichInputOptions): Api.InputRichMessageMarkdown;
/** Options for {@link blocks} — the raw PageBlock input variant. */
export interface RichBlocksOptions {
    /** Right-to-left layout. */
    rtl?: boolean;
    /** Disable automatic linking of URLs, emails and phone numbers. */
    noAutolink?: boolean;
    /** Photos referenced by `photoId` from within the blocks. */
    photos?: Api.TypeInputPhoto[];
    /** Documents referenced by `documentId` from within the blocks. */
    documents?: Api.TypeInputDocument[];
    /** Users referenced by `userId` from within the blocks. */
    users?: Api.TypeInputUser[];
}
/** Builds a rich message from a raw PageBlock tree. */
export declare function blocks(pageBlocks: Api.TypePageBlock[], options?: RichBlocksOptions): Api.InputRichMessage;
type RenderMode = "text" | "md" | "html";
/** Renders a {@link Api.TypeRichText} tree to plain text, Markdown or HTML. */
export declare function renderRichText(text: Api.TypeRichText | undefined, mode?: RenderMode): string;
/** @hidden */
export declare function renderBlocks(pageBlocks: Api.TypePageBlock[], mode: RenderMode): string;
type RichSource = Api.RichMessage | Api.TypePageBlock[];
/** Renders a rich message to plain text. */
export declare function toPlainText(source: RichSource): string;
/** Renders a rich message to Markdown. */
export declare function toMarkdown(source: RichSource): string;
/** Renders a rich message to HTML. Media are emitted as tags with `data-photo-id`/`data-document-id` attributes pointing into `richMessage.photos`/`documents`. */
export declare function toHtml(source: RichSource): string;
export {};
