/* Saatli takip hatırlatıcıları yalnızca CRM sayfası açıkken görünür. */
let lastReminderSignature = "";
let lastDueSoundKeys = new Set();
let reminderNotificationsEnabled = localStorage.getItem("sorbi_reminder_notifications_enabled") !== "false";
let reminderSoundEnabled = localStorage.getItem("sorbi_reminder_sound_enabled") !== "false";
const savedReminderVolume = localStorage.getItem("sorbi_reminder_sound_volume");
let reminderSoundVolume = savedReminderVolume !== null && Number.isFinite(Number(savedReminderVolume))
    ? Math.min(100, Math.max(0, Number(savedReminderVolume)))
    : 60;
const REMINDER_SOUND_PRESETS = {
    classic: { type: "sine", notes: [660, 880], spacing: 0.22, duration: 0.19, peak: 0.2 },
    chime: { type: "triangle", notes: [523.25, 659.25, 783.99], spacing: 0.16, duration: 0.32, peak: 0.13 }
};
const savedReminderSoundChoice = localStorage.getItem("sorbi_reminder_sound_choice");
let reminderSoundChoice = Object.hasOwn(REMINDER_SOUND_PRESETS, savedReminderSoundChoice)
    ? savedReminderSoundChoice : "classic";
const savedReminderSoundRepeats = Number(localStorage.getItem("sorbi_reminder_sound_repeats"));
let reminderSoundRepeats = Number.isInteger(savedReminderSoundRepeats) &&
    savedReminderSoundRepeats >= 1 && savedReminderSoundRepeats <= 5
    ? savedReminderSoundRepeats : 1;
let reminderAudioContext = null;

function updateReminderSettingsControls() {
    $("notificationsEnabled").checked = reminderNotificationsEnabled;
    $("reminderSoundEnabled").checked = reminderSoundEnabled;
    $("reminderSoundChoice").value = reminderSoundChoice;
    $("reminderSoundChoice").disabled = !reminderSoundEnabled;
    $("reminderSoundRepeats").value = String(reminderSoundRepeats);
    $("reminderSoundRepeats").disabled = !reminderSoundEnabled;
    $("reminderSoundVolume").value = reminderSoundVolume;
    $("reminderSoundVolumeValue").textContent = `${reminderSoundVolume}%`;
    $("previewReminderSound").disabled = !reminderSoundEnabled || reminderSoundVolume === 0;
}

function getReminderAudioContext() {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;
    if (!reminderAudioContext) reminderAudioContext = new AudioContextClass();
    return reminderAudioContext;
}

async function playReminderSound() {
    if (!reminderSoundEnabled || reminderSoundVolume === 0) return false;
    try {
        const context = getReminderAudioContext();
        if (!context) return false;
        if (context.state !== "running") await context.resume();
        if (context.state !== "running") return false;

        const start = context.currentTime + 0.02;
        const preset = REMINDER_SOUND_PRESETS[reminderSoundChoice];
        const cycleLength = (preset.notes.length - 1) * preset.spacing + preset.duration + 0.36;
        for (let repeat = 0; repeat < reminderSoundRepeats; repeat++) {
          preset.notes.forEach((frequency, index) => {
            const oscillator = context.createOscillator();
            const volume = context.createGain();
            const noteStart = start + repeat * cycleLength + index * preset.spacing;
            oscillator.type = preset.type;
            oscillator.frequency.value = frequency;
            volume.gain.setValueAtTime(0.0001, noteStart);
            volume.gain.exponentialRampToValueAtTime(
                preset.peak * reminderSoundVolume / 100,
                noteStart + 0.025
            );
            volume.gain.exponentialRampToValueAtTime(0.0001, noteStart + preset.duration - 0.01);
            oscillator.connect(volume);
            volume.connect(context.destination);
            oscillator.start(noteStart);
            oscillator.stop(noteStart + preset.duration);
          });
        }
        return true;
    } catch (error) {
        // Tarayıcı kullanıcı etkileşimi olmadan sesi engelleyebilir; görsel bildirim sürer.
        return false;
    }
}

