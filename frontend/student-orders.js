// =====================================================
// CampusBite - Frontend JavaScript
// =====================================================


// =====================================================
// LANDING PAGE
// =====================================================

document.addEventListener("DOMContentLoaded", function () {

    const discoverButton = document.querySelector(".primary-btn");
    const howItWorksButton = document.querySelector(".secondary-btn");

    if (discoverButton) {

        discoverButton.addEventListener("click", function () {

            const discoverSection =
                document.getElementById("discover");

            if (discoverSection) {

                discoverSection.scrollIntoView({
                    behavior: "smooth"
                });

            }

        });

    }


    if (howItWorksButton) {

        howItWorksButton.addEventListener("click", function () {

            const howItWorksSection =
                document.getElementById("how-it-works");

            if (howItWorksSection) {

                howItWorksSection.scrollIntoView({
                    behavior: "smooth"
                });

            }

        });

    }

});


// =====================================================
// STUDENT REGISTRATION
// =====================================================

const registerForm =
    document.getElementById("student-register-form");

if (registerForm) {

    registerForm.addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();


            const name =
                document.getElementById("student-name").value.trim();

            const registerNumber =
                document.getElementById("register-number").value.trim();

            const email =
                document.getElementById("student-email").value.trim();

            const password =
                document.getElementById("student-password").value;

            const confirmPassword =
                document.getElementById("confirm-password").value;


            if (
                !name ||
                !registerNumber ||
                !email ||
                !password ||
                !confirmPassword
            ) {

                alert("Please fill in all fields.");
                return;

            }


            if (password !== confirmPassword) {

                alert("Passwords do not match!");
                return;

            }


            try {

                const response = await fetch(
                    "http://127.0.0.1:5000/register",
                    {
                        method: "POST",

                        headers: {
                            "Content-Type": "application/json"
                        },

                        body: JSON.stringify({

                            name: name,
                            register_number: registerNumber,
                            email: email,
                            password: password

                        })

                    }
                );


                const result =
                    await response.json();


                if (!response.ok) {

                    throw new Error(
                        result.message ||
                        "Registration failed."
                    );

                }


                alert(result.message);

                registerForm.reset();


                setTimeout(function () {

                    window.location.href =
                        "student-login.html";

                }, 500);


            } catch (error) {

                console.error(
                    "Student registration error:",
                    error
                );

                alert(
                    "Registration Error: " +
                    error.message
                );

            }

        }
    );

}


// =====================================================
// STUDENT LOGIN
// =====================================================

const loginForm =
    document.getElementById("student-login-form");

if (loginForm) {

    loginForm.addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();


            const registerNumber =
                document
                    .getElementById("register-number")
                    .value
                    .trim();

            const password =
                document
                    .getElementById("password")
                    .value;


            if (!registerNumber || !password) {

                alert(
                    "Please enter register number and password."
                );

                return;

            }


            try {

                // IMPORTANT:
                // Student login uses /login
                // NOT /staff/login

                const response = await fetch(
                    "http://127.0.0.1:5000/login",
                    {
                        method: "POST",

                        headers: {
                            "Content-Type": "application/json"
                        },

                        body: JSON.stringify({

                            register_number:
                                registerNumber,

                            password:
                                password

                        })

                    }
                );


                const result =
                    await response.json();


                if (!response.ok) {

                    alert(
                        result.message ||
                        "Invalid student login."
                    );

                    return;

                }


                // Save logged-in student

                localStorage.setItem(
                    "student",
                    JSON.stringify(result.user)
                );


                alert(result.message);


                window.location.href =
                    "student-dashboard.html";


            } catch (error) {

                console.error(
                    "Student login error:",
                    error
                );

                alert(
                    "Login Error: Unable to connect to server."
                );

            }

        }
    );

}


// =====================================================
// PASSWORD SHOW / HIDE
// =====================================================

function togglePassword(inputId, button) {

    const passwordInput =
        document.getElementById(inputId);


    if (!passwordInput || !button) {
        return;
    }


    if (passwordInput.type === "password") {

        passwordInput.type = "text";

        button.textContent = "🙈";

    } else {

        passwordInput.type = "password";

        button.textContent = "👁️";

    }

}


// =====================================================
// STUDENT DETAILS
// =====================================================

function loadStudentDetails() {

    const savedStudent =
        localStorage.getItem("student");


    if (!savedStudent) {
        return;
    }


    let studentData;


    try {

        studentData =
            JSON.parse(savedStudent);

    } catch (error) {

        console.error(
            "Student data error:",
            error
        );

        return;

    }


    if (!studentData) {
        return;
    }


    const nameElements = [

        document.getElementById(
            "student-name-display"
        ),

        document.getElementById(
            "profile-name"
        ),

        document.getElementById(
            "detail-name"
        )

    ];


    const registerElements = [

        document.getElementById(
            "student-register-display"
        ),

        document.getElementById(
            "profile-register"
        ),

        document.getElementById(
            "detail-register"
        )

    ];


    const emailElements = [

        document.getElementById(
            "profile-email"
        ),

        document.getElementById(
            "detail-email"
        )

    ];


    nameElements.forEach(function (element) {

        if (element) {

            element.textContent =
                studentData.name || "";

        }

    });


    registerElements.forEach(function (element) {

        if (element) {

            element.textContent =
                studentData.register_number || "";

        }

    });


    emailElements.forEach(function (element) {

        if (element) {

            element.textContent =
                studentData.email || "";

        }

    });


    const profileAvatar =
        document.querySelector(".profile-avatar");


    if (
        profileAvatar &&
        studentData.name
    ) {

        profileAvatar.textContent =
            studentData.name
                .charAt(0)
                .toUpperCase();

    }

}


