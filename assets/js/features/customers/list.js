/* =========================================================
   CUSTOMER FILTERS
========================================================= */

function getFilteredCustomers() {
    let result = [...customers];

    const search =
        $("searchInput")
            .value
            .toLowerCase()
            .trim();

    const status =
        $("statusFilter").value;

    const product =
        $("productFilter").value;

    const date =
        $("dateFilter").value;

    if (search) {
        result =
            result.filter(
                (customer) => {
                    const name =
                        String(
                            customer.name ||
                                ""
                        )
                            .toLowerCase();

                    const phone =
                        String(
                            customer.phone ||
                                ""
                        )
                            .toLowerCase();

                    const tc =
                        String(
                            customer.tc ||
                                ""
                        )
                            .toLowerCase();

                    return (
                        name.includes(
                            search
                        ) ||
                        phone.includes(
                            search
                        ) ||
                        tc.includes(
                            search
                        )
                    );
                }
            );
    }

    if (status !== "all") {
        result =
            result.filter(
                (customer) =>
                    customer.status ===
                    status
            );
    }

    if (product !== "all") {
        result =
            result.filter(
                (customer) =>
                    customer.product ===
                    product
            );
    }

    if (date !== "all") {
        result =
            result.filter(
                (customer) => {
                    if (
                        !customer.nextActionDate
                    ) {
                        return false;
                    }

                    if (
                        date === "overdue"
                    ) {
                        return isOverdue(
                            customer
                        );
                    }

                    if (
                        date === "today"
                    ) {
                        return isToday(
                            customer.nextActionDate
                        );
                    }

                    if (
                        date ===
                        "tomorrow"
                    ) {
                        return isTomorrow(
                            customer.nextActionDate
                        );
                    }

                    if (
                        date === "week"
                    ) {
                        return isThisWeek(
                            customer.nextActionDate
                        );
                    }

                    return true;
                }
            );
    }

    return result;
}

/* =========================================================
   CUSTOMER RENDER
========================================================= */

function renderCustomers() {
    if (!customerList) {
        return;
    }

    const filtered =
        getFilteredCustomers();

    customerList.innerHTML = "";

    if ($("customerCount")) {
        $("customerCount").textContent =
            `${filtered.length} müşteri`;
    }

    if (emptyState) {
        emptyState.classList.toggle(
            "hidden",
            filtered.length !== 0
        );
    }

    filtered.forEach(
        (customer) => {
            const row =
                document.createElement(
                    "div"
                );

            row.className =
                "customer-row";

            const overdue =
                isOverdue(
                    customer
                );

            const today =
                isToday(
                    customer.nextActionDate
                );

            row.innerHTML = `
                <div class="customer-main">

                    <div
                        class="customer-avatar"
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

                    <div>
                        <div class="customer-name">
                            ${escapeHTML(
                                customer.name
                            )}
                        </div>

                        <div class="customer-tc">
                            ${
                                customer.tc
                                    ? `TC: ${escapeHTML(
                                          customer.tc
                                      )}`
                                    : "TC bilgisi yok"
                            }
                        </div>
                    </div>

                </div>

                <div>
                    <div class="customer-phone">
                        ${escapeHTML(
                            customer.phone ||
                                "-"
                        )}
                    </div>

                    <div class="customer-contact-label">
                        Telefon
                    </div>
                </div>

                <div>
                    <span class="product-badge">
                        ${escapeHTML(
                            customer.product
                        )}
                    </span>
                </div>

                <div>
                    <span class="status-badge ${statusClass(
                        customer.status
                    )}">
                        ${escapeHTML(
                            customer.status
                        )}
                    </span>
                </div>

                <div>
                    <span class="date-value">
                        ${formatDateTime(
                            customer.lastCall
                        )}
                    </span>
                </div>

                <div>
                    <span class="date-value ${
                        today
                            ? "today"
                            : ""
                    } ${
                        overdue
                            ? "overdue-date"
                            : ""
                    }">
                        ${
                            overdue
                                ? "⚠ "
                                : ""
                        }

                        ${
                            customer.nextActionDate
                                ? formatDateOnly(
                                      customer.nextActionDate
                                  )
                                : "-"
                        }
                    </span>
                </div>

                <div class="row-actions">

                    <button
                        class="row-action"
                        title="Detay"
                        data-action="detail"
                        data-id="${escapeHTML(
                            customer.id
                        )}"
                    >
                        👁
                    </button>

                    <button
                        class="row-action"
                        title="Düzenle"
                        data-action="edit"
                        data-id="${escapeHTML(
                            customer.id
                        )}"
                    >
                        ✎
                    </button>

                    <button
                        class="row-action delete"
                        title="Sil"
                        data-action="delete"
                        data-id="${escapeHTML(
                            customer.id
                        )}"
                    >
                        ×
                    </button>

                </div>
            `;

            customerList.appendChild(
                row
            );
        }
    );

    updateSummary();
}

function setupCustomerListActions() {
    if (!customerList) {
        return;
    }

    customerList.addEventListener(
        "click",
        (event) => {
            /*
             * Avatar tıklaması renk paneline aittir.
             * Burada return ederek detay/düzenleme
             * aksiyonlarına karışmasını engelliyoruz.
             */
            const avatar =
                event.target.closest(
                    "[data-avatar-customer]"
                );

            if (avatar) {
                return;
            }

            const button =
                event.target.closest(
                    "[data-action]"
                );

            if (!button) {
                return;
            }

            const id =
                button.dataset.id;

            const action =
                button.dataset.action;

            if (
                action === "detail"
            ) {
                openCustomerDetail(
                    id
                );
            }

            if (
                action === "edit"
            ) {
                editCustomer(id);
            }

            if (
                action === "delete"
            ) {
                deleteCustomer(id);
            }
        }
    );
}

/* =========================================================
   SUMMARY
========================================================= */

function updateSummary() {
    if ($("totalCustomers")) {
        $("totalCustomers").textContent =
            customers.length;
    }

    if ($("todayTasks")) {
        $("todayTasks").textContent =
            customers.filter(
                (customer) =>
                    customer.nextActionDate ===
                        getToday() &&
                    customer.status !==
                        "Poliçeleşti" &&
                    customer.status !==
                        "Olumsuz" &&
                    customer.status !==
                        "Yanlış"
            ).length;
    }

    if ($("offerCustomers")) {
        $("offerCustomers").textContent =
            customers.filter(
                (customer) =>
                    customer.status ===
                    "Teklif Verildi"
            ).length;
    }

    if ($("saleCustomers")) {
        $("saleCustomers").textContent =
            customers.filter(
                (customer) =>
                    customer.status ===
                    "Poliçeleşti"
            ).length;
    }

    if ($("overdueTasks")) {
        $("overdueTasks").textContent =
            customers.filter(
                isOverdue
            ).length;
    }
}

