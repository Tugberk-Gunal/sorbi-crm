/* =========================================================
   FOLLOWUPS
========================================================= */

function getFollowupCustomers() {
    let result =
        customers.filter(
            (customer) =>
                customer.nextActionDate &&
                customerHasActiveFollowup(customer)
        );

    switch (
        currentFollowupFilter
    ) {
        case "agenda":
            result = result.filter(customer => {
                const days = getDaysDifference(customer.nextActionDate);
                return days !== null && days <= 0;
            });
            break;
        case "today":
            result =
                result.filter(
                    (customer) =>
                        isToday(
                            customer.nextActionDate
                        )
                );
            break;

        case "overdue":
            result =
                result.filter(
                    isOverdue
                );
            break;

        case "tomorrow":
            result =
                result.filter(
                    (customer) =>
                        isTomorrow(
                            customer.nextActionDate
                        )
                );
            break;

        case "week":
            result =
                result.filter(
                    (customer) =>
                        isThisWeek(
                            customer.nextActionDate
                        )
                );
            break;

        case "all":
            break;
    }

    return result.sort(
        (a, b) => {
            const aDate =
                getDaysDifference(
                    a.nextActionDate
                );

            const bDate =
                getDaysDifference(
                    b.nextActionDate
                );

            if (aDate !== bDate) return aDate - bDate;
            const aTime = a.nextActionTime || "99:99";
            const bTime = b.nextActionTime || "99:99";
            return aTime.localeCompare(bTime) ||
                String(a.name || "").localeCompare(String(b.name || ""), "tr");
        }
    );
}