loadStudentDetails();


// =====================================================
// MENU
// =====================================================

let allMenuItems = [];


const filterButtons =
    document.querySelectorAll(".filter-btn");


filterButtons.forEach(function (button) {

    button.addEventListener(
        "click",
        function () {

            const selectedCategory =
                button.getAttribute(
                    "data-category"
                );


            const foodCards =
                document.querySelectorAll(
                    ".food-card"
                );


            foodCards.forEach(function (card) {

                const categoryElement =
                    card.querySelector(
                        ".food-category"
                    );


                if (!categoryElement) {
                    return;
                }


                const category =
                    categoryElement
                        .textContent
                        .trim();


                if (
                    selectedCategory === "All" ||
                    category === selectedCategory
                ) {

                    card.style.display = "";

                } else {

                    card.style.display = "none";

                }

            });


            filterButtons.forEach(
                function (btn) {

                    btn.classList.remove(
                        "active"
                    );

                }
            );


            button.classList.add("active");

        }
    );

});


// =====================================================
// MENU SEARCH
// =====================================================

const searchInput =
    document.getElementById("menu-search");


if (searchInput) {

    searchInput.addEventListener(
        "input",
        function () {

            const searchText =
                searchInput.value
                    .toLowerCase()
                    .trim();


            const foodCards =
                document.querySelectorAll(
                    ".food-card"
                );


            foodCards.forEach(
                function (card) {

                    const nameElement =
                        card.querySelector("h3");


                    if (!nameElement) {
                        return;
                    }


                    const foodName =
                        nameElement
                            .textContent
                            .toLowerCase();


                    if (
                        foodName.includes(
                            searchText
                        )
                    ) {

                        card.style.display = "";

                    } else {

                        card.style.display = "none";

                    }

                }
            );

        }
    );

}


// =====================================================
// LOAD MENU FROM BACKEND
// =====================================================

const menuContainer =
    document.getElementById("menu-container");


if (menuContainer) {

    fetch(
        "http://127.0.0.1:5000/menu"
    )

        .then(function (response) {

            return response.json();

        })

        .then(function (data) {

            const menuCountElement =
                document.getElementById(
                    "today-menu-count"
                );


            if (menuCountElement) {

                menuCountElement.textContent =
                    data.menu.length;

            }


            allMenuItems =
                data.menu || [];


            menuContainer.innerHTML = "";


            allMenuItems.forEach(
                function (item) {

                    const foodCard =
                        document.createElement("div");


                    foodCard.className =
                        "food-card";


                    const imageName =
                        item.image ||
                        getFoodImage(item.name);


                    foodCard.innerHTML = `

                        <div class="food-image">

                            <img
                                src="images/${imageName}"
                                alt="${item.name}"
                            >

                            <span class="food-badge">
                                POPULAR
                            </span>

                        </div>


                        <div class="food-details">

                            <div class="food-top">

                                <span class="food-category">
                                    ${item.category}
                                </span>

                                <span class="food-rating">
                                    ⭐ ${item.rating}
                                </span>

                            </div>


                            <h3>
                                ${item.name}
                            </h3>


                            <p>
                                ${item.description}
                            </p>


                            <div class="food-info">

                                <span>
                                    ⏱️ ${item.prep_time} min
                                </span>

                                <span class="available-text">
                                    ● Available
                                </span>

                            </div>


                            <div class="food-bottom">

                                <strong>
                                    ₹${item.price}
                                </strong>

                                <button
                                    class="add-cart-btn"
                                    onclick="addToCart(${item.id})"
                                >
                                    Add to Cart
                                </button>

                            </div>

                        </div>

                    `;


                    menuContainer.appendChild(
                        foodCard
                    );

                }
            );

        })

        .catch(function (error) {

            console.error(
                "Menu loading error:",
                error
            );

        });

}


// =====================================================
// FOOD IMAGE MAPPING
// =====================================================

function getFoodImage(foodName) {

    const imageMap = {

        "idly":
            "idly.jpg",

        "pongal":
            "pongal.jpg",

        "poori":
            "poori.jpg",

        "masala dosa":
            "dosa.jpg",

        "vada":
            "vada.jpg",

        "veg meals":
            "veg-meals.jpg",

        "lemon rice":
            "lemon-rice.jpg",

        "tomato rice":
            "tomato-rice.jpg",

        "curd rice":
            "curd-rice.jpg",

        "veg biryani":
            "biryani.jpg",

        "samosa":
            "samosa.jpg",

        "sandwich":
            "sandwich.jpg",

        "veg noodles":
            "veg-noodles.jpg",

        "french fries":
            "french-fries.jpg",

        "veg puff":
            "puffs.jpg",

        "veg cutlet":
            "cutlet.jpg",

        "tea":
            "tea.jpg",

        "coffee":
            "coffee.jpg",

        "fresh lime":
            "lime-juice.jpg",

        "rose milk":
            "rosemilk.jpg",

        "milkshake":
            "milkshake.jpg",

        "ice cream":
            "icecream.jpg",

        "gulab jamun":
            "gulab-jamun.jpg"

    };


    const normalizedName =
        (foodName || "")
            .trim()
            .toLowerCase();


    return (
        imageMap[normalizedName] ||
        "veg-meals.jpg"
    );

}


