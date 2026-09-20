/* =========================================================
   SORBİ CRM - BOOTSTRAP
   Uygulamanın bütün modüllerini tek noktadan başlatır.
========================================================= */

function renderAll() {
    const activePage = document.querySelector(".page-section:not(.hidden-page)")?.id;
    if (activePage === "customersPage") renderCustomers();
    else updateSummary();
    if (activePage === "followupsPage") renderFollowups();
    if (activePage === "interactionsPage") renderAllInteractions();
    if (activePage === "renewalsPage") renderRenewals();
    if (activePage === "collectionsPage" && typeof renderCollections === "function") {
        renderCollections();
    }

    if (typeof checkReminders === "function") {
        checkReminders();
    }
}

async function initApp() {
    populateStatusSelects();

    setupNavigation();
    setupCustomerListActions();
    setupFollowupFilters();
    setupFollowupActions();
    setupInteractionPageActions();
    setupInteractionFilters();
    setupCustomerForm();
    setupInteractionEvents();
    setupTheme();
    setupModalEvents();
    setupFilters();
    setupRenewalForm();
    setupRenewalActions();
    setupRenewalFilters();
    setupRenewalModalEvents();
    setupAvatarColorPicker();

    loadTheme();

    if (typeof checkAuth === "function") {
        await checkAuth();
    }

    if (typeof listenAuthChanges === "function") {
        listenAuthChanges();
    }

    let loadedFromSupabase = false;

    if (
        typeof isSupabaseEnabled === "function" &&
        isSupabaseEnabled()
    ) {
        loadedFromSupabase = await loadCustomersFromSupabase();
    }

    if (!loadedFromSupabase) {
        if (loadLocalData() === false) return;
    }

    if (loadRenewalData() === false) return;
    normalizeCustomers();
    if (!saveLocalData()) return;

    /*
     * Tahsilat modülü müşteriler yüklendikten sonra başlatılır.
     * Böylece eski tahsilat kayıtları müşteri ID / TC / avatar rengi
     * ile eşleştirilebilir.
     */
    if (typeof initCollectionModule === "function") {
        if (initCollectionModule() === false) return;
    }

    renderAll();
    setupReminderNotifications();
    switchPage("customers");

    updateCurrentDateTime();
    updateFollowupDateTime();

    let lastRenderedDay = getToday();
    setInterval(() => {
        updateCurrentDateTime();
        updateFollowupDateTime();
        const today = getToday();
        if (today !== lastRenderedDay) {
            lastRenderedDay = today;
            renderAll();
        }
    }, 1000);
}

initApp().catch(error => {
    console.error("SORBİ CRM başlatılamadı:", error);
});
