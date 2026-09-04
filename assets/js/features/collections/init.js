/* =========================================================
   FİLTRELERİ TEMİZLE
========================================================= */

function clearCollectionFilters() {

    const search =
        getCollectionSearchElement();

    const product =
        document.getElementById(
            "collectionProductFilter"
        );

    const status =
        document.getElementById(
            "collectionStatusFilter"
        );

    const date =
        document.getElementById(
            "collectionDateFilter"
        );

    const payment =
        getCollectionPaymentMethodElement();


    if (search) {
        search.value = "";
    }

    if (product) {
        product.value = "all";
    }

    if (status) {
        status.value = "all";
    }

    if (date) {
        date.value = "all";
    }

    if (payment) {
        payment.value = "all";
    }


    renderCollections();
}


/* =========================================================
   FİLTRE EVENTLERİ
========================================================= */

function setupCollectionFilters() {

    const elements = [

        getCollectionSearchElement(),

        document.getElementById(
            "collectionProductFilter"
        ),

        document.getElementById(
            "collectionStatusFilter"
        ),

        document.getElementById(
            "collectionDateFilter"
        ),

        getCollectionPaymentMethodElement()

    ];


    elements.forEach(element => {

        if (!element) return;


        element.oninput =
            renderCollections;

        element.onchange =
            renderCollections;
    });


    const clear =
        document.getElementById(
            "clearCollectionFilters"
        );


    if (clear) {

        clear.onclick =
            clearCollectionFilters;
    }
}


/* =========================================================
   YENİ POLİÇE BUTONU
   ---------------------------------------------------------
   EVENT DELEGATION KULLANIYORUZ.
   Böylece buton sonradan oluşsa bile çalışır.
========================================================= */

function setupCollectionAddButton() {

    prepareCollectionAddButton();


    /*
     * Önceden eklenmiş listener varsa
     * tekrar eklemiyoruz.
     */

    if (
        document.body.dataset.collectionAddReady ===
        "true"
    ) {
        return;
    }


    document.body.dataset.collectionAddReady =
        "true";


    document.addEventListener(
        "click",
        function(event) {

            const button =
                event.target.closest(
                    "#addCollectionButton"
                );


            if (!button) return;


            event.preventDefault();
            event.stopPropagation();


            openCollectionModal();

        }
    );
}


/* =========================================================
   MODÜL BAŞLAT
========================================================= */

function initCollectionModule() {

    /*
     * Sayfa henüz Tahsilat HTML'ini
     * içermiyorsa tekrar denemek için
     * bekliyoruz.
     */

    const list =
        document.getElementById(
            "collectionList"
        );


    const header =
        document.querySelector(
            ".collections-header"
        );


    if (!list && !header) {
        return;
    }


    loadCollectionData();

    createCollectionModal();

    prepareCollectionTableHeader();

    prepareCollectionAddButton();

    setupCollectionAddButton();

    setupCollectionFilters();

    renderCollections();

    collectionModuleInitialized =
        true;
}


/* =========================================================
   GLOBAL
========================================================= */

window.loadCollectionData =
    loadCollectionData;

window.saveCollectionData =
    saveCollectionData;

window.renderCollections =
    renderCollections;

window.initCollectionModule =
    initCollectionModule;

window.markCollectionAsPaid =
    markCollectionAsPaid;

window.deleteCollection =
    deleteCollection;

window.openCollectionModal =
    openCollectionModal;

window.closeCollectionModal =
    closeCollectionModal;