// =====================================================
// ADD TO CART
// =====================================================

function addToCart(foodId) {

    const savedStudent =
        localStorage.getItem("student");


    if (!savedStudent) {

        alert("Please login first.");

        return;

    }


    let studentData;


    try {

        studentData =
            JSON.parse(savedStudent);

    } catch (error) {

        alert("Please login again.");

        return;

    }


    if (!studentData || !studentData.id) {

        alert("Please login again.");

        return;

    }


    fetch(
        "http://127.0.0.1:5000/cart/add",
        {
            method: "POST",

            headers: {
                "Content-Type":
                    "application/json"
            },

            body: JSON.stringify({

                user_id:
                    studentData.id,

                menu_id:
                    foodId

            })

        }
    )

        .then(function (response) {

            return response.json();

        })

        .then(function (data) {

            alert(data.message);

            loadCart();

            loadDashboardStats();

        })

        .catch(function (error) {

            console.error(
                "Cart error:",
                error
            );

            alert(
                "Unable to add food to cart."
            );

        });

}


// =====================================================
// UPDATE CART QUANTITY
// =====================================================

function updateCartQuantity(
    cartId,
    quantity
) {

    if (quantity <= 0) {

        removeCartItem(cartId);

        return;

    }


    fetch(
        "http://127.0.0.1:5000/cart/update",
        {
            method: "PUT",

            headers: {
                "Content-Type":
                    "application/json"
            },

            body: JSON.stringify({

                cart_id:
                    cartId,

                quantity:
                    quantity

            })

        }
    )

        .then(function (response) {

            return response.json();

        })

        .then(function () {

            loadCart();

            loadDashboardStats();

        })

        .catch(function (error) {

            console.error(
                "Quantity update error:",
                error
            );

        });

}


// =====================================================
// REMOVE CART ITEM
// =====================================================

function removeCartItem(cartId) {

    fetch(
        `http://127.0.0.1:5000/cart/remove/${cartId}`,
        {
            method: "DELETE"
        }
    )

        .then(function (response) {

            return response.json();

        })

        .then(function () {

            loadCart();

            loadDashboardStats();

        })

        .catch(function (error) {

            console.error(
                "Remove cart error:",
                error
            );

        });

}


// =====================================================
// LOAD CART
// =====================================================

function loadCart() {

    const cartItemsContainer =
        document.getElementById(
            "cart-items"
        );


    if (!cartItemsContainer) {
        return;
    }


    const savedStudent =
        localStorage.getItem("student");


    if (!savedStudent) {
        return;
    }


    let studentData;


    try {

        studentData =
            JSON.parse(savedStudent);

    } catch (error) {

        return;

    }


    if (!studentData || !studentData.id) {
        return;
    }


    fetch(
        `http://127.0.0.1:5000/cart/${studentData.id}`
    )

        .then(function (response) {

            return response.json();

        })

        .then(function (data) {

            cartItemsContainer.innerHTML = "";


            let total = 0;

            let itemCount = 0;


            const cartEmpty =
                document.getElementById(
                    "cart-empty"
                );


            const cartLayout =
                document.querySelector(
                    ".cart-layout"
                );


            const cartItemCount =
                document.getElementById(
                    "cart-item-count"
                );


            const cartSubtotal =
                document.getElementById(
                    "cart-subtotal"
                );


            const cartTotal =
                document.getElementById(
                    "cart-total"
                );


            if (
                !data.cart ||
                data.cart.length === 0
            ) {

                if (cartEmpty) {

                    cartEmpty.style.display =
                        "block";

                }


                if (cartLayout) {

                    cartLayout.style.display =
                        "none";

                }


                if (cartItemCount) {

                    cartItemCount.textContent =
                        "0";

                }


                if (cartSubtotal) {

                    cartSubtotal.textContent =
                        "₹0";

                }


                if (cartTotal) {

                    cartTotal.textContent =
                        "₹0";

                }


                return;

            }


            if (cartEmpty) {

                cartEmpty.style.display =
                    "none";

            }


            if (cartLayout) {

                cartLayout.style.display =
                    "grid";

            }


            data.cart.forEach(
                function (item) {

                    total +=
                        item.subtotal;

                    itemCount +=
                        item.quantity;


                    const cartItem =
                        document.createElement(
                            "div"
                        );


                    cartItem.className =
                        "cart-item";


                    const cartImage =
                        item.image ||
                        getFoodImage(
                            item.name
                        );


                    cartItem.innerHTML = `

                        <div class="cart-item-image">

                            <img
                                src="images/${cartImage}"
                                alt="${item.name}"
                            >

                        </div>


                        <div class="cart-item-details">

                            <h4>
                                ${item.name}
                            </h4>

                            <span>
                                ₹${item.price} each
                            </span>

                        </div>


                        <div class="quantity-control">

                            <button
                                onclick="
                                    updateCartQuantity(
                                        ${item.cart_id},
                                        ${item.quantity - 1}
                                    )
                                "
                            >
                                −
                            </button>


                            <span>
                                ${item.quantity}
                            </span>


                            <button
                                onclick="
                                    updateCartQuantity(
                                        ${item.cart_id},
                                        ${item.quantity + 1}
                                    )
                                "
                            >
                                +
                            </button>

                        </div>


                        <div class="cart-item-price">

                            ₹${item.subtotal}

                        </div>


                        <button
                            class="remove-cart-btn"
                            onclick="
                                removeCartItem(
                                    ${item.cart_id}
                                )
                            "
                        >
                            Remove
                        </button>

                    `;


                    cartItemsContainer.appendChild(
                        cartItem
                    );

                }
            );


            if (cartItemCount) {

                cartItemCount.textContent =
                    itemCount;

            }


            if (cartSubtotal) {

                cartSubtotal.textContent =
                    `₹${total}`;

            }


            if (cartTotal) {

                cartTotal.textContent =
                    `₹${total}`;

            }

        })

        .catch(function (error) {

            console.error(
                "Cart loading error:",
                error
            );

        });

}


