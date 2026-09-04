/* =========================================================
   STORAGE
   LocalStorage geçiş katmanı. Backend'e taşınırken sadece bu
   dosya ve integration katmanı değiştirilir.
========================================================= */

const STORAGE_KEYS = {
    customers: "sorbi_customers",
    renewals: "sorbi_renewals"
};

function loadLocalData() {
    const saved = localStorage.getItem(STORAGE_KEYS.customers);

    if (!saved) {
        customers = createDemoCustomers();
        normalizeCustomers();
        saveLocalData();
        return;
    }

    try {
        const parsed = JSON.parse(saved);
        customers = Array.isArray(parsed) ? parsed : [];
        normalizeCustomers();
    } catch (error) {
        console.error("Local müşteri verisi okunamadı:", error);
        customers = createDemoCustomers();
        normalizeCustomers();
        saveLocalData();
    }
}

function saveLocalData() {
    localStorage.setItem(
        STORAGE_KEYS.customers,
        JSON.stringify(customers)
    );
}

function normalizeCustomers() {
    customers = customers.map(customer => {
        const normalizedStatus = STATUS_OPTIONS.includes(customer.status)
            ? customer.status
            : "Bilgilendirildi";

        return {
            ...customer,
            id: customer.id || crypto.randomUUID(),
            name: customer.name || "",
            phone: customer.phone || "",
            tc: customer.tc || "",
            product: customer.product || "TSS",
            status: normalizedStatus,
            nextActionDate: customer.nextActionDate || "",
            lastCall: customer.lastCall || null,
            createdAt: customer.createdAt || null,
            note: customer.note || "",
            renewalId: customer.renewalId || null,
            avatarColor: isValidAvatarColor(customer.avatarColor)
                ? customer.avatarColor
                : DEFAULT_AVATAR_COLOR,
            interactions: Array.isArray(customer.interactions)
                ? customer.interactions.map(interaction => ({
                      ...interaction,
                      id: interaction.id || crypto.randomUUID()
                  }))
                : []
        };
    });
}

function loadRenewalData() {
    const saved = localStorage.getItem(STORAGE_KEYS.renewals);

    if (!saved) {
        renewals = [];
        return;
    }

    try {
        const parsed = JSON.parse(saved);
        renewals = Array.isArray(parsed) ? parsed : [];
        normalizeRenewals();
    } catch (error) {
        console.error("Yenileme verileri okunamadı:", error);
        renewals = [];
    }
}

function saveRenewalData() {
    localStorage.setItem(
        STORAGE_KEYS.renewals,
        JSON.stringify(renewals)
    );
}

function normalizeRenewals() {
    renewals = renewals.map(renewal => ({
        ...renewal,
        id: renewal.id || crypto.randomUUID(),
        customerId: renewal.customerId || null,
        customerName: renewal.customerName || "",
        customerPhone: renewal.customerPhone || "",
        product: renewal.product || "TSS",
        policyNumber: renewal.policyNumber || "",
        startDate: renewal.startDate || "",
        renewalDate: renewal.renewalDate || "",
        status: renewal.status || "Bekliyor",
        note: renewal.note || "",
        createdAt: renewal.createdAt || new Date().toISOString(),
        updatedAt: renewal.updatedAt || null,
        avatarColor: isValidAvatarColor(renewal.avatarColor)
            ? renewal.avatarColor
            : DEFAULT_AVATAR_COLOR
    }));
}
