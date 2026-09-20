const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
function source(file) {
    return fs.readFileSync(path.join(root, file), "utf8");
}
function createContext() {
    const writes = {};
    const context = {
        customers: [],
        renewals: [],
        collections: [],
        STATUS_OPTIONS: ["Bilgilendirildi", "Poliçeleşti", "Teklif Verildi", "Olumsuz"],
        DEFAULT_AVATAR_COLOR: "#123456",
        isValidAvatarColor: () => true,
        crypto: { randomUUID: () => String(Math.random()) },
        localStorage: { setItem(key, value) { writes[key] = value; }, getItem() { return null; } },
        renderRenewals() {},
        renderCollections() {},
        getToday: () => "2026-09-20",
        formatDateForInput: date => [
            date.getFullYear(),
            String(date.getMonth() + 1).padStart(2, "0"),
            String(date.getDate()).padStart(2, "0")
        ].join("-"),
        normalizePhone: value => String(value || "").replace(/\D/g, ""),
        normalizeIdentityText: value => String(value || "").trim().toLocaleLowerCase("tr-TR"),
        $: () => null
    };
    vm.createContext(context);
    for (const file of [
        "assets/js/core/helpers.js",
        "assets/js/core/storage.js",
        "assets/js/features/renewals/crud.js",
        "assets/js/features/collections/data.js",
        "assets/js/features/collections/actions.js"
    ]) vm.runInContext(source(file), context);
    return { context, writes };
}

test("aile üyelerinin durumu ayrı tutulur; eski kayıtlar ana durumu devralır", () => {
    const { context } = createContext();
    context.customers = [{
        id: "c1", name: "Veli", status: "Poliçeleşti", tc: "11111111111",
        birthDate: "1980-04-12",
        product: "TSS", followupHistory: [
            { id: "history-1", kind: "completed", note: "Arandı" }
        ], insuredPersons: [
            { id: "p1", tc: "22222222222", birthDate: "2011-08-02", product: "ÖSS" },
            { id: "p2", tc: "33333333333", product: "DASK", status: "Teklif Verildi" }
        ]
    }];
    context.normalizeCustomers();
    assert.equal(context.customers[0].insuredPersons[0].status, "Poliçeleşti");
    assert.equal(context.customers[0].insuredPersons[1].status, "Teklif Verildi");
    assert.equal(context.customers[0].birthDate, "1980-04-12");
    assert.equal(context.getCustomerInsuredPersons(context.customers[0])[0].birthDate, "1980-04-12");
    assert.equal(context.customers[0].insuredPersons[0].birthDate, "2011-08-02");
    assert.equal(context.customers[0].insuredPersons[1].birthDate, "");
    assert.equal(context.customers[0].followupHistory[0].note, "Arandı");
    assert.equal(context.customerHasActiveFollowup(context.customers[0]), true);
});

test("yanlış TC başka müşteriye bağlanmaz; poliçe ürünü müşteri düzenlemesinde değişmez", () => {
    const { context } = createContext();
    const customer = {
        id: "c1", name: "Ayşe", phone: "0555 123 45 67", tc: "11111111111",
        product: "TSS", status: "Poliçeleşti", avatarColor: "#123456",
        insuredPersons: [{ id: "p1", name: "Ali", tc: "22222222222",
            product: "ÖSS", status: "Poliçeleşti" }]
    };
    context.customers = [customer];
    assert.equal(context.findCustomerForRenewalData({
        tc: "99999999999", customerName: "Ayşe", customerPhone: customer.phone,
        customerId: "c1"
    }), null);
    const person = context.getCustomerInsuredPersons(customer)[1];
    const renewal = context.createRenewalFromCustomer(customer, person);
    assert.equal(renewal.product, "ÖSS");
    assert.equal(renewal.insuredPersonId, "p1");
    assert.equal(context.findExistingRenewalForCustomer(customer, person)?.id, renewal.id);
    customer.insuredPersons[0].product = "TSS";
    context.syncLinkedRenewalFromCustomer(customer);
    assert.equal(renewal.product, "ÖSS");
    assert.equal(context.findExistingRenewalForCustomer(customer,
        context.getCustomerInsuredPersons(customer)[1]), null);
});

