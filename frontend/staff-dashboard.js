const API_URL = "https://campusbite-lo8a.onrender.com";

let storeIsOpen = true;


// ===============================
// PAGE LOAD
// ===============================

document.addEventListener("DOMContentLoaded", function () {

    loadStaffName();

    loadDashboardStats();

    loadRecentOrders();

    loadPopularItem();

    loadLowStock();

    loadStoreStatus();

    updateLiveTime();

    setInterval(updateLiveTime, 1000);

});


// ===============================
// STAFF NAME
// ===============================

function loadStaffName() {

    const staffNameElement =
        document.getElementById("staff-name-display");

    if (!staffNameElement) {
        return;
    }

    const staffName =
        localStorage.getItem("staffName");

    if (staffName) {
        staffNameElement.textContent = staffName;
    } else {
        staffNameElement.textContent = "Staff";
    }
}


// ===============================
// DASHBOARD STATS
// ===============================

async function loadDashboardStats() {

    try {

        const response = await fetch(
            `${API_URL}/staff/dashboard/stats`
        );

        if (!response.ok) {
            throw new Error("Unable to load dashboard stats");
        }

        const data = await response.json();

        if (!data.success) {
            throw new Error("Dashboard stats failed");
        }

        const stats = data.stats;

        // Today's Orders
        const todayOrders =
            document.getElementById("today-orders");

        if (todayOrders) {
            todayOrders.textContent =
                stats.today_orders || 0;
        }


        // Today's Revenue
        const todayRevenue =
            document.getElementById("today-revenue");

        if (todayRevenue) {
            todayRevenue.textContent =
                "₹" + Number(
                    stats.today_sales || 0
                ).toFixed(2);
        }


        // Today's Sales
        const todaySales =
            document.getElementById("today-sales");

        if (todaySales) {
            todaySales.textContent =
                "₹" + Number(
                    stats.today_sales || 0
                ).toFixed(2);
        }


        // Pending Orders
        const pendingOrders =
            document.getElementById("pending-orders");

        if (pendingOrders) {
            pendingOrders.textContent =
                stats.pending_orders || 0;
        }

        const heroPending =
            document.getElementById("hero-pending");

        if (heroPending) {
            heroPending.textContent =
                Number(stats.pending_orders || 0).toLocaleString();
        }


        // Menu Items
        const menuItems =
            document.getElementById("menu-items");

        if (menuItems) {
            menuItems.textContent =
                stats.menu_items || 0;
        }


        // Placed Orders
        const placedOrders =
            document.getElementById("placed-orders");

        if (placedOrders) {
            placedOrders.textContent =
                stats.placed_orders || 0;
        }


        // Preparing Orders
        const preparingOrders =
            document.getElementById("preparing-orders");

        if (preparingOrders) {
            preparingOrders.textContent =
                stats.preparing_orders || 0;
        }


        // Ready Orders
        const readyOrders =
            document.getElementById("ready-orders");

        if (readyOrders) {
            readyOrders.textContent =
                stats.ready_orders || 0;
        }


        // Collected Orders
        const collectedOrders =
            document.getElementById("collected-orders");

        if (collectedOrders) {
            collectedOrders.textContent =
                stats.collected_orders || 0;
        }


        // Available Items
        const availableItems =
            document.getElementById("available-items");

        if (availableItems) {
            availableItems.textContent =
                stats.available_items || 0;
        }

        const heroAvailable =
            document.getElementById("hero-available");

        if (heroAvailable) {
            heroAvailable.textContent =
                Number(stats.available_items || 0).toLocaleString();
        }


        // Out Of Stock
        const outOfStockItems =
            document.getElementById("out-of-stock-items");

        if (outOfStockItems) {
            outOfStockItems.textContent =
                stats.out_of_stock_items || 0;
        }


        // Average Order Value
        const averageOrderValue =
            document.getElementById("average-order-value");

        if (averageOrderValue) {

            const orders =
                Number(stats.today_orders || 0);

            const sales =
                Number(stats.today_sales || 0);

            let average = 0;

            if (orders > 0) {
                average = sales / orders;
            }

            averageOrderValue.textContent =
                "₹" + average.toFixed(2);
        }


        updateRevenuePulse(
            Number(stats.today_sales || 0),
            stats.sales_activity || []
        );

        updateKitchenLoad(
            Number(stats.pending_orders || 0)
        );

        updateCanteenHealth(
            Number(stats.available_items || 0),
            Number(stats.menu_items || 0),
            Number(stats.out_of_stock_items || 0)
        );

    }

    catch (error) {

        console.error(
            "Dashboard stats error:",
            error
        );

    }
}


