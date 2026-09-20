const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const source = fs.readFileSync(
    path.resolve(__dirname, "../assets/js/core/dates.js"), "utf8");
const context = {
    escapeHTML: value => String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;")
};
vm.createContext(context);
vm.runInContext(source, context);

test("son görüşme tarihi ve saati ayrı satırlarda hazırlanır", () => {
    const html = context.formatLastCallHTML("2026-09-20T12:30:00");
    assert.match(html, /class="last-call-date"/);
    assert.match(html, /class="last-call-time"/);
    assert.match(html, /20\.09\.2026/);
    assert.match(html, /12:30/);
    const element = { innerHTML: "" };
    context.renderLastCall(element, "2026-09-20T12:30:00");
    assert.equal(element.innerHTML, html);
});

test("son görüşme yoksa veya tarih bozuksa boş gösterilir", () => {
    assert.equal(context.formatLastCallHTML(null), "-");
    assert.equal(context.formatLastCallHTML("geçersiz"), "-");
});
