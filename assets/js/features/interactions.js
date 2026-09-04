/* =========================================================
   INTERACTIONS PAGE
========================================================= */

let pendingInteractionDelete = null;

function ensureInteractionDeleteModal() {
    let overlay = $("interactionDeleteModal");

    if (overlay) {
        return overlay;
    }

    overlay = document.createElement("div");
    overlay.id = "interactionDeleteModal";
    overlay.className = "modal-overlay interaction-delete-overlay";
    overlay.innerHTML = `
        <div class="modal small-modal interaction-delete-modal" role="alertdialog" aria-modal="true" aria-labelledby="interactionDeleteTitle">
            <div class="interaction-delete-icon" aria-hidden="true">!</div>

            <div class="interaction-delete-copy">
                <span class="eyebrow">GÖRÜŞME KAYDI</span>
                <h2 id="interactionDeleteTitle">Görüşme silinsin mi?</h2>
                <p>
                    <strong id="interactionDeleteCustomer"></strong> için kaydedilen bu görüşme kalıcı olarak silinecek.
                </p>
                <div id="interactionDeletePreview" class="interaction-delete-preview"></div>
            </div>

            <div class="modal-actions interaction-delete-actions">
                <button id="cancelInteractionDelete" class="secondary-button" type="button">Vazgeç</button>
                <button id="confirmInteractionDelete" class="interaction-confirm-delete" type="button">Görüşmeyi Sil</button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    $("cancelInteractionDelete").addEventListener("click", closeInteractionDeleteModal);
    $("confirmInteractionDelete").addEventListener("click", confirmInteractionDelete);

    overlay.addEventListener("click", event => {
        if (event.target === overlay) {
            closeInteractionDeleteModal();
        }
    });

    document.addEventListener("keydown", event => {
        if (event.key === "Escape" && overlay.classList.contains("show")) {
            closeInteractionDeleteModal();
        }
    });

    return overlay;
}

function openInteractionDeleteModal(customerId, interactionId) {
    const customer = customers.find(item => String(item.id) === String(customerId));
    const interaction = customer?.interactions?.find(
        item => String(item.id) === String(interactionId)
    );

    if (!customer || !interaction) {
        return;
    }

    pendingInteractionDelete = {
        customerId: customer.id,
        interactionId: interaction.id
    };

    const overlay = ensureInteractionDeleteModal();
    $("interactionDeleteCustomer").textContent = customer.name || "Bu müşteri";
    $("interactionDeletePreview").textContent = interaction.note || "Not bulunmuyor.";
    overlay.classList.add("show");

    requestAnimationFrame(() => $("cancelInteractionDelete")?.focus());
}

function closeInteractionDeleteModal() {
    $("interactionDeleteModal")?.classList.remove("show");
    pendingInteractionDelete = null;
}

function deleteInteraction(customerId, interactionId) {
    const customer = customers.find(item => String(item.id) === String(customerId));

    if (!customer || !Array.isArray(customer.interactions)) {
        return;
    }

    const previousLength = customer.interactions.length;
    customer.interactions = customer.interactions.filter(
        interaction => String(interaction.id) !== String(interactionId)
    );

    if (customer.interactions.length === previousLength) {
        return;
    }

    const latestInteraction = [...customer.interactions].sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    )[0];

    customer.lastCall = latestInteraction?.createdAt || null;
    customer.note = latestInteraction?.note || "";

    saveLocalData();
    renderAll();

    if (
        detailOverlay.classList.contains("show") &&
        String(selectedCustomerId) === String(customer.id)
    ) {
        $("detailLastCall").textContent = formatDateTime(customer.lastCall);
        $("detailNote").textContent = customer.note || "-";
        renderCustomerInteractions(customer);
    }
}

function confirmInteractionDelete() {
    if (!pendingInteractionDelete) {
        return;
    }

    const { customerId, interactionId } = pendingInteractionDelete;
    $("interactionDeleteModal")?.classList.remove("show");
    pendingInteractionDelete = null;
    deleteInteraction(customerId, interactionId);
}

function getAllInteractions() {
    const result = [];

    customers.forEach(
        (customer) => {
            (
                customer.interactions ||
                []
            ).forEach(
                (interaction) => {
                    result.push({
                        ...interaction,

                        customerId:
                            customer.id,

                        customerName:
                            customer.name,

                        customerPhone:
                            customer.phone,

                        product:
                            customer.product,

                        avatarColor:
                            customer.avatarColor ||
                            ""
                    });
                }
            );
        }
    );

    return result.sort(
        (a, b) =>
            new Date(
                b.createdAt
            ) -
            new Date(
                a.createdAt
            )
    );
}

function renderAllInteractions() {
    if (!allInteractionList) {
        return;
    }

    const interactions =
        getAllInteractions();

    allInteractionList.innerHTML =
        "";

    if ($("interactionCount")) {
        $("interactionCount")
            .textContent =
            `${interactions.length} görüşme`;
    }

    if (interactionPageEmpty) {
        interactionPageEmpty.classList.toggle(
            "hidden",
            interactions.length !==
                0
        );
    }

    interactions.forEach(
        (interaction) => {
            const item =
                document.createElement(
                    "div"
                );

            item.className =
                "interaction-page-item";

            const avatarStyle =
                isValidAvatarColor(
                    interaction.avatarColor
                )
                    ? `style="background-color:${escapeHTML(
                          interaction.avatarColor
                      )};"`
                    : "";

            item.innerHTML = `
                <div
                    class="interaction-page-avatar"
                    data-avatar-customer="${escapeHTML(
                        interaction.customerId
                    )}"
                    title="Avatar rengini değiştir"
                    ${avatarStyle}
                >
                    ${escapeHTML(
                        getInitials(
                            interaction.customerName
                        )
                    )}
                </div>

                <div class="interaction-page-content">

                    <div class="interaction-page-top">

                        <strong>
                            ${escapeHTML(
                                interaction.customerName
                            )}
                        </strong>

                        <span>
                            ${formatDateTime(
                                interaction.createdAt
                            )}
                        </span>

                    </div>

                    <div class="interaction-page-meta">
                        ${escapeHTML(
                            interaction.type
                        )}
                        ·
                        ${escapeHTML(
                            interaction.product ||
                                "-"
                        )}
                        ${
                            interaction.customerPhone
                                ? ` · ${escapeHTML(
                                      interaction.customerPhone
                                  )}`
                                : ""
                        }
                    </div>

                    <div class="interaction-page-note">
                        ${escapeHTML(
                            interaction.note
                        )}
                    </div>

                </div>

                <div class="interaction-page-actions">
                    <button
                        class="followup-detail-button"
                        data-interaction-customer="${escapeHTML(
                            interaction.customerId
                        )}"
                        type="button"
                    >
                        Detay
                    </button>

                    <button
                        class="interaction-delete-button"
                        data-delete-interaction="${escapeHTML(interaction.id)}"
                        data-delete-customer="${escapeHTML(interaction.customerId)}"
                        type="button"
                        title="Görüşmeyi sil"
                        aria-label="${escapeHTML(interaction.customerName)} görüşmesini sil"
                    >
                        Sil
                    </button>
                </div>
            `;

            allInteractionList.appendChild(
                item
            );
        }
    );
}