// ===============================
// RECENT ORDERS
// ===============================

async function loadRecentOrders() {

    try {

        const response = await fetch(
            `${API_URL}/staff/dashboard/recent-orders`
        );

        const data =
            await response.json();

        if (!data.success) {
            return;
        }

        const container =
            document.getElementById("recent-orders");

        if (!container) {
            return;
        }

        container.innerHTML = "";


        if (!data.orders || data.orders.length === 0) {

            container.innerHTML = `
                <div class="empty-state">
                    No recent orders
                </div>
            `;

            return;
        }


        data.orders.forEach(order => {

            const orderElement =
                document.createElement("div");

            orderElement.className =
                "recent-order-item";


            const status =
                order.status || "PLACED";


            orderElement.innerHTML = `

                <div class="order-main">

                    <div class="order-id">
                        #${order.id}
                    </div>

                    <div class="order-student">
                        ${order.student_name || "Student"}
                    </div>

                    <div class="order-register">
                        ${order.register_number || ""}
                    </div>

                </div>


                <div class="order-middle">

                    <div class="pickup-slot">
                        ${order.pickup_slot || "No slot"}
                    </div>

                    <div class="order-time">
                        ${formatDateTime(order.created_at)}
                    </div>

                </div>


                <div class="order-right">

                    <div class="order-price">
                        ₹${Number(
                            order.total_amount || 0
                        ).toFixed(2)}
                    </div>

                    <span class="order-status ${getStatusClass(status)}">
                        ${status}
                    </span>

                </div>

            `;


            container.appendChild(
                orderElement
            );

        });

    }

    catch (error) {

        console.error(
            "Recent orders error:",
            error
        );

    }
}


// ===============================
// POPULAR ITEM
// ===============================

async function loadPopularItem() {

    try {

        const response = await fetch(
            `${API_URL}/staff/dashboard/popular-item`
        );

        const data =
            await response.json();


        const popularItem =
            document.getElementById("popular-item");


        if (!popularItem) {
            return;
        }


        if (
            data.success &&
            data.item
        ) {

            popularItem.innerHTML = `

                <div class="popular-item-name">
                    ${data.item.name}
                </div>

                <div class="popular-item-count">
                    ${data.item.total_quantity}
                    orders
                </div>

            `;

        }

        else {

            popularItem.innerHTML = `
                <div class="empty-state">
                    No popular item yet
                </div>
            `;

        }

    }

    catch (error) {

        console.error(
            "Popular item error:",
            error
        );

    }
}


// ===============================
// LOW STOCK
// ===============================

async function loadLowStock() {

    try {

        const response = await fetch(
            `${API_URL}/staff/dashboard/low-stock`
        );

        const data =
            await response.json();


        const lowStockContainer =
            document.getElementById(
                "low-stock-items"
            );


        if (!lowStockContainer) {
            return;
        }


        lowStockContainer.innerHTML = "";


        if (
            !data.success ||
            !data.items ||
            data.items.length === 0
        ) {

            lowStockContainer.innerHTML = `

                <div class="empty-state">
                    <span>✓</span>
                    All items have sufficient stock
                </div>

            `;

            return;
        }


        data.items.forEach(item => {

            const itemElement =
                document.createElement("div");


            itemElement.className =
                "low-stock-item";


            itemElement.innerHTML = `

                <div class="low-stock-name">
                    ${item.name}
                </div>

                <div class="low-stock-value">
                    ${item.stock_quantity}
                    left
                </div>

            `;


            lowStockContainer.appendChild(
                itemElement
            );

        });

    }

    catch (error) {

        console.error(
            "Low stock error:",
            error
        );

    }
}


// ===============================
// STORE ONLINE / OFFLINE
// ===============================

async function loadStoreStatus() {

    try {
        const response = await fetch(`${API_URL}/canteen/status`);
        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.message || "Unable to load canteen status.");
        }

        storeIsOpen = Boolean(data.is_open);
        applyStoreStatus(storeIsOpen ? "online" : "offline");
    } catch (error) {
        showDashboardToast(error.message || "Unable to load canteen status.");
    }
}