function renderFollowups() {
    if (!followupList) {
        return;
    }

    const filtered =
        getFollowupCustomers();

    followupList.innerHTML =
        "";

    if ($("followupCount")) {
        $("followupCount").textContent =
            `${filtered.length} takip`;
    }

    if (followupEmpty) {
        followupEmpty.classList.toggle(
            "hidden",
            filtered.length !== 0
        );
    }

    const visible = getListPage("followupList", currentFollowupFilter, filtered);
    updateListPager("followupList", filtered.length, renderFollowups);

    visible.forEach(
        (customer) => {
            const card =
                document.createElement(
                    "div"
                );

            card.className =
                `followup-card${isOverdue(customer) ? " followup-overdue" : ""}${customer.isHot ? " followup-hot" : ""}`;
            card.dataset.customerId = customer.id;
            card.tabIndex = 0;
            card.setAttribute("role", "group");
            card.setAttribute("aria-label",
                `${customer.name || "Müşteri"} detaylarını açmak için Enter tuşuna basın`);

            const diff =
                getDaysDifference(
                    customer.nextActionDate
                );

            const overdue =
                diff !== null &&
                diff < 0;

            const overdueDays =
                overdue
                    ? Math.abs(diff)
                    : 0;

            let dateTitle = "";

            if (overdue) {
                dateTitle =
                    `${overdueDays} gün gecikti`;
            } else if (diff === 0) {
                dateTitle =
                    "Bugün";
            } else if (diff === 1) {
                dateTitle =
                    "Yarın";
            } else if (diff > 1) {
                dateTitle =
                    `${diff} gün sonra`;
            }

            card.innerHTML = `
                <div class="followup-customer">

                    <div
                        class="followup-avatar"
                        title="Müşteri detayını aç"
                        ${getAvatarStyle(
                            customer
                        )}
                    >
                        ${escapeHTML(
                            getInitials(
                                customer.name
                            )
                        )}
                    </div>

                    <div class="followup-customer-info">

                        <div class="followup-name-line">
                            <div class="followup-name">
                                ${escapeHTML(customer.name)}
                            </div>
                            <button
                                class="customer-hot-toggle${customer.isHot ? " is-active" : ""}"
                                type="button"
                                data-followup-action="toggle-hot"
                                data-id="${escapeHTML(customer.id)}"
                                aria-pressed="${customer.isHot === true}"
                                aria-label="${customer.isHot ? "Sıcak müşteri işaretini kaldır" : "Sıcak müşteri olarak işaretle"}"
                                title="${customer.isHot ? "Sıcak müşteri işaretini kaldır" : "Sıcak müşteri olarak işaretle"}"
                            >
                                <svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true" focusable="false">
                                    <path d="M12 22a7.5 7.5 0 0 0 7.5-7.5c0-2.8-1.2-5.2-3.5-7.3.1 2-.4 3.1-1.2 3.7C14.8 7.4 12.7 5 10 2c.3 3.8-1.4 5.8-3.3 8.1A7.5 7.5 0 0 0 12 22Z"/>
                                    <path class="customer-hot-core" d="M12 19.4a3 3 0 0 0 3-3c0-1.2-.5-2.2-1.6-3.3 0 1-.4 1.6-1 2-.2-1.3-1-2.3-2-3.3.1 1.5-.5 2.4-1.1 3.2a3 3 0 0 0 2.7 4.4Z"/>
                                </svg>
                            </button>
                        </div>

                        <div class="followup-phone">
                            📞 ${escapeHTML(
                                customer.phone ||
                                    "-"
                            )}
                        </div>

                        <div class="followup-tc">
                            ${
                                customer.tc
                                    ? `TC: ${escapeHTML(
                                          customer.tc
                                      )}`
                                    : "TC: -"
                            }
                            ${customer.insuredPersons?.length ? ` · +${customer.insuredPersons.length} sigortalı` : ""}
                        </div>

                    </div>
                </div>

                <div class="followup-meta">

                    <div class="followup-product-list" aria-label="Ürünler">
                        ${getCustomerProducts(customer).map(product =>
                            `<span class="product-badge">${escapeHTML(product)}</span>`
                        ).join("") || '<span class="product-badge">-</span>'}
                    </div>

                    <div class="followup-status-list" aria-label="Durumlar">
                        ${getCustomerStatuses(customer).map(status =>
                            `<span class="status-badge ${statusClass(status)}">${escapeHTML(status)}</span>`
                        ).join("") || '<span class="status-badge">-</span>'}
                    </div>

                </div>

                <div class="followup-date">

                    <div class="followup-date-title ${
                        overdue
                            ? ""
                            : "normal"
                    }">

                        <span class="followup-date-dot"></span>
                        ${dateTitle}

                    </div>

                    <div class="followup-date-value">
                        Takip: ${escapeHTML(getCustomerReminderSummary(customer))}
                    </div>

                    ${
                        overdue
                            ? `
                            <span class="followup-overdue-badge">
                                Geciken Takip
                            </span>
                            `
                            : ""
                    }

                </div>

                <div class="followup-actions">

                    <button
                        class="followup-detail-button followup-call-button"
                        data-followup-action="call"
                        data-id="${escapeHTML(customer.id)}"
                        type="button"
                    >
                        Görüşme Ekle
                    </button>

                    <button
                        class="followup-quick-button"
                        data-followup-action="defer"
                        data-id="${escapeHTML(customer.id)}"
                        type="button"
                    >
                        Ertele
                    </button>

                    <button
                        class="followup-quick-button followup-done-button"
                        data-followup-action="complete"
                        data-id="${escapeHTML(customer.id)}"
                        type="button"
                    >
                        Yapıldı
                    </button>

                    <button
                        class="followup-quiet-button"
                        data-followup-action="detail"
                        data-id="${escapeHTML(customer.id)}"
                        type="button"
                    >
                        Detay
                    </button>

                    <button
                        class="followup-edit-button"
                        title="Düzenle"
                        data-followup-action="edit"
                        data-id="${escapeHTML(
                            customer.id
                        )}"
                        type="button"
                    >
                        ✎
                    </button>

                </div>
            `;

            followupList.appendChild(
                card
            );
        }
    );
}

