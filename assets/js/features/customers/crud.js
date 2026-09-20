/* =========================================================
   CUSTOMER MODAL
========================================================= */

function openCustomerModal(
    customer = null
) {
    $("customerForm").reset();
    $("customerId").value = "";
    $("nextActionTime").setCustomValidity("");
    $("customerTc").setCustomValidity("");
    $("customerBirthDate").max = getToday();
    $("insuredPersonsFields").replaceChildren();
    $("additionalReminderTimes").replaceChildren();

    if (customer) {
        $("modalTitle").textContent =
            "Müşteriyi Düzenle";

        $("customerId").value =
            customer.id;

        $("customerName").value =
            customer.name || "";

        $("customerPhone").value =
            customer.phone || "";

        $("customerTc").value =
            customer.tc || "";

        $("customerBirthDate").value =
            customer.birthDate || "";

        $("customerProduct").value =
            customer.product ||
            "TSS";

        $("customerStatus").value =
            customer.status ||
            "Bilgilendirildi";

        $("nextActionDate").value =
            customer.nextActionDate ||
            "";

        $("nextActionTime").value = customer.nextActionTime || "";

        $("customerNote").value =
            customer.note || "";

        (customer.insuredPersons || []).forEach(addInsuredPersonField);
        (customer.additionalReminderTimes || []).forEach(addReminderTimeField);
    } else {
        $("modalTitle").textContent =
            "Yeni Müşteri";

        $("customerStatus").value =
            "Bilgilendirildi";
    }

    updateReminderAddButton();
    refreshReminderFormState(customer);

    customerModal.classList.add(
        "show"
    );
}

function updateReminderAddButton() {
    $("addReminderTime").disabled = !$("nextActionDate").value || !$("nextActionTime").value;
}

function getEditingCustomer() {
    return customers.find(customer => customer.id === $("customerId").value) || null;
}

function updateReminderTimeLabels() {
    $("additionalReminderTimes").querySelectorAll(".additional-reminder-row")
        .forEach((row, index) => {
            row.querySelector(".additional-reminder-label").textContent =
                `${index + 2}. hatırlatma saati`;
        });
}

function addReminderTimeField(reminder = {}) {
    const row = document.createElement("div");
    row.className = "additional-reminder-row";
    row.dataset.reminderId = reminder.id || crypto.randomUUID();
    row.innerHTML = `
        <label><span class="additional-reminder-label"></span><input class="additional-reminder-input" type="time" required></label>
        <button class="secondary-button remove-reminder-time" type="button" aria-label="Hatırlatma saatini kaldır">Kaldır</button>
        <span class="reminder-form-state"></span>
    `;
    row.querySelector(".additional-reminder-input").value = reminder.time || "";
    $("additionalReminderTimes").appendChild(row);
    updateReminderTimeLabels();
    return row;
}

function refreshReminderFormState(customer) {
    const sameDate = customer && customer.nextActionDate === $("nextActionDate").value;
    $("primaryReminderState").textContent = sameDate &&
        customer.nextActionTime === $("nextActionTime").value
        ? getReminderStateText(customer.reminderDismissed, customer.reminderSnoozedUntil)
        : "";

    $("additionalReminderTimes").querySelectorAll(".additional-reminder-row")
        .forEach(row => {
            const previous = sameDate && (customer.additionalReminderTimes || [])
                .find(reminder => reminder.id === row.dataset.reminderId &&
                    reminder.time === row.querySelector(".additional-reminder-input").value);
            row.querySelector(".reminder-form-state").textContent = previous
                ? getReminderStateText(previous.dismissed, previous.snoozedUntil)
                : "";
        });
}

function updateInsuredPersonLabels() {
    $("insuredPersonsFields").querySelectorAll(".insured-person-row")
        .forEach((row, index) => {
            row.querySelector(".insured-person-title").textContent =
                `${index + 2}. sigortalı`;
        });
}

