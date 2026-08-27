/* =========================================================
   SORBİ CRM V4
   TEK DOSYA - TEK STATE - TEK NAVIGATION SİSTEMİ
========================================================= */

"use strict";

/* =========================================================
   STATUSLAR
========================================================= */

const STATUS_OPTIONS = [
    "Bilgilendirildi",
    "Daha Sonra Aranacak",
    "Değerlendiriyor",
    "Doğmamış",
    "Dönülebilir",
    "Numara Hatalı",
    "Olumsuz",
    "Poliçeleşti",
    "TC Bekleniyor",
    "Teklif Verildi",
    "Ulaşılamadı",
    "Yanlış",
    "Yaptırmış",
    "Yeni Doğmuş"
];

/* =========================================================
   STATE
========================================================= */

let customers = [];
let selectedCustomerId = null;
let currentFollowupFilter = "today";

/* =========================================================
   DOM
========================================================= */

const $ = (id) => document.getElementById(id);

const customerList = $("customerList");
const emptyState = $("emptyState");
const customerModal = $("customerModal");
const detailOverlay = $("detailOverlay");
const interactionModal = $("interactionModal");
const followupList = $("followupList");
const followupEmpty = $("followupEmpty");
const allInteractionList = $("allInteractionList");
const interactionPageEmpty = $("interactionPageEmpty");

/* =========================================================
   STORAGE
========================================================= */

function loadLocalData() {
    const saved = localStorage.getItem("sorbi_customers");

    if (!saved) {
        customers = createDemoCustomers();
        saveLocalData();
        return;
    }

    try {
        const parsed = JSON.parse(saved);
        customers = Array.isArray(parsed) ? parsed : [];
        normalizeCustomers();
    } catch (error) {
        console.error("Local veri okunamadı:", error);
        customers = createDemoCustomers();
        saveLocalData();
    }
}

function saveLocalData() {
    localStorage.setItem(
        "sorbi_customers",
        JSON.stringify(customers)
    );
}

function normalizeCustomers() {
    customers = customers.map((customer) => {
        const normalizedStatus = STATUS_OPTIONS.includes(customer.status)
            ? customer.status
            : "Bilgilendirildi";

        return {
            ...customer,
            id: customer.id || crypto.randomUUID(),
            name: customer.name || "",
            phone: customer.phone || "",
            tc: customer.tc || "",
            product: customer.product || "TSS",
            status: normalizedStatus,
            nextActionDate: customer.nextActionDate || "",
            lastCall: customer.lastCall || null,
            createdAt: customer.createdAt || null,
            note: customer.note || "",
            interactions: Array.isArray(customer.interactions)
                ? customer.interactions
                : []
        };
    });
}

/* =========================================================
   DEMO
========================================================= */

function createDemoCustomers() {
    const today = getToday();
    const tomorrow = getTomorrow();
    const yesterday = getDateBefore(1);

    return [
        {
            id: crypto.randomUUID(),
            name: "Ahmet Yılmaz",
            phone: "0532 123 45 67",
            tc: "12345678901",
            product: "TSS",
            status: "Teklif Verildi",
            lastCall: new Date().toISOString(),
            nextActionDate: today,
            createdAt: new Date().toISOString(),
            note: "Eşiyle konuşup karar verecek.",
            interactions: [
                {
                    id: crypto.randomUUID(),
                    type: "Arama",
                    note: "Teklif gönderildi. Eşiyle konuşup karar verecek.",
                    createdAt: new Date().toISOString()
                }
            ]
        },
        {
            id: crypto.randomUUID(),
            name: "Mehmet Kaya",
            phone: "0544 222 33 44",
            tc: "",
            product: "ÖSS",
            status: "Değerlendiriyor",
            lastCall: new Date().toISOString(),
            nextActionDate: tomorrow,
            createdAt: new Date().toISOString(),
            note: "Fiyatı değerlendirecek.",
            interactions: [
                {
                    id: crypto.randomUUID(),
                    type: "WhatsApp",
                    note: "Teklif WhatsApp üzerinden iletildi.",
                    createdAt: new Date().toISOString()
                }
            ]
        },
        {
            id: crypto.randomUUID(),
            name: "Ayşe Demir",
            phone: "0555 444 55 66",
            tc: "",
            product: "TSS",
            status: "Poliçeleşti",
            lastCall: new Date().toISOString(),
            nextActionDate: "",
            createdAt: new Date().toISOString(),
            note: "Poliçe işlemleri tamamlandı.",
            interactions: []
        },
        {
            id: crypto.randomUUID(),
            name: "Burak Şahin",
            phone: "0551 222 33 44",
            tc: "",
            product: "TSS",
            status: "Teklif Verildi",
            lastCall: new Date(
                new Date().setDate(new Date().getDate() - 1)
            ).toISOString(),
            nextActionDate: yesterday,
            createdAt: new Date().toISOString(),
            note: "Tekrar aranacak.",
            interactions: []
        }
    ];
}

/* =========================================================
   DATE
========================================================= */

function getToday() {
    return formatDateForInput(new Date());
}