loadCart();


// =====================================================
// GO TO CHECKOUT
// =====================================================

function goToCheckout() {

    const savedStudent =
        localStorage.getItem("student");


    if (!savedStudent) {

        alert("Please login first.");

        return;

    }


    let studentData;


    try {

        studentData =
            JSON.parse(savedStudent);

    } catch (error) {

        alert("Please login again.");

        return;

    }


    fetch(
        `http://127.0.0.1:5000/cart/${studentData.id}`
    )

        .then(function (response) {

            return response.json();

        })

        .then(function (data) {

            if (
                !data.cart ||
                data.cart.length === 0
            ) {

                alert(
                    "Your cart is empty."
                );

                return;

            }


            window.location.href =
                "checkout.html";

        })

        .catch(function (error) {

            console.error(
                "Checkout error:",
                error
            );

            alert(
                "Unable to proceed to checkout."
            );

        });

}


// =====================================================
// LOAD CHECKOUT
// =====================================================

function loadCheckout() {

    const checkoutItems =
        document.getElementById(
            "checkout-items"
        );


    if (!checkoutItems) {
        return;
    }


    const savedStudent =
        localStorage.getItem("student");


    if (!savedStudent) {

        alert("Please login first.");

        return;

    }


    let studentData;


    try {

        studentData =
            JSON.parse(savedStudent);

    } catch (error) {

        return;

    }


    fetch(
        `http://127.0.0.1:5000/cart/${studentData.id}`
    )

        .then(function (response) {

            return response.json();

        })

        .then(function (data) {

            checkoutItems.innerHTML = "";


            let total = 0;


            data.cart.forEach(
                function (item) {

                    total +=
                        item.subtotal;


                    const checkoutItem =
                        document.createElement(
                            "div"
                        );


                    checkoutItem.className =
                        "checkout-item";


                    const checkoutImage =
                        item.image ||
                        getFoodImage(
                            item.name
                        );


                    checkoutItem.innerHTML = `

                        <div class="checkout-item-image">

                            <img
                                src="images/${checkoutImage}"
                                alt="${item.name}"
                            >

                        </div>


                        <div class="checkout-item-details">

                            <h4>
                                ${item.name}
                            </h4>

                            <span>
                                ₹${item.price}
                                ×
                                ${item.quantity}
                            </span>

                        </div>


                        <div class="checkout-item-price">

                            ₹${item.subtotal}

                        </div>

                    `;


                    checkoutItems.appendChild(
                        checkoutItem
                    );

                }
            );


            const checkoutSubtotal =
                document.getElementById(
                    "checkout-subtotal"
                );


            const checkoutTotal =
                document.getElementById(
                    "checkout-total"
                );


            if (checkoutSubtotal) {

                checkoutSubtotal.textContent =
                    `₹${total}`;

            }


            if (checkoutTotal) {

                checkoutTotal.textContent =
                    `₹${total}`;

            }

        })

        .catch(function (error) {

            console.error(
                "Checkout loading error:",
                error
            );

        });

}


loadCheckout();


// =====================================================
// CREATE ORDER / CONTINUE TO PAYMENT
// =====================================================

function continueToPayment() {

    const pickupSlot =
        document.getElementById(
            "pickup-slot"
        );


    if (
        !pickupSlot ||
        pickupSlot.value === ""
    ) {

        alert(
            "Please select a pickup slot."
        );

        return;

    }


    const savedStudent =
        localStorage.getItem("student");


    if (!savedStudent) {

        alert("Please login first.");

        return;

    }


    let studentData;


    try {

        studentData =
            JSON.parse(savedStudent);

    } catch (error) {

        alert("Please login again.");

        return;

    }


    fetch(
        "http://127.0.0.1:5000/orders/create",
        {
            method: "POST",

            headers: {
                "Content-Type":
                    "application/json"
            },

            body: JSON.stringify({

                user_id:
                    studentData.id,

                pickup_slot:
                    pickupSlot.value

            })

        }
    )

        .then(function (response) {

            return response.json();

        })

        .then(function (data) {

            if (data.order_id) {

                localStorage.setItem(
                    "currentOrder",
                    JSON.stringify(data)
                );


                window.location.href =
                    "payment.html";

            } else {

                alert(
                    data.message ||
                    "Unable to create order."
                );

            }

        })

        .catch(function (error) {

            console.error(
                "Order error:",
                error
            );

            alert(
                "Unable to create order."
            );

        });

}


