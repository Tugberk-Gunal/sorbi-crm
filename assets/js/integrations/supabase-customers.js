/* =========================================================
   SUPABASE - 
========================================================= */

async function loadCustomersFromSupabase() {
    if (
        typeof isSupabaseEnabled !==
            "function" ||
        !isSupabaseEnabled() ||
        typeof db ===
            "undefined"
    ) {
        return false;
    }

    const {
        data,
        error
    } = await db
        .from("customers")
        .select("*")
        .order(
            "created_at",
            {
                ascending: false
            }
        );

    if (error) {
        console.error(
            "Müşteriler alınamadı:",
            error
        );

        return false;
    }

    if (Array.isArray(data)) {
        customers =
            data.map(
                (customer) => ({
                    id:
                        customer.id,

                    name:
                        customer.name ||
                        "",

                    phone:
                        customer.phone ||
                        "",

                    tc:
                        customer.tc ||
                        "",

                    product:
                        customer.product ||
                        "TSS",

                    status:
                        STATUS_OPTIONS.includes(
                            customer.status
                        )
                            ? customer.status
                            : "Bilgilendirildi",

                    /*
                     * Supabase'de avatar_color
                     * alanı varsa kullanılır.
                     */
                    avatarColor:
                        customer.avatar_color ||
                        customer.avatarColor ||
                        "",

                    lastCall:
                        customer.last_call ||
                        null,

                    nextActionDate:
                        customer.next_action_date ||
                        "",

                    note:
                        customer.note ||
                        "",

                    createdAt:
                        customer.created_at ||
                        null,

                    interactions:
                        Array.isArray(
                            customer.interactions
                        )
                            ? customer.interactions
                            : []
                })
            );

        normalizeCustomers();

        renderAll();

        return true;
    }

    return false;
}

