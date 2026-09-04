/* =========================================================
   YAKLAŞAN YENİLEMELER - CRUD / OTOMATİK OLUŞTURMA
========================================================= */

let pendingRenewalOfferCustomerId = null;

function ensureRenewalOfferModal() {
    let overlay = $("renewalOfferModal");

    if (overlay) {
        return overlay;
    }

    overlay = document.createElement("div");
    overlay.id = "renewalOfferModal";
    overlay.className = "modal-overlay";
    overlay.innerHTML = `
        <div class="modal small-modal interaction-delete-modal renewal-offer-modal" role="alertdialog" aria-modal="true" aria-labelledby="renewalOfferTitle">
            <div class="interaction-delete-icon renewal-offer-icon" aria-hidden="true">✓</div>

            <div class="interaction-delete-copy">
                <span class="eyebrow">POLİÇE DURUMU</span>
                <h2 id="renewalOfferTitle">Yenilemelere eklensin mi?</h2>
                <p>
                    <strong id="renewalOfferCustomer"></strong> poliçeleşti. Bu müşteri için otomatik yenileme kaydı oluşturabiliriz.
                </p>
                <div class="interaction-delete-preview renewal-offer-preview">
                    Yenileme tarihi bugünden 1 yıl sonrası olarak ayarlanacak. Poliçe bilgilerini daha sonra düzenleyebilirsiniz.
                </div>
            </div>

            <div class="modal-actions interaction-delete-actions">
                <button id="cancelRenewalOffer" class="secondary-button" type="button">Şimdi Değil</button>
                <button id="confirmRenewalOffer" class="primary-button" type="button">Yenilemelere Ekle</button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    $("cancelRenewalOffer").addEventListener("click", closeRenewalOfferModal);
    $("confirmRenewalOffer").addEventListener("click", confirmRenewalOffer);

    overlay.addEventListener("click", event => {
        if (event.target === overlay) {
            closeRenewalOfferModal();
        }
    });

    document.addEventListener("keydown", event => {
        if (event.key === "Escape" && overlay.classList.contains("show")) {
            closeRenewalOfferModal();
        }
    });

    return overlay;
}

function closeRenewalOfferModal() {
    $("renewalOfferModal")?.classList.remove("show");
    pendingRenewalOfferCustomerId = null;
}

function confirmRenewalOffer() {
    const customer = customers.find(
        item => String(item.id) === String(pendingRenewalOfferCustomerId)
    );

    $("renewalOfferModal")?.classList.remove("show");
    pendingRenewalOfferCustomerId = null;

    if (!customer || findExistingRenewalForCustomer(customer)) {
        return;
    }

    createRenewalFromCustomer(customer);
    renderRenewals();
}

function addYearsToDateInput(dateString, years = 1) {
    const parts = String(dateString || "").split("-");

    if (parts.length !== 3) {
        return "";
    }

    const year = Number(parts[0]);
    const month = Number(parts[1]);
    const day = Number(parts[2]);

    const target = new Date(year + years, month - 1, day);

    /* 29 Şubat gibi taşmalarda ayı koruyarak son güne çek. */
    if (target.getMonth() !== month - 1) {
        target.setDate(0);
    }

    return formatDateForInput(target);
}

function findCustomerForRenewalData(data) {
    const phone = normalizePhone(data.customerPhone);
    const name = normalizeIdentityText(data.customerName);

    return customers.find(customer => {
        if (
            data.customerId &&
            String(customer.id) === String(data.customerId)
        ) {
            return true;
        }

        const sameName =
            name && normalizeIdentityText(customer.name) === name;

        const samePhone =
            phone && normalizePhone(customer.phone) === phone;

        return sameName && (!phone || samePhone);
    }) || null;
}

function findExistingRenewalForCustomer(customer) {
    if (!customer) {
        return null;
    }

    if (customer.renewalId) {
        const byLinkedId = renewals.find(
            renewal => String(renewal.id) === String(customer.renewalId)
        );

        if (byLinkedId) {
            return byLinkedId;
        }
    }

    return renewals.find(renewal => {
        if (
            renewal.customerId &&
            String(renewal.customerId) === String(customer.id)
        ) {
            return true;
        }

        const sameName =
            normalizeIdentityText(renewal.customerName) ===
            normalizeIdentityText(customer.name);

        const renewalPhone = normalizePhone(renewal.customerPhone);
        const customerPhone = normalizePhone(customer.phone);
        const samePhone =
            renewalPhone && customerPhone
                ? renewalPhone === customerPhone
                : true;

        return sameName && samePhone;
    }) || null;
}


function syncLinkedRenewalFromCustomer(customer) {
    if (!customer) {
        return;
    }

    const renewal = findExistingRenewalForCustomer(customer);

    if (!renewal) {
        return;
    }

    renewal.customerId = customer.id;
    renewal.customerName = customer.name || renewal.customerName || "";
    renewal.customerPhone = customer.phone || renewal.customerPhone || "";
    renewal.product = customer.product || renewal.product || "TSS";

    if (isValidAvatarColor(customer.avatarColor)) {
        renewal.avatarColor = customer.avatarColor;
    }

    customer.renewalId = renewal.id;
    renewal.updatedAt = new Date().toISOString();

    saveRenewalData();
    saveLocalData();
}

function createRenewalFromCustomer(customer) {
    if (!customer) {
        return null;
    }

    const existing = findExistingRenewalForCustomer(customer);

    if (existing) {
        customer.renewalId = existing.id;
        saveLocalData();
        return existing;
    }

    const startDate = getToday();
    const renewalDate = addYearsToDateInput(startDate, 1);
    const now = new Date().toISOString();

    const renewal = {
        id: crypto.randomUUID(),
        customerId: customer.id,
        customerName: customer.name || "",
        customerPhone: customer.phone || "",
        product: customer.product || "TSS",
        policyNumber: "",
        startDate,
        renewalDate,
        status: "Bekliyor",
        note: "Müşteri Poliçeleşti durumuna geçirildiğinde otomatik oluşturuldu.",
        avatarColor: isValidAvatarColor(customer.avatarColor)
            ? customer.avatarColor
            : DEFAULT_AVATAR_COLOR,
        createdAt: now,
        updatedAt: now,
        autoCreated: true
    };

    renewals.unshift(renewal);
    customer.renewalId = renewal.id;

    saveRenewalData();
    saveLocalData();

    return renewal;
}

function maybeOfferRenewalForCustomer(customer) {
    if (!customer || customer.status !== "Poliçeleşti") {
        return false;
    }

    if (findExistingRenewalForCustomer(customer)) {
        return false;
    }

    pendingRenewalOfferCustomerId = customer.id;

    const overlay = ensureRenewalOfferModal();
    $("renewalOfferCustomer").textContent = customer.name || "Bu müşteri";
    overlay.classList.add("show");

    requestAnimationFrame(() => $("confirmRenewalOffer")?.focus());
    return true;
}

function openRenewalModal(renewal = null) {
    $("renewalForm")?.reset();
    $("renewalId").value = "";
    editingRenewalId = null;

    if (renewal) {
        editingRenewalId = renewal.id;
        $("renewalModalTitle").textContent = "Poliçeyi Düzenle";
        $("renewalId").value = renewal.id;
        $("renewalCustomerName").value = renewal.customerName || "";
        $("renewalCustomerPhone").value = renewal.customerPhone || "";
        $("renewalProduct").value = renewal.product || "TSS";
        $("renewalPolicyNumber").value = renewal.policyNumber || "";
        $("renewalStartDate").value = renewal.startDate || "";
        $("renewalDate").value = renewal.renewalDate || "";
        $("renewalStatus").value = renewal.status || "Bekliyor";
        $("renewalNote").value = renewal.note || "";
    } else {
        $("renewalModalTitle").textContent = "Yeni Poliçe";
        $("renewalStatus").value = "Bekliyor";
    }

    $("renewalModal")?.classList.add("show");
}

function closeRenewalModal() {
    $("renewalModal")?.classList.remove("show");
    editingRenewalId = null;
}

function setupRenewalForm() {
    $("renewalForm")?.addEventListener("submit", event => {
        event.preventDefault();

        const data = {
            customerName: $("renewalCustomerName").value.trim(),
            customerPhone: $("renewalCustomerPhone").value.trim(),
            product: $("renewalProduct").value,
            policyNumber: $("renewalPolicyNumber").value.trim(),
            startDate: $("renewalStartDate").value,
            renewalDate: $("renewalDate").value,
            status: $("renewalStatus").value,
            note: $("renewalNote").value.trim(),
            updatedAt: new Date().toISOString()
        };

        if (!data.customerName) {
            alert("Lütfen müşteri adını girin.");
            return;
        }

        if (!data.renewalDate) {
            alert("Lütfen yenileme tarihini girin.");
            return;
        }

        if (editingRenewalId) {
            const index = renewals.findIndex(
                item => item.id === editingRenewalId
            );

            if (index !== -1) {
                const previous = renewals[index];
                const linkedCustomer = findCustomerForRenewalData({
                    ...previous,
                    ...data
                });

                renewals[index] = {
                    ...previous,
                    ...data,
                    customerId: previous.customerId || linkedCustomer?.id || null,
                    avatarColor: previous.avatarColor || linkedCustomer?.avatarColor || DEFAULT_AVATAR_COLOR
                };
            }
        } else {
            const linkedCustomer = findCustomerForRenewalData(data);
            const renewal = {
                id: crypto.randomUUID(),
                ...data,
                customerId: linkedCustomer?.id || null,
                avatarColor: linkedCustomer?.avatarColor || DEFAULT_AVATAR_COLOR,
                createdAt: new Date().toISOString()
            };

            renewals.unshift(renewal);

            if (linkedCustomer && !linkedCustomer.renewalId) {
                linkedCustomer.renewalId = renewal.id;
                saveLocalData();
            }
        }

        saveRenewalData();
        renderRenewals();
        closeRenewalModal();
    });
}

function editRenewal(id) {
    const renewal = renewals.find(item => item.id === id);

    if (renewal) {
        openRenewalModal(renewal);
    }
}

function deleteRenewal(id) {
    const renewal = renewals.find(item => item.id === id);

    if (!renewal) {
        return;
    }

    const confirmed = confirm(
        `${renewal.customerName} poliçesini silmek istediğinize emin misiniz?`
    );

    if (!confirmed) {
        return;
    }

    renewals = renewals.filter(item => item.id !== id);

    if (renewal.customerId) {
        const customer = customers.find(
            item => String(item.id) === String(renewal.customerId)
        );

        if (customer && String(customer.renewalId || "") === String(id)) {
            customer.renewalId = null;
            saveLocalData();
        }
    }

    saveRenewalData();
    renderRenewals();
}

function setupRenewalActions() {
    $("renewalList")?.addEventListener("click", event => {
        const button = event.target.closest("[data-renewal-action]");

        if (!button) {
            return;
        }

        const id = button.dataset.id;
        const action = button.dataset.renewalAction;

        if (action === "edit") {
            editRenewal(id);
        }

        if (action === "delete") {
            deleteRenewal(id);
        }
    });
}

function setupRenewalFilters() {
    $("renewalSearchInput")?.addEventListener("input", renderRenewals);
    $("renewalProductFilter")?.addEventListener("change", renderRenewals);
    $("renewalDateFilter")?.addEventListener("change", renderRenewals);

    $("clearRenewalFilters")?.addEventListener("click", () => {
        $("renewalSearchInput").value = "";
        $("renewalProductFilter").value = "all";
        $("renewalDateFilter").value = "all";
        renderRenewals();
    });
}

function setupRenewalModalEvents() {
    $("addRenewalButton")?.addEventListener("click", () => {
        openRenewalModal();
    });

    $("closeRenewalModal")?.addEventListener("click", closeRenewalModal);
    $("cancelRenewal")?.addEventListener("click", closeRenewalModal);

    $("renewalModal")?.addEventListener("click", event => {
        if (event.target === $("renewalModal")) {
            closeRenewalModal();
        }
    });
}
