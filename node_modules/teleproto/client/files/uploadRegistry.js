"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rememberUpload = rememberUpload;
exports.findUploads = findUploads;
const uploaded = new WeakMap();
function rememberUpload(input, file) {
    uploaded.set(input, file);
}
function findUploads(request) {
    const found = new Set();
    const seen = new Set();
    const visit = (value, depth) => {
        if (!value || typeof value !== "object" || depth > 8 || seen.has(value) || Buffer.isBuffer(value))
            return;
        seen.add(value);
        const known = uploaded.get(value);
        if (known) {
            found.add(known);
            return;
        }
        for (const child of Array.isArray(value) ? value : Object.values(value))
            visit(child, depth + 1);
    };
    visit(request, 0);
    return [...found];
}
