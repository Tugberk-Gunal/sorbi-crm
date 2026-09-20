const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const followupSource = fs.readFileSync(
    path.join(root, "assets/js/features/followups.js"), "utf8");
const interactionSource = fs.readFileSync(
    path.join(root, "assets/js/features/interactions.js"), "utf8");
const helperSource = fs.readFileSync(
    path.join(root, "assets/js/core/helpers.js"), "utf8");

function element() {
    const classes = new Set();
    return {
        value: "", innerHTML: "", hidden: false, required: false,
        textContent: "", handlers: {}, isConnected: true, dataset: {},
        classList: {
            add(value) { classes.add(value); },
            remove(value) { classes.delete(value); },
            contains(value) { return classes.has(value); },
            toggle(value, force) {
                const active = force === undefined ? !classes.has(value) : force;
                if (active) classes.add(value);
                else classes.delete(value);
                return active;
            }
        },
        addEventListener(name, callback) { this.handlers[name] = callback; },
        setAttribute() {},
        setCustomValidity() {}, reportValidity() {}, reset() {}, focus() {}
    };
}

function makeApp(customers) {
    const ids = [
        "followupActionModal", "followupActionDate", "followupActionTime",
        "followupActionNote", "followupActionForm", "interactionList",
        "addInteractionButton", "interactionForm", "interactionFollowupPanel",
        "interactionFollowupOutcome", "interactionNextActionFields",
        "interactionNextActionDate", "interactionNextActionTime",
        "interactionType", "interactionNote", "detailFollowupHistory",
        "detailLastCall", "detailNextAction", "detailNote"
    ];
    const elements = Object.fromEntries(ids.map(id => [id, element()]));
    let saved = "";
    let renders = 0;
    const opened = [];
    const edited = [];
    let sequence = 0;
    const context = {
        customers, currentFollowupFilter: "agenda", selectedCustomerId: null,
        followupList: null, detailOverlay: element(),
        interactionModal: element(),
        crypto: { randomUUID: () => `id-${++sequence}` },
        $: id => elements[id] || null,
        document: { activeElement: null, addEventListener() {},
            createElement: () => element() },
        requestAnimationFrame: callback => callback(),
        getToday: () => "2026-09-20",
        getTomorrow: () => "2026-09-21",
        getDaysDifference: date => date
            ? Math.round((Date.parse(date) - Date.parse("2026-09-20")) / 86400000)
            : null,
        isToday: date => date === "2026-09-20",
        isTomorrow: date => date === "2026-09-21",
        isThisWeek: () => true,
        isOverdue: customer => customer.nextActionDate < "2026-09-20",
        formatDateForInput: date => [
            date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"),
            String(date.getDate()).padStart(2, "0")
        ].join("-"),
        formatDateOnly: value => value,
        formatDateTime: value => value,
        renderAll() { renders++; },
        renderCustomerInteractions() {},
        openCustomerDetail(id) { opened.push(id); },
        editCustomer(id) { edited.push(id); },
        getAvatarStyle: () => "",
        getInitials: () => "A",
        getCustomerReminderSummary: () => "20.09.2026",
        saveLocalData() { saved = JSON.stringify(customers); },
        alert(message) { throw Error(`Beklenmeyen uyarı: ${message}`); }
    };
    vm.createContext(context);
    vm.runInContext(helperSource, context);
    vm.runInContext(followupSource, context);
    vm.runInContext(interactionSource, context);
    return { context, elements, opened, edited,
        saved: () => saved, renders: () => renders };
}

test("takip kartının tamamı detayı açar; aksiyonlar ayrı çalışır", () => {
    const customer = {
        id: "c1", name: "Ayşe", phone: "0555", tc: "11111111111",
        nextActionDate: "2026-09-20", status: "Bilgilendirildi",
        product: "TSS", insuredPersons: []
    };
    const { context, opened, edited } = makeApp([customer]);
    const list = element();
    list.children = [];
    list.appendChild = child => list.children.push(child);
    context.followupList = list;
    context.followupEmpty = null;
    context.renderFollowups();
    const card = list.children[0];
    assert.equal(card.dataset.customerId, "c1");
    assert.doesNotMatch(card.innerHTML, /data-avatar-customer/);
    context.setupFollowupActions();
    list.handlers.click({
        target: { closest: selector => selector === ".followup-card" ? card : null }
    });
    assert.deepEqual(opened, ["c1"]);
    list.handlers.click({
        target: { closest: selector => selector === ".followup-card" ? card : null }
    });
    assert.deepEqual(opened, ["c1", "c1"]);
    const editButton = { dataset: { followupAction: "edit", id: "c1" } };
    list.handlers.click({
        target: { closest: selector => selector === "[data-followup-action]"
            ? editButton : card }
    });
    assert.deepEqual(opened, ["c1", "c1"]);
    assert.deepEqual(edited, ["c1"]);
    list.handlers.keydown({
        target: { dataset: { customerId: "c1" },
            classList: { contains: value => value === "followup-card" } },
        key: "Enter", preventDefault() {}
    });
    assert.deepEqual(opened, ["c1", "c1", "c1"]);
});

