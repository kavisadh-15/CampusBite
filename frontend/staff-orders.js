const API_BASE_URL = "http://127.0.0.1:5000";

let allOrders = [];

/* ================= ELEMENTS ================= */

const ordersContainer = document.getElementById("ordersContainer");
const loadingState = document.getElementById("loadingState");
const emptyState = document.getElementById("emptyState");

const orderSearch = document.getElementById("orderSearch");
const statusFilter = document.getElementById("statusFilter");

const refreshOrdersBtn = document.getElementById("refreshOrdersBtn");

const totalOrders = document.getElementById("totalOrders");
const pendingOrders = document.getElementById("pendingOrders");
const preparingOrders = document.getElementById("preparingOrders");
const readyOrders = document.getElementById("readyOrders");

const toast = document.getElementById("toast");


/* ================= INITIAL LOAD ================= */

document.addEventListener("DOMContentLoaded", function () {
    loadOrders();
    updateStoreStatus();
});


/* ================= LOAD ORDERS ================= */

async function loadOrders() {

    showLoading();

    try {

        const response = await fetch(
            API_BASE_URL + "/staff/orders"
        );

        if (!response.ok) {
            throw new Error("Unable to load orders");
        }

        const data = await response.json();

        if (data.success === false) {
            throw new Error(
                data.message || "Failed to load orders"
            );
        }

        allOrders = data.orders || [];

        updateSummary();
        displayOrders();

    } catch (error) {

        console.error(
            "Order loading error:",
            error
        );

        hideLoading();

        ordersContainer.innerHTML = "";

        showEmptyState();

        showToast("Unable to load orders");
    }
}


/* ================= DISPLAY ORDERS ================= */

function displayOrders() {

    const searchText =
        orderSearch.value.trim().toLowerCase();

    const selectedStatus =
        statusFilter.value;


    const filteredOrders =
        allOrders.filter(function (order) {

            const studentName =
                String(
                    order.student_name || ""
                ).toLowerCase();


            const registerNumber =
                String(
                    order.register_number || ""
                ).toLowerCase();


            const orderId =
                String(
                    order.order_id || ""
                ).toLowerCase();


            const status =
                String(
                    order.status || ""
                ).toUpperCase();


            const matchesSearch =
                studentName.includes(searchText) ||
                registerNumber.includes(searchText) ||
                orderId.includes(searchText);


            const matchesStatus =
                selectedStatus === "ALL" ||
                (selectedStatus === "PENDING" && ["PLACED", "PAID"].includes(status)) ||
                status === selectedStatus;


            return (
                matchesSearch &&
                matchesStatus
            );

        });


    hideLoading();


    if (filteredOrders.length === 0) {

        ordersContainer.innerHTML = "";

        showEmptyState();

        return;
    }


    hideEmptyState();


    ordersContainer.innerHTML =
        filteredOrders
            .map(function (order) {
                return createOrderCard(order);
            })
            .join("");
}


/* ================= ORDER CARD ================= */