// =====================================================
// LOAD PAYMENT
// =====================================================

function loadPayment() {

    const paymentAmount =
        document.getElementById(
            "payment-amount"
        );


    const paymentTotal =
        document.getElementById(
            "payment-total"
        );


    if (
        !paymentAmount ||
        !paymentTotal
    ) {

        return;

    }


    const savedOrder =
        localStorage.getItem(
            "currentOrder"
        );


    if (!savedOrder) {

        alert(
            "Order information not found."
        );

        return;

    }


    let orderData;


    try {

        orderData =
            JSON.parse(savedOrder);

    } catch (error) {

        alert(
            "Order information is invalid."
        );

        return;

    }


    const amount =
        orderData.total_amount;


    paymentAmount.textContent =
        `₹${amount}`;


    paymentTotal.textContent =
        `₹${amount}`;

}


loadPayment();


// =====================================================
// PAYMENT METHOD
// =====================================================

function selectPaymentMethod(option) {

    if (!option) {
        return;
    }


    const options =
        document.querySelectorAll(
            ".payment-option"
        );


    options.forEach(
        function (item) {

            item.classList.remove(
                "selected"
            );


            const check =
                item.querySelector(
                    ".payment-check"
                );


            if (check) {

                check.remove();

            }

        }
    );


    option.classList.add(
        "selected"
    );


    const check =
        document.createElement(
            "span"
        );


    check.className =
        "payment-check";


    check.textContent =
        "✓";


    option.appendChild(check);

}


// =====================================================
// PROCESS PAYMENT
// =====================================================

function processPayment() {

    const savedOrder =
        localStorage.getItem(
            "currentOrder"
        );


    if (!savedOrder) {

        alert(
            "Order information not found."
        );

        return;

    }


    let orderData;


    try {

        orderData =
            JSON.parse(savedOrder);

    } catch (error) {

        alert(
            "Invalid order information."
        );

        return;

    }


    fetch(
        "http://127.0.0.1:5000/payment/success",
        {
            method: "POST",

            headers: {
                "Content-Type":
                    "application/json"
            },

            body: JSON.stringify({

                order_id:
                    orderData.order_id

            })

        }
    )

        .then(function (response) {

            return response.json();

        })

        .then(function (data) {

            if (
                data.status === "PAID"
            ) {

                localStorage.setItem(
                    "paidOrder",
                    JSON.stringify(data)
                );


                window.location.href =
                    "payment-success.html";

            } else {

                alert(
                    data.message ||
                    "Payment failed."
                );

            }

        })

        .catch(function (error) {

            console.error(
                "Payment error:",
                error
            );

            alert(
                "Payment failed. Please try again."
            );

        });

}


// =====================================================
// STUDENT ORDERS
// =====================================================

let openQrOrderId = null;
let renderedOrdersSignature = "";