function getTomorrow() {
    const date = new Date();
    date.setDate(date.getDate() + 1);

    return formatDateForInput(date);
}

function getDateBefore(days) {
    const date = new Date();
    date.setDate(date.getDate() - days);

    return formatDateForInput(date);
}

function formatDateForInput(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

/* =========================================================
   TARİH / SAAT FORMATLAMA
========================================================= */

/*
 * Sadece tarih.
 *
 * 2026-08-26
 * =>
 * 26.08.2026
 *
 * Saat göstermez.
 */
function formatDateOnly(value) {
    if (!value) {
        return "-";
    }

    if (
        typeof value === "string" &&
        /^\d{4}-\d{2}-\d{2}$/.test(value)
    ) {
        const [year, month, day] = value.split("-");

        return `${day}.${month}.${year}`;
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "-";
    }

    return date.toLocaleDateString("tr-TR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
    });
}

/*
 * Tarih + saat.
 *
 * Örnek:
 * 26.08.2026 17:34
 */
function formatDateTime(value) {
    if (!value) {
        return "-";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "-";
    }

    return date.toLocaleString("tr-TR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });
}

/* =========================================================
   KAYIT TARİHİ / SAATİ
========================================================= */

function formatCreatedDate(value) {
    return formatDateOnly(value);
}

function formatCreatedTime(value) {
    if (!value) {
        return "-";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "-";
    }

    return date.toLocaleTimeString("tr-TR", {
        hour: "2-digit",
        minute: "2-digit"
    });
}

function getDaysDifference(dateString) {
    if (!dateString) {
        return null;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    /*
     * Tarihi local olarak oluşturuyoruz.
     * Böylece UTC kaynaklı saat kayması olmaz.
     */
    const parts = String(dateString).split("-");

    if (parts.length !== 3) {
        return null;
    }

    const year = Number(parts[0]);
    const month = Number(parts[1]);
    const day = Number(parts[2]);

    const target = new Date(year, month - 1, day);
    target.setHours(0, 0, 0, 0);

    if (Number.isNaN(target.getTime())) {
        return null;
    }

    return Math.round(
        (target - today) / 86400000
    );
}

function isToday(dateString) {
    return dateString === getToday();
}

function isTomorrow(dateString) {
    return dateString === getTomorrow();
}

function isOverdue(customer) {
    if (!customer.nextActionDate) {
        return false;
    }

    if (
        customer.status === "Poliçeleşti" ||
        customer.status === "Olumsuz" ||
        customer.status === "Yanlış"
    ) {
        return false;
    }

    const diff = getDaysDifference(
        customer.nextActionDate
    );

    return diff !== null && diff < 0;
}

function isThisWeek(dateString) {
    const diff = getDaysDifference(dateString);

    return (
        diff !== null &&
        diff >= 0 &&
        diff <= 7
    );
}

/* =========================================================
   BUGÜNÜN TARİHİ VE SAATİ
========================================================= */

function updateCurrentDateTime() {
    const element = $("currentDateTime");

    if (!element) {
        return;
    }

    const now = new Date();

    const date = now.toLocaleDateString("tr-TR", {
        weekday: "long",
        day: "2-digit",
        month: "long",
        year: "numeric"
    });

    const time = now.toLocaleTimeString("tr-TR", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
    });

    element.textContent = `${date} • ${time}`;
}

/* =========================================================
   TAKİPLER TARİH / SAAT
========================================================= */

function updateFollowupDateTime() {
    const dateElement = $("currentDate");
    const timeElement = $("currentTime");
    const dayElement = $("currentDay");

    if (!dateElement && !timeElement && !dayElement) {
        return;
    }

    const now = new Date();

    if (dateElement) {
        dateElement.textContent = now.toLocaleDateString(
            "tr-TR",
            {
                day: "2-digit",
                month: "long",
                year: "numeric"
            }
        );
    }

    if (timeElement) {
        timeElement.textContent = now.toLocaleTimeString(
            "tr-TR",
            {
                hour: "2-digit",
                minute: "2-digit"
            }
        );
    }

    if (dayElement) {
        dayElement.textContent = now.toLocaleDateString(
            "tr-TR",
            {
                weekday: "long"
            }
        );
    }
}

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

    const parts = name
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
        "Bilgilendirildi": "status-info",
        "Daha Sonra Aranacak": "status-call",
        "Değerlendiriyor": "status-evaluating",
        "Doğmamış": "status-unborn",
        "Dönülebilir": "status-returnable",
        "Numara Hatalı": "status-wrong-number",
        "Olumsuz": "status-negative",
        "Poliçeleşti": "status-sale",
        "TC Bekleniyor": "status-tc",
        "Teklif Verildi": "status-offer",
        "Ulaşılamadı": "status-unreachable",
        "Yanlış": "status-wrong",
        "Yaptırmış": "status-done",
        "Yeni Doğmuş": "status-newborn"
    };

    return classes[status] || "status-info";
}

/* =========================================================
   STATUS SELECTS
========================================================= */

