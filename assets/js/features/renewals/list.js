/* =========================================================
   RENEWALS
========================================================= */

function getRenewalDaysDifference(dateString) {
    if (!dateString) {
        return null;
    }

    const today = new Date();

    today.setHours(0, 0, 0, 0);

    const parts =
        String(dateString).split("-");

    if (parts.length !== 3) {
        return null;
    }

    const year = Number(parts[0]);
    const month = Number(parts[1]);
    const day = Number(parts[2]);

    const target =
        new Date(
            year,
            month - 1,
            day
        );

    target.setHours(0, 0, 0, 0);

    if (Number.isNaN(target.getTime())) {
        return null;
    }

    return Math.round(
        (target - today) / 86400000
    );
}


function formatRemainingDays(days) {

    if (days === null) {
        return "-";
    }

    if (days < 0) {
        return `${Math.abs(days)} gün geçti`;
    }

    if (days === 0) {
        return "Bugün";
    }

    if (days === 1) {
        return "Yarın";
    }

    return `${days} gün`;
}


function isClosedRenewal(renewal) {
    return (
        renewal?.status === "Yenilendi" ||
        renewal?.status === "Olumsuz"
    );
}


/* =========================================================
   RENEWAL FILTER
========================================================= */

function getFilteredRenewals() {

    let result = [...renewals];

    const search =
        $("renewalSearchInput")
            ?.value
            .toLowerCase()
            .trim() || "";

    const product =
        $("renewalProductFilter")
            ?.value || "all";

    const date =
        $("renewalDateFilter")
            ?.value || "all";


    if (search) {

        result =
            result.filter(
                (renewal) => {

                    const name =
                        String(
                            renewal.customerName || ""
                        )
                            .toLowerCase();

                    const policy =
                        String(
                            renewal.policyNumber || ""
                        )
                            .toLowerCase();

                    return (
                        name.includes(search) ||
                        policy.includes(search)
                    );
                }
            );
    }


    if (product !== "all") {

        result =
            result.filter(
                (renewal) =>
                    renewal.product === product
            );
    }


    if (date !== "all") {

        result =
            result.filter(
                (renewal) => {

                    if (isClosedRenewal(renewal)) {
                        return false;
                    }

                    const days =
                        getRenewalDaysDifference(
                            renewal.renewalDate
                        );

                    if (days === null) {
                        return false;
                    }

                    if (date === "expired") {
                        return days < 0;
                    }

                    const limit =
                        Number(date);

                    return (
                        days >= 0 &&
                        days <= limit
                    );
                }
            );
    }


    return result.sort(
        (a, b) => {

            const aDays =
                getRenewalDaysDifference(
                    a.renewalDate
                );

            const bDays =
                getRenewalDaysDifference(
                    b.renewalDate
                );

            return (
                (aDays ?? 99999) -
                (bDays ?? 99999)
            );
        }
    );
}


/* =========================================================
   RENEWAL SUMMARY
========================================================= */

function updateRenewalSummary() {

    const total =
        renewals.length;

    const days30 =
        renewals.filter(
            (renewal) => {

                if (isClosedRenewal(renewal)) {
                    return false;
                }

                const days =
                    getRenewalDaysDifference(
                        renewal.renewalDate
                    );

                return (
                    days !== null &&
                    days >= 0 &&
                    days <= 30
                );
            }
        ).length;

    const days7 =
        renewals.filter(
            (renewal) => {

                if (isClosedRenewal(renewal)) {
                    return false;
                }

                const days =
                    getRenewalDaysDifference(
                        renewal.renewalDate
                    );

                return (
                    days !== null &&
                    days >= 0 &&
                    days <= 7
                );
            }
        ).length;

    const expired =
        renewals.filter(
            (renewal) => {

                if (isClosedRenewal(renewal)) {
                    return false;
                }

                const days =
                    getRenewalDaysDifference(
                        renewal.renewalDate
                    );

                return (
                    days !== null &&
                    days < 0
                );
            }
        ).length;


    if ($("totalRenewals")) {
        $("totalRenewals").textContent =
            total;
    }

    if ($("renewals30Days")) {
        $("renewals30Days").textContent =
            days30;
    }

    if ($("renewals7Days")) {
        $("renewals7Days").textContent =
            days7;
    }

    if ($("expiredRenewals")) {
        $("expiredRenewals").textContent =
            expired;
    }
}


/* =========================================================
   RENDER RENEWALS
========================================================= */

function renderRenewals() {

    const list =
        $("renewalList");

    if (!list) {
        return;
    }

    const filtered =
        getFilteredRenewals();

    list.innerHTML = "";


    if ($("renewalCount")) {
        $("renewalCount").textContent =
            `${filtered.length} poliçe`;
    }


    if ($("renewalEmpty")) {

        $("renewalEmpty")
            .classList.toggle(
                "hidden",
                filtered.length !== 0
            );
    }


    filtered.forEach(
        (renewal) => {

            const item =
                document.createElement("div");

            item.className =
                "customer-row renewal-row";


            const days =
                getRenewalDaysDifference(
                    renewal.renewalDate
                );


            let remainingClass = "";

            if (days !== null) {

                if (days < 0) {
                    remainingClass =
                        "overdue-date";
                }

                else if (days <= 7) {
                    remainingClass =
                        "today";
                }
            }


            item.innerHTML = `

                <div class="customer-main">

                    <div
                        class="customer-avatar renewal-avatar"
                        data-avatar-renewal="${escapeHTML(
                            renewal.id
                        )}"
                        title="Avatar rengini değiştir"
                        ${
                            isValidAvatarColor(renewal.avatarColor)
                                ? `style="background-color:${escapeHTML(renewal.avatarColor)};"`
                                : ""
                        }
                    >
                        ${escapeHTML(
                            getInitials(
                                renewal.customerName
                            )
                        )}
                    </div>

                    <div>

                        <div class="customer-name">
                            ${escapeHTML(
                                renewal.customerName
                            )}
                        </div>

                    </div>

                </div>


                <div>

                    <div class="customer-phone">
                        ${escapeHTML(
                            renewal.customerPhone || "-"
                        )}
                    </div>

                    <div class="customer-contact-label">
                        Telefon
                    </div>

                </div>


                <div>

                    <span class="product-badge">
                        ${escapeHTML(
                            renewal.product || "-"
                        )}
                    </span>

                </div>


                <div>

                    <span class="date-value">
                        ${escapeHTML(
                            renewal.policyNumber || "-"
                        )}
                    </span>

                </div>


                <div>

                    <span class="date-value">
                        ${formatDateOnly(
                            renewal.renewalDate
                        )}
                    </span>

                </div>


                <div>

                    <span class="date-value ${remainingClass}">
                        ${formatRemainingDays(
                            days
                        )}
                    </span>

                </div>


                <div class="row-actions">

                    <button
                        class="row-action"
                        title="Düzenle"
                        data-renewal-action="edit"
                        data-id="${escapeHTML(
                            renewal.id
                        )}"
                    >
                        ✎
                    </button>

                    <button
                        class="row-action delete"
                        title="Sil"
                        data-renewal-action="delete"
                        data-id="${escapeHTML(
                            renewal.id
                        )}"
                    >
                        ×
                    </button>

                </div>
            `;

            list.appendChild(item);
        }
    );


    updateRenewalSummary();
}



