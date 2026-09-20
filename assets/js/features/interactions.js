/* =========================================================
   INTERACTIONS PAGE
========================================================= */

let pendingInteractionDelete = null;
const expandedInteractionCustomers = new Set();

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

    const deletedInteraction = customer.interactions.find(
        interaction => String(interaction.id) === String(interactionId)
    );
    const noteFollowsDeletedInteraction = deletedInteraction && (
        customer.noteSourceInteractionId
            ? String(customer.noteSourceInteractionId) === String(interactionId)
            : !Object.hasOwn(customer, "noteSourceInteractionId") &&
              customer.lastCall === deletedInteraction.createdAt &&
              customer.note === deletedInteraction.note
    );
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
    if (noteFollowsDeletedInteraction) {
        customer.note = latestInteraction?.note || "";
        customer.noteSourceInteractionId = latestInteraction?.id || null;
    }

    saveLocalData();
    renderAll();

    if (
        detailOverlay.classList.contains("show") &&
        String(selectedCustomerId) === String(customer.id)
    ) {
        renderLastCall($("detailLastCall"), customer.lastCall);
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

                        customerTc:
                            customer.tc || "",

                        product:
                            getCustomerProducts(customer).join(", "),

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

function filterInteractions(interactions, { search = "", type = "all", period = "all" } = {}, now = new Date()) {
    const query = search.trim().toLocaleLowerCase("tr-TR");
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const last7 = new Date(today);
    last7.setDate(last7.getDate() - 6);

    return interactions.filter(interaction => {
        if (type !== "all" && interaction.type !== type) return false;
        if (query && ![
            interaction.customerName, interaction.customerPhone,
            interaction.customerTc, interaction.note
        ].some(value => String(value || "").toLocaleLowerCase("tr-TR").includes(query))) {
            return false;
        }
        if (period === "all") return true;
        const date = new Date(interaction.createdAt);
        if (Number.isNaN(date.getTime())) return false;
        if (period === "today") return date >= today && date < tomorrow;
        if (period === "last7") return date >= last7 && date < tomorrow;
        if (period === "thisMonth") return date.getFullYear() === today.getFullYear() &&
            date.getMonth() === today.getMonth();
        return true;
    });
}

function groupInteractionsByCustomer(interactions, allInteractions = interactions) {
    const totalCounts = new Map();
    allInteractions.forEach(interaction => {
        totalCounts.set(interaction.customerId,
            (totalCounts.get(interaction.customerId) || 0) + 1);
    });
    const groups = new Map();
    interactions.forEach(interaction => {
        if (!groups.has(interaction.customerId)) {
            groups.set(interaction.customerId, {
                customerId: interaction.customerId,
                customerName: interaction.customerName,
                customerPhone: interaction.customerPhone,
                product: interaction.product,
                avatarColor: interaction.avatarColor,
                totalCount: totalCounts.get(interaction.customerId) || 0,
                interactions: []
            });
        }
        groups.get(interaction.customerId).interactions.push(interaction);
    });
    return [...groups.values()];
}

function populateInteractionTypeFilter(interactions) {
    const select = $("interactionTypeFilter");
    if (!select) return;
    const selected = select.value;
    const types = [...new Set(interactions.map(item => item.type).filter(Boolean))]
        .sort((a, b) => a.localeCompare(b, "tr"));
    select.innerHTML = `<option value="all">Tüm Görüşme Türleri</option>` +
        types.map(type => `<option value="${escapeHTML(type)}">${escapeHTML(type)}</option>`).join("");
    select.value = types.includes(selected) ? selected : "all";
}

function renderAllInteractions() {
    if (!allInteractionList) {
        return;
    }

    const allInteractions = getAllInteractions();
    populateInteractionTypeFilter(allInteractions);
    const filters = {
        search: $("interactionSearchInput")?.value || "",
        type: $("interactionTypeFilter")?.value || "all",
        period: $("interactionDateFilter")?.value || "all"
    };
    const interactions = filterInteractions(allInteractions, filters);
    const groups = groupInteractionsByCustomer(interactions, allInteractions);
    const filtersActive = Boolean(filters.search.trim()) ||
        filters.type !== "all" || filters.period !== "all";
    if ($("clearInteractionFilters")) {
        $("clearInteractionFilters").hidden = !filtersActive;
    }

    if (typeof allInteractionList.querySelectorAll === "function") {
        allInteractionList.querySelectorAll(".interaction-customer-group[open]").forEach(item =>
            expandedInteractionCustomers.add(item.dataset.customerId));
    }
    allInteractionList.innerHTML =
        "";

    if ($("interactionCount")) {
        $("interactionCount")
            .textContent =
            filtersActive
                ? `${groups.length} müşteri · ${interactions.length} / ${allInteractions.length} görüşme`
                : `${groups.length} müşteri · ${allInteractions.length} görüşme`;
    }

    if (interactionPageEmpty) {
        interactionPageEmpty.classList.toggle(
            "hidden",
            interactions.length !==
                0
        );
        interactionPageEmpty.textContent = filtersActive
            ? "Bu filtrelere uygun müşteri görüşmesi bulunamadı."
            : "Henüz müşteri görüşmesi bulunmuyor.";
    }

    const visible = getListPage("allInteractionList", [
        filters.search, filters.type, filters.period
    ].join("|"), groups);
    updateListPager("allInteractionList", groups.length, renderAllInteractions);

    visible.forEach(
        (group) => {
            const item =
                document.createElement(
                    "details"
                );

            item.className = "interaction-customer-group";
            item.dataset.customerId = group.customerId;
            item.open = expandedInteractionCustomers.has(group.customerId);

            const avatarStyle =
                isValidAvatarColor(
                    group.avatarColor
                )
                    ? `style="background-color:${escapeHTML(
                          group.avatarColor
                      )};"`
                    : "";

            const typeCounts = new Map();
            group.interactions.forEach(interaction =>
                typeCounts.set(interaction.type || "Diğer",
                    (typeCounts.get(interaction.type || "Diğer") || 0) + 1));
            const typeSummary = [...typeCounts.entries()]
                .map(([type, count]) =>
                    `<span class="interaction-page-type">${count} ${escapeHTML(type)}</span>`)
                .join("");
            const countLabel = filtersActive && group.interactions.length !== group.totalCount
                ? `${group.interactions.length} / ${group.totalCount} görüşme`
                : `${group.totalCount} görüşme`;

            item.innerHTML = `
                <summary class="interaction-customer-summary">
                    <span class="interaction-page-avatar" ${avatarStyle}>${escapeHTML(getInitials(group.customerName))}</span>
                    <span class="interaction-page-content">
                        <span class="interaction-page-top">
                            <strong>${escapeHTML(group.customerName)}</strong>
                            <time class="interaction-page-date" datetime="${escapeHTML(group.interactions[0].createdAt)}">Son görüşme: ${escapeHTML(formatDateTime(group.interactions[0].createdAt))}</time>
                        </span>
                        <span class="interaction-page-meta">${escapeHTML(group.product || "-")}${group.customerPhone ? ` · ${escapeHTML(group.customerPhone)}` : ""}</span>
                        <span class="interaction-group-counts"><strong>${countLabel}</strong>${typeSummary}</span>
                    </span>
                    <span class="interaction-group-chevron" aria-hidden="true">⌄</span>
                </summary>
                <div class="interaction-group-body">
                    <div class="interaction-group-toolbar">
                        <span>Görüşme geçmişi · yeniden eskiye</span>
                        <button class="followup-detail-button" data-interaction-customer="${escapeHTML(group.customerId)}" type="button">Müşteri Detayı</button>
                    </div>
                    <div class="interaction-group-entries">
                        ${group.interactions.map(interaction => `
                            <article class="interaction-group-entry">
                                <div class="interaction-group-entry-top">
                                    <span class="interaction-page-type">${escapeHTML(interaction.type || "Diğer")}</span>
                                    <time datetime="${escapeHTML(interaction.createdAt)}">${escapeHTML(formatDateTime(interaction.createdAt))}</time>
                                    <button class="interaction-delete-button" data-delete-interaction="${escapeHTML(interaction.id)}" data-delete-customer="${escapeHTML(interaction.customerId)}" type="button" aria-label="${escapeHTML(group.customerName)} görüşmesini sil">Sil</button>
                                </div>
                                <p class="interaction-page-note">${escapeHTML(interaction.note || "Not yok")}</p>
                            </article>
                        `).join("")}
                    </div>
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

            const button = event.target.closest("[data-interaction-customer]");
            if (button) openCustomerDetail(button.dataset.interactionCustomer);
        }
    );

    allInteractionList.addEventListener("toggle", event => {
        const group = event.target.closest?.(".interaction-customer-group");
        if (!group || event.target !== group) return;
        if (group.open) expandedInteractionCustomers.add(group.dataset.customerId);
        else expandedInteractionCustomers.delete(group.dataset.customerId);
    }, true);
}

function setupInteractionFilters() {
    let searchTimer;
    $("interactionSearchInput")?.addEventListener("input", () => {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(renderAllInteractions, 180);
    });
    $("interactionTypeFilter")?.addEventListener("change", renderAllInteractions);
    $("interactionDateFilter")?.addEventListener("change", renderAllInteractions);
    $("clearInteractionFilters")?.addEventListener("click", () => {
        clearTimeout(searchTimer);
        $("interactionSearchInput").value = "";
        $("interactionTypeFilter").value = "all";
        $("interactionDateFilter").value = "all";
        renderAllInteractions();
        $("interactionSearchInput").focus();
    });
}

/* =========================================================
   ADD / SAVE INTERACTION
========================================================= */

function updateInteractionFollowupFields() {
    const reschedule = $("interactionFollowupOutcome").value === "reschedule";
    $("interactionNextActionFields").hidden = !reschedule;
    $("interactionNextActionDate").required = reschedule;
}

function openInteractionModalForCustomer(customer) {
    if (!customer) return;
    selectedCustomerId = customer.id;
    $("interactionForm").reset();
    $("interactionFollowupPanel").hidden = false;
    $("interactionFollowupOutcome").value = "reschedule";
    $("interactionNextActionDate").setCustomValidity("");
    $("interactionNextActionTime").setCustomValidity("");
    $("interactionNextActionDate").min = getToday();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    $("interactionNextActionDate").value = formatDateForInput(tomorrow);
    $("interactionNextActionTime").value = customer.nextActionTime || "";
    updateInteractionFollowupFields();
    interactionModal.classList.add("show");
    requestAnimationFrame(() => $("interactionType")?.focus());
}

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

            const customer = customers.find(item =>
                String(item.id) === String(selectedCustomerId));
            openInteractionModalForCustomer(customer);
        }
    );

    $("interactionFollowupOutcome").addEventListener(
        "change", updateInteractionFollowupFields);
    $("interactionNextActionDate").addEventListener("input", event => {
        event.target.setCustomValidity("");
        $("interactionNextActionTime").setCustomValidity("");
    });
    $("interactionNextActionTime").addEventListener("input", event =>
        event.target.setCustomValidity(""));

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

            const outcome = $("interactionFollowupOutcome").value;
            const nextDate = outcome === "reschedule"
                ? $("interactionNextActionDate").value : "";
            const nextTime = outcome === "reschedule"
                ? $("interactionNextActionTime").value : "";
            if (outcome === "reschedule" && (!nextDate || nextDate < getToday())) {
                $("interactionNextActionDate").setCustomValidity(
                    "Bugün veya sonrası için tarih seçin.");
                $("interactionNextActionDate").reportValidity();
                return;
            }
            if (outcome === "reschedule" && nextDate === getToday() && nextTime &&
                new Date(`${nextDate}T${nextTime}`).getTime() <= Date.now()) {
                $("interactionNextActionTime").setCustomValidity(
                    "Geçmiş bir saat seçilemez.");
                $("interactionNextActionTime").reportValidity();
                return;
            }

            const oldDate = customer.nextActionDate;
            const oldTime = customer.nextActionTime;
            customer.interactions.push(
                interaction
            );

            customer.lastCall =
                interaction.createdAt;

            customer.note =
                interaction.note;
            customer.noteSourceInteractionId = interaction.id;

            if (outcome === "reschedule" || outcome === "complete") {
                setCustomerFollowupSchedule(customer,
                    outcome === "complete" ? "" : nextDate,
                    outcome === "complete" ? "" : nextTime);
                addCustomerFollowupHistory(customer,
                    outcome === "complete" ? "contact_completed" : "contact_rescheduled",
                    interaction.note, oldDate, oldTime);
            }

            saveLocalData();

            renderAll();

            renderCustomerInteractions(
                customer
            );
            renderCustomerFollowupHistory(customer);
            if (detailOverlay.classList.contains("show")) {
                renderLastCall($("detailLastCall"), customer.lastCall);
                $("detailNextAction").textContent = getCustomerReminderSummary(customer);
                $("detailNote").textContent = customer.note || "-";
            }

            interactionModal.classList.remove(
                "show"
            );
        }
    );
}
