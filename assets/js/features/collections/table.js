/* =========================================================
   TAHSİLAT - TABLO / RENDER
   Yaklaşan Yenilemeler ile aynı kompakt tablo dili.
========================================================= */

function prepareCollectionTableHeader() {
    const header = document.querySelector(".collection-table-head");

    if (!header) {
        return;
    }

    header.classList.add("collection-table-header");
    header.style.removeProperty("grid-template-columns");
}

function prepareCollectionAddButton() {
    let button = document.getElementById("addCollectionButton");

    if (button) {
        return button;
    }

    const header = document.querySelector(".collections-header");

    if (!header) {
        return null;
    }

    button = document.createElement("button");
    button.id = "addCollectionButton";
    button.type = "button";
    button.className = "primary-button";
    button.textContent = "＋ Yeni Poliçe";

    header.appendChild(button);
    return button;
}

function collectionCurrency(value) {
    const amount = Number(value);

    if (!Number.isFinite(amount) || amount <= 0) {
        return "—";
    }

    return amount.toLocaleString("tr-TR", {
        style: "currency",
        currency: "TRY"
    });
}

function renderCollections() {
    const list = document.getElementById("collectionList");

    if (!list) {
        return;
    }

    prepareCollectionTableHeader();
    updateCollectionSummary();

    const filtered = getFilteredCollections();
    const countElement = document.getElementById("collectionCount");

    if (countElement) {
        countElement.textContent = `${filtered.length} kayıt`;
    }

    if (!filtered.length) {
        getListPage("collectionList", "empty", filtered);
        updateListPager("collectionList", 0, renderCollections);
        list.innerHTML = `
            <div class="collection-empty">
                <div class="collection-empty-icon">📋</div>
                <strong>Tahsilat kaydı bulunamadı</strong>
                <span>Yeni bir poliçe ekleyerek tahsilat takibini başlatabilirsiniz.</span>
            </div>
        `;
        return;
    }

    const visible = getListPage("collectionList", [
        getCollectionSearchElement()?.value || "",
        document.getElementById("collectionProductFilter")?.value || "all",
        document.getElementById("collectionStatusFilter")?.value || "all",
        document.getElementById("collectionDateFilter")?.value || "all",
        getCollectionPaymentMethodElement()?.value || "all"
    ].join("|"), filtered);
    updateListPager("collectionList", filtered.length, renderCollections);

    list.innerHTML = visible.map(item => {
        const status = getCollectionStatus(item);
        const completed = status === "completed";
        const countdown = getCollectionCountdown(item);
        const installment = getCollectionInstallmentProgress(item);

        const customerName =
            item.customerName || item.customer || item.name || "İsimsiz";
        const phone =
            item.phone || item.customerPhone || item.telephone || "";
        const tc = item.tc || item.customerTc || "";
        const product = item.product || "Diğer";
        const policyNumber =
            item.policyNumber || item.policyNo || item.policy || "—";

        const paymentDate = completed
            ? "—"
            : collectionFormatDate(item.nextPaymentDate);

        const initials = typeof getInitials === "function"
            ? getInitials(customerName)
            : String(customerName)
                .trim()
                .split(/\s+/)
                .filter(Boolean)
                .slice(0, 2)
                .map(part => part.charAt(0).toUpperCase())
                .join("") || "?";

        return `
            <div
                class="collection-row"
                data-id="${collectionEscape(item.id)}"
            >
                <!-- MÜŞTERİ -->
                <div class="collection-customer-cell">
                    <div
                        class="collection-customer-avatar"
                        data-avatar-collection="${collectionEscape(item.id)}"
                        title="Avatar rengini değiştir"
                        ${
                            isValidAvatarColor(item.avatarColor)
                                ? `style="background-color:${collectionEscape(item.avatarColor)};"`
                                : ""
                        }
                    >
                        ${collectionEscape(initials)}
                    </div>

                    <div class="collection-customer-copy">
                        <strong>${collectionEscape(customerName)}</strong>
                        <small>
                            ${
                                tc
                                    ? `TC: ${collectionEscape(tc)}`
                                    : "TC bilgisi yok"
                            }
                        </small>
                    </div>
                </div>

                <!-- TELEFON -->
                <div class="collection-phone-cell">
                    <strong>${collectionEscape(phone || "-")}</strong>
                    <small>Telefon</small>
                </div>

                <!-- ÜRÜN -->
                <div>
                    <span class="collection-product-badge">
                        ${collectionEscape(product)}
                    </span>
                </div>

                <!-- POLİÇE -->
                <div class="collection-policy-number">
                    ${collectionEscape(policyNumber)}
                </div>

                <!-- TAKSİT -->
                <div class="collection-installment">
                    <div class="collection-installment-badge ${completed ? "is-complete" : ""}"
                        title="${installment.paid}/${installment.total} taksit tahsil edildi"
                        aria-label="${installment.current}/${installment.total} taksit, ${installment.paid} taksit tahsil edildi">
                        <div class="collection-installment-numbers">
                            <strong>${installment.current}</strong><span>/${installment.total}</span>
                        </div>
                        <span class="collection-installment-track" aria-hidden="true">
                            <span style="width: ${installment.percent}%"></span>
                        </span>
                    </div>
                </div>

                <!-- TAHSİLAT TARİHİ -->
                <div class="collection-date">
                    ${paymentDate}
                </div>

                <!-- TUTAR -->
                <div class="collection-amount">
                    ${collectionCurrency(item.installmentAmount)}
                </div>

                <!-- DURUM -->
                <div>
                    <span class="collection-status ${status} ${countdown.tone}">
                        ${collectionEscape(countdown.text)}
                    </span>
                </div>

                <!-- AKSİYON -->
                <div class="collection-actions">
                    ${
                        !completed
                            ? `
                                <button
                                    type="button"
                                    class="row-action collection-paid-button"
                                    data-action="paid"
                                    data-id="${collectionEscape(item.id)}"
                                    title="Tahsil Edildi"
                                >✓</button>
                            `
                            : ""
                    }

                    <button
                        type="button"
                        class="row-action"
                        data-action="edit"
                        data-id="${collectionEscape(item.id)}"
                        title="Düzenle"
                    >✎</button>

                    <button
                        type="button"
                        class="row-action delete"
                        data-action="delete"
                        data-id="${collectionEscape(item.id)}"
                        title="Sil"
                    >×</button>
                </div>
            </div>
        `;
    }).join("");

    setupCollectionRowActions();
}
