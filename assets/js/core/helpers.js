/* =========================================================
   HELPERS
========================================================= */

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

