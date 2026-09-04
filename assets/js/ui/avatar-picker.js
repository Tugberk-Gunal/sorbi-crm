/* =========================================================
   SORBİ CRM - ORTAK AVATAR RENK SİSTEMİ
   Müşteri / Yenileme / Tahsilat kayıtlarında aynı renk seçici.
========================================================= */

function isValidAvatarColor(color) {
    return Boolean(
        color && /^#[0-9A-Fa-f]{6}$/.test(String(color))
    );
}

function getAvatarColor(record) {
    return record && isValidAvatarColor(record.avatarColor)
        ? record.avatarColor
        : null;
}

function getAvatarStyle(record) {
    const color = getAvatarColor(record);

    return color
        ? `style="background-color:${escapeHTML(color)};"`
        : "";
}

function normalizeIdentityText(value) {
    return String(value || "")
        .trim()
        .toLocaleLowerCase("tr-TR")
        .replace(/\s+/g, " ");
}

function normalizePhone(value) {
    return String(value || "").replace(/\D/g, "");
}

function findCustomerForLinkedRecord(record) {
    if (!record || !Array.isArray(customers)) {
        return null;
    }

    if (record.customerId) {
        const byId = customers.find(
            customer => String(customer.id) === String(record.customerId)
        );

        if (byId) {
            return byId;
        }
    }

    const name = normalizeIdentityText(
        record.customerName || record.name
    );
    const phone = normalizePhone(
        record.customerPhone || record.phone
    );

    return customers.find(customer => {
        const sameName =
            name && normalizeIdentityText(customer.name) === name;

        const samePhone =
            phone && normalizePhone(customer.phone) === phone;

        return sameName && (!phone || samePhone);
    }) || null;
}

function getAvatarTargetRecord(type, id) {
    const targetId = String(id || "");

    if (!targetId) {
        return null;
    }

    if (type === "customer") {
        return customers.find(
            item => String(item.id) === targetId
        ) || null;
    }

    if (type === "renewal") {
        return renewals.find(
            item => String(item.id) === targetId
        ) || null;
    }

    if (
        type === "collection" &&
        typeof collections !== "undefined" &&
        Array.isArray(collections)
    ) {
        return collections.find(
            item => String(item.id) === targetId
        ) || null;
    }

    return null;
}

function createAvatarColorPicker() {
    if ($("avatarColorPicker")) {
        return;
    }

    const picker = document.createElement("div");

    picker.id = "avatarColorPicker";
    picker.className = "avatar-color-picker";

    picker.innerHTML = `
        <div class="avatar-color-picker-title">Avatar Rengi</div>

        <div class="avatar-color-options">
            ${AVATAR_COLORS.map(color => `
                <button
                    type="button"
                    class="avatar-color-option"
                    data-avatar-color="${color}"
                    style="background-color:${color};"
                    title="Bu rengi kullan"
                ></button>
            `).join("")}
        </div>

        <label class="avatar-color-custom" for="avatarCustomColor">
            <span>Özel renk</span>
            <input
                id="avatarCustomColor"
                type="color"
                value="#2f8f6b"
            >
        </label>

        <button
            type="button"
            class="avatar-color-default"
            id="avatarColorDefault"
        >
            ↩ Varsayılan renge dön
        </button>
    `;

    document.body.appendChild(picker);
}

function openAvatarColorPickerForTarget(type, id, avatarElement) {
    const record = getAvatarTargetRecord(type, id);

    if (!record || !avatarElement) {
        return;
    }

    createAvatarColorPicker();

    const picker = $("avatarColorPicker");

    if (!picker) {
        return;
    }

    activeAvatarColorTarget = {
        type,
        id: String(id)
    };

    activeAvatarColorCustomerId =
        type === "customer" ? String(id) : null;

    const customColor = $("avatarCustomColor");

    if (customColor) {
        customColor.value =
            getAvatarColor(record) || "#2f8f6b";
    }

    picker.classList.add("show");

    const rect = avatarElement.getBoundingClientRect();
    const pickerWidth = 220;
    const pickerHeight = 190;

    let left = rect.left + rect.width / 2 - pickerWidth / 2;
    let top = rect.bottom + 10;

    left = Math.max(
        10,
        Math.min(left, window.innerWidth - pickerWidth - 10)
    );

    if (top + pickerHeight > window.innerHeight - 10) {
        top = rect.top - pickerHeight - 10;
    }

    picker.style.left = `${left}px`;
    picker.style.top = `${Math.max(10, top)}px`;
}

