const API_BASE_URL = "https://campusbite-lo8a.onrender.com";

let allMenuItems = [];
let editingFoodId = null;


/* =====================================================
   ELEMENTS
===================================================== */

const grid = document.getElementById("menu-items-grid");
const loading = document.getElementById("menu-loading");
const emptyState = document.getElementById("menu-empty-state");

const searchInput = document.getElementById("menu-search");
const categoryFilter = document.getElementById("category-filter");
const availabilityFilter = document.getElementById("availability-filter");

const totalItems = document.getElementById("total-items");
const availableItems = document.getElementById("available-items");
const lowStockItems = document.getElementById("low-stock-items");
const outStockItems = document.getElementById("out-stock-items");

const resultCount = document.getElementById("menu-result-count");

const modal = document.getElementById("menu-modal");
const modalTitle = document.getElementById("modal-title");

const foodForm = document.getElementById("food-form");

const foodId = document.getElementById("food-id");
const foodName = document.getElementById("food-name");
const foodCategory = document.getElementById("food-category");
const foodPrice = document.getElementById("food-price");
const foodStock = document.getElementById("food-stock");
const foodPrepTime = document.getElementById("food-prep-time");
const foodRating = document.getElementById("food-rating");
const foodImage = document.getElementById("food-image");
const foodAvailable = document.getElementById("food-available");
const foodDescription = document.getElementById("food-description");

const availabilityLabel =
    document.getElementById("availability-label");


/* =====================================================
   INITIAL LOAD
===================================================== */

document.addEventListener("DOMContentLoaded", () => {

    loadMenu();

    updateStoreStatus();

    setupEvents();

});


/* =====================================================
   EVENTS
===================================================== */

function setupEvents() {

    searchInput.addEventListener("input", applyFilters);

    categoryFilter.addEventListener("change", applyFilters);

    availabilityFilter.addEventListener("change", applyFilters);


    document
        .getElementById("refresh-btn")
        .addEventListener("click", loadMenu);


    document
        .getElementById("add-food-btn")
        .addEventListener("click", openAddModal);


    document
        .getElementById("empty-add-btn")
        .addEventListener("click", openAddModal);


    document
        .getElementById("modal-close-btn")
        .addEventListener("click", closeModal);


    document
        .getElementById("cancel-food-btn")
        .addEventListener("click", closeModal);


    foodForm.addEventListener("submit", saveFood);


    foodAvailable.addEventListener("change", updateAvailabilityLabel);


    modal.addEventListener("click", (event) => {

        if (event.target === modal) {
            closeModal();
        }

    });

}


/* =====================================================
   LOAD MENU
===================================================== */

async function loadMenu() {

    showLoading();

    try {

        const response = await fetch(
            `${API_BASE_URL}/staff/menu`
        );

        if (!response.ok) {
            throw new Error("Failed to load menu");
        }

        const data = await response.json();

        allMenuItems = Array.isArray(data.menu)
            ? data.menu
            : [];

        updateSummary();

        applyFilters();

    } catch (error) {

        console.error(error);

        hideLoading();

        grid.innerHTML = "";

        emptyState.classList.remove("hidden");

        showNotification(
            "Unable to load menu items."
        );

    }

}


/* =====================================================
   SUMMARY
===================================================== */

function updateSummary() {

    const total = allMenuItems.length;

    const available = allMenuItems.filter(
        item => Number(item.available) === 1
    ).length;

    const lowStock = allMenuItems.filter(
        item =>
            Number(item.stock_quantity) > 0 &&
            Number(item.stock_quantity) <= 5
    ).length;

    const outStock = allMenuItems.filter(
        item =>
            Number(item.stock_quantity) <= 0
    ).length;


    totalItems.textContent = total;

    availableItems.textContent = available;

    lowStockItems.textContent = lowStock;

    outStockItems.textContent = outStock;

}


/* =====================================================
   FILTER
===================================================== */

