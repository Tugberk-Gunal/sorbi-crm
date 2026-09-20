const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const helpers = fs.readFileSync(
    path.join(root, "assets/js/core/helpers.js"), "utf8");
const list = fs.readFileSync(
    path.join(root, "assets/js/features/customers/list.js"), "utf8");

function makeContext() {
    const group = {
        children: [],
        replaceChildren() { this.children = []; },
        appendChild(option) { this.children.push(option); }
    };
    const elements = {
        searchInput: { value: "" },
        statusFilter: { value: "all" },
        productFilter: { value: "all" },
        dateFilter: { value: "all" },
        dateFilterMonths: group
    };
    const context = {
        customers: [
            { id: "one", name: "Ayşe", nextActionDate: "2026-09-04",
                status: "Bilgilendirildi", product: "TSS" },
            { id: "two", name: "Ali", nextActionDate: "2026-09-25",
                status: "Bilgilendirildi", product: "TSS" },
            { id: "three", name: "Veli", nextActionDate: "2027-09-11",
                status: "Bilgilendirildi", product: "TSS" },
            { id: "four", name: "Deniz", nextActionDate: "2026-10-01",
                status: "Bilgilendirildi", product: "TSS" },
            { id: "no-date", name: "Ece", nextActionDate: "",
                status: "Bilgilendirildi", product: "TSS" }
        ],
        $: id => elements[id],
        document: { createElement: () => ({ value: "", textContent: "" }) },
        getToday: () => "2026-09-20",
        isToday: date => date === "2026-09-20",
        isTomorrow: date => date === "2026-09-21",
        isThisWeek: () => false,
        isOverdue: () => false
    };
    vm.createContext(context);
    vm.runInContext(helpers, context);
    vm.runInContext(list, context);
    return { context, elements, group };
}

test("ay-yıl seçenekleri kayıtlardan oluşturulur ve seçili ay korunur", () => {
    const { context, elements, group } = makeContext();
    elements.dateFilter.value = "month:2026-09";
    context.populateCustomerDateFilterMonths();
    assert.equal(elements.dateFilter.value, "month:2026-09");
    assert.deepEqual(group.children.map(option => option.value), [
        "month:2027-09", "month:2026-10", "month:2026-09"
    ]);
    assert.match(group.children[2].textContent, /Eylül 2026 \(2\)/);
    assert.deepEqual(Array.from(context.getFilteredCustomers(), item => item.id),
        ["one", "two"]);
});

test("bu ay ve farklı yıllardaki aynı ay ayrı filtrelenir", () => {
    const { context, elements } = makeContext();
    elements.dateFilter.value = "thisMonth";
    assert.deepEqual(Array.from(context.getFilteredCustomers(), item => item.id),
        ["one", "two"]);
    elements.dateFilter.value = "month:2027-09";
    assert.deepEqual(Array.from(context.getFilteredCustomers(), item => item.id),
        ["three"]);
    elements.dateFilter.value = "all";
    assert.equal(context.getFilteredCustomers().length, 5);
});

test("son kayıt başka aya taşınsa bile seçili ay boş sonuçla korunur", () => {
    const { context, elements, group } = makeContext();
    elements.dateFilter.value = "month:2025-12";
    context.populateCustomerDateFilterMonths();
    assert.equal(elements.dateFilter.value, "month:2025-12");
    assert.ok(group.children.some(option =>
        option.value === "month:2025-12" && option.textContent.endsWith("(0)")));
    assert.equal(context.getFilteredCustomers().length, 0);
});