function unlockReminderAudio() {
    if (!reminderNotificationsEnabled || !reminderSoundEnabled || reminderSoundVolume === 0) return;
    try {
        const context = getReminderAudioContext();
        if (context && context.state !== "running") {
            context.resume().catch(() => {});
        }
    } catch (error) {
        // Ses desteği yoksa hatırlatıcı sessiz biçimde çalışır.
    }
}

function getCustomerReminderEntries(customer) {
    const entries = [];
    if (customer.nextActionTime) {
        entries.push({
            id: "primary",
            order: 1,
            time: customer.nextActionTime,
            snoozedUntil: customer.reminderSnoozedUntil || null,
            dismissed: customer.reminderDismissed === true
        });
    }
    (customer.additionalReminderTimes || []).forEach((reminder, index) => {
        if (reminder.time) {
            entries.push({
                id: reminder.id,
                order: index + 2,
                time: reminder.time,
                snoozedUntil: reminder.snoozedUntil || null,
                dismissed: reminder.dismissed === true
            });
        }
    });
    return entries;
}

function getReminderStateText(dismissed, snoozedUntil) {
    if (dismissed) return "Bu hatırlatma sonlandırıldı. Saati değiştirirseniz yeniden etkinleşir.";
    if (snoozedUntil && !Number.isNaN(new Date(snoozedUntil).getTime())) {
        return `Ertelendi · yeni bildirim: ${formatDateTime(snoozedUntil)}`;
    }
    return "";
}

function getReminderDueAt(customer, reminder) {
    const date = customer.nextActionDate || "";
    const time = reminder.time || "";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) ||
        !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) {
        return null;
    }

    const [year, month, day] = date.split("-").map(Number);
    const [hour, minute] = time.split(":").map(Number);
    const scheduled = new Date(year, month - 1, day, hour, minute);
    if (scheduled.getFullYear() !== year ||
        scheduled.getMonth() !== month - 1 ||
        scheduled.getDate() !== day) {
        return null;
    }

    const snoozed = reminder.snoozedUntil
        ? new Date(reminder.snoozedUntil)
        : null;
    return snoozed && !Number.isNaN(snoozed.getTime())
        ? snoozed.getTime()
        : scheduled.getTime();
}

function getCustomerReminderSummary(customer, compact = false) {
    if (!customer.nextActionDate) return "-";
    const entries = getCustomerReminderEntries(customer);
    const dateText = compact
        ? formatDateOnly(customer.nextActionDate).slice(0, 5)
        : formatDateOnly(customer.nextActionDate);
    if (!entries.length) return dateText;

    const active = entries
        .filter(reminder => !reminder.dismissed)
        .map(reminder => ({ reminder, dueAt: getReminderDueAt(customer, reminder) }))
        .filter(item => item.dueAt !== null)
        .sort((a, b) => a.dueAt - b.dueAt);
    if (!active.length) {
        return `${dateText} · ${compact ? "sonlandırıldı" : "Hatırlatıcılar sonlandırıldı"}`;
    }

    const next = active[0];
    const dueDate = new Date(next.dueAt);
    const compactTime = `${String(dueDate.getDate()).padStart(2, "0")}.${String(dueDate.getMonth() + 1).padStart(2, "0")} ${String(dueDate.getHours()).padStart(2, "0")}:${String(dueDate.getMinutes()).padStart(2, "0")}`;
    const extra = active.length > 1
        ? compact ? ` · +${active.length - 1}` : ` · ${active.length} aktif saat`
        : "";
    return `${compact ? compactTime : formatDateTime(next.dueAt)}${next.reminder.snoozedUntil ? compact ? " (ert.)" : " (ertelendi)" : ""}${extra}`;
}

