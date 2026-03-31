"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.slugify = slugify;
exports.buildSlug = buildSlug;
function slugify(value) {
    return value
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 48);
}
function buildSlug(title, seed = "") {
    const base = slugify(title) || "template";
    return seed ? `${base}-${seed}` : base;
}
//# sourceMappingURL=helpers.js.map