function addInsuredPersonField(person = {}) {
    const row = document.createElement("div");
    row.className = "insured-person-row";
    row.dataset.personId = person.id || crypto.randomUUID();
    row.innerHTML = `
        <div class="insured-person-heading">
            <strong class="insured-person-title"></strong>
            <button class="remove-insured-button" type="button" aria-label="Sigortalıyı kaldır">Kaldır</button>
        </div>
        <div class="insured-person-grid">
            <label class="insured-person-name-label">Ad Soyad <input class="insured-person-name" type="text" placeholder="Aile üyesinin adı (isteğe bağlı)"></label>
            <label>TC Kimlik No <input class="insured-person-tc" type="text" inputmode="numeric" maxlength="11" pattern="[0-9]{11}" title="11 haneli TC kimlik numarası girin" required placeholder="11 haneli TC"></label>
            <label>Doğum Tarihi <input class="insured-person-birth-date" type="date"></label>
            <label>Ürün <select class="insured-person-product"></select></label>
            <label>Durum <select class="insured-person-status"></select></label>
        </div>
    `;
    row.querySelector(".insured-person-product").innerHTML =
        $("customerProduct").innerHTML;
    row.querySelector(".insured-person-status").innerHTML =
        $("customerStatus").innerHTML;
    row.querySelector(".insured-person-name").value = person.name || "";
    row.querySelector(".insured-person-tc").value = person.tc || "";
    row.querySelector(".insured-person-birth-date").max = getToday();
    row.querySelector(".insured-person-birth-date").value = person.birthDate || "";
    row.querySelector(".insured-person-product").value =
        normalizeProductName(person.product) || "TSS";
    row.querySelector(".insured-person-status").value =
        person.status || "Bilgilendirildi";
    $("insuredPersonsFields").appendChild(row);
    updateInsuredPersonLabels();
}

function closeCustomerModal() {
    customerModal.classList.remove(
        "show"
    );
}

/* =========================================================
   SAVE CUSTOMER
========================================================= */