function createOrderCard(order) {

    const orderId =
        order.order_id;


    const studentName =
        escapeHTML(
            order.student_name ||
            "Unknown Student"
        );


    const registerNumber =
        escapeHTML(
            order.register_number ||
            "N/A"
        );


    const pickupSlot =
        escapeHTML(
            order.pickup_slot ||
            "Not specified"
        );


    const status =
        String(
            order.status ||
            "PLACED"
        ).toUpperCase();

    const displayedStatus =
        ["PLACED", "PAID"].includes(status)
            ? "Needs confirmation"
            : formatStatus(status);


    const total =
        Number(
            order.total_amount || 0
        ).toFixed(2);


    const createdAt =
        formatDate(
            order.created_at
        );


    const items =
        Array.isArray(order.items)
            ? order.items
            : [];


    const itemsHTML =
        items.length > 0

            ? items.map(function (item) {

                    const name =
                    escapeHTML(
                        item.food_name || item.name ||
                        "Item"
                    );


                const quantity =
                    Number(
                        item.quantity || 0
                    );


                const price =
                    Number(
                        item.price || 0
                    );


                const subtotal =
                    Number(
                        item.subtotal !== undefined
                            ? item.subtotal
                            : quantity * price
                    ).toFixed(2);


                return `
                    <div class="order-item">

                        <div>

                            <span class="item-name">
                                ${name}
                            </span>

                            <span class="item-qty">
                                × ${quantity}
                            </span>

                        </div>

                        <span class="item-price">
                            ₹${subtotal}
                        </span>

                    </div>
                `;

            }).join("")

            : `
                <div class="order-item">

                    <span class="item-name">
                        No item details available
                    </span>

                </div>
            `;


    return `
        <div class="order-card">

            <div class="order-top">

                <div>

                    <span class="order-id">
                        Order #${orderId}
                    </span>

                    <span class="order-time">
                        ${createdAt}
                    </span>

                </div>


                <span
                    class="status-badge status-${status.toLowerCase()}"
                >
                    ${displayedStatus}
                </span>

            </div>


            <div class="order-details">

                <div>

                    <span class="detail-label">
                        Student
                    </span>

                    <span class="detail-value">
                        ${studentName}
                    </span>

                </div>


                <div>

                    <span class="detail-label">
                        Register Number
                    </span>

                    <span class="detail-value">
                        ${registerNumber}
                    </span>

                </div>


                <div>

                    <span class="detail-label">
                        Pickup Slot
                    </span>

                    <span class="detail-value">
                        ${pickupSlot}
                    </span>

                </div>


                <div>

                    <span class="detail-label">
                        Total
                    </span>

                    <span class="detail-value">
                        ₹${total}
                    </span>

                </div>

            </div>


            <div class="order-items">

                ${itemsHTML}

            </div>


            <div class="order-bottom">

                <div class="order-total">
                    ₹${total}
                    ${Number(order.refunded_amount || 0) > 0
                        ? `<small class="payment-note refunded-note">Refund recorded · ₹${Number(order.refunded_amount).toFixed(2)}</small>`
                        : `<small class="payment-note">${escapeHTML(order.payment_status || (status === "PLACED" ? "UNPAID" : "PAID"))}</small>`}
                </div>


                <div class="order-actions">

                    ${createOrderActions(order)}
                </div>

            </div>

        </div>
    `;
}


/* ================= STATUS OPTIONS ================= */

function createOrderActions(order) {

    const status = String(order.status || "PLACED").toUpperCase();
    const nextAction = {
        PLACED: ["CONFIRMED", "Confirm"],
        PAID: ["CONFIRMED", "Confirm"],
        CONFIRMED: ["PREPARING", "Preparing"],
        PREPARING: ["READY", "Ready"]
    }[status];
    const actions = [];

    if (nextAction) {
        actions.push(`<button class="order-action-btn primary" data-order-id="${order.order_id}" data-status="${nextAction[0]}" onclick="updateOrderStatus(this)">${nextAction[1]}</button>`);
    }

    if (["PLACED", "PAID", "CONFIRMED"].includes(status)) {
        actions.push(`<button class="order-action-btn cancel" data-order-id="${order.order_id}" data-status="CANCELLED" onclick="updateOrderStatus(this)">Cancel</button>`);
    }

    return actions.join("") || `<span class="order-action-done">${status === "CANCELLED" ? "Cancelled" : "Ready"}</span>`;
}


/* ================= UPDATE STATUS ================= */

