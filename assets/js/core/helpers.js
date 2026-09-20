/* =========================================================
   HELPERS
========================================================= */

const LIST_BATCH_SIZE = 100;
const listPageState = new Map();

function getListPage(key, signature, items) {
    const previous = listPageState.get(key);
    const visible = previous?.signature === signature
        ? previous.visible : LIST_BATCH_SIZE;
    listPageState.set(key, { signature, visible });
    return items.slice(0, visible);
}

function updateListPager(key, total, render) {
    if (typeof document.getElementById !== "function") return;
    const pager = document.getElementById(`${key}Pager`);
    if (!pager) return;
    const visible = Math.min(listPageState.get(key)?.visible || LIST_BATCH_SIZE, total);
    pager.hidden = visible >= total;
    if (pager.hidden) return;
    pager.textContent = `${visible} / ${total} gösteriliyor · Daha fazla göster`;
    pager.onclick = () => {
        listPageState.get(key).visible += LIST_BATCH_SIZE;
        render();
    };
}

function escapeHTML(value) {
    if (
        value === null ||
        value === undefined
    ) {
        return "";
    }

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function normalizeProductName(value) {
    const product = String(value || "").trim();

    // Önceki Tahsilat kayıtları "Kasko" değerini kullanıyordu.
    return product === "Kasko" ? "KASKO" : product;
}

function getCustomerInsuredPersons(customer) {
    return [
        {
            id: customer.id,
            name: customer.name || "",
            tc: customer.tc || "",
            birthDate: customer.birthDate || "",
            product: customer.product || "TSS",
            status: customer.status || "Bilgilendirildi",
            primary: true
        },
        ...(Array.isArray(customer.insuredPersons)
            ? customer.insuredPersons
            : [])
    ];
}

function getCustomerProducts(customer) {
    return [...new Set(getCustomerInsuredPersons(customer)
        .map(person => normalizeProductName(person.product))
        .filter(Boolean))];
}

function customerHasActiveFollowup(customer) {
    return getCustomerInsuredPersons(customer).some(person =>
        !["Poliçeleşti", "Olumsuz", "Yanlış"].includes(person.status)
    );
}

function getCustomerStatuses(customer) {
    return [...new Set(getCustomerInsuredPersons(customer)
        .map(person => person.status || "Bilgilendirildi"))];
}

function getInitials(name) {
    if (!name) {
        return "?";
    }

    const parts =
        name
            .trim()
            .split(/\s+/);

    if (parts.length === 1) {
        return parts[0]
            .substring(0, 2)
            .toUpperCase();
    }

    return `${parts[0][0]}${parts[parts.length - 1][0]}`
        .toUpperCase();
}

function statusClass(status) {
    const classes = {
        "Bilgilendirildi":
            "status-info",

        "Daha Sonra Aranacak":
            "status-call",

        "Değerlendiriyor":
            "status-evaluating",

        "Doğmamış":
            "status-unborn",

        "Dönülebilir":
            "status-returnable",

        "Numara Hatalı":
            "status-wrong-number",

        "Olumsuz":
            "status-negative",

        "Poliçeleşti":
            "status-sale",

        "TC Bekleniyor":
            "status-tc",

        "Teklif Verildi":
            "status-offer",

        "Ulaşılamadı":
            "status-unreachable",

        "Yanlış":
            "status-wrong",

        "Yaptırmış":
            "status-done",

        "Yeni Doğmuş":
            "status-newborn"
    };

    return (
        classes[status] ||
        "status-info"
    );
}
