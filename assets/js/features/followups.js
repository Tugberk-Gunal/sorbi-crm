/* =========================================================
   FOLLOWUPS
========================================================= */

function getFollowupCustomers() {
    let result =
        customers.filter(
            (customer) =>
                customer.nextActionDate &&
                customer.status !==
                    "Poliçeleşti" &&
                customer.status !==
                    "Olumsuz" &&
                customer.status !==
                    "Yanlış"
        );

    switch (
        currentFollowupFilter
    ) {
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

            return (
                aDate - bDate
            );
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

    filtered.forEach(
        (customer) => {
            const card =
                document.createElement(
                    "div"
                );

            card.className =
                "followup-card";

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
                        data-avatar-customer="${escapeHTML(
                            customer.id
                        )}"
                        title="Avatar rengini değiştir"
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

                        <div class="followup-name">
                            ${escapeHTML(
                                customer.name
                            )}
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
                        </div>

                    </div>
                </div>

                <div class="followup-meta">

                    <div class="followup-product">
                        <span class="followup-product-dot"></span>
                        ${escapeHTML(
                            customer.product ||
                                "-"
                        )}
                    </div>

                    <div class="followup-status">
                        <span class="followup-status-dot"></span>
                        ${escapeHTML(
                            customer.status ||
                                "-"
                        )}
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
                        Takip:
                        ${formatDateOnly(
                            customer.nextActionDate
                        )}
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
                        class="followup-detail-button"
                        data-followup-action="detail"
                        data-id="${escapeHTML(
                            customer.id
                        )}"
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
            const avatar =
                event.target.closest(
                    "[data-avatar-customer]"
                );

            if (avatar) {
                return;
            }

            const button =
                event.target.closest(
                    "[data-followup-action]"
                );

            if (!button) {
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
            }

            if (
                button.dataset
                    .followupAction ===
                "edit"
            ) {
                editCustomer(
                    button.dataset.id
                );
            }
        }
    );
}

