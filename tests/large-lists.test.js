const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const helpers = fs.readFileSync(path.join(root, "assets/js/core/helpers.js"), "utf8");

test("5000 kayıtta yalnızca ilk 100 öğe çizilir; filtre ve devamı doğru çalışır", () => {
    const pager = { hidden: true, textContent: "", onclick: null };
    const context = {
        document: { getElementById: () => pager }
    };
    vm.createContext(context);
    vm.runInContext(helpers, context);
    const all = Array.from({ length: 5000 }, (_, index) => index);
    const page = (signature, items = all) =>
        context.getListPage("customerList", signature, items);

    assert.equal(page("all").length, 100);
    context.updateListPager("customerList", all.length, () => {});
    assert.equal(pager.hidden, false);
    assert.match(pager.textContent, /100 \/ 5000/);
    pager.onclick();
    assert.equal(page("all").length, 200);
    assert.equal(page("filtered", all.slice(0, 7)).length, 7);
    context.updateListPager("customerList", 7, () => {});
    assert.equal(pager.hidden, true);
    assert.equal(page("all").length, 100);
});
