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
    if (!value) {
        return null;
    }

    const date = new Date(`${value}T00:00:00`);
    return Number.isNaN(date.getTime()) ? null : date;
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

    if (record.customerId) {
        const byId = customers.find(
            customer => String(customer.id) === String(record.customerId)
        );

        if (byId) {
            return byId;
        }
    }

    const name = normalizeIdentityText(
        record.customerName || record.customer || record.name
    );
    const phone = normalizePhone(
        record.phone || record.customerPhone || record.telephone
    );
    const tc = String(record.tc || record.customerTc || "").trim();

    return customers.find(customer => {
        if (tc && customer.tc && String(customer.tc) === tc) {
            return true;
        }

        const sameName =
            name && normalizeIdentityText(customer.name) === name;
        const samePhone =
            phone && normalizePhone(customer.phone) === phone;

        return sameName && (!phone || samePhone);
    }) || null;
}

function normalizeCollections() {
    collections = collections.map(item => {
        const linkedCustomer = findCustomerForCollectionRecord(item);

        return {
            ...item,
            id: item.id || collectionCreateId(),
            customerId: item.customerId || linkedCustomer?.id || null,
            customerName:
                item.customerName || item.customer || item.name || linkedCustomer?.name || "",
            phone:
                item.phone || item.customerPhone || item.telephone || linkedCustomer?.phone || "",
            tc:
                item.tc || item.customerTc || linkedCustomer?.tc || "",
            product: item.product || linkedCustomer?.product || "TSS",
            policyNumber: item.policyNumber || item.policyNo || item.policy || "",
            installmentCount: Number(item.installmentCount || 1),
            currentInstallment: Number(item.currentInstallment || 1),
            installmentAmount:
                item.installmentAmount === null || item.installmentAmount === ""
                    ? null
                    : Number(item.installmentAmount),
            firstPaymentDate: item.firstPaymentDate || item.nextPaymentDate || collectionToday(),
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
    try {
        const saved = localStorage.getItem(COLLECTION_STORAGE_KEY);

        if (!saved) {
            collections = [];
            return;
        }

        const parsed = JSON.parse(saved);
        collections = Array.isArray(parsed) ? parsed : [];
        normalizeCollections();
    } catch (error) {
        console.error("Tahsilat verileri yüklenemedi:", error);
        collections = [];
    }
}

function saveCollectionData() {
    localStorage.setItem(
        COLLECTION_STORAGE_KEY,
        JSON.stringify(collections)
    );
}

function getCollectionStatus(collection) {
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

    return collection.nextPaymentDate < collectionToday()
        ? "overdue"
        : "pending";
}

function getCollectionStatusText(status) {
    if (status === "overdue") {
        return "Geciken";
    }

    if (status === "completed") {
        return "Tamamlandı";
    }

    return "Bekliyor";
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