async function updateOrderStatus(actionButton) {

    const orderId = actionButton.dataset.orderId;
    const newStatus = actionButton.dataset.status;
    const order = allOrders.find(item => String(item.order_id) === String(orderId));

    if (!order) {
        showToast("Order not found.");
        return;
    }

    if (newStatus === "CANCELLED" && !window.confirm("Cancel this order? Any recorded payment will be marked as refunded.")) {
        return;
    }

    actionButton.disabled = true;

    try {
        const response = await fetch(`${API_BASE_URL}/staff/orders/${orderId}/status`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: newStatus })
        });
        const data = await response.json();

        if (!response.ok || data.success === false) {
            throw new Error(data.message || "Status update failed.");
        }

        order.status = newStatus;
        order.payment_status = data.payment_status || order.payment_status;
        order.refunded_amount = Number(data.refunded_amount || 0);
        updateSummary();
        displayOrders();

        showToast(newStatus === "CANCELLED" && order.refunded_amount > 0
            ? `Order #${orderId} cancelled. Refund of ₹${order.refunded_amount.toFixed(2)} recorded.`
            : `Order #${orderId} updated to ${formatStatus(newStatus)}.`);
    } catch (error) {
        actionButton.disabled = false;
        showToast(error.message || "Unable to update order.");
    }
}


/* ================= SUMMARY ================= */

function updateSummary() {

    const total =
        allOrders.length;


    const pending =
        allOrders.filter(
            function (order) {

                const status =
                    String(
                        order.status || ""
                    ).toUpperCase();


                return status === "PLACED" || status === "PAID";

            }
        ).length;


    const preparing =
        allOrders.filter(
            function (order) {

                return (
                    String(
                        order.status || ""
                    ).toUpperCase() ===
                    "PREPARING"
                );

            }
        ).length;


    const ready =
        allOrders.filter(
            function (order) {

                return (
                    String(
                        order.status || ""
                    ).toUpperCase() ===
                    "READY"
                );

            }
        ).length;


    totalOrders.textContent =
        total;

    pendingOrders.textContent =
        pending;

    preparingOrders.textContent =
        preparing;

    readyOrders.textContent =
        ready;
}


/* ================= SEARCH ================= */

orderSearch.addEventListener(
    "input",
    function () {

        displayOrders();

    }
);


/* ================= FILTER ================= */

statusFilter.addEventListener(
    "change",
    function () {

        displayOrders();

    }
);


/* ================= REFRESH ================= */

refreshOrdersBtn.addEventListener(
    "click",
    async function () {

        refreshOrdersBtn.style.transform =
            "rotate(360deg)";


        await loadOrders();


        setTimeout(
            function () {

                refreshOrdersBtn.style.transform =
                    "";

            },
            300
        );

    }
);


/* ================= STORE STATUS ================= */

function updateStoreStatus() {
    if (window.refreshCanteenStatus) {
        window.refreshCanteenStatus();
    }
}




/* ================= LOADING ================= */

function showLoading() {

    loadingState.style.display =
        "flex";


    emptyState.style.display =
        "none";
}


function hideLoading() {

    loadingState.style.display =
        "none";
}


/* ================= EMPTY ================= */

function showEmptyState() {

    emptyState.style.display =
        "block";
}


function hideEmptyState() {

    emptyState.style.display =
        "none";
}


/* ================= STATUS HELPERS ================= */

function formatStatus(status) {

    if (status === "PLACED" || status === "PAID") {
        return "Needs confirmation";
    }

    const words =
        String(status)
            .toLowerCase()
            .split("_");


    return words
        .map(
            function (word) {

                return (
                    word.charAt(0).toUpperCase() +
                    word.slice(1)
                );

            }
        )
        .join(" ");
}


function isStatusLocked(status) {

    return (
        status === "COLLECTED" ||
        status === "CANCELLED"
    );
}


/* ================= DATE ================= */

function formatDate(dateValue) {

    if (!dateValue) {

        return "Date unavailable";
    }


    const date =
        new Date(dateValue);


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return String(dateValue);
    }


    return date.toLocaleString(
        "en-IN",
        {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        }
    );
}


/* ================= HTML SAFETY ================= */

function escapeHTML(value) {

    return String(value)
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );
}


/* ================= TOAST ================= */

function showToast(message) {

    if (!toast) {

        return;
    }


    toast.textContent =
        message;


    toast.classList.add(
        "show"
    );


    setTimeout(
        function () {

            toast.classList.remove(
                "show"
            );

        },
        2500
    );
}