function setupFollowupFilters() {
    document
        .querySelectorAll(
            ".followup-filter"
        )
        .forEach(
            (button) => {
                button.addEventListener(
                    "click",
                    () => {
                        document
                            .querySelectorAll(
                                ".followup-filter"
                            )
                            .forEach(
                                (item) => {
                                    item.classList.remove(
                                        "active"
                                    );
                                }
                            );

                        button.classList.add(
                            "active"
                        );

                        currentFollowupFilter =
                            button.dataset.followupFilter;

                        renderFollowups();
                    }
                );
            }
        );
}

function setupFollowupActions() {
    if (!followupList) {
        return;
    }

    followupList.addEventListener(
        "click",
        (event) => {
            const button =
                event.target.closest(
                    "[data-followup-action]"
                );

            if (!button) {
                const card = event.target.closest(".followup-card");
                if (card?.dataset.customerId) {
                    openCustomerDetail(card.dataset.customerId);
                }
                return;
            }

            if (button.dataset.followupAction === "toggle-hot") {
                const customer = customers.find(item => String(item.id) === String(button.dataset.id));
                if (!customer) return;
                const previous = customer.isHot === true;
                customer.isHot = !previous;
                if (saveLocalData() === false) {
                    customer.isHot = previous;
                    return;
                }
                button.classList.toggle("is-active", customer.isHot);
                button.setAttribute("aria-pressed", String(customer.isHot));
                const label = customer.isHot
                    ? "Sıcak müşteri işaretini kaldır" : "Sıcak müşteri olarak işaretle";
                button.setAttribute("aria-label", label);
                button.title = label;
                button.closest(".followup-card")?.classList.toggle("followup-hot", customer.isHot);
                return;
            }

            if (
                button.dataset
                    .followupAction ===
                "detail"
            ) {
                openCustomerDetail(
                    button.dataset.id
                );
                return;
            }

            if (
                button.dataset
                    .followupAction ===
                "edit"
            ) {
                editCustomer(
                    button.dataset.id
                );
                return;
            }

            if (button.dataset.followupAction === "call") {
                const customer = customers.find(item =>
                    String(item.id) === String(button.dataset.id));
                if (customer) openInteractionModalForCustomer(customer);
                return;
            }

            if (["defer", "complete"].includes(button.dataset.followupAction)) {
                openFollowupActionModal(button.dataset.id,
                    button.dataset.followupAction, button);
                return;
            }
        }
    );
    followupList.addEventListener("keydown", event => {
        if (event.target?.classList?.contains("followup-card") &&
            (event.key === "Enter" || event.key === " ")) {
            event.preventDefault();
            openCustomerDetail(event.target.dataset.customerId);
        }
    });
}

let pendingFollowupAction = null;
let followupActionReturnFocus = null;

function setCustomerFollowupSchedule(customer, date, time = "") {
    customer.nextActionDate = date;
    customer.nextActionTime = date ? time : "";
    customer.reminderSnoozedUntil = null;
    customer.reminderDismissed = false;
    customer.additionalReminderTimes = [];
    customer.updatedAt = new Date().toISOString();
}

function addCustomerFollowupHistory(customer, kind, note, oldDate, oldTime) {
    if (!Array.isArray(customer.followupHistory)) customer.followupHistory = [];
    customer.followupHistory.push({
        id: crypto.randomUUID(),
        kind,
        note: note || "",
        oldDate: oldDate || "",
        oldTime: oldTime || "",
        newDate: customer.nextActionDate || "",
        newTime: customer.nextActionTime || "",
        createdAt: new Date().toISOString()
    });
}