test("tahsilat yanlış TC'yi bağlamaz; ay sonu taksit tarihi kaymaz", () => {
    const { context } = createContext();
    context.customers = [{
        id: "c1", name: "Ayşe", phone: "0555 123 45 67",
        tc: "11111111111", product: "TSS", insuredPersons: []
    }];
    assert.equal(context.findCustomerForCollectionRecord({
        tc: "99999999999", customerName: "Ayşe", phone: "0555 123 45 67",
        customerId: "c1"
    }), null);
    const collection = {
        id: "col1", customerName: "Ayşe", tc: "11111111111",
        firstPaymentDate: "2026-01-31", billingAnchorDate: "2026-01-31",
        billingAnchorInstallment: 1, nextPaymentDate: "2026-01-31",
        currentInstallment: 1, installmentCount: 4, status: "pending"
    };
    context.collection = collection;
    vm.runInContext("collections.push(collection)", context);
    assert.equal(context.getCollectionInstallmentProgress({
        currentInstallment: 2, installmentCount: 12, status: "pending"
    }).paid, 1);
    context.markCollectionAsPaid("col1");
    assert.equal(collection.nextPaymentDate, "2026-02-28");
    context.markCollectionAsPaid("col1");
    assert.equal(collection.nextPaymentDate, "2026-03-31");
    assert.equal(context.getCollectionCountdown(collection, "2026-03-30").text, "Yarın");
    context.markCollectionAsPaid("col1");
    context.markCollectionAsPaid("col1");
    assert.equal(context.getCollectionCountdown(collection, "2026-05-01").text,
        "Tamamlandı");
});

test("tahsilat normalizasyonu mevcut müşteri ID bağlantısını korur", () => {
    const { context } = createContext();
    context.customers = [{ id: "c1", name: "Ayşe Yeni", phone: "05559999999",
        tc: "22222222222", product: "ÖSS", insuredPersons: [] }];
    vm.runInContext(`collections = [{ id: "col1", customerId: "c1",
        customerName: "Ayşe Eski", phone: "05551111111", tc: "11111111111",
        product: "ÖSS", nextPaymentDate: "2026-10-01" }]`, context);
    context.normalizeCollections();
    assert.equal(vm.runInContext("collections[0].customerId", context), "c1");
    const previous = { customerId: "c1", customerName: "Ayşe Eski",
        phone: "05551111111", tc: "11111111111" };
    assert.equal(context.resolveCollectionCustomerForEdit(previous, {
        customerName: previous.customerName, phone: previous.phone, tc: previous.tc
    })?.id, "c1");
    assert.equal(context.resolveCollectionCustomerForEdit(previous, {
        customerName: previous.customerName, phone: previous.phone, tc: "99999999999"
    }), null);
});

test("yenileme düzenlemede değişmeyen kimlik eski müşteri bağlantısını korur", () => {
    const { context } = createContext();
    context.customers = [{ id: "c1", name: "Ayşe Yeni", phone: "05559999999",
        tc: "22222222222", product: "ÖSS", insuredPersons: [] }];
    const previous = { customerId: "c1", insuredPersonId: "c1",
        customerName: "Ayşe Eski", customerPhone: "05551111111", tc: "11111111111" };
    const result = context.resolveRenewalCustomerForEdit(previous, {
        customerName: previous.customerName, customerPhone: previous.customerPhone, tc: previous.tc
    });
    assert.equal(result.linkedCustomer?.id, "c1");
    assert.equal(result.linkedPerson?.id, "c1");
    const changed = context.resolveRenewalCustomerForEdit(previous, {
        customerName: previous.customerName, customerPhone: previous.customerPhone, tc: "99999999999"
    });
    assert.equal(changed.linkedCustomer, null);
});

test("tahsilat geri sayımı takvim gününü esas alır ve durumla uyumludur", () => {
    const { context } = createContext();
    const item = { nextPaymentDate: "2026-03-30", currentInstallment: 1,
        installmentCount: 3, status: "pending" };
    assert.equal(context.getCollectionCountdown(item, "2026-03-28").text, "2 gün kaldı");
    assert.equal(context.getCollectionCountdown(item, "2026-03-29").text, "Yarın");
    assert.equal(context.getCollectionCountdown(item, "2026-03-30").text, "Bugün");
    assert.equal(context.getCollectionCountdown(item, "2026-04-01").text, "2 gün gecikti");
    assert.equal(context.getCollectionStatus(item, "2026-04-01"), "overdue");
    item.nextPaymentDate = null;
    assert.equal(context.getCollectionCountdown(item, "2026-04-01").text,
        "Tarih yok");
    assert.equal(context.collectionDaysUntil("2026-02-31", "2026-02-28"), null);
    assert.equal(context.collectionDaysUntil("2028-02-29", "2028-02-28"), 1);
});

