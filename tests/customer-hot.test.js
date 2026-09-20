const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const listSource = fs.readFileSync(path.join(root,
    "assets/js/features/customers/list.js"), "utf8");
const storageSource = fs.readFileSync(path.join(root,
    "assets/js/core/storage.js"), "utf8");

test("sıcak müşteri alevi detayı açmadan kaydedilir ve yeniden çizilir", () => {
    const customer = { id: "c1", name: "Ayşe Yılmaz", tc: "123", status: "Teklif Verildi",
        product: "TSS", isHot: false };
    const rows = [];
    const listeners = {};
    let stored = "";
    const opened = [];
    const customerList = {
        innerHTML: "",
        appendChild(row) { rows.push(row); },
        addEventListener(type, handler) { listeners[type] = handler; },
        contains(row) { return rows.includes(row); }
    };
    const context = {
        customers: [customer], customerList, emptyState: null,
        document: { createElement() { return { dataset: {}, setAttribute() {},
            classList: { toggle() {} }, innerHTML: "" }; } },
        $: id => ({ searchInput: { value: "" }, statusFilter: { value: "" },
            productFilter: { value: "" }, dateFilter: { value: "" } })[id] || null,
        getListPage: (_key, _signature, items) => items,
        updateListPager() {},
        getCustomerProducts: item => [item.product],
        getCustomerStatuses: item => [item.status],
        isOverdue: () => false,
        isToday: () => false,
        getAvatarStyle: () => "",
        getInitials: () => "AY",
        escapeHTML: value => String(value),
        formatLastCallHTML: () => "-",
        getCustomerReminderSummary: () => "-",
        formatDateOnly: value => value,
        statusClass: () => "status-new",
        saveLocalData() { stored = JSON.stringify(context.customers); return true; },
        openCustomerDetail(id) { opened.push(id); }
    };
    vm.createContext(context);
    vm.runInContext(listSource, context);
    context.populateCustomerDateFilterMonths = () => {};
    context.getFilteredCustomers = () => context.customers;
    context.renderCustomers();
    assert.match(rows[0].innerHTML, /data-action="toggle-hot"/);
    assert.match(rows[0].innerHTML, /aria-pressed="false"/);
    assert.match(rows[0].innerHTML, /<svg[\s\S]*<path/);
    assert.match(rows[0].innerHTML, /customer-hot-core/);

    context.setupCustomerListActions();
    const row = rows[0];
    const attributes = {};
    const button = {
        dataset: { id: "c1", action: "toggle-hot" },
        classList: { toggle() {} },
        setAttribute(name, value) { attributes[name] = value; },
        closest(selector) { return selector === ".customer-row" ? row : null; }
    };
    listeners.click({ target: { closest(selector) {
        return selector === "[data-action]" ? button : null;
    } } });
    assert.equal(customer.isHot, true);
    assert.equal(JSON.parse(stored)[0].isHot, true);
    assert.equal(attributes["aria-pressed"], "true");
    assert.deepEqual(opened, []);

    context.saveLocalData = () => false;
    listeners.click({ target: { closest(selector) {
        return selector === "[data-action]" ? button : null;
    } } });
    assert.equal(customer.isHot, true);
    assert.equal(attributes["aria-pressed"], "true");

    rows.length = 0;
    context.renderCustomers();
    assert.match(rows[0].innerHTML, /aria-pressed="true"/);
    assert.match(rows[0].className, /customer-row-hot/);
});

test("işaretli alev nazikçe hareket eder; hareket azaltma tercihi korunur", () => {
    const css = fs.readFileSync(path.join(root, "assets/css/customers.css"), "utf8");
    assert.match(css, /\.customer-hot-toggle\.is-active svg\s*\{[^}]*animation: customer-flame-ignite/);
    assert.match(css, /customer-flame-flicker 1\.8s ease-in-out \.48s infinite alternate/);
    assert.match(css, /prefers-reduced-motion: reduce/);
});

test("eski müşteri kayıtlarında sıcaklık varsayılan olarak kapalıdır", () => {
    const context = {
        customers: [{ id: "c1", name: "Eski" }, { id: "c2", isHot: true }],
        renewals: [], localStorage: { getItem() { return null; }, setItem() {} },
        STATUS_OPTIONS: ["Bilgilendirildi"],
        normalizeProductName: value => value,
        isValidAvatarColor: () => true,
        DEFAULT_AVATAR_COLOR: "#fff",
        crypto: { randomUUID: () => "new" }
    };
    vm.createContext(context);
    vm.runInContext(storageSource, context);
    context.normalizeCustomers();
    assert.equal(context.customers[0].isHot, false);
    assert.equal(context.customers[1].isHot, true);
});

test("müşteri detayı adı yalnızca profil başlığında gösterir", () => {
    const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
    assert.match(html, /id="detailTitle">Müşteri Detayı<\/h2>/);
    assert.match(html, /id="detailFullName"/);
    assert.doesNotMatch(html, /id="detailName"/);
    assert.doesNotMatch(fs.readFileSync(path.join(root,
        "assets/js/features/customers/crud.js"), "utf8"), /\$\("detailName"\)/);
});