test("takipte ürün ve durumlar müşteri listesindeki renkli rozetlerle gösterilir", () => {
    const customer = {
        id: "c1", name: "Ayşe", phone: "0555", nextActionDate: "2026-09-20",
        status: "Teklif Verildi", product: "TSS",
        insuredPersons: [{ id: "p1", name: "Bebek", product: "ÖSS", status: "Bilgilendirildi" }]
    };
    const { context } = makeApp([customer]);
    const list = element();
    list.children = [];
    list.appendChild = child => list.children.push(child);
    context.followupList = list;
    context.followupEmpty = null;
    context.renderFollowups();
    const markup = list.children[0].innerHTML;
    assert.match(markup, /class="product-badge">TSS<\/span>/);
    assert.match(markup, /class="product-badge">ÖSS<\/span>/);
    assert.match(markup, /class="status-badge status-offer">Teklif Verildi<\/span>/);
    assert.match(markup, /class="status-badge status-info">Bilgilendirildi<\/span>/);
});

test("takiplerdeki alev aynı müşteri işaretini açıp kapatır", () => {
    const customer = { id: "hot-1", name: "Ayşe", nextActionDate: "2026-09-20",
        status: "Bilgilendirildi", product: "TSS", insuredPersons: [], isHot: true };
    const { context, opened, saved } = makeApp([customer]);
    const list = element();
    list.children = [];
    list.appendChild = card => list.children.push(card);
    context.followupList = list;
    context.followupEmpty = null;
    context.renderFollowups();
    assert.match(list.children[0].innerHTML, /data-followup-action="toggle-hot"/);
    assert.match(list.children[0].innerHTML, /aria-pressed="true"/);
    assert.match(list.children[0].className, /followup-hot/);

    context.setupFollowupActions();
    const card = list.children[0];
    const button = element();
    button.dataset = { followupAction: "toggle-hot", id: "hot-1" };
    button.closest = selector => selector === ".followup-card" ? card : null;
    list.handlers.click({ target: { closest: selector =>
        selector === "[data-followup-action]" ? button : null } });
    assert.equal(customer.isHot, false);
    assert.equal(JSON.parse(saved())[0].isHot, false);
    assert.deepEqual(opened, []);

    list.children = [];
    context.renderFollowups();
    assert.match(list.children[0].innerHTML, /aria-pressed="false"/);
    assert.doesNotMatch(list.children[0].className, /followup-hot/);
    customer.isHot = true;
    list.children = [];
    context.renderFollowups();
    assert.match(list.children[0].innerHTML, /aria-pressed="true"/);
});

test("öncelikli takipler gecikenleri ve saatli bugünkü işleri önce sıralar", () => {
    const makeCustomer = (id, date, time = "") => ({
        id, name: id, nextActionDate: date, nextActionTime: time,
        status: "Bilgilendirildi", insuredPersons: []
    });
    const { context } = makeApp([
        makeCustomer("saat-yok", "2026-09-20"),
        makeCustomer("yarin", "2026-09-21", "08:00"),
        makeCustomer("geciken", "2026-09-18", "17:00"),
        makeCustomer("gec", "2026-09-20", "15:00"),
        makeCustomer("erken", "2026-09-20", "09:00")
    ]);
    assert.deepEqual(Array.from(context.getFollowupCustomers(), item => item.id),
        ["geciken", "erken", "gec", "saat-yok"]);
});