function populateStatusSelects() {
    const customerStatus = $("customerStatus");
    const statusFilter = $("statusFilter");

    if (customerStatus) {
        customerStatus.innerHTML =
            STATUS_OPTIONS
                .map(
                    (status) =>
                        `<option value="${escapeHTML(status)}">${escapeHTML(status)}</option>`
                )
                .join("");
    }

    if (statusFilter) {
        statusFilter.innerHTML =
            `<option value="all">Tüm Durumlar</option>` +
            STATUS_OPTIONS
                .map(
                    (status) =>
                        `<option value="${escapeHTML(status)}">${escapeHTML(status)}</option>`
                )
                .join("");
    }
}

/* =========================================================
   PAGE NAVIGATION - TEK SİSTEM
========================================================= */

const PAGE_CONFIG = {
    customers: {
        eyebrow: "MÜŞTERİ YÖNETİMİ",
        title: "Müşteriler",
        description:
            "Müşterilerinizi ve takiplerinizi kolayca yönetin."
    },

    followups: {
        eyebrow: "TAKİP YÖNETİMİ",
        title: "Takipler",
        description:
            "Bugünkü, geciken ve yaklaşan müşteri takiplerinizi yönetin."
    },

    interactions: {
        eyebrow: "GÖRÜŞME GEÇMİŞİ",
        title: "Görüşmeler",
        description:
            "Müşterilerinizle yapılan tüm görüşmeleri görüntüleyin."
    }
};

function switchPage(page) {
    const pages = {
        customers: $("customersPage"),
        followups: $("followupsPage"),
        interactions: $("interactionsPage")
    };

    Object.values(pages).forEach((section) => {
        if (section) {
            section.classList.add(
                "hidden-page"
            );
        }
    });

    if (!pages[page]) {
        return;
    }

    pages[page].classList.remove(
        "hidden-page"
    );

    document
        .querySelectorAll(".menu-link")
        .forEach((button) => {
            button.classList.toggle(
                "active",
                button.dataset.page === page
            );
        });

    const config = PAGE_CONFIG[page];

    if ($("pageEyebrow")) {
        $("pageEyebrow").textContent =
            config.eyebrow;
    }

    if ($("pageTitle")) {
        $("pageTitle").textContent =
            config.title;
    }

    if ($("pageDescription")) {
        $("pageDescription").textContent =
            config.description;
    }

    if (page === "customers") {
        renderCustomers();
    }

    if (page === "followups") {
        renderFollowups();
        updateFollowupDateTime();
    }

    if (page === "interactions") {
        renderAllInteractions();
    }
}

function setupNavigation() {
    document
        .querySelectorAll(".menu-link")
        .forEach((button) => {
            button.addEventListener(
                "click",
                () => {
                    switchPage(
                        button.dataset.page
                    );
                }
            );
        });
}

/* =========================================================
   CUSTOMER FILTERS
========================================================= */

function getFilteredCustomers() {
    let result = [...customers];

    const search =
        $("searchInput")
            .value
            .toLowerCase()
            .trim();

    const status =
        $("statusFilter").value;

    const product =
        $("productFilter").value;

    const date =
        $("dateFilter").value;

    if (search) {
        result = result.filter(
            (customer) => {
                const name =
                    String(
                        customer.name || ""
                    ).toLowerCase();

                const phone =
                    String(
                        customer.phone || ""
                    ).toLowerCase();

                const tc =
                    String(
                        customer.tc || ""
                    ).toLowerCase();

                return (
                    name.includes(search) ||
                    phone.includes(search) ||
                    tc.includes(search)
                );
            }
        );
    }

    if (status !== "all") {
        result = result.filter(
            (customer) =>
                customer.status === status
        );
    }

    if (product !== "all") {
        result = result.filter(
            (customer) =>
                customer.product === product
        );
    }

    if (date !== "all") {
        result = result.filter(
            (customer) => {
                if (
                    !customer.nextActionDate
                ) {
                    return false;
                }

                if (date === "overdue") {
                    return isOverdue(
                        customer
                    );
                }

                if (date === "today") {
                    return isToday(
                        customer.nextActionDate
                    );
                }

                if (
                    date === "tomorrow"
                ) {
                    return isTomorrow(
                        customer.nextActionDate
                    );
                }

                if (date === "week") {
                    return isThisWeek(
                        customer.nextActionDate
                    );
                }

                return true;
            }
        );
    }

    return result;
}

/* =========================================================
   CUSTOMER RENDER
========================================================= */