function renderCustomerFollowupHistory(customer) {
    const host = $("detailFollowupHistory");
    if (!host) return;
    const entries = Array.isArray(customer.followupHistory)
        ? [...customer.followupHistory].reverse() : [];
    if (!entries.length) {
        host.innerHTML = '<p class="followup-history-empty">Henüz takip işlemi yok.</p>';
        return;
    }
    const labels = {
        deferred: "Takip ertelendi",
        completed: "Takip tamamlandı",
        contact_rescheduled: "Görüşme sonrası yeni takip",
        contact_completed: "Görüşme sonrası takip tamamlandı"
    };
    host.innerHTML = entries.map(entry => {
        const oldText = entry.oldDate
            ? `${formatDateOnly(entry.oldDate)}${entry.oldTime ? ` · ${escapeHTML(entry.oldTime)}` : ""}`
            : "—";
        const newText = entry.newDate
            ? `${formatDateOnly(entry.newDate)}${entry.newTime ? ` · ${escapeHTML(entry.newTime)}` : ""}`
            : "Kapandı";
        return `
            <div class="followup-history-entry">
                <div><strong>${escapeHTML(labels[entry.kind] || "Takip işlemi")}</strong>
                    <time>${escapeHTML(formatDateTime(entry.createdAt))}</time></div>
                <small>${oldText} → ${newText}</small>
                ${entry.note ? `<p>${escapeHTML(entry.note)}</p>` : ""}
            </div>
        `;
    }).join("");
}

function ensureFollowupActionModal() {
    let overlay = $("followupActionModal");
    if (overlay) return overlay;
    overlay = document.createElement("div");
    overlay.id = "followupActionModal";
    overlay.className = "modal-overlay";
    overlay.innerHTML = `
        <div class="modal small-modal followup-action-modal" role="dialog"
            aria-modal="true" aria-labelledby="followupActionTitle"
            aria-describedby="followupActionDescription">
            <div class="modal-header">
                <div><span class="eyebrow">TAKİP İŞLEMİ</span>
                    <h2 id="followupActionTitle">Takibi ertele</h2></div>
                <button id="closeFollowupAction" class="modal-close" type="button" aria-label="Kapat">×</button>
            </div>
            <p id="followupActionDescription" class="followup-action-description"></p>
            <form id="followupActionForm">
                <div id="followupScheduleFields">
                    <div class="followup-quick-dates">
                        <button type="button" data-followup-days="1">Yarın</button>
                        <button type="button" data-followup-days="3">3 gün</button>
                        <button type="button" data-followup-days="7">1 hafta</button>
                    </div>
                    <div class="followup-schedule-grid">
                        <label>Yeni Takip Tarihi
                            <input id="followupActionDate" type="date" required></label>
                        <label>Hatırlatma Saati (isteğe bağlı)
                            <input id="followupActionTime" type="time"></label>
                    </div>
                    <p class="followup-action-hint">Eski ek hatırlatma saatleri temizlenir.</p>
                </div>
                <label>Not (isteğe bağlı)
                    <textarea id="followupActionNote" rows="3"
                        placeholder="Bu işlemle ilgili kısa bir not..."></textarea></label>
                <div class="modal-actions">
                    <button id="cancelFollowupAction" class="secondary-button" type="button">Vazgeç</button>
                    <button id="confirmFollowupAction" class="primary-button" type="submit">Takibi Ertele</button>
                </div>
            </form>
        </div>
    `;
    document.body.appendChild(overlay);
    $("closeFollowupAction").addEventListener("click", closeFollowupActionModal);
    $("cancelFollowupAction").addEventListener("click", closeFollowupActionModal);
    overlay.addEventListener("click", event => {
        if (event.target === overlay) closeFollowupActionModal();
    });
    document.addEventListener("keydown", event => {
        if (event.key === "Escape" && overlay.classList.contains("show")) {
            closeFollowupActionModal();
        }
    });
    $("followupActionDate").addEventListener("input", event => {
        event.target.setCustomValidity("");
        $("followupActionTime").setCustomValidity("");
    });
    $("followupActionTime").addEventListener("input", event =>
        event.target.setCustomValidity(""));
    overlay.querySelectorAll("[data-followup-days]").forEach(button => {
        button.addEventListener("click", () => {
            const target = new Date();
            target.setDate(target.getDate() + Number(button.dataset.followupDays));
            $("followupActionDate").value = formatDateForInput(target);
            $("followupActionDate").setCustomValidity("");
            $("followupActionTime").setCustomValidity("");
        });
    });
    $("followupActionForm").addEventListener("submit", submitFollowupAction);
    return overlay;
}

