const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const helperSource = fs.readFileSync(path.join(root, "assets/js/core/helpers.js"), "utf8");
const interactionSource = fs.readFileSync(path.join(root, "assets/js/features/interactions.js"), "utf8");

function makeContext() {
    const elements = {
        interactionSearchInput: { value: "" },
        interactionTypeFilter: { value: "all", innerHTML: "" },
        interactionDateFilter: { value: "all" },
        clearInteractionFilters: { hidden: true },
        interactionCount: { textContent: "" }
    };
    const list = {
        innerHTML: "", children: [], handlers: {},
        appendChild(item) { this.children.push(item); },
        addEventListener(name, callback) { this.handlers[name] = callback; }
    };
    const empty = {
        textContent: "", hidden: false,
        classList: { toggle(name, value) { empty.hidden = value; } }
    };
    const opened = [];
    const context = {
        customers: [{
            id: "c1", name: "İpek", phone: "0555", tc: "12345678901",
            product: "TSS", status: "Bilgilendirildi", interactions: [
                { id: "i1", type: "Arama", note: "Yenileme konuşuldu", createdAt: "2026-09-20T09:00:00Z" },
                { id: "i2", type: "WhatsApp", note: "Teklif gönderildi", createdAt: "2026-09-12T09:00:00Z" }
            ]
        }],
        allInteractionList: list, interactionPageEmpty: empty,
        $: id => elements[id] || null,
        document: {
            getElementById: () => null,
            createElement: () => ({ dataset: {}, setAttribute() {}, innerHTML: "" })
        },
        formatDateTime: value => value,
        getInitials: () => "İP",
        isValidAvatarColor: () => false,
        openCustomerDetail: id => opened.push(id)
    };
    vm.createContext(context);
    vm.runInContext(helperSource, context);
    vm.runInContext(interactionSource, context);
    return { context, elements, list, empty, opened };
}

test("görüşmeler ad, TC ve notla aranır; tür ve zaman filtreleri birlikte çalışır", () => {
    const { context } = makeContext();
    const all = context.getAllInteractions();
    assert.equal(context.filterInteractions(all, { search: "ipek" }).length, 2);
    assert.equal(context.filterInteractions(all, { search: "12345678901" }).length, 2);
    assert.equal(context.filterInteractions(all, { search: "yenileme", type: "Arama" }).length, 1);
    assert.equal(context.filterInteractions(all, { type: "WhatsApp", period: "last7" },
        new Date("2026-09-20T12:00:00Z")).length, 0);
    assert.equal(context.filterInteractions(all, { period: "thisMonth" },
        new Date("2026-09-20T12:00:00Z")).length, 2);
});

test("görüşmeler müşteride gruplanır; filtre sayacı ve detay düğmesi doğru çalışır", () => {
    const { context, elements, list, empty, opened } = makeContext();
    elements.interactionSearchInput.value = "yenileme";
    context.renderAllInteractions();
    assert.equal(elements.interactionCount.textContent, "1 müşteri · 1 / 2 görüşme");
    assert.equal(list.children.length, 1);
    assert.equal(elements.clearInteractionFilters.hidden, false);
    assert.equal(empty.hidden, true);
    context.setupInteractionPageActions();
    const group = list.children[0];
    assert.equal(group.dataset.customerId, "c1");
    assert.match(group.innerHTML, /1 \/ 2 görüşme/);
    const detailButton = { dataset: { interactionCustomer: "c1" } };
    list.handlers.click({ target: {
        closest: selector => selector === "[data-interaction-customer]" ? detailButton : null
    } });
    assert.deepEqual(opened, ["c1"]);
    elements.interactionSearchInput.value = "bulunmayan";
    list.children = [];
    context.renderAllInteractions();
    assert.equal(elements.interactionCount.textContent, "0 müşteri · 0 / 2 görüşme");
    assert.equal(empty.hidden, false);
    assert.match(empty.textContent, /uygun müşteri görüşmesi bulunamadı/);
});

test("üç arama ve iki mesaj tek müşteri altında kalır", () => {
    const { context, elements, list } = makeContext();
    context.customers[0].interactions = [
        ...context.customers[0].interactions,
        { id: "i3", type: "Arama", note: "Arandı", createdAt: "2026-09-18T09:00:00Z" },
        { id: "i4", type: "Arama", note: "Tekrar arandı", createdAt: "2026-09-17T09:00:00Z" },
        { id: "i5", type: "WhatsApp", note: "Mesaj atıldı", createdAt: "2026-09-16T09:00:00Z" }
    ];
    context.renderAllInteractions();
    assert.equal(list.children.length, 1);
    assert.equal(elements.interactionCount.textContent, "1 müşteri · 5 görüşme");
    assert.match(list.children[0].innerHTML, /3 Arama/);
    assert.match(list.children[0].innerHTML, /2 WhatsApp/);
    assert.equal((list.children[0].innerHTML.match(/interaction-group-entry"/g) || []).length, 5);
});

test("görüşme silmek elle düzenlenen müşteri notunu değiştirmez", () => {
    const { context } = makeContext();
    const customer = context.customers[0];
    customer.lastCall = customer.interactions[0].createdAt;
    customer.note = "Müşteriye özel kalıcı not";
    context.saveLocalData = () => true;
    context.renderAll = () => {};
    context.detailOverlay = { classList: { contains: () => false } };
    context.deleteInteraction("c1", "i1");
    assert.equal(customer.note, "Müşteriye özel kalıcı not");
    assert.equal(customer.lastCall, customer.interactions[0].createdAt);
});

test("elle girilen not görüşme notuyla aynı olsa bile silinmez", () => {
    const { context } = makeContext();
    const customer = context.customers[0];
    customer.lastCall = customer.interactions[0].createdAt;
    customer.note = customer.interactions[0].note;
    customer.noteSourceInteractionId = null;
    context.saveLocalData = () => true;
    context.renderAll = () => {};
    context.detailOverlay = { classList: { contains: () => false } };
    context.deleteInteraction("c1", "i1");
    assert.equal(customer.note, "Yenileme konuşuldu");
});