function openAvatarColorPicker(customerId, avatarElement) {
    openAvatarColorPickerForTarget(
        "customer",
        customerId,
        avatarElement
    );
}

function closeAvatarColorPicker() {
    $("avatarColorPicker")?.classList.remove("show");
    activeAvatarColorCustomerId = null;
    activeAvatarColorTarget = null;
}

function persistAllAvatarStores() {
    if (typeof saveLocalData === "function") {
        saveLocalData();
    }

    if (typeof saveRenewalData === "function") {
        saveRenewalData();
    }

    if (typeof saveCollectionData === "function") {
        saveCollectionData();
    }
}

function renderAllAvatarConsumers() {
    if (typeof renderAll === "function") {
        renderAll();
    }

    if (typeof renderCollections === "function") {
        renderCollections();
    }

    if (
        selectedCustomerId &&
        detailOverlay?.classList.contains("show") &&
        typeof openCustomerDetail === "function"
    ) {
        openCustomerDetail(selectedCustomerId);
    }
}

function setAvatarTargetColor(type, id, color) {
    const record = getAvatarTargetRecord(type, id);

    if (!record) {
        return;
    }

    const normalizedColor = isValidAvatarColor(color)
        ? color
        : DEFAULT_AVATAR_COLOR;

    record.avatarColor = normalizedColor;

    let linkedCustomer =
        type === "customer"
            ? record
            : findCustomerForLinkedRecord(record);

    if (linkedCustomer) {
        const customerId = String(linkedCustomer.id);

        linkedCustomer.avatarColor = normalizedColor;

        if (type !== "customer" && !record.customerId) {
            record.customerId = linkedCustomer.id;
        }

        renewals.forEach(renewal => {
            const match =
                String(renewal.customerId || "") === customerId;

            if (match) {
                renewal.avatarColor = normalizedColor;
            }
        });

        if (
            typeof collections !== "undefined" &&
            Array.isArray(collections)
        ) {
            collections.forEach(collection => {
                const match =
                    String(collection.customerId || "") === customerId;

                if (match) {
                    collection.avatarColor = normalizedColor;
                }
            });
        }
    }

    persistAllAvatarStores();
    renderAllAvatarConsumers();
    closeAvatarColorPicker();
}

function setCustomerAvatarColor(customerId, color) {
    setAvatarTargetColor(
        "customer",
        customerId,
        color
    );
}

function setupAvatarColorPicker() {
    createAvatarColorPicker();

    document.addEventListener("click", event => {
        const avatar = event.target.closest(
            "[data-avatar-customer], [data-avatar-renewal], [data-avatar-collection]"
        );

        if (avatar) {
            event.preventDefault();
            event.stopPropagation();

            if (avatar.dataset.avatarRenewal) {
                openAvatarColorPickerForTarget(
                    "renewal",
                    avatar.dataset.avatarRenewal,
                    avatar
                );
                return;
            }

            if (avatar.dataset.avatarCollection) {
                openAvatarColorPickerForTarget(
                    "collection",
                    avatar.dataset.avatarCollection,
                    avatar
                );
                return;
            }

            openAvatarColorPickerForTarget(
                "customer",
                avatar.dataset.avatarCustomer,
                avatar
            );
            return;
        }

        const colorButton = event.target.closest(
            "[data-avatar-color]"
        );

        if (colorButton && activeAvatarColorTarget) {
            event.preventDefault();
            event.stopPropagation();

            setAvatarTargetColor(
                activeAvatarColorTarget.type,
                activeAvatarColorTarget.id,
                colorButton.dataset.avatarColor
            );
            return;
        }

        if (
            event.target.closest("#avatarColorDefault") &&
            activeAvatarColorTarget
        ) {
            event.preventDefault();
            event.stopPropagation();

            setAvatarTargetColor(
                activeAvatarColorTarget.type,
                activeAvatarColorTarget.id,
                DEFAULT_AVATAR_COLOR
            );
            return;
        }

        if (event.target.closest("#avatarColorPicker")) {
            return;
        }

        closeAvatarColorPicker();
    });

    document.addEventListener("change", event => {
        if (
            event.target.id !== "avatarCustomColor" ||
            !activeAvatarColorTarget
        ) {
            return;
        }

        setAvatarTargetColor(
            activeAvatarColorTarget.type,
            activeAvatarColorTarget.id,
            event.target.value
        );
    });

    document.addEventListener("keydown", event => {
        if (event.key === "Escape") {
            closeAvatarColorPicker();
        }
    });

    window.addEventListener("resize", closeAvatarColorPicker);
    window.addEventListener("scroll", closeAvatarColorPicker, true);
}