async function toggleStoreStatus() {

    const toggleButton = document.getElementById("store-toggle-btn");
    if (toggleButton) toggleButton.disabled = true;

    try {
        const response = await fetch(`${API_URL}/staff/canteen/status`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ is_open: !storeIsOpen })
        });
        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.message || "Unable to update canteen status.");
        }

        storeIsOpen = Boolean(data.is_open);
        applyStoreStatus(storeIsOpen ? "online" : "offline");
        showDashboardToast(storeIsOpen ? "Canteen is open." : "Canteen is closed.");
    } catch (error) {
        showDashboardToast(error.message || "Unable to update canteen status.");
    } finally {
        if (toggleButton) toggleButton.disabled = false;
    }
}


function showDashboardToast(message) {

    const toast = document.getElementById("dashboard-toast");
    if (!toast) return;

    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(showDashboardToast.timeout);
    showDashboardToast.timeout = setTimeout(() => toast.classList.remove("show"), 2800);
}


function applyStoreStatus(status) {

    // ==============================
    // ELEMENTS
    // ==============================

    const statusTitle =
        document.getElementById("store-status-title");

    const statusText =
        document.getElementById("store-status-text");

    const statusDot =
        document.getElementById("store-status-dot");

    const toggleButton =
        document.getElementById("store-toggle-btn");

    const toggleIcon =
        document.getElementById("store-toggle-icon");

    const toggleText =
        document.getElementById("store-toggle-text");

    const offlineBanner =
        document.getElementById("offline-banner");

    const heroStoreState =
        document.getElementById("hero-store-state");


    // ==============================
    // OFFLINE
    // ==============================

    if (status === "offline") {

        // Store Control
        if (statusTitle) {
            statusTitle.textContent = "Canteen closed";
        }

        if (statusText) {
            statusText.textContent =
                "Students cannot place new orders.";
        }

        // Red status dot
        if (statusDot) {
            statusDot.classList.add("offline");
        }

        // Toggle button
        if (toggleButton) {

            toggleButton.classList.remove("online");
            toggleButton.classList.add("offline");

        }

        if (toggleIcon) {
            toggleIcon.textContent = "●";
        }

        if (toggleText) {
            toggleText.textContent = "Open canteen";
        }

        // Hero
        if (heroStoreState) {
            heroStoreState.textContent = "Offline";
        }

        // Offline banner
        if (offlineBanner) {
            offlineBanner.classList.remove("hidden");
        }

    }


    // ==============================
    // ONLINE
    // ==============================

    else {

        // Store Control
        if (statusTitle) {
            statusTitle.textContent = "Canteen open";
        }

        if (statusText) {
            statusText.textContent =
                "Students can place orders.";
        }

        // Green status dot
        if (statusDot) {
            statusDot.classList.remove("offline");
        }

        // Toggle button
        if (toggleButton) {

            toggleButton.classList.remove("offline");
            toggleButton.classList.add("online");

        }

        if (toggleIcon) {
            toggleIcon.textContent = "●";
        }

        if (toggleText) {
            toggleText.textContent = "Close canteen";
        }

        // Hero
        if (heroStoreState) {
            heroStoreState.textContent = "Online";
        }

        // Hide offline banner
        if (offlineBanner) {
            offlineBanner.classList.add("hidden");
        }

    }
}

// ===============================
// REVENUE PULSE
// ===============================

function updateRevenuePulse(revenue, salesActivity) {

    const revenueValue =
        document.getElementById(
            "revenue-pulse-value"
        );


    if (revenueValue) {

        revenueValue.textContent =
            "₹" + revenue.toFixed(2);

    }

    const salesList =
        document.getElementById("sales-overview");

    if (!salesList) {
        return;
    }

    salesList.replaceChildren();

    if (!salesActivity.length) {
        const emptyMessage =
            document.createElement("div");

        emptyMessage.className = "chart-empty";
        emptyMessage.textContent = "No paid sales today yet.";
        salesList.appendChild(emptyMessage);
        return;
    }

    salesActivity.forEach(sale => {
        const row =
            document.createElement("div");

        row.className = "sales-activity-row";

        const details =
            document.createElement("div");

        const order =
            document.createElement("strong");

        order.textContent = `Order #${sale.order_id}`;

        const time =
            document.createElement("time");

        const createdAt = new Date(
            String(sale.created_at || "").replace(" ", "T")
        );

        time.textContent = Number.isNaN(createdAt.getTime())
            ? "Time unavailable"
            : createdAt.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit"
            });

        details.append(order, time);

        const amount =
            document.createElement("strong");

        amount.className = "sales-activity-amount";
        amount.textContent = `₹${Number(sale.total_amount || 0).toFixed(2)}`;

        row.append(details, amount);
        salesList.appendChild(row);
    });
}


