/* =========================================================
   SORBİ CRM - BOOTSTRAP
   Uygulamanın bütün modüllerini tek noktadan başlatır.
========================================================= */

function renderAll() {
    renderCustomers();
    renderFollowups();
    renderAllInteractions();
    renderRenewals();

    if (typeof renderCollections === "function") {
        renderCollections();
    }
}

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
        loadLocalData();
    }

    loadRenewalData();
    normalizeCustomers();
    saveLocalData();

    /*
     * Tahsilat modülü müşteriler yüklendikten sonra başlatılır.
     * Böylece eski tahsilat kayıtları müşteri ID / TC / avatar rengi
     * ile eşleştirilebilir.
     */
    if (typeof initCollectionModule === "function") {
        initCollectionModule();
    }

    renderAll();
    switchPage("customers");

    updateCurrentDateTime();
    updateFollowupDateTime();

    setInterval(() => {
        updateCurrentDateTime();
        updateFollowupDateTime();
    }, 1000);
}

initApp().catch(error => {
    console.error("SORBİ CRM başlatılamadı:", error);
});
