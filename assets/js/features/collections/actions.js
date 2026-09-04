/* =========================================================
   POLİÇE BUL
========================================================= */

function collectionGet(id) {

    return collections.find(
        item =>
            String(item.id) === String(id)
    );
}


/* =========================================================
   TAHSİL EDİLDİ
========================================================= */

function markCollectionAsPaid(id) {

    const item =
        collectionGet(id);

    if (!item) return;


    const current =
        Number(
            item.currentInstallment || 1
        );


    const count =
        Number(
            item.installmentCount || 1
        );


    if (current >= count) {

        item.currentInstallment =
            count + 1;

        item.nextPaymentDate =
            null;

        item.status =
            "completed";

        item.completedAt =
            collectionToday();

    } else {

        item.currentInstallment =
            current + 1;

        item.nextPaymentDate =
            item.nextPaymentDate
                ? addMonthsToDate(
                    item.nextPaymentDate,
                    1
                )
                : collectionToday();

        item.status =
            "pending";

        item.lastPaidAt =
            collectionToday();
    }


    saveCollectionData();

    renderCollections();
}


/* =========================================================
   SİL
========================================================= */

function deleteCollection(id) {

    const item =
        collectionGet(id);

    if (!item) return;


    const name =
        item.customerName ||
        item.customer ||
        item.name ||
        "Bu poliçe";


    if (
        !window.confirm(
            `${name} adlı müşterinin tahsilat kaydı silinsin mi?`
        )
    ) {
        return;
    }


    collections =
        collections.filter(
            collection =>
                String(collection.id) !==
                String(id)
        );


    saveCollectionData();

    renderCollections();
}


/* =========================================================
   SATIR AKSİYONLARI
========================================================= */

function setupCollectionRowActions() {

    const list =
        document.getElementById(
            "collectionList"
        );

    if (!list) return;


    list.querySelectorAll(
        "[data-action]"
    ).forEach(button => {

        button.onclick = function(event) {

            event.preventDefault();
            event.stopPropagation();


            const action =
                button.dataset.action;

            const id =
                button.dataset.id;


            if (action === "paid") {

                const item =
                    collectionGet(id);

                if (!item) return;


                const current =
                    Number(
                        item.currentInstallment || 1
                    );

                const count =
                    Number(
                        item.installmentCount || 1
                    );


                const message =
                    current >= count

                        ? "Bu işlem son taksiti tahsil edilmiş olarak işaretleyecek ve poliçeyi tamamlayacak. Devam edilsin mi?"

                        : `${current}. taksit tahsil edildi olarak işaretlensin mi?`;


                if (
                    window.confirm(message)
                ) {

                    markCollectionAsPaid(id);
                }

                return;
            }


            if (action === "edit") {

                const item =
                    collectionGet(id);

                if (item) {
                    openCollectionModal(item);
                }

                return;
            }


            if (action === "delete") {

                deleteCollection(id);
            }

        };

    });
}


