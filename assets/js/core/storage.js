/* =========================================================
   STORAGE
   LocalStorage geçiş katmanı. Backend'e taşınırken sadece bu
   dosya ve integration katmanı değiştirilir.
========================================================= */

const STORAGE_KEYS = {
    customers: "sorbi_customers",
    renewals: "sorbi_renewals"
};
const blockedStorageBackups = new Map();

function blockUnreadableStorage(key, backup, message) {
    blockedStorageBackups.set(key, backup);
    showStorageFailure(key, message, backup);
}

function isStorageBlocked(key) {
    return blockedStorageBackups.has(key);
}

function clearStorageFailure(key) {
    if (typeof document === "undefined") return;
    const banner = document.getElementById("storageFailureBanner");
    if (banner?.dataset.storageKey === key) banner.remove();
}

function showStorageFailure(key, message, backup) {
    if (typeof document === "undefined") return;
    let banner = document.getElementById("storageFailureBanner");
    if (!banner) {
        banner = document.createElement("div");
        banner.id = "storageFailureBanner";
        banner.className = "storage-failure-banner";
        banner.setAttribute("role", "alert");
        banner.innerHTML = '<span class="storage-failure-message"></span><button type="button">Veriyi indir</button>';
        document.body.appendChild(banner);
    }
    banner.querySelector(".storage-failure-message").textContent = message;
    banner.dataset.storageKey = key;
    const downloadButton = banner.querySelector("button");
    downloadButton.disabled = !backup;
    downloadButton.onclick = () => {
        const blob = new Blob([backup], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${key}-yedek.json`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    };
}

function loadLocalData() {
    let saved = null;
    try {
        saved = localStorage.getItem(STORAGE_KEYS.customers);
    } catch (error) {
        console.error("Müşteri deposuna erişilemedi:", error);
        blockUnreadableStorage(STORAGE_KEYS.customers, "",
            "Müşteri verisine erişilemiyor. Depolama iznini kontrol edin; hiçbir verinin üzerine yazılmadı.");
        return false;
    }

    if (!saved) {
        customers = createDemoCustomers();
        normalizeCustomers();
        return saveLocalData();
    }

    try {
        const parsed = JSON.parse(saved);
        if (!Array.isArray(parsed)) throw new Error("Müşteri verisi dizi değil");
        customers = parsed;
        normalizeCustomers();
        return true;
    } catch (error) {
        console.error("Local müşteri verisi okunamadı:", error);
        customers = [];
        blockUnreadableStorage(STORAGE_KEYS.customers, saved,
            "Müşteri verisi okunamadı. Üzerine yazılmadı; mevcut veriyi indirip kontrol edin.");
        return false;
    }
}

function saveLocalData() {
    if (isStorageBlocked(STORAGE_KEYS.customers)) {
        showStorageFailure(STORAGE_KEYS.customers,
            "Müşteri verisi okunamadığı için üzerine yazma engellendi. Mevcut veriyi indirin.",
            blockedStorageBackups.get(STORAGE_KEYS.customers));
        return false;
    }
    const backup = JSON.stringify(customers);
    try {
        localStorage.setItem(STORAGE_KEYS.customers, backup);
    } catch (error) {
        console.error("Müşteri verisi kaydedilemedi:", error);
        showStorageFailure(STORAGE_KEYS.customers,
            "Değişiklikler kaydedilemedi. Sayfayı kapatmadan veriyi indirin ve depolama alanını kontrol edin.", backup);
        return false;
    }
    clearStorageFailure(STORAGE_KEYS.customers);
    if (typeof publishRiskCustomers === "function") {
        try { publishRiskCustomers(); }
        catch (error) { console.warn("Risk Takip bağlantısı güncellenemedi:", error); }
    }
    return true;
}

function normalizeCustomers() {
    customers = customers.map(customer => {
        const normalizedStatus = STATUS_OPTIONS.includes(customer.status)
            ? customer.status
            : "Bilgilendirildi";

        return {
            ...customer,
            id: customer.id || crypto.randomUUID(),
            name: customer.name || "",
            phone: customer.phone || "",
            tc: customer.tc || "",
            birthDate: customer.birthDate || "",
            product: normalizeProductName(customer.product) || "TSS",
            insuredPersons: Array.isArray(customer.insuredPersons)
                ? customer.insuredPersons.map(person => ({
                      id: person.id || crypto.randomUUID(),
                      name: String(person.name || "").trim(),
                      tc: String(person.tc || "").trim(),
                      birthDate: person.birthDate || "",
                      product: normalizeProductName(person.product) || "TSS",
                      status: STATUS_OPTIONS.includes(person.status)
                          ? person.status : normalizedStatus
                  }))
                : [],
            status: normalizedStatus,
            nextActionDate: customer.nextActionDate || "",
            nextActionTime: /^([01]\d|2[0-3]):[0-5]\d$/.test(customer.nextActionTime || "")
                ? customer.nextActionTime
                : "",
            reminderSnoozedUntil: customer.reminderSnoozedUntil || null,
            reminderDismissed: customer.reminderDismissed === true,
            additionalReminderTimes: Array.isArray(customer.additionalReminderTimes)
                ? customer.additionalReminderTimes
                    .filter(reminder => /^([01]\d|2[0-3]):[0-5]\d$/.test(reminder?.time || ""))
                    .map(reminder => ({
                        id: reminder.id || crypto.randomUUID(),
                        time: reminder.time,
                        snoozedUntil: reminder.snoozedUntil || null,
                        dismissed: reminder.dismissed === true
                    }))
                : [],
            lastCall: customer.lastCall || null,
            createdAt: customer.createdAt || null,
            note: customer.note || "",
            isHot: customer.isHot === true,
            renewalId: customer.renewalId || null,
            avatarColor: isValidAvatarColor(customer.avatarColor)
                ? customer.avatarColor
                : DEFAULT_AVATAR_COLOR,
            interactions: Array.isArray(customer.interactions)
                ? customer.interactions.map(interaction => ({
                      ...interaction,
                      id: interaction.id || crypto.randomUUID()
                  }))
                : [],
            followupHistory: Array.isArray(customer.followupHistory)
                ? customer.followupHistory.map(entry => ({
                      ...entry,
                      id: entry.id || crypto.randomUUID()
                  }))
                : []
        };
    });
}

function loadRenewalData() {
    let saved = null;
    try {
        saved = localStorage.getItem(STORAGE_KEYS.renewals);
    } catch (error) {
        console.error("Yenileme deposuna erişilemedi:", error);
        blockUnreadableStorage(STORAGE_KEYS.renewals, "",
            "Yenileme verisine erişilemiyor. Depolama iznini kontrol edin.");
        return false;
    }

    if (!saved) {
        renewals = [];
        return true;
    }

    try {
        const parsed = JSON.parse(saved);
        if (!Array.isArray(parsed)) throw new Error("Yenileme verisi dizi değil");
        renewals = parsed;
        normalizeRenewals();
        return true;
    } catch (error) {
        console.error("Yenileme verileri okunamadı:", error);
        renewals = [];
        blockUnreadableStorage(STORAGE_KEYS.renewals, saved,
            "Yenileme verisi okunamadı. Üzerine yazılmadı; mevcut veriyi indirin.");
        return false;
    }
}

function saveRenewalData() {
    if (isStorageBlocked(STORAGE_KEYS.renewals)) {
        showStorageFailure(STORAGE_KEYS.renewals,
            "Yenileme verisi okunamadığı için üzerine yazma engellendi. Mevcut veriyi indirin.",
            blockedStorageBackups.get(STORAGE_KEYS.renewals));
        return false;
    }
    const backup = JSON.stringify(renewals);
    try {
        localStorage.setItem(STORAGE_KEYS.renewals, backup);
        clearStorageFailure(STORAGE_KEYS.renewals);
        return true;
    } catch (error) {
        console.error("Yenileme verisi kaydedilemedi:", error);
        showStorageFailure(STORAGE_KEYS.renewals,
            "Yenileme değişiklikleri kaydedilemedi. Sayfayı kapatmadan veriyi indirin.", backup);
        return false;
    }
}

function normalizeRenewals() {
    renewals = renewals.map(renewal => ({
        ...renewal,
        id: renewal.id || crypto.randomUUID(),
        customerId: renewal.customerId || null,
        insuredPersonId: renewal.insuredPersonId || null,
        customerName: renewal.customerName || "",
        customerPhone: renewal.customerPhone || "",
        tc: renewal.tc || "",
        product: normalizeProductName(renewal.product) || "TSS",
        policyNumber: renewal.policyNumber || "",
        startDate: renewal.startDate || "",
        renewalDate: renewal.renewalDate || "",
        status: renewal.status || "Bekliyor",
        note: renewal.note || "",
        createdAt: renewal.createdAt || new Date().toISOString(),
        updatedAt: renewal.updatedAt || null,
        avatarColor: isValidAvatarColor(renewal.avatarColor)
            ? renewal.avatarColor
            : DEFAULT_AVATAR_COLOR
    }));
}
