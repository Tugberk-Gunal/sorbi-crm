/* =========================================================
   THEME - LIGHT / DARK
========================================================= */

function loadTheme() {
    const theme =
        localStorage.getItem(
            "sorbi_theme"
        ) || "light";

    document.body.classList.toggle(
        "dark",
        theme === "dark"
    );

    updateThemeIcon();
}

function updateThemeIcon() {
    const button =
        $("themeToggle");

    if (!button) {
        return;
    }

    const dark =
        document.body.classList.contains(
            "dark"
        );

    button.textContent =
        dark
            ? "☀"
            : "☾";

    button.title =
        dark
            ? "Açık moda geç"
            : "Koyu moda geç";
}

function setupTheme() {
    $("themeToggle").addEventListener(
        "click",
        () => {
            const dark =
                document.body.classList.toggle(
                    "dark"
                );

            localStorage.setItem(
                "sorbi_theme",
                dark
                    ? "dark"
                    : "light"
            );

            updateThemeIcon();
        }
    );
}

/* =========================================================
   MODAL EVENTS
========================================================= */

function setupModalEvents() {
    $("addCustomerButton").addEventListener(
        "click",
        () => {
            openCustomerModal();
        }
    );

    $("closeCustomerModal").addEventListener(
        "click",
        closeCustomerModal
    );

    $("cancelCustomer").addEventListener(
        "click",
        closeCustomerModal
    );

    $("closeDetail").addEventListener(
        "click",
        () => {
            detailOverlay.classList.remove(
                "show"
            );
        }
    );

    $("closeInteraction").addEventListener(
        "click",
        () => {
            interactionModal.classList.remove(
                "show"
            );
        }
    );

    $("cancelInteraction").addEventListener(
        "click",
        () => {
            interactionModal.classList.remove(
                "show"
            );
        }
    );

    document.addEventListener(
        "click",
        (event) => {
            if (
                event.target ===
                customerModal
            ) {
                closeCustomerModal();
            }

            if (
                event.target ===
                detailOverlay
            ) {
                detailOverlay.classList.remove(
                    "show"
                );
            }

            if (
                event.target ===
                interactionModal
            ) {
                interactionModal.classList.remove(
                    "show"
                );
            }
        }
    );

    document.addEventListener(
        "keydown",
        (event) => {
            if (
                event.key !==
                "Escape"
            ) {
                return;
            }

            const interactionDeleteModal = $("interactionDeleteModal");

            if (interactionDeleteModal?.classList.contains("show")) {
                closeInteractionDeleteModal();
                return;
            }

            customerModal.classList.remove(
                "show"
            );

            detailOverlay.classList.remove(
                "show"
            );

            interactionModal.classList.remove(
                "show"
            );

            closeAvatarColorPicker();
        }
    );
}

/* =========================================================
   FILTER EVENTS
========================================================= */

function setupFilters() {
    $("searchInput").addEventListener(
        "input",
        renderCustomers
    );

    $("statusFilter").addEventListener(
        "change",
        renderCustomers
    );

    $("productFilter").addEventListener(
        "change",
        renderCustomers
    );

    $("dateFilter").addEventListener(
        "change",
        renderCustomers
    );

    $("clearFilters").addEventListener(
        "click",
        () => {
            $("searchInput").value =
                "";

            $("statusFilter").value =
                "all";

            $("productFilter").value =
                "all";

            $("dateFilter").value =
                "all";

            renderCustomers();
        }
    );
}

/* =========================================================
   LOGOUT
========================================================= */

function setupLogout() {
    $("logoutButton").addEventListener(
        "click",
        async () => {
            if (
                typeof logoutUser ===
                "function"
            ) {
                await logoutUser();
            }

            alert(
                "Çıkış işlemi tamamlandı."
            );
        }
    );
}
