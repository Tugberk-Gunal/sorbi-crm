const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const reminderSource = fs.readFileSync(
    path.join(root, "assets/js/features/reminders.js"), "utf8"
);
const helperSource = fs.readFileSync(
    path.join(root, "assets/js/core/helpers.js"), "utf8"
);

function makeElement() {
    return {
        innerHTML: "",
        value: "",
        checked: false,
        textContent: "",
        handlers: {},
        classList: { add() {}, remove() {}, contains() { return false; } },
        addEventListener(name, handler) { this.handlers[name] = handler; },
        setAttribute() {},
        focus() {},
        replaceChildren() { this.innerHTML = ""; }
    };
}

function makeApp(customer, initialTime, options = {}) {
    let clock = initialTime;
    let saved = "";
    const navigation = [];
    class ClockDate extends Date {
        static now() { return clock; }
    }
    const elements = Object.fromEntries([
        "reminderNotifications", "settingsButton", "settingsModal", "closeSettings",
        "settingsHomeView", "settingsSoundView", "settingsNotificationView", "settingsTitle",
        "openSoundSettings", "openNotificationSettings", "backToSettings",
        "notificationsEnabled", "reminderSoundEnabled", "reminderSoundChoice", "reminderSoundRepeats", "reminderSoundVolume",
        "reminderSoundVolumeValue", "previewReminderSound", "customerId"
    ].map(id => [id, makeElement()]));
    const context = {
        Date: ClockDate,
        customers: [customer],
        localStorage: {
            getItem: key => options.storage && Object.hasOwn(options.storage, key)
                ? options.storage[key] : key === "sorbi_reminder_sound_enabled" ? "false" : null,
            setItem(key, value) { if (options.storage) options.storage[key] = value; }
        },
        window: { setInterval() {}, addEventListener() {}, AudioContext: options.AudioContext },
        document: { addEventListener() {}, hidden: false },
        $: id => elements[id],
        escapeHTML: value => String(value),
        formatDateOnly: value => value,
        formatDateTime: value => {
            const date = new Date(value);
            return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
        },
        selectedCustomerId: null,
        detailOverlay: makeElement(),
        customerModal: makeElement(),
        switchPage(page) { navigation.push({ page }); },
        openCustomerDetail(id) { navigation.push({ customerId: id }); },
        saveLocalData() { saved = JSON.stringify(context.customers); },
        renderAll() { context.checkReminders(); }
    };
    vm.createContext(context);
    vm.runInContext(helperSource, context);
    vm.runInContext(reminderSource, context);
    context.setupReminderNotifications();
    return {
        context,
        elements,
        advance(minutes) { clock += minutes * 60_000; },
        saved() { return saved; },
        navigation,
        act(action, reminderId) {
            elements.reminderNotifications.handlers.click({
                target: { closest: () => ({ dataset: {
                    reminderAction: action,
                    reminderId,
                    id: customer.id
                } }) }
            });
        }
    };
}

test("bildirimden müşteriye gitmek detayı açar, hatırlatmayı değiştirmez", () => {
    const start = new Date(2026, 8, 19, 12, 0).getTime();
    const customer = {
        id: "customer-view", name: "Test Müşteri", status: "Bilgilendirildi",
        nextActionDate: "2026-09-19", nextActionTime: "11:59",
        reminderDismissed: false
    };
    const app = makeApp(customer, start);
    app.context.checkReminders();
    assert.match(app.elements.reminderNotifications.innerHTML, /Müşteriye Git/);
    assert.match(app.elements.reminderNotifications.innerHTML,
        /<strong>Test Müşteri<\/strong>\s*<span>Takip hatırlatması<\/span>/);
    app.act("view", undefined);
    assert.deepEqual(app.navigation, [
        { page: "customers" }, { customerId: "customer-view" }
    ]);
    assert.equal(customer.reminderDismissed, false);
    assert.equal(customer.reminderSnoozedUntil, undefined);
    assert.equal(app.saved(), "");
    assert.match(app.elements.reminderNotifications.innerHTML, /Müşteriye Git/);
});

