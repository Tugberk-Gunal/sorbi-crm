/* =========================================================
   YAKLAŞAN YENİLEMELER - CRUD / OTOMATİK OLUŞTURMA
========================================================= */

let pendingRenewalOfferCustomerId = null;
let pendingRenewalOfferPersonId = null;
let renewalOfferQueue = [];

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
    pendingRenewalOfferPersonId = null;
    showNextRenewalOffer();
}

function confirmRenewalOffer() {
    const customer = customers.find(
        item => String(item.id) === String(pendingRenewalOfferCustomerId)
    );
    const person = customer && getCustomerInsuredPersons(customer)
        .find(item => String(item.id) === String(pendingRenewalOfferPersonId));

    $("renewalOfferModal")?.classList.remove("show");
    pendingRenewalOfferCustomerId = null;
    pendingRenewalOfferPersonId = null;

    if (customer && person && !findExistingRenewalForCustomer(customer, person)) {
        createRenewalFromCustomer(customer, person);
        renderRenewals();
    }
    showNextRenewalOffer();
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
    const tc = String(data.tc || "").trim();
    if (tc) {
        const matches = customers.filter(customer =>
            getCustomerInsuredPersons(customer).some(person => person.tc === tc));
        return matches.length === 1 ? matches[0] : null;
    }
    const phone = normalizePhone(data.customerPhone);
    const name = normalizeIdentityText(data.customerName);
    if (!name || !phone) return null;
    const matches = customers.filter(customer =>
        normalizeIdentityText(customer.name) === name &&
        normalizePhone(customer.phone) === phone);
    return matches.length === 1 ? matches[0] : null;
}

function resolveRenewalCustomerForEdit(previous, data) {
    const unchanged = previous &&
        normalizeIdentityText(data.customerName) === normalizeIdentityText(previous.customerName) &&
        normalizePhone(data.customerPhone) === normalizePhone(previous.customerPhone) &&
        String(data.tc || "").trim() === String(previous.tc || "").trim();
    const linkedCustomer = (unchanged && previous.customerId && customers.find(customer =>
        String(customer.id) === String(previous.customerId))) ||
        findCustomerForRenewalData(data);
    const linkedPerson = linkedCustomer && (
        (unchanged && previous.insuredPersonId &&
            getCustomerInsuredPersons(linkedCustomer).find(person =>
                String(person.id) === String(previous.insuredPersonId))) ||
        (data.tc && getCustomerInsuredPersons(linkedCustomer).find(person => person.tc === data.tc))
    );
    return { linkedCustomer, linkedPerson };
}

function findExistingRenewalForCustomer(customer, person = null) {
    if (!customer) {
        return null;
    }
    person = person || getCustomerInsuredPersons(customer)[0];
    if (person.primary && customer.renewalId) {
        const byLinkedId = renewals.find(
            renewal => String(renewal.id) === String(customer.renewalId) &&
                String(renewal.customerId || "") === String(customer.id) &&
                renewal.product === person.product &&
                (!renewal.tc || renewal.tc === person.tc)
        );

        if (byLinkedId) {
            return byLinkedId;
        }
    }

    return renewals.find(renewal => renewal.product === person.product && (
        (renewal.insuredPersonId && String(renewal.insuredPersonId) === String(person.id)) ||
        (person.tc && renewal.tc === person.tc &&
            String(renewal.customerId || "") === String(customer.id)) ||
        (person.primary && !person.tc && !renewal.tc &&
            String(renewal.customerId || "") === String(customer.id) &&
            !renewal.insuredPersonId)
    )) || null;
}


function syncLinkedRenewalFromCustomer(customer) {
    if (!customer) {
        return;
    }

    let changed = false;
    for (const person of getCustomerInsuredPersons(customer)) {
        const renewal = findExistingRenewalForCustomer(customer, person);
        if (!renewal) continue;
        if (renewal.customerId !== customer.id || renewal.insuredPersonId !== person.id) {
            renewal.customerId = customer.id;
            renewal.insuredPersonId = person.id;
            changed = true;
        }
        if (person.primary && customer.renewalId !== renewal.id) {
            customer.renewalId = renewal.id;
            changed = true;
        }
    }
    if (changed) {
        saveRenewalData();
        saveLocalData();
    }
}