function renderCustomers() {
    if (!customerList) {
        return;
    }

    const filtered =
        getFilteredCustomers();

    customerList.innerHTML = "";

    if ($("customerCount")) {
        $("customerCount").textContent =
            `${filtered.length} müşteri`;
    }

    if (emptyState) {
        emptyState.classList.toggle(
            "hidden",
            filtered.length !== 0
        );
    }

    filtered.forEach((customer) => {
        const row =
            document.createElement("div");

        row.className =
            "customer-row";

        const overdue =
            isOverdue(customer);

        const today =
            isToday(
                customer.nextActionDate
            );

        row.innerHTML = `
            <div class="customer-main">
                <div class="customer-avatar">
                    ${escapeHTML(
                        getInitials(
                            customer.name
                        )
                    )}
                </div>

                <div>
                    <div class="customer-name">
                        ${escapeHTML(
                            customer.name
                        )}
                    </div>

                    <div class="customer-tc">
                        ${
                            customer.tc
                                ? `TC: ${escapeHTML(customer.tc)}`
                                : "TC bilgisi yok"
                        }
                    </div>
                </div>
            </div>

            <div>
                <div class="customer-phone">
                    ${escapeHTML(
                        customer.phone || "-"
                    )}
                </div>

                <div class="customer-contact-label">
                    Telefon
                </div>
            </div>

            <div>
                <span class="product-badge">
                    ${escapeHTML(
                        customer.product
                    )}
                </span>
            </div>

            <div>
                <span class="status-badge ${statusClass(
                    customer.status
                )}">
                    ${escapeHTML(
                        customer.status
                    )}
                </span>
            </div>

            <div>
                <span class="date-value">
                    ${formatDateTime(
                        customer.lastCall
                    )}
                </span>
            </div>

            <div>
                <span class="date-value ${
                    today ? "today" : ""
                } ${
                    overdue
                        ? "overdue-date"
                        : ""
                }">
                    ${
                        overdue
                            ? "⚠ "
                            : ""
                    }

                    ${
                        customer.nextActionDate
                            ? formatDateOnly(
                                  customer.nextActionDate
                              )
                            : "-"
                    }
                </span>
            </div>

            <div class="row-actions">
                <button
                    class="row-action"
                    title="Detay"
                    data-action="detail"
                    data-id="${escapeHTML(
                        customer.id
                    )}">
                    👁
                </button>

                <button
                    class="row-action"
                    title="Düzenle"
                    data-action="edit"
                    data-id="${escapeHTML(
                        customer.id
                    )}">
                    ✎
                </button>

                <button
                    class="row-action delete"
                    title="Sil"
                    data-action="delete"
                    data-id="${escapeHTML(
                        customer.id
                    )}">
                    ×
                </button>
            </div>
        `;

        customerList.appendChild(row);
    });

    updateSummary();
}

function setupCustomerListActions() {
    if (!customerList) {
        return;
    }

    customerList.addEventListener(
        "click",
        (event) => {
            const button =
                event.target.closest(
                    "[data-action]"
                );

            if (!button) {
                return;
            }

            const id =
                button.dataset.id;

            const action =
                button.dataset.action;

            if (action === "detail") {
                openCustomerDetail(id);
            }

            if (action === "edit") {
                editCustomer(id);
            }

            if (action === "delete") {
                deleteCustomer(id);
            }
        }
    );
}

/* =========================================================
   SUMMARY
========================================================= */

function updateSummary() {
    if ($("totalCustomers")) {
        $("totalCustomers").textContent =
            customers.length;
    }

    if ($("todayTasks")) {
        $("todayTasks").textContent =
            customers.filter(
                (customer) =>
                    customer.nextActionDate ===
                        getToday() &&
                    customer.status !==
                        "Poliçeleşti" &&
                    customer.status !==
                        "Olumsuz"
            ).length;
    }

    if ($("offerCustomers")) {
        $("offerCustomers").textContent =
            customers.filter(
                (customer) =>
                    customer.status ===
                    "Teklif Verildi"
            ).length;
    }

    if ($("saleCustomers")) {
        $("saleCustomers").textContent =
            customers.filter(
                (customer) =>
                    customer.status ===
                    "Poliçeleşti"
            ).length;
    }

    if ($("overdueTasks")) {
        $("overdueTasks").textContent =
            customers.filter(
                isOverdue
            ).length;
    }
}

/* =========================================================
   FOLLOWUPS
========================================================= */

function getFollowupCustomers() {
    let result = customers.filter(
        (customer) =>
            customer.nextActionDate &&
            customer.status !==
                "Poliçeleşti" &&
            customer.status !==
                "Olumsuz"
    );

    switch (
        currentFollowupFilter
    ) {
        case "today":
            result = result.filter(
                (customer) =>
                    isToday(
                        customer.nextActionDate
                    )
            );
            break;

        case "overdue":
            result = result.filter(
                isOverdue
            );
            break;

        case "tomorrow":
            result = result.filter(
                (customer) =>
                    isTomorrow(
                        customer.nextActionDate
                    )
            );
            break;

        case "week":
            result = result.filter(
                (customer) =>
                    isThisWeek(
                        customer.nextActionDate
                    )
            );
            break;

        case "all":
            break;
    }

    return result.sort(
        (a, b) => {
            const aDate =
                getDaysDifference(
                    a.nextActionDate
                );

            const bDate =
                getDaysDifference(
                    b.nextActionDate
                );

            return aDate - bDate;
        }
    );
}