function checkReminders() {
    const host = $("reminderNotifications");
    if (!host) return;
    if (!reminderNotificationsEnabled) {
        host.replaceChildren();
        lastReminderSignature = "";
        lastDueSoundKeys = new Set();
        return;
    }

    const now = Date.now();
    const due = [];
    customers.forEach(customer => {
        if (!customerHasActiveFollowup(customer)) return;
        getCustomerReminderEntries(customer).forEach(reminder => {
            if (reminder.dismissed) return;
            const dueAt = getReminderDueAt(customer, reminder);
            if (dueAt !== null && dueAt <= now) {
                due.push({ customer, reminder, dueAt });
            }
        });
    });
    due.sort((a, b) => a.dueAt - b.dueAt);

    const dueSoundKeys = new Set(due.map(({ customer, reminder }) => [
        customer.id, reminder.id, customer.nextActionDate,
        reminder.time, reminder.snoozedUntil || ""
    ].join("|")));
    if ([...dueSoundKeys].some(key => !lastDueSoundKeys.has(key))) {
        void playReminderSound();
    }
    lastDueSoundKeys = dueSoundKeys;

    const signature = JSON.stringify(due.map(({ customer, reminder, dueAt }) => [
        customer.id, customer.name, reminder.id, reminder.time, dueAt
    ]));
    if (signature === lastReminderSignature) return;
    lastReminderSignature = signature;

    host.innerHTML = due.map(({ customer, reminder, dueAt }) => `
        <div class="reminder-card" role="status">
            <div class="reminder-card-heading">
                <span class="reminder-icon" aria-hidden="true">⏰</span>
                <div>
                    <strong>${escapeHTML(customer.name || "Müşteri")}</strong>
                    <span>Takip hatırlatması</span>
                </div>
            </div>
            <p>${reminder.order}. hatırlatma · ${escapeHTML(formatDateTime(dueAt))}${reminder.snoozedUntil ? ` <span class="reminder-snoozed-label">(ertelendi; ilk saat ${escapeHTML(reminder.time)})</span>` : ""}</p>
            <div class="reminder-actions">
                <button type="button" class="secondary-button reminder-open-button" data-reminder-action="view" data-id="${escapeHTML(customer.id)}">Müşteriye Git</button>
                <button type="button" class="secondary-button" data-reminder-action="snooze" data-id="${escapeHTML(customer.id)}" data-reminder-id="${escapeHTML(reminder.id)}">5 dk ertele</button>
                <button type="button" class="primary-button" data-reminder-action="dismiss" data-id="${escapeHTML(customer.id)}" data-reminder-id="${escapeHTML(reminder.id)}">Sonlandır</button>
            </div>
        </div>
    `).join("");
}