function setupCustomerForm() {
    $("nextActionDate")?.addEventListener("input", () => {
        $("nextActionTime").setCustomValidity("");
        updateReminderAddButton();
        refreshReminderFormState(getEditingCustomer());
    });
    $("nextActionTime")?.addEventListener("input", event => {
        event.target.setCustomValidity("");
        updateReminderAddButton();
        refreshReminderFormState(getEditingCustomer());
    });
    $("addReminderTime")?.addEventListener("click", () => {
        const row = addReminderTimeField();
        row.querySelector(".additional-reminder-input").focus();
    });
    $("additionalReminderTimes")?.addEventListener("click", event => {
        const button = event.target.closest(".remove-reminder-time");
        if (!button) return;
        button.closest(".additional-reminder-row").remove();
        updateReminderTimeLabels();
        refreshReminderFormState(getEditingCustomer());
    });
    $("additionalReminderTimes")?.addEventListener("input", event => {
        if (event.target.matches(".additional-reminder-input")) {
            event.target.setCustomValidity("");
            refreshReminderFormState(getEditingCustomer());
        }
    });
    $("customerForm")?.addEventListener("input", event => {
        if (event.target.matches("#customerTc, .insured-person-tc")) {
            event.target.setCustomValidity("");
        }
    });
    $("addInsuredPersonButton")?.addEventListener("click", () =>
        addInsuredPersonField()
    );
    $("insuredPersonsFields")?.addEventListener("click", event => {
        const button = event.target.closest(".remove-insured-button");
        if (!button) return;
        button.closest(".insured-person-row").remove();
        updateInsuredPersonLabels();
    });

    $("customerForm")?.addEventListener("submit", event => {
        event.preventDefault();

        const id = $("customerId").value;
        const existingCustomer = id
            ? customers.find(customer => customer.id === id)
            : null;
        const previousStatuses = new Map(existingCustomer
            ? getCustomerInsuredPersons(existingCustomer).map(person => [person.id, person.status])
            : []);
        const nextActionDate = $("nextActionDate").value;
        const nextActionTime = $("nextActionTime").value;
        const reminderRows = [...$("additionalReminderTimes")
            .querySelectorAll(".additional-reminder-row")];
        if ((nextActionTime || reminderRows.length) && !nextActionDate) {
            $("nextActionTime").setCustomValidity("Önce takip tarihi seçin.");
            $("nextActionTime").reportValidity();
            return;
        }
        if (reminderRows.length && !nextActionTime) {
            $("nextActionTime").setCustomValidity("Önce ilk hatırlatma saatini girin.");
            $("nextActionTime").reportValidity();
            return;
        }

        const seenReminderTimes = new Set();
        for (const input of [$("nextActionTime"), ...reminderRows
            .map(row => row.querySelector(".additional-reminder-input"))]) {
            input.setCustomValidity("");
            if (input.value && seenReminderTimes.has(input.value)) {
                input.setCustomValidity("Bu hatırlatma saati zaten eklendi.");
                input.reportValidity();
                return;
            }
            if (input.value) seenReminderTimes.add(input.value);
        }

        const dateChanged = existingCustomer && existingCustomer.nextActionDate !== nextActionDate;
        const reminderChanged = existingCustomer && (
            dateChanged ||
            (existingCustomer.nextActionTime || "") !== nextActionTime
        );
        const additionalReminderTimes = reminderRows.map(row => {
            const time = row.querySelector(".additional-reminder-input").value;
            const previous = !dateChanged && (existingCustomer?.additionalReminderTimes || [])
                .find(reminder => reminder.id === row.dataset.reminderId && reminder.time === time);
            return {
                id: row.dataset.reminderId,
                time,
                snoozedUntil: previous?.snoozedUntil || null,
                dismissed: previous?.dismissed === true
            };
        });
        const insuredPersons = [...$("insuredPersonsFields")
            .querySelectorAll(".insured-person-row")]
            .map(row => ({
                id: row.dataset.personId,
                name: row.querySelector(".insured-person-name").value.trim(),
                tc: row.querySelector(".insured-person-tc").value.trim(),
                birthDate: row.querySelector(".insured-person-birth-date").value,
                product: row.querySelector(".insured-person-product").value,
                status: row.querySelector(".insured-person-status").value
            }));

        const seenTc = new Set();
        for (const input of [$("customerTc"), ...$("insuredPersonsFields")
            .querySelectorAll(".insured-person-tc")]) {
            input.setCustomValidity("");
            const tc = input.value.trim();
            if (tc && seenTc.has(tc)) {
                input.setCustomValidity("Bu TC bu müşteri kaydında zaten var.");
                input.reportValidity();
                return;
            }
            if (tc && customers.some(customer => customer.id !== id &&
                getCustomerInsuredPersons(customer).some(person => person.tc === tc))) {
                input.setCustomValidity("Bu TC başka bir müşteri kaydında bulunuyor.");
                input.reportValidity();
                return;
            }
            if (tc) seenTc.add(tc);
        }

        const noteValue = $("customerNote").value.trim();
        const data = {
            name: $("customerName").value.trim(),
            phone: $("customerPhone").value.trim(),
            tc: $("customerTc").value.trim(),
            birthDate: $("customerBirthDate").value,
            product: $("customerProduct").value,
            insuredPersons,
            status: $("customerStatus").value,
            nextActionDate,
            nextActionTime,
            reminderSnoozedUntil: reminderChanged ? null : existingCustomer?.reminderSnoozedUntil || null,
            reminderDismissed: reminderChanged ? false : existingCustomer?.reminderDismissed === true,
            additionalReminderTimes,
            note: noteValue,
            noteSourceInteractionId: existingCustomer &&
                existingCustomer.note === noteValue
                    ? existingCustomer.noteSourceInteractionId || null : null,
            updatedAt: new Date().toISOString()
        };

        if (!data.name) {
            alert("Lütfen müşteri adını girin.");
            return;
        }

        let savedCustomer = null;

        if (id) {
            const index = customers.findIndex(
                customer => customer.id === id
            );

            if (index !== -1) {
                customers[index] = {
                    ...customers[index],
                    ...data,
                    createdAt:
                        customers[index].createdAt ||
                        new Date().toISOString(),
                    avatarColor:
                        customers[index].avatarColor ||
                        DEFAULT_AVATAR_COLOR
                };

                savedCustomer = customers[index];
            }
        } else {
            savedCustomer = {
                id: crypto.randomUUID(),
                ...data,
                isHot: false,
                avatarColor: DEFAULT_AVATAR_COLOR,
                createdAt: new Date().toISOString(),
                lastCall: null,
                renewalId: null,
                interactions: []
            };

            customers.unshift(savedCustomer);
        }

        saveLocalData();

        if (
            savedCustomer &&
            typeof syncLinkedRenewalFromCustomer === "function"
        ) {
            syncLinkedRenewalFromCustomer(savedCustomer);
        }

        renderAll();
        closeCustomerModal();

        if (savedCustomer && typeof queueRenewalOffersForCustomer === "function") {
            queueRenewalOffersForCustomer(savedCustomer,
                getCustomerInsuredPersons(savedCustomer)
                    .filter(person => person.status === "Poliçeleşti" &&
                        previousStatuses.get(person.id) !== "Poliçeleşti")
                    .map(person => person.id));
        }
    });
}