function renderFollowups() {
    if (!followupList) {
        return;
    }

    const filtered =
        getFollowupCustomers();

    followupList.innerHTML = "";

    if ($("followupCount")) {
        $("followupCount").textContent =
            `${filtered.length} takip`;
    }

    if (followupEmpty) {
        followupEmpty.classList.toggle(
            "hidden",
            filtered.length !== 0
        );
    }

    filtered.forEach((customer) => {
        const card =
            document.createElement("div");

        card.className =
            "followup-card";

        const diff =
            getDaysDifference(
                customer.nextActionDate
            );

        const overdue =
            diff !== null &&
            diff < 0;

        const overdueDays =
            overdue
                ? Math.abs(diff)
                : 0;

        let dateTitle = "";

        if (overdue) {
            dateTitle =
                `${overdueDays} gün gecikti`;
        } else if (diff === 0) {
            dateTitle = "Bugün";
        } else if (diff === 1) {
            dateTitle = "Yarın";
        } else if (diff > 1) {
            dateTitle =
                `${diff} gün sonra`;
        }

        card.innerHTML = `
            <div class="followup-customer">
                <div class="followup-avatar">
                    ${escapeHTML(
                        getInitials(
                            customer.name
                        )
                    )}
                </div>

                <div class="followup-customer-info">
                    <div class="followup-name">
                        ${escapeHTML(
                            customer.name
                        )}
                    </div>

                    <div class="followup-phone">
                        📞 ${escapeHTML(
                            customer.phone || "-"
                        )}
                    </div>

                    <div class="followup-tc">
                        ${
                            customer.tc
                                ? `TC: ${escapeHTML(customer.tc)}`
                                : "TC: -"
                        }
                    </div>
                </div>
            </div>

            <div class="followup-meta">
                <div class="followup-product">
                    <span class="followup-product-dot"></span>
                    ${escapeHTML(
                        customer.product || "-"
                    )}
                </div>

                <div class="followup-status">
                    <span class="followup-status-dot"></span>
                    ${escapeHTML(
                        customer.status || "-"
                    )}
                </div>
            </div>

            <div class="followup-date">
                <div class="followup-date-title ${
                    overdue
                        ? ""
                        : "normal"
                }">
                    <span class="followup-date-dot"></span>
                    ${dateTitle}
                </div>

                <div class="followup-date-value">
                    Takip:
                    ${formatDateOnly(
                        customer.nextActionDate
                    )}
                </div>

                ${
                    overdue
                        ? `
                        <span class="followup-overdue-badge">
                            Geciken Takip
                        </span>
                        `
                        : ""
                }
            </div>

            <div class="followup-actions">
                <button
                    class="followup-detail-button"
                    data-followup-action="detail"
                    data-id="${escapeHTML(
                        customer.id
                    )}">
                    Detay
                </button>

                <button
                    class="followup-edit-button"
                    title="Düzenle"
                    data-followup-action="edit"
                    data-id="${escapeHTML(
                        customer.id
                    )}">
                    ✎
                </button>
            </div>
        `;

        followupList.appendChild(card);
    });
}

function setupFollowupFilters() {
    document
        .querySelectorAll(".followup-filter")
        .forEach((button) => {
            button.addEventListener(
                "click",
                () => {
                    document
                        .querySelectorAll(
                            ".followup-filter"
                        )
                        .forEach(
                            (item) => {
                                item.classList.remove(
                                    "active"
                                );
                            }
                        );

                    button.classList.add(
                        "active"
                    );

                    currentFollowupFilter =
                        button.dataset.followupFilter;

                    renderFollowups();
                }
            );
        });
}

function setupFollowupActions() {
    if (!followupList) {
        return;
    }

    followupList.addEventListener(
        "click",
        (event) => {
            const button =
                event.target.closest(
                    "[data-followup-action]"
                );

            if (!button) {
                return;
            }

            if (
                button.dataset.followupAction ===
                "detail"
            ) {
                openCustomerDetail(
                    button.dataset.id
                );
            }

            if (
                button.dataset.followupAction ===
                "edit"
            ) {
                editCustomer(
                    button.dataset.id
                );
            }
        }
    );
}

/* =========================================================
   CUSTOMER MODAL
========================================================= */

function openCustomerModal(
    customer = null
) {
    $("customerForm").reset();
    $("customerId").value = "";

    if (customer) {
        $("modalTitle").textContent =
            "Müşteriyi Düzenle";

        $("customerId").value =
            customer.id;

        $("customerName").value =
            customer.name || "";

        $("customerPhone").value =
            customer.phone || "";

        $("customerTc").value =
            customer.tc || "";

        $("customerProduct").value =
            customer.product || "TSS";

        $("customerStatus").value =
            customer.status ||
            "Bilgilendirildi";

        $("nextActionDate").value =
            customer.nextActionDate || "";

        $("customerNote").value =
            customer.note || "";
    } else {
        $("modalTitle").textContent =
            "Yeni Müşteri";

        $("customerStatus").value =
            "Bilgilendirildi";
    }

    customerModal.classList.add(
        "show"
    );
}

function closeCustomerModal() {
    customerModal.classList.remove(
        "show"
    );
}

/* =========================================================
   SAVE CUSTOMER
========================================================= */