test("özel tahsilat onayı iptal edilince değişiklik yapmaz, onayda tek taksit ilerler", () => {
    const { context, writes } = createContext();
    const elements = new Map();
    const fakeElement = () => {
        const classes = new Set();
        return {
            classList: {
                add(value) { classes.add(value); },
                remove(value) { classes.delete(value); },
                contains(value) { return classes.has(value); }
            },
            addEventListener() {},
            focus() {},
            isConnected: true,
            hidden: false,
            textContent: "",
            innerHTML: ""
        };
    };
    context.document = {
        activeElement: fakeElement(),
        getElementById(id) { return elements.get(id) || null; },
        createElement() { return fakeElement(); },
        addEventListener() {},
        body: {
            appendChild(overlay) {
                elements.set(overlay.id, overlay);
                for (const id of [
                    "cancelCollectionPaid", "confirmCollectionPaid", "collectionPaidCustomer",
                    "collectionPaidInstallment", "collectionPaidDate", "collectionPaidAmount",
                    "collectionPaidFinalNote"
                ]) elements.set(id, fakeElement());
            }
        }
    };
    context.requestAnimationFrame = callback => callback();
    context.collectionCurrency = amount => `${amount} ₺`;
    context.window = { confirm() { throw Error("Tarayıcı onayı kullanılmamalı"); } };
    const collection = {
        id: "paid-1", customerName: "Ayşe", currentInstallment: 2,
        installmentCount: 3, installmentAmount: 450,
        firstPaymentDate: "2026-09-20", billingAnchorDate: "2026-09-20",
        billingAnchorInstallment: 1, nextPaymentDate: "2026-10-20", status: "pending"
    };
    context.collection = collection;
    vm.runInContext("collections.push(collection)", context);
    context.openCollectionPaidModal("paid-1");
    assert.equal(elements.get("collectionPaidInstallment").textContent, "2 / 3");
    assert.equal(collection.currentInstallment, 2);
    assert.equal(Object.keys(writes).length, 0);
    context.closeCollectionPaidModal();
    assert.equal(collection.currentInstallment, 2);
    assert.equal(Object.keys(writes).length, 0);

    context.openCollectionPaidModal("paid-1");
    context.confirmCollectionPaid();
    assert.equal(collection.currentInstallment, 3);
    assert.equal(collection.nextPaymentDate, "2026-11-20");
    assert.equal(context.getCollectionInstallmentProgress(collection).paid, 2);
    context.confirmCollectionPaid();
    assert.equal(collection.currentInstallment, 3);

    context.openCollectionPaidModal("paid-1");
    assert.equal(elements.get("collectionPaidFinalNote").hidden, false);
    context.confirmCollectionPaid();
    assert.equal(context.getCollectionStatus(collection), "completed");
    assert.equal(context.getCollectionInstallmentProgress(collection).percent, 100);
    assert.equal(collection.lastPaidAt, collection.completedAt);
});

test("poliçeleşmiş müşteriye bağlı yenileme satırı müşteri detayını açar", () => {
    const { context } = createContext();
    const customer = {
        id: "c1", name: "Ayşe", status: "Teklif Verildi", tc: "11111111111",
        insuredPersons: [{ id: "p1", name: "Çocuk", tc: "22222222222",
            status: "Poliçeleşti", product: "ÖSS" }]
    };
    const linked = { id: "r1", customerId: "c1", insuredPersonId: "p1" };
    const unrelated = { id: "r2", customerId: "c1", insuredPersonId: "c1" };
    const standalone = { id: "r3", customerName: "Ayşe", tc: "22222222222" };
    context.customers = [customer];
    context.renewals = [linked, unrelated, standalone];
    assert.equal(context.getLinkedPolicyCustomerForRenewal(linked), customer);
    assert.equal(context.getLinkedPolicyCustomerForRenewal(unrelated), null);
    assert.equal(context.getLinkedPolicyCustomerForRenewal(standalone), null);

    const listeners = {};
    const row = { dataset: { renewalId: "r1" }, closest: () => null };
    row.closest = selector => selector === ".renewal-row-linked" ? row : null;
    const list = {
        addEventListener(type, handler) { listeners[type] = handler; },
        contains(node) { return node === row; }
    };
    context.$ = id => id === "renewalList" ? list : null;
    const opened = [];
    context.openCustomerDetail = id => opened.push(id);
    context.setupRenewalActions();
    const target = (button = null, avatar = null) => ({
        closest(selector) {
            if (selector === "[data-renewal-action]") return button;
            if (selector === "[data-avatar-renewal]") return avatar;
            if (selector === ".renewal-row-linked") return row;
            return null;
        }
    });
    listeners.click({ target: target() });
    assert.deepEqual(opened, ["c1"]);
    listeners.click({ target: target(null, {}) });
    assert.deepEqual(opened, ["c1"]);
    context.editRenewal = id => opened.push(`edit:${id}`);
    listeners.click({ target: target({ dataset: { id: "r1", renewalAction: "edit" } }) });
    assert.deepEqual(opened, ["c1", "edit:r1"]);
    listeners.keydown({ target: row, key: "Enter", preventDefault() {} });
    assert.deepEqual(opened, ["c1", "edit:r1", "c1"]);
});