function applyFilters() {

    const search =
        searchInput.value
            .trim()
            .toLowerCase();

    const category =
        categoryFilter.value;

    const availability =
        availabilityFilter.value;


    const filtered = allMenuItems.filter(item => {

        const name =
            String(item.name || "")
                .toLowerCase();

        const description =
            String(item.description || "")
                .toLowerCase();

        const matchesSearch =
            name.includes(search) ||
            description.includes(search);


        const matchesCategory =
            category === "all" ||
            item.category === category;


        const stock =
            Number(item.stock_quantity || 0);

        const available =
            Number(item.available) === 1;


        let matchesAvailability = true;


        if (availability === "available") {

            matchesAvailability =
                available && stock > 5;

        }


        if (availability === "unavailable") {

            matchesAvailability =
                !available;

        }


        if (availability === "low-stock") {

            matchesAvailability =
                stock > 0 && stock <= 5;

        }


        if (availability === "out-of-stock") {

            matchesAvailability =
                stock <= 0;

        }


        return (
            matchesSearch &&
            matchesCategory &&
            matchesAvailability
        );

    });


    renderMenu(filtered);

}


/* =====================================================
   RENDER MENU
===================================================== */

function renderMenu(items) {

    hideLoading();

    grid.innerHTML = "";

    resultCount.textContent =
        `${items.length} ${items.length === 1 ? "item" : "items"}`;


    if (items.length === 0) {

        emptyState.classList.remove("hidden");

        return;

    }


    emptyState.classList.add("hidden");


    items.forEach(item => {

        grid.appendChild(
            createFoodCard(item)
        );

    });

}


/* =====================================================
   CREATE FOOD CARD
===================================================== */

function createFoodCard(item) {

    const card =
        document.createElement("article");

    card.className = "food-card";


    const available =
        Number(item.available) === 1;

    const stock =
        Number(item.stock_quantity || 0);


    const imageName =
        String(item.image || "").trim();


    const imageHTML =
        imageName
            ? `
                <img
                    src="images/${escapeAttribute(imageName)}"
                    alt="${escapeAttribute(item.name)}"
                    onerror="this.style.display='none'; this.parentElement.innerHTML='<div class=&quot;image-placeholder&quot;>🍽️</div>';"
                >
            `
            : `
                <div class="image-placeholder">
                    🍽️
                </div>
            `;


    let availabilityText =
        available
            ? "Available"
            : "Unavailable";


    let availabilityClass =
        available
            ? "available"
            : "unavailable";


    card.innerHTML = `

        <div class="food-image">

            ${imageHTML}

        </div>


        <div class="food-body">

            <div class="food-heading">

                <div>

                    <div class="food-name">
                        ${escapeHTML(item.name || "Unnamed Food")}
                    </div>

                    <div class="food-category">
                        ${escapeHTML(item.category || "Food")}
                    </div>

                </div>


                <span class="availability-badge ${availabilityClass}">
                    ${availabilityText}
                </span>

            </div>


            <div class="food-description">

                ${escapeHTML(
                    item.description ||
                    "No description available."
                )}

            </div>


            <div class="food-info">

                <div class="info-box">

                    <span class="info-label">
                        PRICE
                    </span>

                    <span class="info-value price-value">
                        ₹${Number(item.price || 0).toFixed(2)}
                    </span>

                </div>


                <div class="info-box">

                    <span class="info-label">
                        RATING
                    </span>

                    <span class="info-value rating-value">
                        ★ ${Number(item.rating || 0).toFixed(1)}
                    </span>

                </div>


                <div class="info-box">

                    <span class="info-label">
                        STOCK
                    </span>

                    <span class="info-value">
                        ${stock}
                    </span>

                </div>


                <div class="info-box">

                    <span class="info-label">
                        PREP TIME
                    </span>

                    <span class="info-value">
                        ${Number(item.prep_time || 0)} min
                    </span>

                </div>

            </div>


            <div class="food-actions">

                <button
                    class="edit-btn"
                    onclick="editFood(${item.id})"
                >
                    Edit
                </button>

                <button
                    class="delete-btn"
                    onclick="deleteFood(${item.id})"
                >
                    Delete
                </button>

            </div>

        </div>

    `;


    return card;

}


/* =====================================================
   ADD FOOD
===================================================== */

function openAddModal() {

    editingFoodId = null;

    modalTitle.textContent = "Add Food";

    foodForm.reset();

    foodId.value = "";

    foodAvailable.checked = true;

    foodRating.value = "4.5";

    updateAvailabilityLabel();

    modal.classList.remove("hidden");

}


/* =====================================================
   EDIT FOOD
===================================================== */