function setupCustomerForm() {
    $("customerForm").addEventListener(
        "submit",
        (event) => {
            event.preventDefault();

            const id =
                $("customerId").value;

            const data = {
                name: $("customerName")
                    .value
                    .trim(),

                phone: $("customerPhone")
                    .value
                    .trim(),

                tc: $("customerTc")
                    .value
                    .trim(),

                product:
                    $("customerProduct")
                        .value,

                status:
                    $("customerStatus")
                        .value,

                nextActionDate:
                    $("nextActionDate")
                        .value,

                note:
                    $("customerNote")
                        .value
                        .trim(),

                updatedAt:
                    new Date().toISOString()
            };

            if (!data.name) {
                alert(
                    "Lütfen müşteri adını girin."
                );

                return;
            }

            if (id) {
                const index =
                    customers.findIndex(
                        (customer) =>
                            customer.id === id
                    );

                if (index !== -1) {
                    customers[index] = {
                        ...customers[index],
                        ...data,

                        createdAt:
                            customers[index]
                                .createdAt ||
                            new Date().toISOString()
                    };
                }
            } else {
                customers.unshift({
                    id: crypto.randomUUID(),
                    ...data,

                    createdAt:
                        new Date().toISOString(),

                    lastCall: null,
                    interactions: []
                });
            }

            saveLocalData();
            renderAll();
            closeCustomerModal();
        }
    );
}

/* =========================================================
   EDIT / DELETE
========================================================= */

function editCustomer(id) {
    const customer =
        customers.find(
            (item) =>
                item.id === id
        );

    if (customer) {
        openCustomerModal(
            customer
        );
    }
}

function deleteCustomer(id) {
    const customer =
        customers.find(
            (item) =>
                item.id === id
        );

    if (!customer) {
        return;
    }

    const confirmed =
        confirm(
            `${customer.name} müşterisini silmek istediğinize emin misiniz?`
        );

    if (!confirmed) {
        return;
    }

    customers =
        customers.filter(
            (item) =>
                item.id !== id
        );

    if (
        selectedCustomerId === id
    ) {
        selectedCustomerId = null;

        detailOverlay.classList.remove(
            "show"
        );
    }

    saveLocalData();
    renderAll();
}

/* =========================================================
   CUSTOMER DETAIL
========================================================= */

function openCustomerDetail(id) {
    const customer =
        customers.find(
            (item) =>
                item.id === id
        );

    if (!customer) {
        return;
    }

    selectedCustomerId = id;

    $("detailName").textContent =
        customer.name || "-";

    $("detailFullName").textContent =
        customer.name || "-";

    $("detailPhone").textContent =
        customer.phone || "-";

    $("detailAvatar").textContent =
        getInitials(
            customer.name
        );

    $("detailProduct").textContent =
        customer.product || "-";

    $("detailStatus").textContent =
        customer.status || "-";

    const createdDateElement =
        $("detailCreatedDate");

    const createdTimeElement =
        $("detailCreatedTime");

    if (createdDateElement) {
        createdDateElement.textContent =
            formatCreatedDate(
                customer.createdAt
            );
    }

    if (createdTimeElement) {
        createdTimeElement.textContent =
            formatCreatedTime(
                customer.createdAt
            );
    }

    $("detailLastCall").textContent =
        formatDateTime(
            customer.lastCall
        );

    $("detailNextAction").textContent =
        formatDateOnly(
            customer.nextActionDate
        );

    $("detailCreatedAt").textContent =
        formatDateTime(
            customer.createdAt
        );

    $("detailNote").textContent =
        customer.note || "-";

    renderCustomerInteractions(
        customer
    );

    detailOverlay.classList.add(
        "show"
    );
}

function renderCustomerInteractions(
    customer
) {
    const list =
        $("interactionList");

    list.innerHTML = "";

    const interactions =
        Array.isArray(
            customer.interactions
        )
            ? [...customer.interactions]
            : [];

    if (!interactions.length) {
        list.innerHTML = `
            <div class="empty-state">
                Henüz görüşme kaydı bulunmuyor.
            </div>
        `;

        return;
    }

    interactions
        .sort(
            (a, b) =>
                new Date(
                    b.createdAt
                ) -
                new Date(
                    a.createdAt
                )
        )
        .forEach(
            (interaction) => {
                const item =
                    document.createElement(
                        "div"
                    );

                item.className =
                    "interaction";

                item.innerHTML = `
                    <div class="interaction-date">
                        ${formatDateTime(
                            interaction.createdAt
                        )}
                    </div>

                    <div class="interaction-type">
                        ${escapeHTML(
                            interaction.type
                        )}
                    </div>

                    <div class="interaction-note">
                        ${escapeHTML(
                            interaction.note
                        )}
                    </div>
                `;

                list.appendChild(
                    item
                );
            }
        );
}

/* =========================================================
   INTERACTIONS PAGE
========================================================= */

function getAllInteractions() {
    const result = [];

    customers.forEach(
        (customer) => {
            (
                customer.interactions || []
            ).forEach(
                (interaction) => {
                    result.push({
                        ...interaction,
                        customerId:
                            customer.id,
                        customerName:
                            customer.name,
                        customerPhone:
                            customer.phone,
                        product:
                            customer.product
                    });
                }
            );
        }
    );

    return result.sort(
        (a, b) =>
            new Date(
                b.createdAt
            ) -
            new Date(
                a.createdAt
            )
    );
}

