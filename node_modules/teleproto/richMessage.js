"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.html = html;
exports.markdown = markdown;
exports.blocks = blocks;
exports.renderRichText = renderRichText;
exports.renderBlocks = renderBlocks;
exports.toPlainText = toPlainText;
exports.toMarkdown = toMarkdown;
exports.toHtml = toHtml;
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
const api_1 = require("./tl/api");
const Helpers_1 = require("./Helpers");
function _toRichFiles(files) {
    if (!files) {
        return undefined;
    }
    const result = [];
    for (const [id, media] of Object.entries(files)) {
        if (media.SUBCLASS_OF_ID === (0, Helpers_1.unionId)("InputPhoto")) {
            result.push(new api_1.Api.InputRichFilePhoto({
                id,
                photo: media,
            }));
        }
        else {
            result.push(new api_1.Api.InputRichFileDocument({
                id,
                document: media,
            }));
        }
    }
    return result.length ? result : undefined;
}
/** Builds a rich message from HTML. The server parses it into blocks. */
function html(content, options = {}) {
    return new api_1.Api.InputRichMessageHTML({
        html: content,
        rtl: options.rtl,
        noautolink: options.noAutolink,
        files: _toRichFiles(options.files),
    });
}
/** Builds a rich message from Markdown. The server parses it into blocks. */
function markdown(content, options = {}) {
    return new api_1.Api.InputRichMessageMarkdown({
        markdown: content,
        rtl: options.rtl,
        noautolink: options.noAutolink,
        files: _toRichFiles(options.files),
    });
}
/** Builds a rich message from a raw PageBlock tree. */
function blocks(pageBlocks, options = {}) {
    return new api_1.Api.InputRichMessage({
        blocks: pageBlocks,
        rtl: options.rtl,
        noautolink: options.noAutolink,
        photos: options.photos,
        documents: options.documents,
        users: options.users,
    });
}
function _escapeHtml(text) {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}
function _escapeMd(text) {
    return text.replace(/([\\`*_[\]|~])/g, "\\$1");
}
function _plain(text, mode) {
    if (mode === "html") {
        return _escapeHtml(text);
    }
    if (mode === "md") {
        return _escapeMd(text);
    }
    return text;
}
function _tag(inner, mode, htmlTag, md) {
    if (mode === "html") {
        return `<${htmlTag}>${inner}</${htmlTag}>`;
    }
    if (mode === "md") {
        return `${md}${inner}${md}`;
    }
    return inner;
}
function _buttonUrl(type) {
    if (type instanceof api_1.Api.InlineButtonTypeUrl ||
        type instanceof api_1.Api.InlineButtonTypeUrlAuth ||
        type instanceof api_1.Api.InputInlineButtonTypeUrlAuth ||
        type instanceof api_1.Api.InlineButtonTypeWebView) {
        return type.url;
    }
    return undefined;
}
function _renderButton(text, type, mode) {
    const inner = renderRichText(text, mode);
    const url = _buttonUrl(type);
    if (mode === "html") {
        return url
            ? `<a class="button" href="${_escapeHtml(url)}">${inner}</a>`
            : `<button>${inner}</button>`;
    }
    if (mode === "md" && url) {
        return `[${inner}](${url})`;
    }
    return inner;
}
/** Renders a {@link Api.TypeRichText} tree to plain text, Markdown or HTML. */
function renderRichText(text, mode = "text") {
    if (!text || text instanceof api_1.Api.TextEmpty) {
        return "";
    }
    if (text instanceof api_1.Api.TextPlain) {
        return _plain(text.text, mode);
    }
    if (text instanceof api_1.Api.TextConcat) {
        return text.texts.map((t) => renderRichText(t, mode)).join("");
    }
    if (text instanceof api_1.Api.TextBold) {
        return _tag(renderRichText(text.text, mode), mode, "b", "**");
    }
    if (text instanceof api_1.Api.TextItalic) {
        return _tag(renderRichText(text.text, mode), mode, "i", "_");
    }
    if (text instanceof api_1.Api.TextUnderline) {
        return mode === "html"
            ? `<u>${renderRichText(text.text, mode)}</u>`
            : renderRichText(text.text, mode);
    }
    if (text instanceof api_1.Api.TextStrike) {
        return _tag(renderRichText(text.text, mode), mode, "s", "~~");
    }
    if (text instanceof api_1.Api.TextFixed) {
        return _tag(renderRichText(text.text, mode), mode, "code", "`");
    }
    if (text instanceof api_1.Api.TextMarked) {
        return mode === "html"
            ? `<mark>${renderRichText(text.text, mode)}</mark>`
            : renderRichText(text.text, mode);
    }
    if (text instanceof api_1.Api.TextSpoiler) {
        const inner = renderRichText(text.text, mode);
        if (mode === "html") {
            return `<span class="spoiler">${inner}</span>`;
        }
        if (mode === "md") {
            return `||${inner}||`;
        }
        return inner;
    }
    if (text instanceof api_1.Api.TextSubscript) {
        return mode === "html"
            ? `<sub>${renderRichText(text.text, mode)}</sub>`
            : renderRichText(text.text, mode);
    }
    if (text instanceof api_1.Api.TextSuperscript) {
        return mode === "html"
            ? `<sup>${renderRichText(text.text, mode)}</sup>`
            : renderRichText(text.text, mode);
    }
    if (text instanceof api_1.Api.TextUrl) {
        const inner = renderRichText(text.text, mode);
        if (mode === "html") {
            return `<a href="${_escapeHtml(text.url)}">${inner}</a>`;
        }
        if (mode === "md") {
            return `[${inner}](${text.url})`;
        }
        return inner;
    }
    if (text instanceof api_1.Api.TextEmail) {
        const inner = renderRichText(text.text, mode);
        if (mode === "html") {
            return `<a href="mailto:${_escapeHtml(text.email)}">${inner}</a>`;
        }
        return inner;
    }
    if (text instanceof api_1.Api.TextPhone) {
        return renderRichText(text.text, mode);
    }
    if (text instanceof api_1.Api.TextAnchor) {
        const inner = renderRichText(text.text, mode);
        return mode === "html"
            ? `<a id="${_escapeHtml(text.name)}">${inner}</a>`
            : inner;
    }
    if (text instanceof api_1.Api.TextMentionName) {
        const inner = renderRichText(text.text, mode);
        if (mode === "html") {
            return `<a href="tg://user?id=${text.userId}">${inner}</a>`;
        }
        return inner;
    }
    if (text instanceof api_1.Api.TextCustomEmoji) {
        return _plain(text.alt, mode);
    }
    if (text instanceof api_1.Api.TextImage) {
        return mode === "html"
            ? `<img data-document-id="${text.documentId}">`
            : "";
    }
    if (text instanceof api_1.Api.TextMath) {
        return _tag(_plain(text.source, mode), mode, "code", "`");
    }
    if (text instanceof api_1.Api.TextDiff) {
        return renderRichText(text.text, mode);
    }
    if (text instanceof api_1.Api.TextButton) {
        return _renderButton(text.text, text.type, mode);
    }
    const nested = text.text;
    if (nested && typeof nested === "object") {
        return renderRichText(nested, mode);
    }
    return "";
}
function _renderCaption(caption, mode) {
    if (!caption || !(caption instanceof api_1.Api.PageCaption)) {
        return "";
    }
    const parts = [
        renderRichText(caption.text, mode),
        renderRichText(caption.credit, mode),
    ].filter(Boolean);
    return parts.join(mode === "html" ? " — " : " — ");
}
function _checkbox(item) {
    if (!item.checkbox) {
        return "";
    }
    return item.checked ? "[x] " : "[ ] ";
}
function _renderBlock(block, mode) {
    if (block instanceof api_1.Api.PageBlockTitle) {
        const inner = renderRichText(block.text, mode);
        if (mode === "html")
            return `<h1>${inner}</h1>`;
        if (mode === "md")
            return `# ${inner}`;
        return inner;
    }
    if (block instanceof api_1.Api.PageBlockSubtitle) {
        const inner = renderRichText(block.text, mode);
        if (mode === "html")
            return `<h2>${inner}</h2>`;
        if (mode === "md")
            return `## ${inner}`;
        return inner;
    }
    if (block instanceof api_1.Api.PageBlockHeader) {
        const inner = renderRichText(block.text, mode);
        if (mode === "html")
            return `<h3>${inner}</h3>`;
        if (mode === "md")
            return `### ${inner}`;
        return inner;
    }
    if (block instanceof api_1.Api.PageBlockSubheader) {
        const inner = renderRichText(block.text, mode);
        if (mode === "html")
            return `<h4>${inner}</h4>`;
        if (mode === "md")
            return `#### ${inner}`;
        return inner;
    }
    for (const [cls, level] of [
        [api_1.Api.PageBlockHeading1, 1],
        [api_1.Api.PageBlockHeading2, 2],
        [api_1.Api.PageBlockHeading3, 3],
        [api_1.Api.PageBlockHeading4, 4],
        [api_1.Api.PageBlockHeading5, 5],
        [api_1.Api.PageBlockHeading6, 6],
    ]) {
        if (block instanceof cls) {
            const inner = renderRichText(block.text, mode);
            if (mode === "html")
                return `<h${level}>${inner}</h${level}>`;
            if (mode === "md")
                return `${"#".repeat(level)} ${inner}`;
            return inner;
        }
    }
    if (block instanceof api_1.Api.PageBlockParagraph) {
        const inner = renderRichText(block.text, mode);
        return mode === "html" ? `<p>${inner}</p>` : inner;
    }
    if (block instanceof api_1.Api.PageBlockKicker) {
        const inner = renderRichText(block.text, mode);
        return mode === "html" ? `<p>${inner}</p>` : inner;
    }
    if (block instanceof api_1.Api.PageBlockFooter) {
        const inner = renderRichText(block.text, mode);
        return mode === "html" ? `<footer>${inner}</footer>` : inner;
    }
    if (block instanceof api_1.Api.PageBlockPreformatted) {
        if (mode === "html") {
            return `<pre>${renderRichText(block.text, "html")}</pre>`;
        }
        const raw = renderRichText(block.text, "text");
        if (mode === "md") {
            return "```" + (block.language || "") + "\n" + raw + "\n```";
        }
        return raw;
    }
    if (block instanceof api_1.Api.PageBlockBlockquote ||
        block instanceof api_1.Api.PageBlockPullquote) {
        const inner = renderRichText(block.text, mode);
        const caption = renderRichText(block.caption, mode);
        if (mode === "html") {
            return `<blockquote>${inner}${caption ? `<footer>${caption}</footer>` : ""}</blockquote>`;
        }
        if (mode === "md") {
            const quoted = inner
                .split("\n")
                .map((line) => `> ${line}`)
                .join("\n");
            return caption ? `${quoted}\n> — ${caption}` : quoted;
        }
        return caption ? `${inner} — ${caption}` : inner;
    }
    if (block instanceof api_1.Api.PageBlockBlockquoteBlocks) {
        const inner = renderBlocks(block.blocks, mode);
        const caption = renderRichText(block.caption, mode);
        if (mode === "html") {
            return `<blockquote>${inner}${caption ? `<footer>${caption}</footer>` : ""}</blockquote>`;
        }
        if (mode === "md") {
            const quoted = inner
                .split("\n")
                .map((line) => `> ${line}`)
                .join("\n");
            return caption ? `${quoted}\n> — ${caption}` : quoted;
        }
        return caption ? `${inner} — ${caption}` : inner;
    }
    if (block instanceof api_1.Api.PageBlockDivider) {
        if (mode === "html")
            return "<hr>";
        if (mode === "md")
            return "---";
        return "———";
    }
    if (block instanceof api_1.Api.PageBlockAnchor) {
        return mode === "html" ? `<a id="${_escapeHtml(block.name)}"></a>` : "";
    }
    if (block instanceof api_1.Api.PageBlockList) {
        const items = block.items.map((item) => {
            let inner = "";
            let check = "";
            if (item instanceof api_1.Api.PageListItemText) {
                inner = renderRichText(item.text, mode);
                check = _checkbox(item);
            }
            else if (item instanceof api_1.Api.PageListItemBlocks) {
                inner = renderBlocks(item.blocks, mode);
                check = _checkbox(item);
            }
            if (mode === "html")
                return `<li>${check}${inner}</li>`;
            return `- ${check}${inner}`;
        });
        if (mode === "html")
            return `<ul>${items.join("")}</ul>`;
        return items.join("\n");
    }
    if (block instanceof api_1.Api.PageBlockOrderedList) {
        const items = block.items.map((item, index) => {
            let inner = "";
            let check = "";
            let num;
            if (item instanceof api_1.Api.PageListOrderedItemText) {
                inner = renderRichText(item.text, mode);
                check = _checkbox(item);
                num = item.num;
            }
            else if (item instanceof api_1.Api.PageListOrderedItemBlocks) {
                inner = renderBlocks(item.blocks, mode);
                check = _checkbox(item);
                num = item.num;
            }
            if (mode === "html")
                return `<li>${check}${inner}</li>`;
            return `${num ?? index + 1}. ${check}${inner}`;
        });
        if (mode === "html") {
            const start = block.start != undefined ? ` start="${block.start}"` : "";
            return `<ol${start}>${items.join("")}</ol>`;
        }
        return items.join("\n");
    }
    if (block instanceof api_1.Api.PageBlockTable) {
        const title = renderRichText(block.title, mode);
        const rows = block.rows.map((row) => row.cells.map((cell) => cell.text ? renderRichText(cell.text, mode) : ""));
        if (mode === "html") {
            const body = block.rows
                .map((row, i) => {
                const cells = row.cells
                    .map((cell) => {
                    const tag = cell.header ? "th" : "td";
                    const attrs = [
                        cell.colspan ? ` colspan="${cell.colspan}"` : "",
                        cell.rowspan ? ` rowspan="${cell.rowspan}"` : "",
                    ].join("");
                    const inner = cell.text
                        ? renderRichText(cell.text, "html")
                        : "";
                    return `<${tag}${attrs}>${inner}</${tag}>`;
                })
                    .join("");
                return `<tr>${cells}</tr>`;
            })
                .join("");
            return `${title ? `<p>${title}</p>` : ""}<table>${body}</table>`;
        }
        if (mode === "md" && rows.length) {
            const header = rows[0];
            const lines = [
                `| ${header.join(" | ")} |`,
                `| ${header.map(() => "---").join(" | ")} |`,
                ...rows
                    .slice(1)
                    .map((cells) => `| ${cells.join(" | ")} |`),
            ];
            return (title ? `${title}\n` : "") + lines.join("\n");
        }
        return [title, ...rows.map((cells) => cells.join(" | "))]
            .filter(Boolean)
            .join("\n");
    }
    if (block instanceof api_1.Api.PageBlockPhoto) {
        const caption = _renderCaption(block.caption, mode);
        if (mode === "html") {
            return `<figure><img data-photo-id="${block.photoId}">${caption ? `<figcaption>${caption}</figcaption>` : ""}</figure>`;
        }
        return caption ? `[photo: ${caption}]` : "[photo]";
    }
    if (block instanceof api_1.Api.PageBlockVideo) {
        const caption = _renderCaption(block.caption, mode);
        if (mode === "html") {
            return `<figure><video data-document-id="${block.videoId}"></video>${caption ? `<figcaption>${caption}</figcaption>` : ""}</figure>`;
        }
        return caption ? `[video: ${caption}]` : "[video]";
    }
    if (block instanceof api_1.Api.PageBlockAudio) {
        const caption = _renderCaption(block.caption, mode);
        if (mode === "html") {
            return `<audio data-document-id="${block.audioId}"></audio>`;
        }
        return caption ? `[audio: ${caption}]` : "[audio]";
    }
    if (block instanceof api_1.Api.PageBlockDocument) {
        const caption = _renderCaption(block.caption, mode);
        if (mode === "html") {
            return `<figure><a data-document-id="${block.documentId}"></a>${caption ? `<figcaption>${caption}</figcaption>` : ""}</figure>`;
        }
        return caption ? `[document: ${caption}]` : "[document]";
    }
    if (block instanceof api_1.Api.PageBlockCollage ||
        block instanceof api_1.Api.PageBlockSlideshow) {
        const inner = renderBlocks(block.items, mode);
        const caption = _renderCaption(block.caption, mode);
        if (mode === "html") {
            return `<div>${inner}${caption ? `<figcaption>${caption}</figcaption>` : ""}</div>`;
        }
        return [inner, caption].filter(Boolean).join("\n");
    }
    if (block instanceof api_1.Api.PageBlockCover) {
        return _renderBlock(block.cover, mode);
    }
    if (block instanceof api_1.Api.PageBlockDetails) {
        const title = renderRichText(block.title, mode);
        const inner = renderBlocks(block.blocks, mode);
        if (mode === "html") {
            return `<details${block.open ? " open" : ""}><summary>${title}</summary>${inner}</details>`;
        }
        return [title, inner].filter(Boolean).join("\n");
    }
    if (block instanceof api_1.Api.PageBlockMath) {
        if (mode === "html")
            return `<code>${_escapeHtml(block.source)}</code>`;
        if (mode === "md")
            return "```\n" + block.source + "\n```";
        return block.source;
    }
    if (block instanceof api_1.Api.PageBlockThinking) {
        return renderRichText(block.text, mode);
    }
    if (block instanceof api_1.Api.PageBlockAuthorDate) {
        return renderRichText(block.author, mode);
    }
    if (block instanceof api_1.Api.PageBlockButtonRow) {
        const buttons = block.buttons
            .map((button) => button instanceof api_1.Api.PageButton
            ? _renderButton(button.text, button.type, mode)
            : "")
            .filter(Boolean);
        if (mode === "html") {
            return `<div class="buttons">${buttons.join("")}</div>`;
        }
        return buttons.join(" ");
    }
    if (block instanceof api_1.Api.PageBlockUnsupported) {
        return "";
    }
    const anyBlock = block;
    if (anyBlock.text && typeof anyBlock.text === "object") {
        return renderRichText(anyBlock.text, mode);
    }
    if (Array.isArray(anyBlock.blocks)) {
        return renderBlocks(anyBlock.blocks, mode);
    }
    if (Array.isArray(anyBlock.items)) {
        return renderBlocks(anyBlock.items, mode);
    }
    return "";
}
/** @hidden */
function renderBlocks(pageBlocks, mode) {
    const parts = pageBlocks
        .map((block) => _renderBlock(block, mode))
        .filter((part) => part !== "");
    if (mode === "html") {
        return parts.join("");
    }
    return parts.join("\n\n");
}
function _blocksOf(source) {
    return Array.isArray(source) ? source : source.blocks;
}
/** Renders a rich message to plain text. */
function toPlainText(source) {
    return renderBlocks(_blocksOf(source), "text");
}
/** Renders a rich message to Markdown. */
function toMarkdown(source) {
    return renderBlocks(_blocksOf(source), "md");
}
/** Renders a rich message to HTML. Media are emitted as tags with `data-photo-id`/`data-document-id` attributes pointing into `richMessage.photos`/`documents`. */
function toHtml(source) {
    return renderBlocks(_blocksOf(source), "html");
}
