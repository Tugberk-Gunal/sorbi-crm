/* Risk iframe'ine yalnızca açıkça bağlanan CRM müşterilerinin kimliklerini iletir. */
let lastRiskCustomerSignature = "";
function publishRiskCustomers(force = false) {
    const frame = document.getElementById("riskTrackingFrame");
    if (!frame?.contentWindow) return;
    const summaries = customers.map(customer => ({
            id: customer.id,
            name: customer.name || "",
            tcLast4: String(customer.tc || "").slice(-4)
        }));
    const signature = JSON.stringify(summaries);
    if (!force && signature === lastRiskCustomerSignature) return;
    lastRiskCustomerSignature = signature;
    frame.contentWindow.postMessage({ type: "sorbi:crm-customers", customers: summaries }, "*");
}

window.addEventListener("message", event => {
    const frame = document.getElementById("riskTrackingFrame");
    if (event.source === frame?.contentWindow &&
        event.data?.type === "sorbi:request-crm-customers") {
        publishRiskCustomers(true);
    }
});

document.getElementById("riskTrackingFrame")?.addEventListener(
    "load", () => publishRiskCustomers(true)
);