function loadStudentOrders() {

    const ordersContainer =
        document.getElementById(
            "orders-container"
        );


    if (!ordersContainer) {
        return;
    }


    const savedStudent =
        localStorage.getItem("student");


    if (!savedStudent) {

        alert("Please login first.");

        return;

    }


    let studentData;


    try {

        studentData =
            JSON.parse(savedStudent);

    } catch (error) {

        return;

    }


    fetch(
        `http://127.0.0.1:5000/orders/${studentData.id}`
    )

        .then(function (response) {

            return response.json();

        })

        .then(function (data) {

            const orders =
                Array.isArray(data.orders) ? data.orders : [];

            const ordersSignature =
                JSON.stringify(orders);

            if (ordersSignature === renderedOrdersSignature) {
                return;
            }

            renderedOrdersSignature = ordersSignature;

            ordersContainer.innerHTML =
                "";


            const emptyMessage =
                document.getElementById(
                    "orders-empty"
                );


            if (
                orders.length === 0
            ) {

                if (emptyMessage) {

                    emptyMessage.style.display =
                        "block";

                }

                return;

            }


            if (emptyMessage) {

                emptyMessage.style.display =
                    "none";

            }


            orders.forEach(
                function (order) {

                    const orderCard =
                        document.createElement(
                            "div"
                        );


                    orderCard.className =
                        "order-card";

                    const orderId =
                        Number(order.order_id);

                    const hasQr =
                        Boolean(order.qr_image);

                    const isCollected =
                        String(order.status || "").toUpperCase() === "COLLECTED";

                    const qrUrl = hasQr
                        ? `http://127.0.0.1:5000/qr/${encodeURIComponent(order.qr_image)}`
                        : "";

                    const isQrOpen =
                        String(orderId) === openQrOrderId;

                    const qrControls = hasQr ? `
                        <button
                            class="primary-action view-qr-btn"
                            type="button"
                            data-order-id="${orderId}"
                            aria-controls="student-order-qr-${orderId}"
                            aria-expanded="${isQrOpen}">
                            ${isQrOpen ? "Hide QR" : "View QR"}
                        </button>

                        <div
                            class="order-qr-view"
                            id="student-order-qr-${orderId}"
                            ${isQrOpen ? "" : "hidden"}>
                            <div class="order-qr-frame ${isCollected ? "is-collected" : ""}">
                                <img src="${qrUrl}" alt="Pickup QR for order #${orderId}">
                                ${isCollected ? '<div class="order-qr-collected" role="status">Food collected</div>' : ""}
                            </div>
                            <a
                                class="primary-btn order-qr-download ${isCollected ? "is-disabled" : ""}"
                                href="${qrUrl}?download=1"
                                ${isCollected ? 'aria-disabled="true" tabindex="-1"' : ""}>
                                Download QR
                            </a>
                        </div>
                    ` : "";


                    orderCard.innerHTML = `

                        <div>

                            <h3>
                                Order #${order.order_id}
                            </h3>


                            <div class="order-info">

                                <div>

                                    <span>
                                        Amount
                                    </span>

                                    <strong>
                                        ₹${Number(order.total_amount || 0).toFixed(2)}
                                    </strong>
                                    ${Number(order.refunded_amount || 0) > 0
                                        ? `<small class="refund-info">Refund recorded · ₹${Number(order.refunded_amount).toFixed(2)}</small>`
                                        : `<small class="payment-info">${String(order.payment_status || "UNPAID")}</small>`}

                                </div>


                                <div>

                                    <span>
                                        Pickup Slot
                                    </span>

                                    <strong>
                                        ${order.pickup_slot}
                                    </strong>

                                </div>

                            </div>

                        </div>


                        <div class="order-card-side">
                            <div class="order-status ${isCollected ? "is-collected" : ""}">
                                ${isCollected ? "FOOD COLLECTED" : String(order.status || "").replace(/_/g, " ")}
                            </div>
                            ${qrControls}
                        </div>

                    `;


                    ordersContainer.appendChild(
                        orderCard
                    );

                }
            );

        })

        .catch(function (error) {

            console.error(
                "Orders loading error:",
                error
            );

        });

}


const studentOrdersContainer =
    document.getElementById("orders-container");

if (studentOrdersContainer) {
    studentOrdersContainer.addEventListener("click", function (event) {
        const toggleButton =
            event.target.closest(".view-qr-btn");

        if (!toggleButton) {
            return;
        }

        const orderId =
            toggleButton.dataset.orderId;

        const qrPanel =
            document.getElementById(`student-order-qr-${orderId}`);

        if (!qrPanel) {
            return;
        }

        const isExpanded =
            toggleButton.getAttribute("aria-expanded") === "true";

        openQrOrderId = isExpanded ? null : orderId;
        qrPanel.hidden = isExpanded;
        toggleButton.setAttribute("aria-expanded", String(!isExpanded));
        toggleButton.textContent = isExpanded ? "View QR" : "Hide QR";
    });
}


loadStudentOrders();

if (document.getElementById("orders-container")) {
    window.setInterval(loadStudentOrders, 5000);
}


// =====================================================
// STUDENT DASHBOARD STATS
// =====================================================

function loadDashboardStats() {

    const savedStudent =
        localStorage.getItem("student");


    if (!savedStudent) {
        return;
    }


    let studentData;


    try {

        studentData =
            JSON.parse(savedStudent);

    } catch (error) {

        return;

    }


    if (!studentData || !studentData.id) {
        return;
    }


    // -----------------------------
    // CART COUNT
    // -----------------------------

    fetch(
        `http://127.0.0.1:5000/cart/${studentData.id}`
    )

        .then(function (response) {

            return response.json();

        })

        .then(function (data) {

            let cartCount = 0;


            if (data.cart) {

                data.cart.forEach(
                    function (item) {

                        cartCount +=
                            item.quantity;

                    }
                );

            }


            const cartCountElement =
                document.getElementById(
                    "dashboard-cart-count"
                );


            if (cartCountElement) {

                cartCountElement.textContent =
                    cartCount;

            }

        })

        .catch(function (error) {

            console.error(
                "Dashboard cart count error:",
                error
            );

        });


    // -----------------------------
    // TOTAL ORDERS
    // -----------------------------

    fetch(
        `http://127.0.0.1:5000/orders/${studentData.id}`
    )

        .then(function (response) {

            return response.json();

        })

        .then(function (data) {

            const orderCountElement =
                document.getElementById(
                    "dashboard-order-count"
                );


            if (orderCountElement) {

                orderCountElement.textContent =
                    data.orders
                        ? data.orders.length
                        : 0;

            }

        })

        .catch(function (error) {

            console.error(
                "Dashboard order count error:",
                error
            );

        });

}


loadDashboardStats();


// =====================================================
// STAFF REGISTRATION
// =====================================================

const staffRegisterForm =
    document.getElementById(
        "staff-register-form"
    );


