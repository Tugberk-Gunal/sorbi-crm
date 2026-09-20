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

let pendingCollectionPayment = null;
let collectionPaymentReturnFocus = null;

function ensureCollectionPaidModal() {
    let overlay = document.getElementById("collectionPaidModal");
    if (overlay) return overlay;

    overlay = document.createElement("div");
    overlay.id = "collectionPaidModal";
    overlay.className = "modal-overlay";
    overlay.innerHTML = `
        <div class="modal small-modal interaction-delete-modal collection-paid-modal"
            role="alertdialog" aria-modal="true"
            aria-labelledby="collectionPaidTitle" aria-describedby="collectionPaidDescription">
            <div class="interaction-delete-icon collection-paid-icon" aria-hidden="true">✓</div>
            <div class="interaction-delete-copy">
                <span class="eyebrow">TAHSİLAT ONAYI</span>
                <h2 id="collectionPaidTitle">Tahsilat kaydedilsin mi?</h2>
                <p id="collectionPaidDescription"><strong id="collectionPaidCustomer"></strong> için bu taksiti tahsil edildi olarak işaretleyeceksiniz.</p>
                <div class="collection-payment-summary">
                    <div><span>Taksit</span><strong id="collectionPaidInstallment"></strong></div>
                    <div><span>Vade</span><strong id="collectionPaidDate"></strong></div>
                    <div><span>Tutar</span><strong id="collectionPaidAmount"></strong></div>
                </div>
                <div id="collectionPaidFinalNote" class="collection-payment-final-note" hidden>
                    Bu son taksit. Onayladığınızda tahsilat kaydı tamamlanacak.
                </div>
            </div>
            <div class="modal-actions interaction-delete-actions">
                <button id="cancelCollectionPaid" class="secondary-button" type="button">Vazgeç</button>
                <button id="confirmCollectionPaid" class="primary-button" type="button">Tahsil Edildi Olarak İşaretle</button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);
    document.getElementById("cancelCollectionPaid").addEventListener(
        "click", closeCollectionPaidModal
    );
    document.getElementById("confirmCollectionPaid").addEventListener(
        "click", confirmCollectionPaid
    );
    overlay.addEventListener("click", event => {
        if (event.target === overlay) closeCollectionPaidModal();
    });
    document.addEventListener("keydown", event => {
        if (event.key === "Escape" && overlay.classList.contains("show")) {
            closeCollectionPaidModal();
        }
    });
    return overlay;
}

function openCollectionPaidModal(id, returnFocus = document.activeElement) {
    const item = collectionGet(id);
    if (!item || getCollectionStatus(item) === "completed") return;

    pendingCollectionPayment = {
        id: item.id,
        installment: Number(item.currentInstallment || 1)
    };
    collectionPaymentReturnFocus = returnFocus;
    const overlay = ensureCollectionPaidModal();
    document.getElementById("collectionPaidCustomer").textContent =
        item.customerName || "Bu müşteri";
    document.getElementById("collectionPaidInstallment").textContent =
        `${pendingCollectionPayment.installment} / ${Number(item.installmentCount || 1)}`;
    document.getElementById("collectionPaidDate").textContent =
        collectionFormatDate(item.nextPaymentDate);
    document.getElementById("collectionPaidAmount").textContent =
        collectionCurrency(item.installmentAmount);
    document.getElementById("collectionPaidFinalNote").hidden =
        pendingCollectionPayment.installment < Number(item.installmentCount || 1);
    overlay.classList.add("show");
    requestAnimationFrame(() => document.getElementById("cancelCollectionPaid")?.focus());
}

function closeCollectionPaidModal() {
    document.getElementById("collectionPaidModal")?.classList.remove("show");
    pendingCollectionPayment = null;
    if (collectionPaymentReturnFocus?.isConnected) collectionPaymentReturnFocus.focus();
    collectionPaymentReturnFocus = null;
}

function confirmCollectionPaid() {
    const pending = pendingCollectionPayment;
    if (!pending) return;
    const item = collectionGet(pending.id);
    collectionPaymentReturnFocus = null;
    closeCollectionPaidModal();
    if (!item || getCollectionStatus(item) === "completed" ||
        Number(item.currentInstallment || 1) !== pending.installment) return;
    markCollectionAsPaid(item.id);
    requestAnimationFrame(() => {
        const editButton = [...(document.getElementById("collectionList")
            ?.querySelectorAll('[data-action="edit"]') || [])]
            .find(button => String(button.dataset.id) === String(item.id));
        editButton?.focus();
    });
}

function markCollectionAsPaid(id) {

    const item =
        collectionGet(id);

    if (!item || getCollectionStatus(item) === "completed") return;


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

        item.lastPaidAt =
            item.completedAt;

    } else {

        item.currentInstallment =
            current + 1;

        item.nextPaymentDate =
            item.billingAnchorDate || item.firstPaymentDate || item.nextPaymentDate
                ? addMonthsToDate(
                    item.billingAnchorDate || item.firstPaymentDate || item.nextPaymentDate,
                    current + 1 - Number(item.billingAnchorInstallment || 1)
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
                openCollectionPaidModal(id, button);
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