test("ek saatler bağımsız çalar; erteleme görünen sonraki saati değiştirir", () => {
    const start = new Date(2026, 8, 19, 12, 0).getTime();
    const customer = {
        id: "customer-1",
        name: "Test Müşteri",
        status: "Bilgilendirildi",
        nextActionDate: "2026-09-19",
        nextActionTime: "11:59",
        reminderDismissed: false,
        additionalReminderTimes: [
            { id: "second", time: "12:00", dismissed: false },
            { id: "third", time: "12:01", dismissed: false }
        ]
    };
    const app = makeApp(customer, start);
    const host = app.elements.reminderNotifications;
    app.context.checkReminders();
    assert.equal((host.innerHTML.match(/class="reminder-card"/g) || []).length, 2);

    app.act("snooze", "primary");
    assert.equal((host.innerHTML.match(/class="reminder-card"/g) || []).length, 1);
    assert.match(app.context.getCustomerReminderSummary(customer), /12:00/);
    assert.match(app.context.getReminderStateText(false, customer.reminderSnoozedUntil), /12:05/);

    app.act("dismiss", "second");
    assert.equal(host.innerHTML, "");
    assert.match(app.context.getCustomerReminderSummary(customer), /12:01/);

    app.advance(2);
    app.context.checkReminders();
    assert.match(host.innerHTML, /3\. hatırlatma/);
    app.act("dismiss", "third");
    assert.equal(host.innerHTML, "");
    assert.match(app.context.getCustomerReminderSummary(customer), /12:05.*ertelendi/);

    app.advance(4);
    app.context.checkReminders();
    assert.match(host.innerHTML, /1\. hatırlatma/);
    app.act("dismiss", "primary");
    assert.equal(host.innerHTML, "");
    assert.match(app.context.getCustomerReminderSummary(customer), /sonlandırıldı/);
    assert.equal(JSON.parse(app.saved())[0].additionalReminderTimes[1].dismissed, true);
});

test("eski tek saatli kayıtlar ek saat olmadan çalışır", () => {
    const start = new Date(2026, 8, 19, 12, 0).getTime();
    const customer = {
        id: "legacy", name: "Eski Kayıt", status: "Bilgilendirildi",
        nextActionDate: "2026-09-19", nextActionTime: "12:00"
    };
    const app = makeApp(customer, start);
    app.context.checkReminders();
    assert.match(app.elements.reminderNotifications.innerHTML, /1\. hatırlatma/);
    app.act("dismiss", "primary");
    assert.equal(app.elements.reminderNotifications.innerHTML, "");
});

test("bildirim sesi seçimi saklanır; önizleme seçilen farklı melodiyi çalar", async () => {
    const notes = [];
    class AudioContext {
        state = "running";
        currentTime = 0;
        destination = {};
        createOscillator() {
            const note = { frequency: { value: 0 }, type: "", connect() {},
                start(at) { notes.push({ frequency: note.frequency.value, type: note.type, at }); }, stop() {} };
            return note;
        }
        createGain() {
            return { gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {} };
        }
    }
    const storage = { sorbi_reminder_sound_enabled: "true" };
    const app = makeApp({ id: "c1" }, Date.now(), { storage, AudioContext });
    assert.equal(app.elements.reminderSoundChoice.value, "classic");
    await app.context.playReminderSound();
    assert.deepEqual(notes.map(note => note.frequency), [660, 880]);

    notes.length = 0;
    app.elements.reminderSoundChoice.handlers.change({ target: { value: "chime" } });
    assert.equal(storage.sorbi_reminder_sound_choice, "chime");
    assert.deepEqual(notes.map(note => note.frequency), [523.25, 659.25, 783.99]);
    assert.ok(notes.every(note => note.type === "triangle"));

    const reopened = makeApp({ id: "c2" }, Date.now(), { storage, AudioContext });
    assert.equal(reopened.elements.reminderSoundChoice.value, "chime");
    assert.equal(reopened.elements.reminderSoundRepeats.value, "1");
    assert.match(fs.readFileSync(path.join(root, "index.html"), "utf8"),
        /id="reminderSoundChoice"[\s\S]*value="classic"[\s\S]*value="chime"/);
});

