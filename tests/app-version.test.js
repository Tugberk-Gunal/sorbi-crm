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

test("sekme simgesi Teybox işaretini kullanır", () => {
    const root = path.resolve(__dirname, "..");
    const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
    const icon = fs.readFileSync(path.join(root, "favicon.svg"), "utf8");
    assert.match(html, /href="favicon\.svg\?v=teybox"/);
    assert.match(icon, /fill="#172c29"/);
    assert.match(icon, /M17 20h30v8H17zm0 13h21v8H17zm0 13h13v4H17z/);
    assert.doesNotMatch(icon, /sorbi-gradient/);
});
