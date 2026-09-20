/* =========================================================
   CUSTOMER FILTERS
========================================================= */

function getCustomerFollowupMonths() {
    const counts = new Map();
    customers.forEach(customer => {
        const date = String(customer.nextActionDate || "");
        if (!/^\d{4}-(0[1-9]|1[0-2])-\d{2}$/.test(date)) return;
        const month = date.slice(0, 7);
        counts.set(month, (counts.get(month) || 0) + 1);
    });
    return [...counts.entries()].sort((a, b) => b[0].localeCompare(a[0]));
}

function populateCustomerDateFilterMonths() {
    const select = $("dateFilter");
    const group = $("dateFilterMonths");
    if (!select || !group) return;
    const selected = select.value;
    const months = getCustomerFollowupMonths();
    if (/^month:\d{4}-(0[1-9]|1[0-2])$/.test(selected) &&
        !months.some(([month]) => `month:${month}` === selected)) {
        months.push([selected.slice(6), 0]);
        months.sort((a, b) => b[0].localeCompare(a[0]));
    }
    group.replaceChildren();
    months.forEach(([month, count]) => {
        const [year, monthNumber] = month.split("-").map(Number);
        const label = new Intl.DateTimeFormat("tr-TR", {
            month: "long", year: "numeric"
        }).format(new Date(year, monthNumber - 1, 1));
        const option = document.createElement("option");
        option.value = `month:${month}`;
        option.textContent = `${label.charAt(0).toLocaleUpperCase("tr-TR")}${label.slice(1)} (${count})`;
        group.appendChild(option);
    });
    select.value = selected;
}

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

                    const insuredSearch = getCustomerInsuredPersons(customer)
                        .map(person => `${person.name || ""} ${person.tc || ""}`)
                        .join(" ")
                        .toLowerCase();

                    return (
                        name.includes(
                            search
                        ) ||
                        phone.includes(
                            search
                        ) ||
                        insuredSearch.includes(
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
                    getCustomerStatuses(customer).includes(status)
            );
    }

    if (product !== "all") {
        result =
            result.filter(
                (customer) =>
                    getCustomerProducts(customer).includes(product)
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

                    if (date === "thisMonth") {
                        return customer.nextActionDate.slice(0, 7) ===
                            getToday().slice(0, 7);
                    }

                    if (/^month:\d{4}-(0[1-9]|1[0-2])$/.test(date)) {
                        return customer.nextActionDate.slice(0, 7) === date.slice(6);
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

    populateCustomerDateFilterMonths();
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

    const visible = getListPage("customerList", [
        $("searchInput").value, $("statusFilter").value,
        $("productFilter").value, $("dateFilter").value
    ].join("|"), filtered);
    updateListPager("customerList", filtered.length, renderCustomers);

    visible.forEach(
        (customer) => {
            const row =
                document.createElement(
                    "div"
                );

            row.className =
                `customer-row${customer.isHot ? " customer-row-hot" : ""}`;
            row.dataset.id = customer.id;
            row.tabIndex = 0;
            row.setAttribute("role", "group");
            row.setAttribute("aria-label", `${customer.name || "Müşteri"} detaylarını açmak için Enter tuşuna basın`);

            const overdue =
                isOverdue(
                    customer
                );

            const today =
                isToday(
                    customer.nextActionDate
                );

            const extraCount = Array.isArray(customer.insuredPersons)
                ? customer.insuredPersons.length
                : 0;
            const productBadges = getCustomerProducts(customer)
                .map(item => `<span class="product-badge">${escapeHTML(item)}</span>`)
                .join(" ");

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

                    <div class="customer-identity">
                        <div class="customer-name-line">
                            <div class="customer-name">
                                ${escapeHTML(customer.name)}
                            </div>
                            <button
                                class="customer-hot-toggle${customer.isHot ? " is-active" : ""}"
                                type="button"
                                data-action="toggle-hot"
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

                        <div class="customer-tc">
                            ${
                                customer.tc
                                    ? `TC: ${escapeHTML(
                                          customer.tc
                                      )}`
                                    : "TC bilgisi yok"
                            }
                            ${extraCount ? `<span class="customer-insured-count">+${extraCount} sigortalı</span>` : ""}
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
                    <div class="customer-product-list">${productBadges}</div>
                </div>

                <div>
                    ${getCustomerStatuses(customer).map(item =>
                        `<span class="status-badge ${statusClass(item)}">${escapeHTML(item)}</span>`
                    ).join(" ")}
                </div>

                <div>
                    <span class="date-value">${formatLastCallHTML(customer.lastCall)}</span>
                </div>

                <div>
                    <span title="${escapeHTML(getCustomerReminderSummary(customer))}" class="date-value ${
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
                                ? escapeHTML(getCustomerReminderSummary(customer, true))
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
                const row = event.target.closest(".customer-row");
                if (row && customerList.contains(row)) {
                    openCustomerDetail(row.dataset.id);
                }
                return;
            }

            const id =
                button.dataset.id;

            const action =
                button.dataset.action;

            if (action === "toggle-hot") {
                const customer = customers.find(item => String(item.id) === String(id));
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
                button.closest(".customer-row")?.classList.toggle("customer-row-hot", customer.isHot);
                return;
            }

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

    customerList.addEventListener("keydown", event => {
        const row = event.target.closest(".customer-row");
        if (event.target !== row || !["Enter", " "].includes(event.key)) {
            return;
        }
        event.preventDefault();
        openCustomerDetail(row.dataset.id);
    });
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
                    customerHasActiveFollowup(customer)
            ).length;
    }

    if ($("offerCustomers")) {
        $("offerCustomers").textContent =
            customers.filter(
                (customer) =>
                    getCustomerStatuses(customer).includes("Teklif Verildi")
            ).length;
    }

    if ($("saleCustomers")) {
        $("saleCustomers").textContent =
            customers.filter(
                (customer) =>
                    getCustomerStatuses(customer).includes("Poliçeleşti")
            ).length;
    }

    if ($("overdueTasks")) {
        $("overdueTasks").textContent =
            customers.filter(
                isOverdue
            ).length;
    }
}