function renderAllInteractions() {
    if (!allInteractionList) {
        return;
    }

    const interactions =
        getAllInteractions();

    allInteractionList.innerHTML =
        "";

    if ($("interactionCount")) {
        $("interactionCount")
            .textContent =
            `${interactions.length} görüşme`;
    }

    if (interactionPageEmpty) {
        interactionPageEmpty.classList.toggle(
            "hidden",
            interactions.length !== 0
        );
    }

    interactions.forEach(
        (interaction) => {
            const item =
                document.createElement(
                    "div"
                );

            item.className =
                "interaction-page-item";

            item.innerHTML = `
                <div class="interaction-page-avatar">
                    ${escapeHTML(
                        getInitials(
                            interaction.customerName
                        )
                    )}
                </div>

                <div class="interaction-page-content">
                    <div class="interaction-page-top">
                        <strong>
                            ${escapeHTML(
                                interaction.customerName
                            )}
                        </strong>

                        <span>
                            ${formatDateTime(
                                interaction.createdAt
                            )}
                        </span>
                    </div>

                    <div class="interaction-page-meta">
                        ${escapeHTML(
                            interaction.type
                        )}
                        ·
                        ${escapeHTML(
                            interaction.product || "-"
                        )}
                        ${
                            interaction.customerPhone
                                ? ` · ${escapeHTML(
                                      interaction.customerPhone
                                  )}`
                                : ""
                        }
                    </div>

                    <div class="interaction-page-note">
                        ${escapeHTML(
                            interaction.note
                        )}
                    </div>
                </div>

                <button
                    class="followup-detail-button"
                    data-interaction-customer="${escapeHTML(
                        interaction.customerId
                    )}"
                >
                    Detay
                </button>
            `;

            allInteractionList.appendChild(
                item
            );
        }
    );
}

function setupInteractionPageActions() {
    if (!allInteractionList) {
        return;
    }

    allInteractionList.addEventListener(
        "click",
        (event) => {
            const button =
                event.target.closest(
                    "[data-interaction-customer]"
                );

            if (!button) {
                return;
            }

            openCustomerDetail(
                button.dataset
                    .interactionCustomer
            );
        }
    );
}

/* =========================================================
   ADD / SAVE INTERACTION
========================================================= */

function setupInteractionEvents() {
    $("addInteractionButton").addEventListener(
        "click",
        () => {
            if (!selectedCustomerId) {
                return;
            }

            $("interactionForm").reset();

            interactionModal.classList.add(
                "show"
            );
        }
    );

    $("interactionForm").addEventListener(
        "submit",
        (event) => {
            event.preventDefault();

            const customer =
                customers.find(
                    (item) =>
                        item.id ===
                        selectedCustomerId
                );

            if (!customer) {
                return;
            }

            if (
                !Array.isArray(
                    customer.interactions
                )
            ) {
                customer.interactions =
                    [];
            }

            const interaction = {
                id: crypto.randomUUID(),

                type:
                    $("interactionType")
                        .value,

                note:
                    $("interactionNote")
                        .value
                        .trim(),

                createdAt:
                    new Date().toISOString()
            };

            if (!interaction.note) {
                alert(
                    "Lütfen görüşme notunu girin."
                );

                return;
            }

            customer.interactions.push(
                interaction
            );

            /*
             * Son görüşme tarihi artık
             * gerçek tarih + saat olarak saklanıyor.
             */
            customer.lastCall =
                interaction.createdAt;

            customer.note =
                interaction.note;

            saveLocalData();

            renderAll();

            renderCustomerInteractions(
                customer
            );

            interactionModal.classList.remove(
                "show"
            );
        }
    );
}

/* =========================================================
   THEME - LIGHT / DARK
========================================================= */

function loadTheme() {
    const theme =
        localStorage.getItem(
            "sorbi_theme"
        ) || "light";

    document.body.classList.toggle(
        "dark",
        theme === "dark"
    );

    updateThemeIcon();
}

function updateThemeIcon() {
    const button =
        $("themeToggle");

    if (!button) {
        return;
    }

    const dark =
        document.body.classList.contains(
            "dark"
        );

    button.textContent =
        dark ? "☀" : "☾";

    button.title =
        dark
            ? "Açık moda geç"
            : "Koyu moda geç";
}

function setupTheme() {
    $("themeToggle").addEventListener(
        "click",
        () => {
            const dark =
                document.body.classList.toggle(
                    "dark"
                );

            localStorage.setItem(
                "sorbi_theme",
                dark
                    ? "dark"
                    : "light"
            );

            updateThemeIcon();
        }
    );
}

/* =========================================================
   MODAL EVENTS
========================================================= */