function openFollowupActionModal(customerId, mode, returnFocus = document.activeElement) {
    const customer = customers.find(item => String(item.id) === String(customerId));
    if (!customer || !customer.nextActionDate ||
        !["defer", "complete"].includes(mode)) return;
    pendingFollowupAction = { customerId: customer.id, mode, date: customer.nextActionDate };
    followupActionReturnFocus = returnFocus;
    const overlay = ensureFollowupActionModal();
    $("followupActionForm").reset();
    $("followupActionDate").setCustomValidity("");
    $("followupActionTime").setCustomValidity("");
    const completing = mode === "complete";
    $("followupActionTitle").textContent = completing ? "Takip tamamlandı mı?" : "Takibi ertele";
    $("followupActionDescription").textContent = completing
        ? `${customer.name} için planlanan takip kapatılacak. Müşteri ve geçmiş kayıtlar korunacak.`
        : `${customer.name} için yeni takip tarihini seçin.`;
    $("followupScheduleFields").hidden = completing;
    $("followupActionDate").required = !completing;
    $("followupActionDate").min = getToday();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    $("followupActionDate").value = formatDateForInput(tomorrow);
    $("followupActionTime").value = customer.nextActionTime || "";
    $("confirmFollowupAction").textContent = completing ? "Takibi Tamamla" : "Takibi Ertele";
    overlay.classList.add("show");
    requestAnimationFrame(() =>
        (completing ? $("followupActionNote") : $("followupActionDate"))?.focus());
}

function closeFollowupActionModal() {
    $("followupActionModal")?.classList.remove("show");
    pendingFollowupAction = null;
    if (followupActionReturnFocus?.isConnected) followupActionReturnFocus.focus();
    followupActionReturnFocus = null;
}

function submitFollowupAction(event) {
    event.preventDefault();
    const pending = pendingFollowupAction;
    if (!pending) return;
    const customer = customers.find(item => String(item.id) === String(pending.customerId));
    if (!customer || customer.nextActionDate !== pending.date) {
        closeFollowupActionModal();
        return;
    }
    const completing = pending.mode === "complete";
    const nextDate = completing ? "" : $("followupActionDate").value;
    const nextTime = completing ? "" : $("followupActionTime").value;
    if (!completing && (!nextDate || nextDate < getToday())) {
        $("followupActionDate").setCustomValidity("Bugün veya sonrası için tarih seçin.");
        $("followupActionDate").reportValidity();
        return;
    }
    if (!completing && nextDate === getToday() && nextTime &&
        new Date(`${nextDate}T${nextTime}`).getTime() <= Date.now()) {
        $("followupActionTime").setCustomValidity("Geçmiş bir saat seçilemez.");
        $("followupActionTime").reportValidity();
        return;
    }
    if (!completing && (nextDate < customer.nextActionDate ||
        (nextDate === customer.nextActionDate &&
            (!nextTime || (customer.nextActionTime &&
                nextTime <= customer.nextActionTime))))) {
        $("followupActionDate").setCustomValidity(
            "Erteleme için mevcut takipten daha ileri bir zaman seçin.");
        $("followupActionDate").reportValidity();
        return;
    }
    $("followupActionTime").setCustomValidity("");
    const oldDate = customer.nextActionDate;
    const oldTime = customer.nextActionTime;
    const note = $("followupActionNote").value.trim();
    setCustomerFollowupSchedule(customer, nextDate, nextTime);
    addCustomerFollowupHistory(customer, completing ? "completed" : "deferred",
        note, oldDate, oldTime);
    saveLocalData();
    closeFollowupActionModal();
    renderAll();
}
