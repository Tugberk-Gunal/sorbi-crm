/* =========================================================
   FİLTRELEME
========================================================= */

function getFilteredCollections() {

    const searchInput =
        getCollectionSearchElement();

    const productFilter =
        document.getElementById(
            "collectionProductFilter"
        );

    const statusFilter =
        document.getElementById(
            "collectionStatusFilter"
        );

    const dateFilter =
        document.getElementById(
            "collectionDateFilter"
        );

    const paymentMethodFilter =
        getCollectionPaymentMethodElement();


    const search =
        (
            searchInput?.value || ""
        )
        .trim()
        .toLocaleLowerCase("tr-TR");


    const product =
        productFilter?.value || "all";


    const status =
        statusFilter?.value || "all";


    const dateFilterValue =
        dateFilter?.value || "all";


    const paymentMethod =
        paymentMethodFilter?.value || "all";


    let result = [...collections];


    /* ARAMA */

    if (search) {

        result = result.filter(item => {

            const text = [

                item.customerName,

                item.phone,

                item.policyNumber

            ]
            .filter(Boolean)
            .join(" ")
            .toLocaleLowerCase("tr-TR");

            return text.includes(search);
        });
    }


    /* ÜRÜN */

    if (
        product &&
        product !== "all"
    ) {

        result = result.filter(
            item =>
                item.product === product
        );
    }


    /* DURUM */

    if (
        status &&
        status !== "all"
    ) {

        result = result.filter(item => {

            return (
                getCollectionStatus(item) ===
                status
            );
        });
    }


    /* ÖDEME YÖNTEMİ */

    if (
        paymentMethod &&
        paymentMethod !== "all"
    ) {

        result = result.filter(
            item =>
                item.paymentMethod ===
                paymentMethod
        );
    }


    /* TARİH */

    if (
        dateFilterValue &&
        dateFilterValue !== "all"
    ) {

        result = result.filter(item => {

            const date =
                item.nextPaymentDate;

            if (!date) return false;

            switch (dateFilterValue) {

                case "today":
                    return collectionIsSameDate(
                        date,
                        collectionToday()
                    );

                case "week":
                    return collectionIsThisWeek(date);

                case "month":
                    return collectionIsThisMonth(date);

                case "nextMonth":
                    return collectionIsNextMonth(date);

                default:
                    return true;
            }
        });
    }


    /* SIRALAMA */

    result.sort((a, b) => {

        if (!a.nextPaymentDate) return 1;

        if (!b.nextPaymentDate) return -1;

        return String(a.nextPaymentDate)
            .localeCompare(
                String(b.nextPaymentDate)
            );
    });


    return result;
}


/* =========================================================
   ÖZET
========================================================= */

function updateCollectionSummary() {

    const today =
        collectionToday();


    const todayCount =
        collections.filter(item => {

            return (
                getCollectionStatus(item) !==
                "completed" &&
                item.nextPaymentDate === today
            );

        }).length;


    const weekCount =
        collections.filter(item => {

            return (
                getCollectionStatus(item) !==
                "completed" &&
                collectionIsThisWeek(
                    item.nextPaymentDate
                )
            );

        }).length;


    const overdueCount =
        collections.filter(item => {

            return (
                getCollectionStatus(item) ===
                "overdue"
            );

        }).length;


    /* TOPLAM POLİÇE */

    const total =
        document.getElementById(
            "totalCollectionAmount"
        );

    if (total) {
        total.textContent =
            collections.length;
    }


    /* BUGÜN */

    const todayElement =
        document.getElementById(
            "monthlyExpectedAmount"
        );

    if (todayElement) {
        todayElement.textContent =
            todayCount;
    }


    /* GECİKEN */

    const overdueElement =
        document.getElementById(
            "overdueCollectionAmount"
        );

    if (overdueElement) {
        overdueElement.textContent =
            overdueCount;
    }


    /* BU HAFTA */

    const weekElement =
        document.getElementById(
            "pendingCollectionAmount"
        );

    if (weekElement) {
        weekElement.textContent =
            weekCount;
    }


    /* YENİ ID'LER VARSA */

    const todayCountElement =
        document.getElementById(
            "collectionTodayCount"
        );

    const weekCountElement =
        document.getElementById(
            "collectionWeekCount"
        );

    const overdueCountElement =
        document.getElementById(
            "collectionOverdueCount"
        );

    if (todayCountElement) {
        todayCountElement.textContent =
            todayCount;
    }

    if (weekCountElement) {
        weekCountElement.textContent =
            weekCount;
    }

    if (overdueCountElement) {
        overdueCountElement.textContent =
            overdueCount;
    }


    /* BAŞLIK SAYACI */

    const count =
        document.getElementById(
            "collectionCount"
        );

    if (count) {

        count.textContent =
            `${collections.length} kayıt`;
    }
}


