const STAFF_API_URL = "http://127.0.0.1:5000";

// ===============================
// PASSWORD SHOW / HIDE
// ===============================

function setupPasswordToggle(inputId, buttonId) {
    const input = document.getElementById(inputId);
    const button = document.getElementById(buttonId);

    if (!input || !button) return;

    button.addEventListener("click", () => {
        if (input.type === "password") {
            input.type = "text";
            button.textContent = "🙈";
        } else {
            input.type = "password";
            button.textContent = "👁";
        }
    });
}


// ===============================
// STAFF REGISTER
// ===============================

const staffRegisterForm = document.getElementById("staff-register-form");

if (staffRegisterForm) {

    setupPasswordToggle("staff-password", "staff-password-toggle");
    setupPasswordToggle("staff-confirm-password", "staff-confirm-password-toggle");

    staffRegisterForm.addEventListener("submit", async (event) => {

        event.preventDefault();

        const name = document.getElementById("staff-name").value.trim();
        const email = document.getElementById("staff-email").value.trim();
        const password = document.getElementById("staff-password").value;
        const confirmPassword =
            document.getElementById("staff-confirm-password").value;

        const message = document.getElementById("staff-register-message");

        if (password !== confirmPassword) {
            message.textContent = "Passwords do not match.";
            message.className = "error-message";
            return;
        }

        if (password.length < 6) {
            message.textContent = "Password must contain at least 6 characters.";
            message.className = "error-message";
            return;
        }

        try {

            const response = await fetch(`${STAFF_API_URL}/staff/register`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    name: name,
                    email: email,
                    password: password
                })
            });

            const result = await response.json();

            if (response.ok) {

                message.textContent =
                    result.message || "Staff registration successful.";

                message.className = "success-message";

                staffRegisterForm.reset();

                setTimeout(() => {
                    window.location.href = "staff-login.html";
                }, 1200);

            } else {

                message.textContent =
                    result.message || "Registration failed.";

                message.className = "error-message";
            }

        } catch (error) {

            console.error("Staff registration error:", error);

            message.textContent =
                "Unable to connect to server. Please try again.";

            message.className = "error-message";
        }
    });
}


// ===============================
// STAFF LOGIN
// ===============================

const staffLoginForm = document.getElementById("staff-login-form");

if (staffLoginForm) {

    setupPasswordToggle("staff-password", "staff-password-toggle");

    staffLoginForm.addEventListener("submit", async (event) => {

        event.preventDefault();

        const email = document.getElementById("staff-email").value.trim();
        const password = document.getElementById("staff-password").value;

        const message = document.getElementById("staff-login-message");

        try {

            const response = await fetch(`${STAFF_API_URL}/staff/login`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    email: email,
                    password: password
                })
            });

            const result = await response.json();

            if (response.ok) {

                if (result.user && result.user.role === "staff") {

                    localStorage.setItem(
                        "staff",
                        JSON.stringify(result.user)
                    );

                    message.textContent =
                        result.message || "Login successful.";

                    message.className = "success-message";

                    setTimeout(() => {
                        window.location.href = "staff-dashboard.html";
                    }, 800);

                } else {

                    message.textContent =
                        "Invalid staff account.";

                    message.className = "error-message";
                }

            } else {

                message.textContent =
                    result.message || "Invalid email or password.";

                message.className = "error-message";
            }

        } catch (error) {

            console.error("Staff login error:", error);

            message.textContent =
                "Unable to connect to server. Please try again.";

            message.className = "error-message";
        }
    });
}


// ===============================
// STAFF AUTH HELPER
// ===============================

function getLoggedInStaff() {

    const staffData = localStorage.getItem("staff");

    if (!staffData) {
        return null;
    }

    try {
        return JSON.parse(staffData);
    } catch (error) {
        console.error("Invalid staff data:", error);
        localStorage.removeItem("staff");
        return null;
    }
}


// ===============================
// STAFF LOGOUT
// ===============================

function staffLogout() {

    localStorage.removeItem("staff");

    window.location.href = "staff-login.html";
}
// ===============================
// STAFF DASHBOARD STATS
// ===============================

