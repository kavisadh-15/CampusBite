const API_BASE_URL = "https://campusbite-lo8a.onrender.com";

const dateFrom = document.getElementById("date-from");
const dateTo = document.getElementById("date-to");
const reportPeriod = document.getElementById("report-period");
const toast = document.getElementById("toast");

document.addEventListener("DOMContentLoaded", () => {
    setDefaultDates();
    updateStoreStatus();
    document.getElementById("load-report").addEventListener("click", loadReport);
    document.getElementById("refresh-reports").addEventListener("click", loadReport);
    loadReport();
});

function setDefaultDates() {
    const today = new Date();
    const previousWeek = new Date(today);
    previousWeek.setDate(today.getDate() - 6);
    dateFrom.value = toDateInput(previousWeek);
    dateTo.value = toDateInput(today);
}

async function loadReport() {
    if (!dateFrom.value || !dateTo.value) {
        showToast("Choose a valid report period.");
        return;
    }
    if (dateFrom.value > dateTo.value) {
        showToast("The start date must be before the end date.");
        return;
    }

    reportPeriod.textContent = dateFrom.value === dateTo.value
        ? formatDate(dateFrom.value)
        : `${formatDate(dateFrom.value)} - ${formatDate(dateTo.value)}`;

    try {
        const query = new URLSearchParams({ date_from: dateFrom.value, date_to: dateTo.value });
        const response = await fetch(`${API_BASE_URL}/staff/reports?${query}`);
        const data = await response.json();
        if (!response.ok || !data.success) {
            throw new Error(data.message || "Unable to load reports.");
        }
        renderReport(data);
    } catch (error) {
        console.error("Reports error:", error);
        showToast(error.message || "Unable to load reports.");
        renderEmptyReport();
    }
}

function renderReport(data) {
    const summary = data.summary || {};
    document.getElementById("total-orders").textContent = Number(summary.total_orders || 0);
    document.getElementById("total-sales").textContent = money(summary.total_sales);
    document.getElementById("refunded-sales").textContent = money(summary.refunded_sales);
    document.getElementById("average-order").textContent = money(summary.average_order_value);
    document.getElementById("collected-orders").textContent = Number(summary.collected_orders || 0);
    document.getElementById("cancelled-orders").textContent = Number(summary.cancelled_orders || 0);
    renderDailySales(data.daily_sales || []);
    renderStatusBreakdown(data.status_breakdown || []);
    renderPopularItems(data.popular_items || []);
}

function renderDailySales(rows) {
    const container = document.getElementById("daily-sales");
    if (!rows.length) {
        container.innerHTML = `<div class="empty-report">No sales recorded for this period.</div>`;
        return;
    }
    const maxSales = Math.max(...rows.map(row => Number(row.sales || 0)), 1);
    container.innerHTML = rows.map(row => `<div class="daily-row"><span>${escapeHTML(formatDate(row.date))}</span><div class="daily-bar"><span style="width:${(Number(row.sales || 0) / maxSales) * 100}%"></span></div><span class="daily-value">${money(row.sales)} / ${Number(row.order_count || 0)} orders</span></div>`).join("");
}

function renderStatusBreakdown(rows) {
    const container = document.getElementById("status-breakdown");
    if (!rows.length) {
        container.innerHTML = `<div class="empty-report">No order statuses for this period.</div>`;
        return;
    }
    const total = rows.reduce((sum, row) => sum + Number(row.count || 0), 0) || 1;
    container.innerHTML = rows.map(row => `<div class="status-row"><span>${escapeHTML(formatStatus(row.status))}</span><strong>${Number(row.count || 0)}</strong><div class="status-track"><span style="width:${(Number(row.count || 0) / total) * 100}%"></span></div></div>`).join("");
}

function renderPopularItems(rows) {
    const container = document.getElementById("popular-items");
    if (!rows.length) {
        container.innerHTML = `<div class="empty-report">No item sales recorded for this period.</div>`;
        return;
    }
    container.innerHTML = rows.map((row, index) => `<div class="popular-row"><span class="rank">${index + 1}</span><span>${escapeHTML(row.food_name || "Food item")}</span><span class="popular-quantity">${Number(row.quantity_sold || 0)} sold</span><strong>${money(row.revenue)}</strong></div>`).join("");
}

function renderEmptyReport() {
    document.getElementById("daily-sales").innerHTML = `<div class="empty-report">Report data is unavailable.</div>`;
    document.getElementById("status-breakdown").innerHTML = `<div class="empty-report">Report data is unavailable.</div>`;
    document.getElementById("popular-items").innerHTML = `<div class="empty-report">Report data is unavailable.</div>`;
}

function updateStoreStatus() {
    if (window.refreshCanteenStatus) {
        window.refreshCanteenStatus();
    }
}

function money(value) {
    return `₹${Number(value || 0).toFixed(2)}`;
}

function toDateInput(value) {
    return value.toISOString().slice(0, 10);
}

function formatDate(value) {
    const date = new Date(`${value}T00:00:00`);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}

function formatStatus(value) {
    return String(value || "Unknown").toLowerCase().replace(/_/g, " ").replace(/(^| )\w/g, character => character.toUpperCase());
}

function escapeHTML(value) {
    return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;").replace(/'/g, "&#039;");
}

function showToast(message) {
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => toast.classList.remove("show"), 2600);
}
