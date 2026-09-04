/* =========================================================
   CUSTOMER MODAL
========================================================= */

function openCustomerModal(
    customer = null
) {
    $("customerForm").reset();
    $("customerId").value = "";

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

        $("customerProduct").value =
            customer.product ||
            "TSS";

        $("customerStatus").value =
            customer.status ||
            "Bilgilendirildi";

        $("nextActionDate").value =
            customer.nextActionDate ||
            "";

        $("customerNote").value =
            customer.note || "";
    } else {
        $("modalTitle").textContent =
            "Yeni Müşteri";

        $("customerStatus").value =
            "Bilgilendirildi";
    }

    customerModal.classList.add(
        "show"
    );
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
    $("customerForm")?.addEventListener("submit", event => {
        event.preventDefault();

        const id = $("customerId").value;
        const existingCustomer = id
            ? customers.find(customer => customer.id === id)
            : null;
        const previousStatus = existingCustomer?.status || null;

        const data = {
            name: $("customerName").value.trim(),
            phone: $("customerPhone").value.trim(),
            tc: $("customerTc").value.trim(),
            product: $("customerProduct").value,
            status: $("customerStatus").value,
            nextActionDate: $("nextActionDate").value,
            note: $("customerNote").value.trim(),
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

        const becamePolicy =
            savedCustomer &&
            savedCustomer.status === "Poliçeleşti" &&
            previousStatus !== "Poliçeleşti";

        if (
            becamePolicy &&
            typeof maybeOfferRenewalForCustomer === "function"
        ) {
            maybeOfferRenewalForCustomer(savedCustomer);
        }
    });
}

/* =========================================================
   EDIT / DELETE
========================================================= */

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

    const confirmed =
        confirm(
            `${customer.name} müşterisini silmek istediğinize emin misiniz?`
        );

    if (!confirmed) {
        return;
    }

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

    $("detailName").textContent =
        customer.name || "-";

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
        customer.product || "-";

    $("detailStatus").textContent =
        customer.status || "-";

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

    $("detailLastCall").textContent =
        formatDateTime(
            customer.lastCall
        );

    $("detailNextAction").textContent =
        formatDateOnly(
            customer.nextActionDate
        );

    $("detailCreatedAt").textContent =
        formatDateTime(
            customer.createdAt
        );

    $("detailNote").textContent =
        customer.note || "-";

    renderCustomerInteractions(
        customer
    );

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
