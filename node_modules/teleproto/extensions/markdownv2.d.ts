import { Api } from "../tl";
export declare class MarkdownV2Parser {
    /** Parses Telegram MarkdownV2 into text and UTF-16 entity ranges. */
    static parse(message: string): [string, Api.TypeMessageEntity[]];
    /** Serializes entities as MarkdownV2 with context-specific escaping. */
    static unparse(text: string, entities: Api.TypeMessageEntity[] | undefined): string;
}
