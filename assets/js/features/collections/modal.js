/* =========================================================
   TAHSİLAT - MODAL / FORM
========================================================= */

function createCollectionModal() {
    let overlay = document.getElementById("collectionModal");

    if (overlay) {
        return overlay;
    }

    overlay = document.createElement("div");
    overlay.id = "collectionModal";
    overlay.className = "modal-overlay collection-modal-overlay";

    overlay.innerHTML = `
        <div class="modal collection-modal">
            <div class="modal-header">
                <div>
                    <span class="eyebrow">TAHSİLAT</span>
                    <h2 id="collectionModalTitle">Yeni Poliçe</h2>
                </div>

                <button
                    id="closeCollectionModalButton"
                    class="modal-close"
                    type="button"
                    aria-label="Kapat"
                >×</button>
            </div>

            <form id="collectionForm" autocomplete="off">
                <div class="form-grid collection-form-grid">
                    <label>
                        Müşteri *
                        <input
                            id="collectionCustomerName"
                            type="text"
                            placeholder="Ad Soyad"
                            required
                        >
                    </label>

                    <label>
                        Telefon
                        <input
                            id="collectionPhone"
                            type="tel"
                            placeholder="05xx xxx xx xx"
                        >
                    </label>

                    <label>
                        TC Kimlik No
                        <input
                            id="collectionCustomerTc"
                            type="text"
                            inputmode="numeric"
                            maxlength="11"
                            placeholder="11 haneli TC"
                        >
                    </label>

                    <label>
                        Ürün *
                        <select id="collectionProduct" required>
                            <option value="TSS">TSS</option>
                            <option value="ÖSS">ÖSS</option>
                            <option value="Kasko">Kasko</option>
                            <option value="DASK">DASK</option>
                            <option value="Diğer">Diğer</option>
                        </select>
                    </label>

                    <label>
                        Poliçe No
                        <input
                            id="collectionPolicyNumber"
                            type="text"
                            placeholder="Poliçe numarası"
                        >
                    </label>

                    <label>
                        Taksit Sayısı *
                        <input
                            id="collectionInstallmentCount"
                            type="number"
                            min="1"
                            max="120"
                            value="12"
                            required
                        >
                    </label>

                    <label>
                        Mevcut Taksit *
                        <input
                            id="collectionCurrentInstallment"
                            type="number"
                            min="1"
                            value="1"
                            required
                        >
                    </label>

                    <label>
                        Taksit Tutarı (₺)
                        <input
                            id="collectionInstallmentAmount"
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="0,00"
                        >
                    </label>

                    <label>
                        Tahsilat Tarihi *
                        <input
                            id="collectionFirstPaymentDate"
                            type="date"
                            required
                        >
                    </label>

                    <label>
                        Ödeme Yöntemi
                        <select id="collectionPaymentMethod">
                            <option value="unblocked">Blokesiz Çekim</option>
                            <option value="blocked">Blokeli Çekim</option>
                            <option value="transfer">Havale / EFT</option>
                            <option value="other">Diğer</option>
                        </select>
                    </label>

                    <label class="full-width">
                        Not
                        <textarea
                            id="collectionNote"
                            rows="4"
                            placeholder="Tahsilat ile ilgili not..."
                        ></textarea>
                    </label>
                </div>

                <div class="modal-actions">
                    <button
                        id="cancelCollectionButton"
                        class="secondary-button"
                        type="button"
                    >Vazgeç</button>

                    <button
                        class="primary-button"
                        type="submit"
                    >Kaydet</button>
                </div>
            </form>
        </div>
    `;

    document.body.appendChild(overlay);

    document
        .getElementById("closeCollectionModalButton")
        ?.addEventListener("click", closeCollectionModal);

    document
        .getElementById("cancelCollectionButton")
        ?.addEventListener("click", closeCollectionModal);

    document
        .getElementById("collectionForm")
        ?.addEventListener("submit", handleCollectionSubmit);

    overlay.addEventListener("click", event => {
        if (event.target === overlay) {
            closeCollectionModal();
        }
    });

    return overlay;
}