function setupReminderNotifications() {
    updateReminderSettingsControls();
    let currentSettingsView = "home";
    const showSettingsView = view => {
        currentSettingsView = view;
        $("settingsHomeView").hidden = view !== "home";
        $("settingsSoundView").hidden = view !== "sound";
        $("settingsNotificationView").hidden = view !== "notifications";
        $("backToSettings").hidden = view === "home";
        $("settingsTitle").textContent = view === "sound" ? "Ses Ayarları"
            : view === "notifications" ? "Bildirimler" : "Ayarlar";
    };
    const closeSettings = () => {
        $("settingsModal").classList.remove("show");
        showSettingsView("home");
        $("settingsButton").focus();
    };
    $("settingsButton")?.addEventListener("click", () => {
        showSettingsView("home");
        $("settingsModal").classList.add("show");
        $("closeSettings").focus();
    });
    $("openSoundSettings")?.addEventListener("click", () => {
        showSettingsView("sound");
        $("backToSettings").focus();
    });
    $("openNotificationSettings")?.addEventListener("click", () => {
        showSettingsView("notifications");
        $("backToSettings").focus();
    });
    $("backToSettings")?.addEventListener("click", () => {
        const returnButton = currentSettingsView === "sound"
            ? $("openSoundSettings") : $("openNotificationSettings");
        showSettingsView("home");
        returnButton.focus();
    });
    $("closeSettings")?.addEventListener("click", closeSettings);
    $("settingsModal")?.addEventListener("click", event => {
        if (event.target === $("settingsModal")) closeSettings();
    });
    document.addEventListener("keydown", event => {
        if (event.key === "Escape" && $("settingsModal").classList.contains("show")) closeSettings();
    });

    $("notificationsEnabled")?.addEventListener("change", event => {
        reminderNotificationsEnabled = event.target.checked;
        localStorage.setItem("sorbi_reminder_notifications_enabled", String(reminderNotificationsEnabled));
        checkReminders();
    });
    $("reminderSoundEnabled")?.addEventListener("change", event => {
        reminderSoundEnabled = event.target.checked;
        localStorage.setItem("sorbi_reminder_sound_enabled", String(reminderSoundEnabled));
        updateReminderSettingsControls();
    });
    $("reminderSoundChoice")?.addEventListener("change", event => {
        reminderSoundChoice = Object.hasOwn(REMINDER_SOUND_PRESETS, event.target.value)
            ? event.target.value : "classic";
        localStorage.setItem("sorbi_reminder_sound_choice", reminderSoundChoice);
        updateReminderSettingsControls();
        void playReminderSound();
    });
    $("reminderSoundRepeats")?.addEventListener("change", event => {
        const value = Number(event.target.value);
        reminderSoundRepeats = Number.isInteger(value) && value >= 1 && value <= 5 ? value : 1;
        localStorage.setItem("sorbi_reminder_sound_repeats", String(reminderSoundRepeats));
        updateReminderSettingsControls();
    });
    $("reminderSoundVolume")?.addEventListener("input", event => {
        reminderSoundVolume = Number(event.target.value);
        localStorage.setItem("sorbi_reminder_sound_volume", String(reminderSoundVolume));
        updateReminderSettingsControls();
    });
    $("previewReminderSound")?.addEventListener("click", () => void playReminderSound());

    document.addEventListener("pointerdown", unlockReminderAudio, { capture: true });
    document.addEventListener("keydown", unlockReminderAudio, { capture: true });

    $("reminderNotifications")?.addEventListener("click", event => {
        const button = event.target.closest("[data-reminder-action]");
        if (!button) return;
        const customer = customers.find(item => item.id === button.dataset.id);
        if (!customer) return;

        if (button.dataset.reminderAction === "view") {
            switchPage("customers");
            openCustomerDetail(customer.id);
            return;
        }

        const reminderId = button.dataset.reminderId;
        const additional = reminderId === "primary" ? null :
            (customer.additionalReminderTimes || []).find(item => item.id === reminderId);
        if (reminderId !== "primary" && !additional) return;

        if (button.dataset.reminderAction === "snooze") {
            const until = new Date(Date.now() + 5 * 60 * 1000).toISOString();
            if (additional) additional.snoozedUntil = until;
            else customer.reminderSnoozedUntil = until;
        } else if (button.dataset.reminderAction === "dismiss") {
            if (additional) {
                additional.dismissed = true;
                additional.snoozedUntil = null;
            } else {
                customer.reminderDismissed = true;
                customer.reminderSnoozedUntil = null;
            }
        } else {
            return;
        }

        customer.updatedAt = new Date().toISOString();
        saveLocalData();
        renderAll();
        if (selectedCustomerId === customer.id && detailOverlay.classList.contains("show")) {
            openCustomerDetail(customer.id);
        }
        if (customerModal.classList.contains("show") && $("customerId").value === customer.id) {
            refreshReminderFormState(customer);
        }
    });

    window.setInterval(checkReminders, 5000);
    window.addEventListener("focus", checkReminders);
    document.addEventListener("visibilitychange", () => {
        if (!document.hidden) checkReminders();
    });
}
