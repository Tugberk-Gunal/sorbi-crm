const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

test("uygulama sürümü kenar çubuğunun altında görünür", () => {
    const root = path.resolve(__dirname, "..");
    const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
    const css = fs.readFileSync(path.join(root, "assets/css/layout.css"), "utf8");
    assert.match(html, /class="sidebar-version" aria-label="Uygulama sürümü v\.1\.7\.18"/);
    assert.match(html, /<strong>v\.1\.7\.18<\/strong>/);
    assert.match(css, /\.sidebar-version\s*\{/);
});