if (staffRegisterForm) {

    staffRegisterForm.addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();


            const name =
                document
                    .getElementById(
                        "staff-name"
                    )
                    .value
                    .trim();


            const email =
                document
                    .getElementById(
                        "staff-email"
                    )
                    .value
                    .trim();


            const password =
                document
                    .getElementById(
                        "staff-password"
                    )
                    .value;


            const confirmPassword =
                document
                    .getElementById(
                        "staff-confirm-password"
                    )
                    .value;


            const message =
                document.getElementById(
                    "staff-register-message"
                );


            if (
                !name ||
                !email ||
                !password ||
                !confirmPassword
            ) {

                if (message) {

                    message.textContent =
                        "Please fill in all fields.";

                }

                return;

            }


            if (
                password !==
                confirmPassword
            ) {

                if (message) {

                    message.textContent =
                        "Passwords do not match!";

                }

                return;

            }


            try {

                const response =
                    await fetch(
                        "http://127.0.0.1:5000/staff/register",
                        {
                            method: "POST",

                            headers: {
                                "Content-Type":
                                    "application/json"
                            },

                            body: JSON.stringify({

                                name:
                                    name,

                                email:
                                    email,

                                password:
                                    password

                            })

                        }
                    );


                const result =
                    await response.json();


                if (response.ok) {

                    if (message) {

                        message.textContent =
                            result.message;

                    }


                    alert(
                        result.message
                    );


                    staffRegisterForm.reset();


                    setTimeout(
                        function () {

                            window.location.href =
                                "staff-login.html";

                        },
                        500
                    );

                } else {

                    if (message) {

                        message.textContent =
                            result.message;

                    }

                }

            } catch (error) {

                console.error(
                    "Staff registration error:",
                    error
                );


                if (message) {

                    message.textContent =
                        "Unable to connect to server.";

                }

            }

        }
    );

}


// =====================================================
// STAFF LOGIN
// =====================================================

const staffLoginForm =
    document.getElementById(
        "staff-login-form"
    );


if (staffLoginForm) {

    staffLoginForm.addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();


            const email =
                document
                    .getElementById(
                        "staff-email"
                    )
                    .value
                    .trim();


            const password =
                document
                    .getElementById(
                        "staff-password"
                    )
                    .value;


            const message =
                document.getElementById(
                    "staff-login-message"
                );


            if (!email || !password) {

                if (message) {

                    message.textContent =
                        "Please enter email and password.";

                }

                return;

            }


            try {

                // IMPORTANT:
                // Staff login uses /staff/login

                const response =
                    await fetch(
                        "http://127.0.0.1:5000/staff/login",
                        {
                            method: "POST",

                            headers: {
                                "Content-Type":
                                    "application/json"
                            },

                            body: JSON.stringify({

                                email:
                                    email,

                                password:
                                    password

                            })

                        }
                    );


                const result =
                    await response.json();


                if (response.ok) {

                    localStorage.setItem(
                        "staff",
                        JSON.stringify(
                            result.user
                        )
                    );


                    alert(
                        result.message
                    );


                    window.location.href =
                        "staff-dashboard.html";

                } else {

                    if (message) {

                        message.textContent =
                            result.message;

                    }

                }

            } catch (error) {

                console.error(
                    "Staff login error:",
                    error
                );


                if (message) {

                    message.textContent =
                        "Unable to connect to server.";

                }

            }

        }
    );

}



// =====================================================
// STAFF STATISTICS
// =====================================================

async function loadStaffStats() {

    const todayOrders =
        document.getElementById(
            "today-orders"
        );


    const pendingOrders =
        document.getElementById(
            "pending-orders"
        );


    const preparingOrders =
        document.getElementById(
            "preparing-orders"
        );


    const readyOrders =
        document.getElementById(
            "ready-orders"
        );


    const revenue =
        document.getElementById(
            "today-revenue"
        );


    if (
        !todayOrders &&
        !pendingOrders &&
        !preparingOrders &&
        !readyOrders &&
        !revenue
    ) {

        return;

    }


    try {

        const response =
            await fetch(
                "http://127.0.0.1:5000/staff/stats"
            );


        const data =
            await response.json();


        if (todayOrders) {

            todayOrders.textContent =
                data.today_orders || 0;

        }


        if (pendingOrders) {

            pendingOrders.textContent =
                data.pending_orders || 0;

        }


        if (preparingOrders) {

            preparingOrders.textContent =
                data.preparing_orders || 0;

        }


        if (readyOrders) {

            readyOrders.textContent =
                data.ready_orders || 0;

        }


        if (revenue) {

            revenue.textContent =
                "₹" +
                (data.revenue || 0);

        }


    } catch (error) {

        console.error(
            "Staff statistics error:",
            error
        );

    }

}


loadStaffStats();


// =====================================================
// UPDATE STAFF ORDER STATUS
// =====================================================

async function updateStaffOrderStatus(
    orderId,
    newStatus
) {

    try {

        const response =
            await fetch(
                `http://127.0.0.1:5000/staff/orders/${orderId}/status`,
                {
                    method: "PUT",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({

                        status:
                            newStatus

                    })

                }
            );


        const data =
            await response.json();


        if (!response.ok) {

            alert(
                data.message ||
                "Unable to update status."
            );

            return;

        }


        alert(
            "Order #" +
            orderId +
            " status updated to " +
            newStatus
        );


        loadStaffOrders();

        loadStaffStats();


    } catch (error) {

        console.error(
            "Status update error:",
            error
        );


        alert(
            "Unable to update order status."
        );

    }

}
/* =========================================
   STAFF ORDERS
   ========================================= */