function setupInteractionPageActions() {
    if (!allInteractionList) {
        return;
    }

    allInteractionList.addEventListener(
        "click",
        (event) => {
            const deleteButton = event.target.closest("[data-delete-interaction]");

            if (deleteButton) {
                openInteractionDeleteModal(
                    deleteButton.dataset.deleteCustomer,
                    deleteButton.dataset.deleteInteraction
                );
                return;
            }

            const avatar =
                event.target.closest(
                    "[data-avatar-customer]"
                );

            if (avatar) {
                return;
            }

            const button =
                event.target.closest(
                    "[data-interaction-customer]"
                );

            if (!button) {
                return;
            }

            openCustomerDetail(
                button.dataset
                    .interactionCustomer
            );
        }
    );
}

/* =========================================================
   ADD / SAVE INTERACTION
========================================================= */

function setupInteractionEvents() {
    $("interactionList")?.addEventListener("click", event => {
        const deleteButton = event.target.closest("[data-delete-interaction]");

        if (!deleteButton) {
            return;
        }

        openInteractionDeleteModal(
            deleteButton.dataset.deleteCustomer,
            deleteButton.dataset.deleteInteraction
        );
    });

    $("addInteractionButton").addEventListener(
        "click",
        () => {
            if (!selectedCustomerId) {
                return;
            }

            $("interactionForm").reset();

            interactionModal.classList.add(
                "show"
            );
        }
    );

    $("interactionForm").addEventListener(
        "submit",
        (event) => {
            event.preventDefault();

            const customer =
                customers.find(
                    (item) =>
                        item.id ===
                        selectedCustomerId
                );

            if (!customer) {
                return;
            }

            if (
                !Array.isArray(
                    customer.interactions
                )
            ) {
                customer.interactions =
                    [];
            }

            const interaction = {
                id: crypto.randomUUID(),

                type:
                    $("interactionType")
                        .value,

                note:
                    $("interactionNote")
                        .value
                        .trim(),

                createdAt:
                    new Date().toISOString()
            };

            if (!interaction.note) {
                alert(
                    "Lütfen görüşme notunu girin."
                );

                return;
            }

            customer.interactions.push(
                interaction
            );

            customer.lastCall =
                interaction.createdAt;

            customer.note =
                interaction.note;

            saveLocalData();

            renderAll();

            renderCustomerInteractions(
                customer
            );

            interactionModal.classList.remove(
                "show"
            );
        }
    );
}
