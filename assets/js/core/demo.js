/* =========================================================
   DEMO
========================================================= */

function createDemoCustomers() {
    const today = getToday();
    const tomorrow = getTomorrow();
    const yesterday = getDateBefore(1);

    return [
        {
            id: crypto.randomUUID(),
            name: "Ahmet Yılmaz",
            phone: "0532 123 45 67",
            tc: "12345678901",
            product: "TSS",
            status: "Teklif Verildi",
            avatarColor: "",
            lastCall: new Date().toISOString(),
            nextActionDate: today,
            createdAt: new Date().toISOString(),
            note: "Eşiyle konuşup karar verecek.",
            interactions: [
                {
                    id: crypto.randomUUID(),
                    type: "Arama",
                    note: "Teklif gönderildi. Eşiyle konuşup karar verecek.",
                    createdAt: new Date().toISOString()
                }
            ]
        },
        {
            id: crypto.randomUUID(),
            name: "Mehmet Kaya",
            phone: "0544 222 33 44",
            tc: "",
            product: "ÖSS",
            status: "Değerlendiriyor",
            avatarColor: "",
            lastCall: new Date().toISOString(),
            nextActionDate: tomorrow,
            createdAt: new Date().toISOString(),
            note: "Fiyatı değerlendirecek.",
            interactions: [
                {
                    id: crypto.randomUUID(),
                    type: "WhatsApp",
                    note: "Teklif WhatsApp üzerinden iletildi.",
                    createdAt: new Date().toISOString()
                }
            ]
        },
        {
            id: crypto.randomUUID(),
            name: "Ayşe Demir",
            phone: "0555 444 55 66",
            tc: "",
            product: "TSS",
            status: "Poliçeleşti",
            avatarColor: "",
            lastCall: new Date().toISOString(),
            nextActionDate: "",
            createdAt: new Date().toISOString(),
            note: "Poliçe işlemleri tamamlandı.",
            interactions: []
        },
        {
            id: crypto.randomUUID(),
            name: "Burak Şahin",
            phone: "0551 222 33 44",
            tc: "",
            product: "TSS",
            status: "Teklif Verildi",
            avatarColor: "",
            lastCall: new Date(
                new Date().setDate(
                    new Date().getDate() - 1
                )
            ).toISOString(),
            nextActionDate: yesterday,
            createdAt: new Date().toISOString(),
            note: "Tekrar aranacak.",
            interactions: []
        }
    ];
}