function setupModalEvents() {
    $("addCustomerButton").addEventListener(
        "click",
        () => {
            openCustomerModal();
        }
    );

    $("closeCustomerModal").addEventListener(
        "click",
        closeCustomerModal
    );

    $("cancelCustomer").addEventListener(
        "click",
        closeCustomerModal
    );

    $("closeDetail").addEventListener(
        "click",
        () => {
            detailOverlay.classList.remove(
                "show"
            );
        }
    );

    $("closeInteraction").addEventListener(
        "click",
        () => {
            interactionModal.classList.remove(
                "show"
            );
        }
    );

    $("cancelInteraction").addEventListener(
        "click",
        () => {
            interactionModal.classList.remove(
                "show"
            );
        }
    );

    document.addEventListener(
        "click",
        (event) => {
            if (
                event.target ===
                customerModal
            ) {
                closeCustomerModal();
            }

            if (
                event.target ===
                detailOverlay
            ) {
                detailOverlay.classList.remove(
                    "show"
                );
            }

            if (
                event.target ===
                interactionModal
            ) {
                interactionModal.classList.remove(
                    "show"
                );
            }
        }
    );

    document.addEventListener(
        "keydown",
        (event) => {
            if (
                event.key !== "Escape"
            ) {
                return;
            }

            customerModal.classList.remove(
                "show"
            );

            detailOverlay.classList.remove(
                "show"
            );

            interactionModal.classList.remove(
                "show"
            );
        }
    );
}

/* =========================================================
   FILTER EVENTS
========================================================= */

function setupFilters() {
    $("searchInput").addEventListener(
        "input",
        renderCustomers
    );

    $("statusFilter").addEventListener(
        "change",
        renderCustomers
    );

    $("productFilter").addEventListener(
        "change",
        renderCustomers
    );

    $("dateFilter").addEventListener(
        "change",
        renderCustomers
    );

    $("clearFilters").addEventListener(
        "click",
        () => {
            $("searchInput").value = "";
            $("statusFilter").value =
                "all";
            $("productFilter").value =
                "all";
            $("dateFilter").value =
                "all";

            renderCustomers();
        }
    );
}

/* =========================================================
   LOGOUT
========================================================= */

function setupLogout() {
    $("logoutButton").addEventListener(
        "click",
        async () => {
            if (
                typeof logoutUser ===
                "function"
            ) {
                await logoutUser();
            }

            alert(
                "Çıkış işlemi tamamlandı."
            );
        }
    );
}

/* =========================================================
   SUPABASE - OPSİYONEL
========================================================= */

async function loadCustomersFromSupabase() {
    if (
        typeof isSupabaseEnabled !==
            "function" ||
        !isSupabaseEnabled() ||
        typeof db === "undefined"
    ) {
        return false;
    }

    const {
        data,
        error
    } = await db
        .from("customers")
        .select("*")
        .order(
            "created_at",
            {
                ascending: false
            }
        );

    if (error) {
        console.error(
            "Müşteriler alınamadı:",
            error
        );

        return false;
    }

    if (Array.isArray(data)) {
        customers =
            data.map(
                (customer) => ({
                    id: customer.id,

                    name:
                        customer.name ||
                        "",

                    phone:
                        customer.phone ||
                        "",

                    tc:
                        customer.tc ||
                        "",

                    product:
                        customer.product ||
                        "TSS",

                    status:
                        STATUS_OPTIONS.includes(
                            customer.status
                        )
                            ? customer.status
                            : "Bilgilendirildi",

                    lastCall:
                        customer.last_call ||
                        null,

                    nextActionDate:
                        customer.next_action_date ||
                        "",

                    note:
                        customer.note ||
                        "",

                    createdAt:
                        customer.created_at ||
                        null,

                    interactions:
                        Array.isArray(
                            customer.interactions
                        )
                            ? customer.interactions
                            : []
                })
            );

        normalizeCustomers();
        renderAll();

        return true;
    }

    return false;
}

/* =========================================================
   RENDER ALL
========================================================= */

function renderAll() {
    renderCustomers();
    renderFollowups();
    renderAllInteractions();
}

/* =========================================================
   INIT
========================================================= */

async function initApp() {
    populateStatusSelects();

    setupNavigation();
    setupCustomerListActions();
    setupFollowupFilters();
    setupFollowupActions();
    setupInteractionPageActions();
    setupCustomerForm();
    setupInteractionEvents();
    setupTheme();
    setupModalEvents();
    setupFilters();
    setupLogout();

    loadTheme();

    if (
        typeof checkAuth ===
        "function"
    ) {
        await checkAuth();
    }

    if (
        typeof listenAuthChanges ===
        "function"
    ) {
        listenAuthChanges();
    }

    let loadedFromSupabase =
        false;

    if (
        typeof isSupabaseEnabled ===
            "function" &&
        isSupabaseEnabled()
    ) {
        loadedFromSupabase =
            await loadCustomersFromSupabase();
    }

    if (!loadedFromSupabase) {
        loadLocalData();
    }

    renderAll();

    switchPage("customers");

    updateCurrentDateTime();
    updateFollowupDateTime();

    setInterval(
        () => {
            updateCurrentDateTime();
            updateFollowupDateTime();
        },
        1000
    );
}

initApp();