test("erteleme ve tamamlama hatırlatıcıları temizler, geçmişi korur", () => {
    const customer = {
        id: "c1", name: "Ayşe", status: "Bilgilendirildi",
        nextActionDate: "2026-09-20", nextActionTime: "10:00",
        reminderSnoozedUntil: "2026-09-20T11:00:00",
        reminderDismissed: true,
        additionalReminderTimes: [{ id: "r1", time: "12:00" }],
        followupHistory: []
    };
    const { context, elements, saved } = makeApp([customer]);
    elements.followupActionDate.value = "2026-09-22";
    elements.followupActionTime.value = "14:00";
    elements.followupActionNote.value = "Tekrar aranacak";
    vm.runInContext(
        'pendingFollowupAction = { customerId: "c1", mode: "defer", date: "2026-09-20" }',
        context);
    context.submitFollowupAction({ preventDefault() {} });
    assert.equal(customer.nextActionDate, "2026-09-22");
    assert.equal(customer.nextActionTime, "14:00");
    assert.equal(customer.reminderSnoozedUntil, null);
    assert.equal(customer.reminderDismissed, false);
    assert.equal(customer.additionalReminderTimes.length, 0);
    assert.equal(customer.followupHistory[0].kind, "deferred");
    assert.ok(saved().includes("Tekrar aranacak"));

    elements.followupActionNote.value = "Tamamlandı";
    vm.runInContext(
        'pendingFollowupAction = { customerId: "c1", mode: "complete", date: "2026-09-22" }',
        context);
    context.submitFollowupAction({ preventDefault() {} });
    assert.equal(customer.nextActionDate, "");
    assert.equal(customer.nextActionTime, "");
    assert.equal(customer.followupHistory.length, 2);
    assert.equal(customer.followupHistory[1].kind, "completed");
});

test("görüşme eklerken yeni takip aynı işlemde kaydedilir", () => {
    const customer = {
        id: "c1", name: "Ayşe", status: "Bilgilendirildi",
        nextActionDate: "2026-09-20", nextActionTime: "10:00",
        additionalReminderTimes: [{ id: "r1", time: "12:00" }],
        interactions: [], followupHistory: []
    };
    const { context, elements, saved } = makeApp([customer]);
    context.setupInteractionEvents();
    context.openInteractionModalForCustomer(customer);
    elements.interactionType.value = "Arama";
    elements.interactionNote.value = "Teklifi değerlendirecek";
    elements.interactionFollowupOutcome.value = "reschedule";
    elements.interactionNextActionDate.value = "2026-09-25";
    elements.interactionNextActionTime.value = "11:30";
    elements.interactionForm.handlers.submit({ preventDefault() {} });
    assert.equal(customer.interactions.length, 1);
    assert.equal(customer.nextActionDate, "2026-09-25");
    assert.equal(customer.nextActionTime, "11:30");
    assert.equal(customer.additionalReminderTimes.length, 0);
    assert.equal(customer.followupHistory[0].kind, "contact_rescheduled");
    assert.ok(saved().includes("Teklifi değerlendirecek"));

    context.openInteractionModalForCustomer(customer);
    elements.interactionType.value = "Arama";
    elements.interactionNote.value = "Teklifi kabul etti";
    elements.interactionFollowupOutcome.value = "complete";
    context.updateInteractionFollowupFields();
    elements.interactionForm.handlers.submit({ preventDefault() {} });
    assert.equal(customer.nextActionDate, "");
    assert.equal(customer.followupHistory[1].kind, "contact_completed");
    assert.equal(customer.interactions.length, 2);
});

test("müşteri detayındaki görüşme ekle de aynı takip seçeneklerini açar", () => {
    const customer = {
        id: "c2", name: "Veli", status: "Bilgilendirildi",
        nextActionDate: "2026-09-22", nextActionTime: "09:00",
        interactions: [], followupHistory: []
    };
    const { context, elements } = makeApp([customer]);
    context.setupInteractionEvents();
    context.selectedCustomerId = "c2";
    elements.addInteractionButton.handlers.click();
    assert.equal(elements.interactionFollowupPanel.hidden, false);
    assert.equal(elements.interactionFollowupOutcome.value, "reschedule");
    assert.equal(elements.interactionNextActionFields.hidden, false);
    assert.equal(elements.interactionNextActionDate.required, true);

    elements.interactionFollowupOutcome.value = "keep";
    context.updateInteractionFollowupFields();
    elements.interactionType.value = "Arama";
    elements.interactionNote.value = "Bilgi verildi";
    elements.interactionForm.handlers.submit({ preventDefault() {} });
    assert.equal(customer.interactions.length, 1);
    assert.equal(customer.nextActionDate, "2026-09-22");
    assert.equal(customer.followupHistory.length, 0);
});