async function loadStaffDashboardStats() {

    try {

        const response = await fetch(
            `${STAFF_API_URL}/staff/dashboard/stats`
        );

        const result = await response.json();

        if (!response.ok || !result.success) {
            console.error("Failed to load dashboard stats.");
            return;
        }

        const stats = result.stats;


        // ===============================
        // TOP STAT CARDS
        // ===============================

        const todayOrders =
            document.getElementById("today-orders");

        const todaySales =
            document.getElementById("today-sales");

        const pendingOrders =
            document.getElementById("pending-orders");

        const menuItems =
            document.getElementById("menu-items");


        if (todayOrders) {
            todayOrders.textContent = stats.today_orders;
        }

        if (todaySales) {
            todaySales.textContent =
                `₹${stats.today_sales.toFixed(2)}`;
        }

        if (pendingOrders) {
            pendingOrders.textContent =
                stats.pending_orders;
        }

        if (menuItems) {
            menuItems.textContent =
                stats.menu_items;
        }


        // ===============================
        // ORDER STATUS
        // ===============================

        const placedOrders =
            document.getElementById("placed-orders");

        const preparingOrders =
            document.getElementById("preparing-orders");

        const readyOrders =
            document.getElementById("ready-orders");

        const collectedOrders =
            document.getElementById("collected-orders");


        if (placedOrders) {
            placedOrders.textContent =
                stats.placed_orders;
        }

        if (preparingOrders) {
            preparingOrders.textContent =
                stats.preparing_orders;
        }

        if (readyOrders) {
            readyOrders.textContent =
                stats.ready_orders;
        }

        if (collectedOrders) {
            collectedOrders.textContent =
                stats.collected_orders;
        }


        // ===============================
        // MENU OVERVIEW
        // ===============================

        const availableItems =
            document.getElementById("available-items");

        const outOfStockItems =
            document.getElementById("out-of-stock-items");


        if (availableItems) {
            availableItems.textContent =
                stats.available_items;
        }

        if (outOfStockItems) {
            outOfStockItems.textContent =
                stats.out_of_stock_items;
        }

    } catch (error) {

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
            `${STAFF_API_URL}/staff/dashboard/recent-orders`
        );

        const result = await response.json();

        if (!response.ok || !result.success) {
            console.error("Failed to load recent orders.");
            return;
        }

        const container =
            document.getElementById("recent-orders");

        if (!container) {
            return;
        }

        if (result.orders.length === 0) {

            container.innerHTML = `
                <div class="staff-empty-state">
                    <p>No recent orders found.</p>
                </div>
            `;

            return;
        }

        container.innerHTML = "";

        result.orders.forEach(order => {

            const orderItem = document.createElement("div");

            orderItem.className = "staff-recent-order-item";

            orderItem.innerHTML = `
                <div class="staff-recent-order-info">

                    <strong>
                        #${order.id}
                    </strong>

                    <span>
                        ${order.student_name || "Student"}
                    </span>

                    <small>
                        ${order.register_number || ""}
                    </small>

                </div>

                <div class="staff-recent-order-details">

                    <span>
                        ₹${order.total_amount.toFixed(2)}
                    </span>

                    <span class="staff-order-status ${order.status.toLowerCase()}">
                        ${order.status}
                    </span>

                </div>
            `;

            container.appendChild(orderItem);

        });

    } catch (error) {

        console.error(
            "Recent orders error:",
            error
        );

    }
}

async function loadPopularItem() {

    try {

        const response = await fetch(
            `${STAFF_API_URL}/staff/dashboard/popular-item`
        );

        const result = await response.json();

        if (!response.ok || !result.success) {
            console.error("Failed to load popular item.");
            return;
        }

        const popularItem =
            document.getElementById("popular-item");

        if (!popularItem) {
            return;
        }

        if (!result.item) {

            popularItem.textContent =
                "No orders yet";

            return;
        }

        popularItem.textContent =
            result.item.name;

    } catch (error) {

        console.error(
            "Popular item error:",
            error
        );

    }
}

async function loadLowStockItems() {

    try {

        const response = await fetch(
            `${STAFF_API_URL}/staff/dashboard/low-stock`
        );

        const result = await response.json();

        if (!response.ok || !result.success) {
            console.error("Failed to load low stock items.");
            return;
        }

        const lowStockItems =
            document.getElementById("low-stock-items");

        if (!lowStockItems) {
            return;
        }

        lowStockItems.textContent =
            result.items.length;

    } catch (error) {

        console.error(
            "Low stock items error:",
            error
        );

    }
}

// ===============================
// LOAD DASHBOARD DATA
// ===============================

if (
    document.getElementById("today-orders") ||
    document.getElementById("today-sales")
) {

    loadStaffDashboardStats();
    loadRecentOrders();
    loadPopularItem();
    loadLowStockItems();

}