// ===============================
// KITCHEN LOAD
// ===============================

function updateKitchenLoad(
    pendingOrders
) {

    const kitchenLoad =
        document.getElementById(
            "kitchen-load"
        );


    const kitchenText =
        document.getElementById(
            "kitchen-load-text"
        );


    if (!kitchenLoad) {
        return;
    }


    let percentage = 0;

    if (pendingOrders >= 10) {
        percentage = 100;
    }

    else if (pendingOrders > 0) {
        percentage =
            pendingOrders * 10;
    }


    kitchenLoad.style.width =
        percentage + "%";


    if (kitchenText) {

        if (pendingOrders >= 10) {

            kitchenText.textContent =
                "High";

        }

        else if (pendingOrders >= 5) {

            kitchenText.textContent =
                "Busy";

        }

        else {

            kitchenText.textContent =
                "Normal";

        }

    }
}


// ===============================
// CANTEEN HEALTH
// ===============================

function updateCanteenHealth(
    available,
    total,
    outOfStock
) {

    const healthBar =
        document.getElementById(
            "canteen-health-bar"
        );


    const healthText =
        document.getElementById(
            "canteen-health-text"
        );


    if (!healthBar) {
        return;
    }


    let percentage = 0;


    if (total > 0) {

        percentage =
            (available / total) * 100;

    }


    healthBar.style.width =
        percentage + "%";


    if (healthText) {

        if (outOfStock > 0) {

            healthText.textContent =
                "Attention Needed";

        }

        else if (percentage >= 80) {

            healthText.textContent =
                "Healthy";

        }

        else {

            healthText.textContent =
                "Moderate";

        }

    }
}


// ===============================
// LIVE CLOCK
// ===============================

function updateLiveTime() {

    const clock =
        document.getElementById(
            "live-clock"
        );


    if (!clock) {
        return;
    }


    const now =
        new Date();


    clock.textContent =
        now.toLocaleTimeString(
            "en-IN",
            {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit"
            }
        );
}


// ===============================
// STATUS CLASS
// ===============================

function getStatusClass(status) {

    status =
        status.toLowerCase();


    if (status === "placed") {
        return "status-placed";
    }


    if (
        status === "paid" ||
        status === "confirmed" ||
        status === "preparing"
    ) {
        return "status-preparing";
    }


    if (status === "ready") {
        return "status-ready";
    }


    if (status === "collected") {
        return "status-collected";
    }


    if (status === "cancelled") {
        return "status-cancelled";
    }


    return "";
}


// ===============================
// DATE & TIME
// ===============================

function formatDateTime(dateValue) {

    if (!dateValue) {
        return "";
    }


    const date =
        new Date(
            dateValue.replace(" ", "T")
        );


    if (isNaN(date.getTime())) {
        return dateValue;
    }


    return date.toLocaleString(
        "en-IN",
        {
            day: "2-digit",
            month: "short",
            hour: "2-digit",
            minute: "2-digit"
        }
    );
}


// ===============================
// REFRESH DASHBOARD
// ===============================

function refreshDashboard() {

    loadDashboardStats();

    loadRecentOrders();

    loadPopularItem();

    loadLowStock();

}


// ===============================
// LOGOUT
// ===============================

function staffLogout() {

    localStorage.removeItem(
        "staffName"
    );

    localStorage.removeItem(
        "staffEmail"
    );


    window.location.href =
        "staff-login.html";
}


// ===============================
// QUICK ACTIONS
// ===============================

function openMenu() {

    window.location.href =
        "staff-menu.html";

}


function openOrders() {

    window.location.href =
        "staff-orders.html";

}


function openQRScanner() {

    window.location.href =
        "staff-qr-scanner.html";

}


function openReports() {

    window.location.href =
        "staff-reports.html";

}


// ===============================
// BUTTON EVENTS
// ===============================

document.addEventListener(
    "click",
    function (event) {


        const storeButton =
            event.target.closest(
                "#store-status-btn"
            );


        if (storeButton) {

            toggleStoreStatus();

        }


        const refreshButton =
            event.target.closest(
                "#refresh-dashboard"
            );


        if (refreshButton) {

            refreshDashboard();

        }


        const logoutButton =
            event.target.closest(
                "#staff-logout"
            );


        if (logoutButton) {

            staffLogout();

        }

    }
);