/* =========================================================
   EDIT / DELETE
========================================================= */

let pendingCustomerDeleteId = null;
let customerDeleteReturnFocus = null;

function ensureCustomerDeleteModal() {
    let overlay = $("customerDeleteModal");
    if (overlay) return overlay;

    overlay = document.createElement("div");
    overlay.id = "customerDeleteModal";
    overlay.className = "modal-overlay";
    overlay.innerHTML = `
        <div class="modal small-modal interaction-delete-modal customer-delete-modal" role="alertdialog" aria-modal="true" aria-labelledby="customerDeleteTitle" aria-describedby="customerDeleteDescription">
            <div class="interaction-delete-icon" aria-hidden="true">×</div>
            <div class="interaction-delete-copy">
                <span class="eyebrow">MÜŞTERİ KAYDI</span>
                <h2 id="customerDeleteTitle">Müşteri silinsin mi?</h2>
                <p id="customerDeleteDescription"><strong id="customerDeleteName"></strong> müşteri kaydı kalıcı olarak silinecek.</p>
                <div class="interaction-delete-preview">
                    Müşteri profili ve görüşmeleri silinir. Poliçe ve tahsilat kayıtları ayrı kalır.
                </div>
            </div>
            <div class="modal-actions interaction-delete-actions">
                <button id="cancelCustomerDelete" class="secondary-button" type="button">Vazgeç</button>
                <button id="confirmCustomerDelete" class="interaction-confirm-delete" type="button">Müşteriyi Sil</button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);
    $("cancelCustomerDelete").addEventListener("click", closeCustomerDeleteModal);
    $("confirmCustomerDelete").addEventListener("click", confirmCustomerDelete);
    overlay.addEventListener("click", event => {
        if (event.target === overlay) closeCustomerDeleteModal();
    });
    return overlay;
}

function closeCustomerDeleteModal() {
    $("customerDeleteModal")?.classList.remove("show");
    pendingCustomerDeleteId = null;
    if (customerDeleteReturnFocus?.isConnected) customerDeleteReturnFocus.focus();
    customerDeleteReturnFocus = null;
}

function editCustomer(id) {
    const customer =
        customers.find(
            (item) =>
                item.id === id
        );

    if (customer) {
        openCustomerModal(
            customer
        );
    }
}

function deleteCustomer(id) {
    const customer =
        customers.find(
            (item) =>
                item.id === id
        );

    if (!customer) {
        return;
    }

    pendingCustomerDeleteId = customer.id;
    customerDeleteReturnFocus = document.activeElement;
    const overlay = ensureCustomerDeleteModal();
    $("customerDeleteName").textContent = customer.name || "Bu";
    overlay.classList.add("show");
    requestAnimationFrame(() => $("cancelCustomerDelete")?.focus());
}

function confirmCustomerDelete() {
    const id = pendingCustomerDeleteId;
    if (!id || !customers.some(customer => customer.id === id)) {
        closeCustomerDeleteModal();
        return;
    }
    $("customerDeleteModal")?.classList.remove("show");
    pendingCustomerDeleteId = null;
    customerDeleteReturnFocus = null;

    customers =
        customers.filter(
            (item) =>
                item.id !== id
        );

    if (
        selectedCustomerId === id
    ) {
        selectedCustomerId =
            null;

        detailOverlay.classList.remove(
            "show"
        );
    }

    closeAvatarColorPicker();

    saveLocalData();
    renderAll();
    $("addCustomerButton")?.focus();
}

/* =========================================================
   CUSTOMER DETAIL
========================================================= */

function openCustomerDetail(id) {
    const customer =
        customers.find(
            (item) =>
                item.id === id
        );

    if (!customer) {
        return;
    }

    selectedCustomerId = id;

    $("detailFullName").textContent =
        customer.name || "-";

    $("detailPhone").textContent =
        customer.phone || "-";

    $("detailAvatar").textContent =
        getInitials(
            customer.name
        );

    /*
     * Detay avatarının rengi.
     */
    const detailAvatar =
        $("detailAvatar");

    if (detailAvatar) {
        detailAvatar.dataset.avatarCustomer =
            customer.id;

        detailAvatar.title =
            "Avatar rengini değiştir";

        if (
            isValidAvatarColor(
                customer.avatarColor
            )
        ) {
            detailAvatar.style.backgroundColor =
                customer.avatarColor;
        } else {
            detailAvatar.style.removeProperty(
                "background-color"
            );
        }
    }

    $("detailProduct").textContent =
        getCustomerProducts(customer).join(", ") || "-";

    const insuredList = $("detailInsuredList");
    insuredList.innerHTML = getCustomerInsuredPersons(customer)
        .map((person, index) => `
            <div class="detail-insured-row">
                <span>${index === 0 ? "Sigorta ettiren" : `${index + 1}. sigortalı`}${person.name ? ` · ${escapeHTML(person.name)}` : ""}</span>
                <div class="detail-insured-identity">
                    <strong>${escapeHTML(person.tc || "TC bilgisi yok")}</strong>
                    <small>Doğum: ${escapeHTML(person.birthDate ? formatDateOnly(person.birthDate) : "Belirtilmedi")}</small>
                </div>
                <span class="product-badge">${escapeHTML(person.product || "-")}</span>
                <span class="status-badge ${statusClass(person.status)}">${escapeHTML(person.status || "-")}</span>
            </div>
        `).join("");

    $("detailStatus").textContent =
        getCustomerStatuses(customer).join(", ") || "-";

    const createdDateElement =
        $("detailCreatedDate");

    const createdTimeElement =
        $("detailCreatedTime");

    if (createdDateElement) {
        createdDateElement.textContent =
            formatCreatedDate(
                customer.createdAt
            );
    }

    if (createdTimeElement) {
        createdTimeElement.textContent =
            formatCreatedTime(
                customer.createdAt
            );
    }

    renderLastCall($("detailLastCall"), customer.lastCall);

    $("detailNextAction").textContent =
        getCustomerReminderSummary(customer);

    $("detailCreatedAt").textContent =
        formatDateTime(
            customer.createdAt
        );

    $("detailNote").textContent =
        customer.note || "-";

    renderCustomerInteractions(
        customer
    );
    renderCustomerFollowupHistory(customer);

    detailOverlay.classList.add(
        "show"
    );
}

function renderCustomerInteractions(
    customer
) {
    const list =
        $("interactionList");

    list.innerHTML = "";

    const interactions =
        Array.isArray(
            customer.interactions
        )
            ? [
                  ...customer.interactions
              ]
            : [];

    if (!interactions.length) {
        list.innerHTML = `
            <div class="empty-state">
                Henüz görüşme kaydı bulunmuyor.
            </div>
        `;

        return;
    }

    interactions
        .sort(
            (a, b) =>
                new Date(
                    b.createdAt
                ) -
                new Date(
                    a.createdAt
                )
        )
        .forEach(
            (interaction) => {
                const item =
                    document.createElement(
                        "div"
                    );

                item.className =
                    "interaction";

                item.innerHTML = `
                    <div class="interaction-heading">
                        <div class="interaction-date">
                            ${formatDateTime(
                                interaction.createdAt
                            )}
                        </div>

                        <button
                            class="interaction-inline-delete"
                            data-delete-interaction="${escapeHTML(interaction.id)}"
                            data-delete-customer="${escapeHTML(customer.id)}"
                            type="button"
                            title="Görüşmeyi sil"
                            aria-label="Görüşmeyi sil"
                        >
                            Sil
                        </button>
                    </div>

                    <div class="interaction-type">
                        ${escapeHTML(
                            interaction.type
                        )}
                    </div>

                    <div class="interaction-note">
                        ${escapeHTML(
                            interaction.note
                        )}
                    </div>
                `;

                list.appendChild(
                    item
                );
            }
        );
}
