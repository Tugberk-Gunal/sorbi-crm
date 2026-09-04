/* =========================================================
   DATE
========================================================= */

function getToday() {
    return formatDateForInput(new Date());
}

function getTomorrow() {
    const date = new Date();
    date.setDate(date.getDate() + 1);

    return formatDateForInput(date);
}

function getDateBefore(days) {
    const date = new Date();
    date.setDate(date.getDate() - days);

    return formatDateForInput(date);
}

function formatDateForInput(date) {
    const year = date.getFullYear();
    const month = String(
        date.getMonth() + 1
    ).padStart(2, "0");

    const day = String(
        date.getDate()
    ).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

/* =========================================================
   TARİH / SAAT FORMATLAMA
========================================================= */

function formatDateOnly(value) {
    if (!value) {
        return "-";
    }

    if (
        typeof value === "string" &&
        /^\d{4}-\d{2}-\d{2}$/.test(value)
    ) {
        const [year, month, day] =
            value.split("-");

        return `${day}.${month}.${year}`;
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "-";
    }

    return date.toLocaleDateString(
        "tr-TR",
        {
            day: "2-digit",
            month: "2-digit",
            year: "numeric"
        }
    );
}

function formatDateTime(value) {
    if (!value) {
        return "-";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "-";
    }

    return date.toLocaleString(
        "tr-TR",
        {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        }
    );
}

/* =========================================================
   KAYIT TARİHİ / SAATİ
========================================================= */

function formatCreatedDate(value) {
    return formatDateOnly(value);
}

function formatCreatedTime(value) {
    if (!value) {
        return "-";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "-";
    }

    return date.toLocaleTimeString(
        "tr-TR",
        {
            hour: "2-digit",
            minute: "2-digit"
        }
    );
}

function getDaysDifference(dateString) {
    if (!dateString) {
        return null;
    }

    const today = new Date();

    today.setHours(
        0,
        0,
        0,
        0
    );

    const parts =
        String(dateString).split("-");

    if (parts.length !== 3) {
        return null;
    }

    const year = Number(parts[0]);
    const month = Number(parts[1]);
    const day = Number(parts[2]);

    const target = new Date(
        year,
        month - 1,
        day
    );

    target.setHours(
        0,
        0,
        0,
        0
    );

    if (Number.isNaN(target.getTime())) {
        return null;
    }

    return Math.round(
        (target - today) /
            86400000
    );
}

function isToday(dateString) {
    return dateString === getToday();
}

function isTomorrow(dateString) {
    return dateString === getTomorrow();
}

function isOverdue(customer) {
    if (!customer.nextActionDate) {
        return false;
    }

    if (
        customer.status === "Poliçeleşti" ||
        customer.status === "Olumsuz" ||
        customer.status === "Yanlış"
    ) {
        return false;
    }

    const diff =
        getDaysDifference(
            customer.nextActionDate
        );

    return (
        diff !== null &&
        diff < 0
    );
}

function isThisWeek(dateString) {
    if (!dateString) {
        return false;
    }

    const parts = String(dateString).split("-");

    if (parts.length !== 3) {
        return false;
    }

    const target = new Date(
        Number(parts[0]),
        Number(parts[1]) - 1,
        Number(parts[2])
    );

    if (Number.isNaN(target.getTime())) {
        return false;
    }

    target.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const day = today.getDay();
    const mondayOffset = day === 0 ? -6 : 1 - day;

    const monday = new Date(today);
    monday.setDate(today.getDate() + mondayOffset);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    return target >= monday && target <= sunday;
}

/* =========================================================
   BUGÜNÜN TARİHİ VE SAATİ
========================================================= */

function updateCurrentDateTime() {
    const element =
        $("currentDateTime");

    if (!element) {
        return;
    }

    const now = new Date();

    const date =
        now.toLocaleDateString(
            "tr-TR",
            {
                weekday: "long",
                day: "2-digit",
                month: "long",
                year: "numeric"
            }
        );

    const time =
        now.toLocaleTimeString(
            "tr-TR",
            {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit"
            }
        );

    element.textContent =
        `${date} • ${time}`;
}

/* =========================================================
   TAKİPLER TARİH / SAAT
========================================================= */

function updateFollowupDateTime() {
    const dateElement =
        $("currentDate");

    const timeElement =
        $("currentTime");

    const dayElement =
        $("currentDay");

    if (
        !dateElement &&
        !timeElement &&
        !dayElement
    ) {
        return;
    }

    const now = new Date();

    if (dateElement) {
        dateElement.textContent =
            now.toLocaleDateString(
                "tr-TR",
                {
                    day: "2-digit",
                    month: "long",
                    year: "numeric"
                }
            );
    }

    if (timeElement) {
        timeElement.textContent =
            now.toLocaleTimeString(
                "tr-TR",
                {
                    hour: "2-digit",
                    minute: "2-digit"
                }
            );
    }

    if (dayElement) {
        dayElement.textContent =
            now.toLocaleDateString(
                "tr-TR",
                {
                    weekday: "long"
                }
            );
    }
}

