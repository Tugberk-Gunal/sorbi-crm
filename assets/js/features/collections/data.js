/* =========================================================
   TAHSİLAT TAKİP - STATE / STORAGE / DOMAIN HELPERS
========================================================= */

const COLLECTION_STORAGE_KEY = "sorbi_collections";

let collections = [];
let editingCollectionId = null;
let collectionModuleInitialized = false;

function collectionCreateId() {
    return `collection_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

function collectionToday() {
    return formatDateForInput(new Date());
}

function collectionParseDate(value) {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return null;
    }

    const [year, month, day] = value.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    return date.getFullYear() === year &&
        date.getMonth() === month - 1 &&
        date.getDate() === day ? date : null;
}

function collectionDaysUntil(dateString, todayString = collectionToday()) {
    const due = collectionParseDate(dateString);
    const today = collectionParseDate(todayString);
    if (!due || !today) return null;
    const calendarDay = date => Date.UTC(
        date.getFullYear(), date.getMonth(), date.getDate()
    );
    return Math.round((calendarDay(due) - calendarDay(today)) / 86400000);
}

function getCollectionCountdown(collection, todayString = collectionToday()) {
    if (getCollectionStatus(collection, todayString) === "completed") {
        return { text: "Tamamlandı", tone: "completed" };
    }
    const days = collectionDaysUntil(collection?.nextPaymentDate, todayString);
    if (days === null) return { text: "Tarih yok", tone: "undated" };
    if (days < 0) return { text: `${Math.abs(days)} gün gecikti`, tone: "overdue" };
    if (days === 0) return { text: "Bugün", tone: "today" };
    if (days === 1) return { text: "Yarın", tone: "upcoming" };
    return { text: `${days} gün kaldı`, tone: "upcoming" };
}

function collectionFormatDate(value) {
    const date = collectionParseDate(value);

    if (!date) {
        return "—";
    }

    return date.toLocaleDateString("tr-TR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
    });
}

function collectionEscape(value) {
    return escapeHTML(value);
}

function addMonthsToDate(dateString, months) {
    const date = collectionParseDate(dateString);

    if (!date) {
        return dateString;
    }

    const originalDay = date.getDate();
    date.setDate(1);
    date.setMonth(date.getMonth() + months);

    const lastDay = new Date(
        date.getFullYear(),
        date.getMonth() + 1,
        0
    ).getDate();

    date.setDate(Math.min(originalDay, lastDay));
    return formatDateForInput(date);
}

function findCustomerForCollectionRecord(record) {
    if (!record || !Array.isArray(customers)) {
        return null;
    }

    const name = normalizeIdentityText(
        record.customerName || record.customer || record.name
    );
    const phone = normalizePhone(
        record.phone || record.customerPhone || record.telephone
    );
    const tc = String(record.tc || record.customerTc || "").trim();

    if (tc) {
        const matches = customers.filter(customer =>
            getCustomerInsuredPersons(customer)
                .some(person => String(person.tc || "") === tc));
        return matches.length === 1 ? matches[0] : null;
    }
    if (!name || !phone) return null;
    const matches = customers.filter(customer =>
        normalizeIdentityText(customer.name) === name &&
        normalizePhone(customer.phone) === phone);
    return matches.length === 1 ? matches[0] : null;
}

function resolveCollectionCustomerForEdit(previous, identity) {
    const unchanged = previous &&
        normalizeIdentityText(identity.customerName) === normalizeIdentityText(previous.customerName) &&
        normalizePhone(identity.phone) === normalizePhone(previous.phone) &&
        String(identity.tc || "").trim() === String(previous.tc || "").trim();
    return (unchanged && previous.customerId && customers.find(customer =>
        String(customer.id) === String(previous.customerId))) ||
        findCustomerForCollectionRecord(identity);
}

function normalizeCollections() {
    collections = collections.map(item => {
        const linkedCustomer = (item.customerId && customers.find(customer =>
            String(customer.id) === String(item.customerId))) ||
            findCustomerForCollectionRecord(item);

        return {
            ...item,
            id: item.id || collectionCreateId(),
            customerId: linkedCustomer?.id || null,
            customerName:
                item.customerName || item.customer || item.name || linkedCustomer?.name || "",
            phone:
                item.phone || item.customerPhone || item.telephone || linkedCustomer?.phone || "",
            tc:
                item.tc || item.customerTc || linkedCustomer?.tc || "",
            product: normalizeProductName(item.product || linkedCustomer?.product) || "TSS",
            policyNumber: item.policyNumber || item.policyNo || item.policy || "",
            installmentCount: Number(item.installmentCount || 1),
            currentInstallment: Number(item.currentInstallment || 1),
            installmentAmount:
                item.installmentAmount === null || item.installmentAmount === ""
                    ? null
                    : Number(item.installmentAmount),
            firstPaymentDate: item.firstPaymentDate || item.nextPaymentDate || collectionToday(),
            billingAnchorDate: item.billingAnchorDate || item.firstPaymentDate ||
                item.nextPaymentDate || collectionToday(),
            billingAnchorInstallment: Number(item.billingAnchorInstallment ||
                (Number(item.currentInstallment || 1) > 1 &&
                item.firstPaymentDate === item.nextPaymentDate
                    ? item.currentInstallment : 1)),
            nextPaymentDate: item.nextPaymentDate || null,
            paymentMethod: item.paymentMethod || "unblocked",
            note: item.note || "",
            status: item.status || "pending",
            createdAt: item.createdAt || collectionToday(),
            avatarColor: isValidAvatarColor(item.avatarColor)
                ? item.avatarColor
                : linkedCustomer?.avatarColor || DEFAULT_AVATAR_COLOR
        };
    });
}

function loadCollectionData() {
    let saved = null;
    try {
        saved = localStorage.getItem(COLLECTION_STORAGE_KEY);

        if (!saved) {
            collections = [];
            return true;
        }

        const parsed = JSON.parse(saved);
        if (!Array.isArray(parsed)) throw new Error("Tahsilat verisi dizi değil");
        collections = parsed;
        normalizeCollections();
        return true;
    } catch (error) {
        console.error("Tahsilat verileri yüklenemedi:", error);
        collections = [];
        blockUnreadableStorage(COLLECTION_STORAGE_KEY, saved || "",
            "Tahsilat verisi okunamadı. Üzerine yazılmadı; mevcut veriyi indirin.");
        return false;
    }
}

function saveCollectionData() {
    if (isStorageBlocked(COLLECTION_STORAGE_KEY)) {
        showStorageFailure(COLLECTION_STORAGE_KEY,
            "Tahsilat verisi okunamadığı için üzerine yazma engellendi. Mevcut veriyi indirin.",
            blockedStorageBackups.get(COLLECTION_STORAGE_KEY));
        return false;
    }
    const backup = JSON.stringify(collections);
    try {
        localStorage.setItem(COLLECTION_STORAGE_KEY, backup);
        clearStorageFailure(COLLECTION_STORAGE_KEY);
        return true;
    } catch (error) {
        console.error("Tahsilat verisi kaydedilemedi:", error);
        showStorageFailure(COLLECTION_STORAGE_KEY,
            "Tahsilat değişiklikleri kaydedilemedi. Sayfayı kapatmadan veriyi indirin.", backup);
        return false;
    }
}

function getCollectionStatus(collection, todayString = collectionToday()) {
    if (!collection) {
        return "pending";
    }

    if (
        collection.status === "completed" ||
        Number(collection.currentInstallment || 1) >
            Number(collection.installmentCount || 1)
    ) {
        return "completed";
    }

    if (!collection.nextPaymentDate) {
        return "pending";
    }

    const days = collectionDaysUntil(collection.nextPaymentDate, todayString);
    return days !== null && days < 0 ? "overdue" : "pending";
}

function getCollectionInstallmentProgress(collection) {
    const total = Math.max(1, Number(collection?.installmentCount) || 1);
    const current = Math.max(1, Number(collection?.currentInstallment) || 1);
    const completed = getCollectionStatus(collection) === "completed";
    const paid = completed ? total : Math.min(total, current - 1);
    return {
        current: completed ? total : Math.min(current, total),
        total,
        paid,
        completed,
        percent: Math.round(paid / total * 100)
    };
}

function collectionIsSameDate(date1, date2) {
    return Boolean(date1 && date2 && date1 === date2);
}

function collectionIsThisWeek(dateString) {
    const date = collectionParseDate(dateString);

    if (!date) {
        return false;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const day = today.getDay();
    const mondayOffset = day === 0 ? -6 : 1 - day;
    const monday = new Date(today);
    monday.setDate(today.getDate() + mondayOffset);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    return date >= monday && date <= sunday;
}

function collectionIsThisMonth(dateString) {
    const date = collectionParseDate(dateString);

    if (!date) {
        return false;
    }

    const today = new Date();
    return (
        date.getFullYear() === today.getFullYear() &&
        date.getMonth() === today.getMonth()
    );
}

function collectionIsNextMonth(dateString) {
    const date = collectionParseDate(dateString);

    if (!date) {
        return false;
    }

    const today = new Date();
    const target = new Date(today.getFullYear(), today.getMonth() + 1, 1);

    return (
        date.getFullYear() === target.getFullYear() &&
        date.getMonth() === target.getMonth()
    );
}

function getCollectionSearchElement() {
    return (
        document.getElementById("collectionSearchInput") ||
        document.getElementById("collectionSearch")
    );
}

function getCollectionPaymentMethodElement() {
    return document.getElementById("collectionPaymentMethodFilter");
}