function openCollectionModal(collection = null) {
    const modal = createCollectionModal();
    const form = document.getElementById("collectionForm");

    if (!form) {
        return;
    }

    editingCollectionId = collection?.id || null;
    document.getElementById("collectionModalTitle").textContent =
        collection ? "Poliçeyi Düzenle" : "Yeni Poliçe";

    form.reset();

    if (!collection) {
        document.getElementById("collectionCurrentInstallment").value = 1;
        document.getElementById("collectionInstallmentCount").value = 12;
        document.getElementById("collectionFirstPaymentDate").value = collectionToday();
        document.getElementById("collectionProduct").value = "TSS";
        document.getElementById("collectionPaymentMethod").value = "unblocked";
        document.getElementById("collectionInstallmentAmount").value = "";
    } else {
        document.getElementById("collectionCustomerName").value =
            collection.customerName || collection.customer || collection.name || "";
        document.getElementById("collectionPhone").value =
            collection.phone || collection.customerPhone || collection.telephone || "";
        document.getElementById("collectionCustomerTc").value =
            collection.tc || collection.customerTc || "";
        document.getElementById("collectionProduct").value = collection.product || "TSS";
        document.getElementById("collectionPolicyNumber").value =
            collection.policyNumber || collection.policyNo || collection.policy || "";
        document.getElementById("collectionInstallmentCount").value =
            collection.installmentCount || 12;
        document.getElementById("collectionCurrentInstallment").value =
            getCollectionStatus(collection) === "completed"
                ? Number(collection.installmentCount || 1)
                : collection.currentInstallment || 1;
        document.getElementById("collectionInstallmentAmount").value =
            collection.installmentAmount ?? "";
        document.getElementById("collectionFirstPaymentDate").value =
            collection.nextPaymentDate || collection.firstPaymentDate || collectionToday();
        document.getElementById("collectionPaymentMethod").value =
            collection.paymentMethod || "unblocked";
        document.getElementById("collectionNote").value = collection.note || "";
    }

    modal.classList.add("show");
}

function closeCollectionModal() {
    document.getElementById("collectionModal")?.classList.remove("show");
    editingCollectionId = null;
}

function handleCollectionSubmit(event) {
    event.preventDefault();

    const customerName = document.getElementById("collectionCustomerName").value.trim();
    const phone = document.getElementById("collectionPhone").value.trim();
    const tc = document.getElementById("collectionCustomerTc").value.trim();
    const product = document.getElementById("collectionProduct").value;
    const policyNumber = document.getElementById("collectionPolicyNumber").value.trim();
    const installmentCount = Number(
        document.getElementById("collectionInstallmentCount").value
    );
    const currentInstallment = Number(
        document.getElementById("collectionCurrentInstallment").value
    );
    const installmentAmountRaw =
        document.getElementById("collectionInstallmentAmount").value;
    const installmentAmount =
        installmentAmountRaw === "" ? null : Number(installmentAmountRaw);
    const firstPaymentDate =
        document.getElementById("collectionFirstPaymentDate").value;
    const paymentMethod =
        document.getElementById("collectionPaymentMethod").value;
    const note = document.getElementById("collectionNote").value.trim();

    if (!customerName) {
        alert("Lütfen müşteri adını girin.");
        return;
    }

    if (!installmentCount || installmentCount < 1) {
        alert("Taksit sayısı geçerli olmalıdır.");
        return;
    }

    if (!currentInstallment || currentInstallment < 1) {
        alert("Mevcut taksit geçerli olmalıdır.");
        return;
    }

    if (currentInstallment > installmentCount) {
        alert("Mevcut taksit, toplam taksit sayısından büyük olamaz.");
        return;
    }

    if (
        installmentAmount !== null &&
        (!Number.isFinite(installmentAmount) || installmentAmount < 0)
    ) {
        alert("Taksit tutarı geçerli olmalıdır.");
        return;
    }

    if (!firstPaymentDate) {
        alert("Lütfen tahsilat tarihini seçin.");
        return;
    }

    const identity = {
        customerName,
        phone,
        tc
    };
    const linkedCustomer = findCustomerForCollectionRecord(identity);

    if (editingCollectionId) {
        const item = collectionGet(editingCollectionId);

        if (!item) {
            return;
        }

        const wasCompleted = getCollectionStatus(item) === "completed";

        item.customerId = item.customerId || linkedCustomer?.id || null;
        item.customerName = customerName;
        item.phone = phone || linkedCustomer?.phone || "";
        item.tc = tc || linkedCustomer?.tc || "";
        item.product = product;
        item.policyNumber = policyNumber;
        item.installmentCount = installmentCount;
        item.installmentAmount = installmentAmount;
        item.firstPaymentDate = item.firstPaymentDate || firstPaymentDate;
        item.paymentMethod = paymentMethod;
        item.note = note;
        item.avatarColor = item.avatarColor || linkedCustomer?.avatarColor || DEFAULT_AVATAR_COLOR;

        if (wasCompleted) {
            item.currentInstallment = installmentCount + 1;
            item.nextPaymentDate = null;
            item.status = "completed";
        } else {
            item.currentInstallment = currentInstallment;
            item.nextPaymentDate = firstPaymentDate;
            item.status = "pending";
        }
    } else {
        collections.push({
            id: collectionCreateId(),
            customerId: linkedCustomer?.id || null,
            customerName,
            phone: phone || linkedCustomer?.phone || "",
            tc: tc || linkedCustomer?.tc || "",
            product,
            policyNumber,
            installmentCount,
            currentInstallment,
            installmentAmount,
            firstPaymentDate,
            nextPaymentDate: firstPaymentDate,
            paymentMethod,
            note,
            status: "pending",
            avatarColor: linkedCustomer?.avatarColor || DEFAULT_AVATAR_COLOR,
            createdAt: collectionToday()
        });
    }

    saveCollectionData();
    closeCollectionModal();
    renderCollections();
}
