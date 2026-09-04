/* =========================================================
   STATUS SELECTS
========================================================= */

function populateStatusSelects() {
    const customerStatus =
        $("customerStatus");

    const statusFilter =
        $("statusFilter");

    if (customerStatus) {
        customerStatus.innerHTML =
            STATUS_OPTIONS
                .map(
                    (status) =>
                        `<option value="${escapeHTML(
                            status
                        )}">${escapeHTML(
                            status
                        )}</option>`
                )
                .join("");
    }

    if (statusFilter) {
        statusFilter.innerHTML =
            `<option value="all">Tüm Durumlar</option>` +
            STATUS_OPTIONS
                .map(
                    (status) =>
                        `<option value="${escapeHTML(
                            status
                        )}">${escapeHTML(
                            status
                        )}</option>`
                )
                .join("");
    }
}

/* =========================================================
   PAGE NAVIGATION
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
    },

    renewals: {
        eyebrow: "POLİÇE YÖNETİMİ",
        title: "Yaklaşan Yenilemeler",
        description:
            "Poliçelerinizi ve yaklaşan yenileme tarihlerini takip edin."
    },

    collections: {
        eyebrow: "TAHSİLAT YÖNETİMİ",
        title: "Tahsilat Takip",
        description:
            "Poliçelerinizin taksit ve tahsilat durumlarını kolayca takip edin."
    }
};

function switchPage(page) {

    const pages = {
        customers: $("customersPage"),
        followups: $("followupsPage"),
        interactions: $("interactionsPage"),
        renewals: $("renewalsPage"),
        collections: $("collectionsPage")
    };

    const mainSummary =
        document.querySelector(".summary-grid");

    const addCustomerButton =
        $("addCustomerButton");

    const showCustomerChrome =
        page === "customers";

    mainSummary?.classList.toggle(
        "hidden",
        !showCustomerChrome
    );

    addCustomerButton?.classList.toggle(
        "hidden",
        !showCustomerChrome
    );

    closeAvatarColorPicker();


    /* =====================================================
       TÜM SAYFALARI GİZLE
    ===================================================== */

    Object.values(pages)
        .forEach((section) => {

            if (section) {
                section.classList.add(
                    "hidden-page"
                );
            }

        });


    /* =====================================================
       GEÇERSİZ SAYFA KONTROLÜ
    ===================================================== */

    if (!pages[page]) {
        return;
    }


    /* =====================================================
       SADECE SEÇİLEN SAYFAYI GÖSTER
    ===================================================== */

    pages[page].classList.remove(
        "hidden-page"
    );


    /* =====================================================
       MENU ACTIVE
    ===================================================== */

    document
        .querySelectorAll(".menu-link")
        .forEach((button) => {

            button.classList.toggle(
                "active",
                button.dataset.page === page
            );

        });


    /* =====================================================
       HEADER
    ===================================================== */

    const config =
        PAGE_CONFIG[page];

    if (config) {

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
    }


    /* =====================================================
       PAGE RENDER
    ===================================================== */

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


    if (page === "renewals") {

        renderRenewals();

    }


    if (page === "collections") {

        /*
         * Tahsilat sayfası artık
         * ana navigation tarafından yönetiliyor.
         */

        if (
            typeof renderCollections ===
            "function"
        ) {
            renderCollections();
        }
    }
}

function setupNavigation() {
    document
        .querySelectorAll(
            ".menu-link"
        )
        .forEach(
            (button) => {
                button.addEventListener(
                    "click",
                    () => {
                        switchPage(
                            button.dataset.page
                        );
                    }
                );
            }
        );
}