function editFood(id) {

    const item =
        allMenuItems.find(
            food => Number(food.id) === Number(id)
        );


    if (!item) {

        showNotification(
            "Food item not found."
        );

        return;

    }


    editingFoodId = item.id;


    modalTitle.textContent = "Edit Food";


    foodId.value = item.id;

    foodName.value = item.name || "";

    foodCategory.value = item.category || "";

    foodPrice.value = item.price ?? "";

    foodStock.value =
        item.stock_quantity ?? 0;

    foodPrepTime.value =
        item.prep_time ?? 10;

    foodRating.value =
        item.rating ?? 4.5;

    foodImage.value =
        item.image || "";

    foodAvailable.checked =
        Number(item.available) === 1;

    foodDescription.value =
        item.description || "";


    updateAvailabilityLabel();


    modal.classList.remove("hidden");

}


/* =====================================================
   SAVE FOOD
===================================================== */

async function saveFood(event) {

    event.preventDefault();


    const payload = {

        name: foodName.value.trim(),

        category: foodCategory.value,

        description:
            foodDescription.value.trim(),

        price:
            Number(foodPrice.value),

        stock_quantity:
            Number(foodStock.value),

        image:
            foodImage.value.trim(),

        rating:
            Number(foodRating.value || 4.5),

        prep_time:
            Number(foodPrepTime.value),

        available:
            foodAvailable.checked ? 1 : 0

    };


    if (!payload.name) {

        showNotification(
            "Please enter food name."
        );

        return;

    }


    try {

        let response;


        if (editingFoodId) {

            response = await fetch(
                `${API_BASE_URL}/staff/menu/${editingFoodId}`,
                {
                    method: "PUT",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify(payload)
                }
            );

        } else {

            response = await fetch(
                `${API_BASE_URL}/staff/menu`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify(payload)
                }
            );

        }


        const data =
            await response.json();


        if (!response.ok || data.success === false) {

            throw new Error(
                data.message ||
                "Unable to save food."
            );

        }


        closeModal();


        showNotification(
            editingFoodId
                ? "Food item updated successfully."
                : "Food item added successfully."
        );


        await loadMenu();


    } catch (error) {

        console.error(error);

        showNotification(
            error.message ||
            "Unable to save food item."
        );

    }

}


/* =====================================================
   DELETE FOOD
===================================================== */

async function deleteFood(id) {

    const item =
        allMenuItems.find(
            food => Number(food.id) === Number(id)
        );


    if (!item) {
        return;
    }


    const confirmed =
        confirm(
            `Delete "${item.name}" from the menu?`
        );


    if (!confirmed) {
        return;
    }


    try {

        const response =
            await fetch(
                `${API_BASE_URL}/staff/menu/${id}`,
                {
                    method: "DELETE"
                }
            );


        const data =
            await response.json();


        if (!response.ok || data.success === false) {

            throw new Error(
                data.message ||
                "Unable to delete food."
            );

        }


        showNotification(
            "Food item deleted successfully."
        );


        await loadMenu();


    } catch (error) {

        console.error(error);

        showNotification(
            error.message ||
            "Unable to delete food."
        );

    }

}


/* =====================================================
   CLOSE MODAL
===================================================== */

function closeModal() {

    modal.classList.add("hidden");

    editingFoodId = null;

    foodForm.reset();

    foodAvailable.checked = true;

    updateAvailabilityLabel();

}


/* =====================================================
   AVAILABILITY LABEL
===================================================== */

function updateAvailabilityLabel() {

    availabilityLabel.textContent =
        foodAvailable.checked
            ? "Available"
            : "Unavailable";

}


/* =====================================================
   LOADING
===================================================== */

function showLoading() {

    loading.classList.remove("hidden");

    grid.innerHTML = "";

    emptyState.classList.add("hidden");

}


function hideLoading() {

    loading.classList.add("hidden");

}


/* =====================================================
   STORE STATUS
===================================================== */

function updateStoreStatus() {
    if (window.refreshCanteenStatus) {
        window.refreshCanteenStatus();
    }
}


/* =====================================================
   LOGOUT
===================================================== */

function logout() {

    localStorage.removeItem("staffLoggedIn");

    window.location.href =
        "staff-login.html";

}


/* =====================================================
   NOTIFICATION
===================================================== */

function showNotification(message) {

    const notification =
        document.getElementById("notification");


    if (!notification) {
        return;
    }


    notification.textContent =
        message;


    notification.classList.remove("hidden");


    clearTimeout(
        showNotification.timer
    );


    showNotification.timer =
        setTimeout(() => {

            notification.classList.add("hidden");

        }, 2500);

}


/* =====================================================
   SAFE HTML
===================================================== */

function escapeHTML(value) {

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}


function escapeAttribute(value) {

    return escapeHTML(value);

}