const STAFF_API_URL = "http://127.0.0.1:5000";


// Load Staff Orders
async function loadStaffOrders() {

    const ordersList = document.getElementById("staff-orders-list");
    const orderCount = document.getElementById("order-count");

    // This function is only for staff-orders.html
    if (!ordersList) {
        return;
    }

    ordersList.innerHTML = `
        <div class="orders-loading">
            Loading orders...
        </div>
    `;

    try {

        const response = await fetch(
            `${STAFF_API_URL}/staff/orders`
        );

        if (!response.ok) {
            throw new Error("Unable to load orders.");
        }

        const orders = await response.json();

        orderCount.textContent =
            `${orders.length} order${orders.length === 1 ? "" : "s"}`;


        // No orders
        if (orders.length === 0) {

            ordersList.innerHTML = `
                <div class="orders-empty">

                    <div class="orders-empty-icon">
                        📭
                    </div>

                    <h3>No Orders Yet</h3>

                    <p>
                        Student orders will appear here
                        when they place an order.
                    </p>

                </div>
            `;

            return;
        }


        ordersList.innerHTML = "";


        // Display orders
        orders.forEach(function(order) {

            const orderItem =
                document.createElement("div");

            orderItem.className =
                "staff-order-item";


            orderItem.innerHTML = `

                <div class="staff-order-main">

                    <div class="staff-order-icon">
                        🧾
                    </div>

                    <div class="staff-order-details">

                        <h3>
                            Order #${order.order_id}
                        </h3>

                        <p>
                            <strong>Student:</strong>
                            ${order.student_name || "Unknown"}
                        </p>

                        <p>
                            <strong>Pickup:</strong>
                            ${order.pickup_slot || "Not selected"}
                        </p>

                        <p>
                            <strong>Amount:</strong>
                            ₹${Number(order.total_amount || 0).toFixed(2)}
                        </p>

                    </div>

                </div>


                <div class="staff-order-actions">

                    <span class="staff-order-status">
                        ${order.status}
                    </span>

                    <select
                        class="order-status-select"
                        id="status-${order.order_id}"
                    >

                        <option value="PLACED"
                            ${order.status === "PLACED" ? "selected" : ""}>
                            PLACED
                        </option>

                        <option value="PAID"
                            ${order.status === "PAID" ? "selected" : ""}>
                            PAID
                        </option>

                        <option value="CONFIRMED"
                            ${order.status === "CONFIRMED" ? "selected" : ""}>
                            CONFIRMED
                        </option>

                        <option value="PREPARING"
                            ${order.status === "PREPARING" ? "selected" : ""}>
                            PREPARING
                        </option>

                        <option value="READY"
                            ${order.status === "READY" ? "selected" : ""}>
                            READY
                        </option>

                        <option value="COLLECTED"
                            ${order.status === "COLLECTED" ? "selected" : ""}>
                            COLLECTED
                        </option>

                        <option value="CANCELLED"
                            ${order.status === "CANCELLED" ? "selected" : ""}>
                            CANCELLED
                        </option>

                    </select>

                    <button
                        class="order-update-btn"
                        onclick="updateOrderStatus(${order.order_id})"
                    >
                        Update
                    </button>

                </div>

            `;

            ordersList.appendChild(orderItem);

        });

    }
    catch (error) {

        console.error("Staff Orders Error:", error);

        orderCount.textContent =
            "Unable to load orders";

        ordersList.innerHTML = `
            <div class="orders-empty">

                <div class="orders-empty-icon">
                    ⚠️
                </div>

                <h3>Unable to Load Orders</h3>

                <p>
                    Please make sure the Flask backend
                    is running.
                </p>

            </div>
        `;
    }
}


// Update Order Status
async function updateOrderStatus(orderId) {

    const select =
        document.getElementById(`status-${orderId}`);

    const newStatus =
        select.value;


    try {

        const response = await fetch(
            `${STAFF_API_URL}/staff/orders/${orderId}/status`,
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    status: newStatus
                })
            }
        );


        const result = await response.json();


        if (!response.ok) {

            throw new Error(
                result.message ||
                "Unable to update order status."
            );

        }


        showStaffOrderMessage(
            `Order #${orderId} updated successfully.`,
            "success"
        );


        // Reload updated orders
        loadStaffOrders();

    }
    catch (error) {

        console.error("Status Update Error:", error);

        showStaffOrderMessage(
            error.message ||
            "Unable to update order.",
            "error"
        );

    }
}


// Show success / error message
function showStaffOrderMessage(message, type) {

    const messageBox =
        document.getElementById("order-message");

    if (!messageBox) {
        return;
    }

    messageBox.textContent = message;

    messageBox.className =
        "order-message " + type;


    setTimeout(function() {

        messageBox.className =
            "order-message";

    }, 3000);

}


// Staff Logout
function logoutStaff() {

    localStorage.removeItem("staff");

    window.location.href =
        "staff-login.html";

}


// Load orders when Staff Orders page opens
if (document.getElementById("staff-orders-list")) {

    loadStaffOrders();

}