function createRenewalFromCustomer(customer, person = null) {
    if (!customer) {
        return null;
    }

    person = person || getCustomerInsuredPersons(customer)[0];
    const existing = findExistingRenewalForCustomer(customer, person);

    if (existing) {
        if (person.primary) {
            customer.renewalId = existing.id;
            saveLocalData();
        }
        return existing;
    }

    const startDate = getToday();
    const renewalDate = addYearsToDateInput(startDate, 1);
    const now = new Date().toISOString();

    const renewal = {
        id: crypto.randomUUID(),
        customerId: customer.id,
        insuredPersonId: person.id,
        customerName: person.name || customer.name || "",
        customerPhone: customer.phone || "",
        tc: person.tc || "",
        product: person.product || "TSS",
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
    if (person.primary) customer.renewalId = renewal.id;

    saveRenewalData();
    saveLocalData();

    return renewal;
}

function maybeOfferRenewalForCustomer(customer, person = null) {
    if (!customer) {
        return false;
    }
    person = person || getCustomerInsuredPersons(customer)[0];
    if (person.status !== "Poliçeleşti" ||
        findExistingRenewalForCustomer(customer, person)) {
        return false;
    }

    pendingRenewalOfferCustomerId = customer.id;
    pendingRenewalOfferPersonId = person.id;

    const overlay = ensureRenewalOfferModal();
    $("renewalOfferCustomer").textContent = person.name || customer.name || "Bu müşteri";
    overlay.classList.add("show");

    requestAnimationFrame(() => $("confirmRenewalOffer")?.focus());
    return true;
}

function showNextRenewalOffer() {
    while (renewalOfferQueue.length) {
        const next = renewalOfferQueue.shift();
        const customer = customers.find(item => String(item.id) === String(next.customerId));
        const person = customer && getCustomerInsuredPersons(customer)
            .find(item => String(item.id) === String(next.personId));
        if (customer && person && maybeOfferRenewalForCustomer(customer, person)) return;
    }
}

function queueRenewalOffersForCustomer(customer, personIds) {
    renewalOfferQueue.push(...personIds.map(personId => ({ customerId: customer.id, personId })));
    if (!pendingRenewalOfferCustomerId) showNextRenewalOffer();
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
        $("renewalCustomerTc").value = renewal.tc || "";
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
    $("renewalCustomerTc")?.addEventListener("change", event => {
        const tc = event.target.value.trim();
        if (!tc) return;
        const customer = findCustomerForRenewalData({ tc });
        const person = customer && getCustomerInsuredPersons(customer)
            .find(item => item.tc === tc);
        if (!person) return;
        $("renewalProduct").value = person.product;
        if (!$("renewalCustomerName").value.trim()) {
            $("renewalCustomerName").value = person.name || customer.name;
        }
        if (!$("renewalCustomerPhone").value.trim()) {
            $("renewalCustomerPhone").value = customer.phone || "";
        }
    });
    $("renewalForm")?.addEventListener("submit", event => {
        event.preventDefault();

        const data = {
            customerName: $("renewalCustomerName").value.trim(),
            customerPhone: $("renewalCustomerPhone").value.trim(),
            tc: $("renewalCustomerTc").value.trim(),
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
                const { linkedCustomer, linkedPerson } =
                    resolveRenewalCustomerForEdit(previous, data);

                renewals[index] = {
                    ...previous,
                    ...data,
                    customerId: linkedCustomer?.id || null,
                    insuredPersonId: linkedPerson?.id || (linkedCustomer && !data.tc ? linkedCustomer.id : null),
                    avatarColor: previous.avatarColor || linkedCustomer?.avatarColor || DEFAULT_AVATAR_COLOR
                };
                if (previous.customerId && (previous.customerId !== renewals[index].customerId ||
                    (previous.tc || "") !== data.tc)) {
                    const oldCustomer = customers.find(customer =>
                        String(customer.id) === String(previous.customerId));
                    if (oldCustomer && String(oldCustomer.renewalId || "") === String(previous.id)) {
                        oldCustomer.renewalId = null;
                        saveLocalData();
                    }
                }
                if (linkedCustomer && (!data.tc || linkedPerson?.primary) &&
                    !linkedCustomer.renewalId) {
                    linkedCustomer.renewalId = previous.id;
                    saveLocalData();
                }
            }
        } else {
            const linkedCustomer = findCustomerForRenewalData(data);
            const linkedPerson = linkedCustomer && data.tc
                ? getCustomerInsuredPersons(linkedCustomer).find(person => person.tc === data.tc)
                : null;
            const renewal = {
                id: crypto.randomUUID(),
                ...data,
                customerId: linkedCustomer?.id || null,
                insuredPersonId: linkedPerson?.id || (linkedCustomer && !data.tc ? linkedCustomer.id : null),
                avatarColor: linkedCustomer?.avatarColor || DEFAULT_AVATAR_COLOR,
                createdAt: new Date().toISOString()
            };

            renewals.unshift(renewal);

            if (linkedCustomer && !linkedCustomer.renewalId &&
                (!data.tc || data.tc === linkedCustomer.tc)) {
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
    const list = $("renewalList");
    list?.addEventListener("click", event => {
        const button = event.target.closest("[data-renewal-action]");

        if (button) {
            const id = button.dataset.id;
            const action = button.dataset.renewalAction;
            if (action === "edit") editRenewal(id);
            if (action === "delete") deleteRenewal(id);
            return;
        }

        if (event.target.closest("[data-avatar-renewal]")) return;
        const row = event.target.closest(".renewal-row-linked");
        if (!row || !list.contains(row)) return;
        const renewal = renewals.find(item => String(item.id) === String(row.dataset.renewalId));
        const customer = getLinkedPolicyCustomerForRenewal(renewal);
        if (customer) openCustomerDetail(customer.id);
    });
    list?.addEventListener("keydown", event => {
        const row = event.target.closest(".renewal-row-linked");
        if (event.target !== row || !["Enter", " "].includes(event.key)) return;
        const renewal = renewals.find(item => String(item.id) === String(row.dataset.renewalId));
        const customer = getLinkedPolicyCustomerForRenewal(renewal);
        if (!customer) return;
        event.preventDefault();
        openCustomerDetail(customer.id);
    });
}

function getLinkedPolicyCustomerForRenewal(renewal) {
    if (!renewal?.customerId) return null;
    const customer = customers.find(item => String(item.id) === String(renewal.customerId));
    if (!customer) return null;
    if (renewal.autoCreated === true) return customer;

    const persons = getCustomerInsuredPersons(customer);
    const person = renewal.insuredPersonId
        ? persons.find(item => String(item.id) === String(renewal.insuredPersonId))
        : renewal.tc
            ? persons.find(item => item.tc === renewal.tc)
            : persons[0];
    return person?.status === "Poliçeleşti" ? customer : null;
}

function setupRenewalFilters() {
    let searchTimer;
    $("renewalSearchInput")?.addEventListener("input", () => {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(renderRenewals, 180);
    });
    $("renewalProductFilter")?.addEventListener("change", renderRenewals);
    $("renewalDateFilter")?.addEventListener("change", renderRenewals);

    $("clearRenewalFilters")?.addEventListener("click", () => {
        clearTimeout(searchTimer);
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