test("ses ayarları alt ekranı ve tekrar sayısı kalıcı çalışır", async () => {
    const notes = [];
    class AudioContext {
        state = "running";
        currentTime = 0;
        destination = {};
        createOscillator() {
            const note = { type: "", frequency: { value: 0 }, connect() {},
                start(at) { notes.push({ at, frequency: note.frequency.value }); }, stop() {} };
            return note;
        }
        createGain() {
            return { gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {} };
        }
    }
    const storage = { sorbi_reminder_sound_enabled: "true",
        sorbi_reminder_sound_choice: "chime" };
    const app = makeApp({ id: "c3" }, Date.now(), { storage, AudioContext });
    const el = app.elements;
    el.settingsButton.handlers.click();
    assert.equal(el.settingsHomeView.hidden, false);
    assert.equal(el.settingsSoundView.hidden, true);
    assert.equal(el.settingsNotificationView.hidden, true);
    el.openSoundSettings.handlers.click();
    assert.equal(el.settingsHomeView.hidden, true);
    assert.equal(el.settingsSoundView.hidden, false);
    assert.equal(el.settingsNotificationView.hidden, true);
    assert.equal(el.settingsTitle.textContent, "Ses Ayarları");

    el.reminderSoundRepeats.handlers.change({ target: { value: "3" } });
    assert.equal(storage.sorbi_reminder_sound_repeats, "3");
    await app.context.playReminderSound();
    assert.equal(notes.length, 9);
    assert.equal(notes[0].frequency, notes[3].frequency);
    assert.ok(notes[3].at > notes[2].at);
    assert.ok(notes[6].at > notes[5].at);

    el.backToSettings.handlers.click();
    assert.equal(el.settingsHomeView.hidden, false);
    assert.equal(el.settingsSoundView.hidden, true);
    const reopened = makeApp({ id: "c4" }, Date.now(), { storage, AudioContext });
    assert.equal(reopened.elements.reminderSoundRepeats.value, "3");
    reopened.elements.reminderSoundEnabled.handlers.change({ target: { checked: false } });
    assert.equal(reopened.elements.reminderSoundRepeats.disabled, true);
    assert.equal(reopened.elements.previewReminderSound.disabled, true);
});

test("ayarlar ana ekranında yalnızca iki kategori vardır; bildirim anahtarı alt ekrandadır", () => {
    const storage = {};
    const app = makeApp({ id: "settings-test" }, Date.now(), { storage });
    const el = app.elements;
    const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
    const home = html.match(/<div id="settingsHomeView"[\s\S]*?<\/div>/)?.[0] || "";
    assert.match(home, /openSoundSettings/);
    assert.match(home, /openNotificationSettings/);
    assert.doesNotMatch(home, /notificationsEnabled|reminderSoundEnabled/);

    el.settingsButton.handlers.click();
    assert.equal(el.settingsNotificationView.hidden, true);
    el.openNotificationSettings.handlers.click();
    assert.equal(el.settingsTitle.textContent, "Bildirimler");
    assert.equal(el.settingsHomeView.hidden, true);
    assert.equal(el.settingsNotificationView.hidden, false);
    assert.equal(el.settingsSoundView.hidden, true);
    el.notificationsEnabled.handlers.change({ target: { checked: false } });
    assert.equal(storage.sorbi_reminder_notifications_enabled, "false");
    el.backToSettings.handlers.click();
    assert.equal(el.settingsHomeView.hidden, false);
    assert.equal(el.settingsNotificationView.hidden, true);
    el.closeSettings.handlers.click();
    el.settingsButton.handlers.click();
    assert.equal(el.settingsHomeView.hidden, false);
    assert.equal(el.settingsTitle.textContent, "Ayarlar");
});

