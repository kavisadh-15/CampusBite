from flask import Flask, request, send_from_directory
from flask_cors import CORS
from werkzeug.security import check_password_hash, generate_password_hash
import sqlite3
import qrcode
import secrets
import os
import hmac


# =========================================================
# APP CONFIGURATION
# =========================================================

app = Flask(__name__)
CORS(app)

DB_PATH = os.path.join(app.root_path, "canteen.db")
QR_FOLDER = os.path.join(app.root_path, "qr_codes")


# =========================================================
# DATABASE CONNECTION
# =========================================================

def get_db_connection():

    conn = sqlite3.connect(DB_PATH)

    conn.row_factory = sqlite3.Row

    return conn


def verify_user_password(conn, user, submitted_password):

    stored_password = user["password"]

    if stored_password.startswith(("scrypt:", "pbkdf2:")):
        return check_password_hash(stored_password, submitted_password)

    if hmac.compare_digest(stored_password, submitted_password):
        conn.execute("""
            UPDATE users
            SET password = ?
            WHERE id = ?
        """, (
            generate_password_hash(submitted_password),
            user["id"]
        ))
        conn.commit()
        return True

    return False


def get_canteen_is_open(conn):

    setting = conn.execute("""
        SELECT value
        FROM app_settings
        WHERE key = 'canteen_open'
    """).fetchone()

    return setting is None or setting["value"] == "1"


# =========================================================
# ORDER NOTIFICATION HELPER
# =========================================================

def create_order_notification(
    conn,
    user_id,
    order_id,
    title,
    message,
    notification_type="ORDER_STATUS"
):

    conn.execute("""
        INSERT INTO notifications
        (
            user_id,
            order_id,
            title,
            message,
            type,
            is_read
        )

        VALUES (?, ?, ?, ?, ?, 0)
    """, (
        user_id,
        order_id,
        title,
        message,
        notification_type
    ))


# =========================================================
# DATABASE INITIALIZATION
# =========================================================

def init_db():

    conn = get_db_connection()
    cursor = conn.cursor()

    # -----------------------------------------------------
    # USERS TABLE
    # -----------------------------------------------------

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            register_number TEXT UNIQUE,
            email TEXT NOT NULL UNIQUE,
            password TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'student'
        )
    """)

    # -----------------------------------------------------
    # USERS TABLE MIGRATION
    # Allow register_number to be NULL for staff accounts
    # -----------------------------------------------------

    cursor.execute("PRAGMA table_info(users)")

    user_columns = cursor.fetchall()

    register_column = None

    for column in user_columns:

        if column["name"] == "register_number":

            register_column = column

            break

    if register_column and register_column["notnull"] == 1:

        cursor.execute("""
            CREATE TABLE users_new (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                register_number TEXT UNIQUE,
                email TEXT NOT NULL UNIQUE,
                password TEXT NOT NULL,
                role TEXT NOT NULL DEFAULT 'student'
            )
        """)

        cursor.execute("""
            INSERT INTO users_new
            (id, name, register_number, email, password, role)

            SELECT
                id,
                name,
                register_number,
                email,
                password,
                role

            FROM users
        """)

        cursor.execute("DROP TABLE users")

        cursor.execute("""
            ALTER TABLE users_new
            RENAME TO users
        """)

    # -----------------------------------------------------
    # MENU TABLE
    # -----------------------------------------------------

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS menu (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            category TEXT NOT NULL,
            description TEXT,
            price REAL NOT NULL,
            available INTEGER DEFAULT 1,
            stock_quantity INTEGER DEFAULT 0,
            image TEXT,
            rating REAL DEFAULT 4.5,
            prep_time INTEGER DEFAULT 10
        )
    """)

    # -----------------------------------------------------
    # MENU TABLE MIGRATION
    # -----------------------------------------------------

    menu_columns = conn.execute("""
        PRAGMA table_info(menu)
    """).fetchall()

    menu_column_names = [
        column["name"]
        for column in menu_columns
    ]

    if "stock_quantity" not in menu_column_names:

        conn.execute("""
            ALTER TABLE menu
            ADD COLUMN stock_quantity INTEGER DEFAULT 0
        """)

    if "image" not in menu_column_names:

        conn.execute("""
            ALTER TABLE menu
            ADD COLUMN image TEXT
        """)

    if "rating" not in menu_column_names:

        conn.execute("""
            ALTER TABLE menu
            ADD COLUMN rating REAL DEFAULT 4.5
        """)

    if "prep_time" not in menu_column_names:

        conn.execute("""
            ALTER TABLE menu
            ADD COLUMN prep_time INTEGER DEFAULT 10
        """)

    # -----------------------------------------------------
    # CART TABLE
    # -----------------------------------------------------

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS cart (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            menu_id INTEGER NOT NULL,
            quantity INTEGER DEFAULT 1
        )
    """)

    # -----------------------------------------------------
    # ORDERS TABLE
    # -----------------------------------------------------

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            pickup_slot TEXT NOT NULL,
            total_amount REAL NOT NULL,
            status TEXT NOT NULL DEFAULT 'PLACED',
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # -----------------------------------------------------
    # ORDER ITEMS TABLE
    # -----------------------------------------------------

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS order_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            order_id INTEGER NOT NULL,
            menu_id INTEGER NOT NULL,
            quantity INTEGER NOT NULL,
            price REAL NOT NULL
        )
    """)

    conn.execute("""
        CREATE TABLE IF NOT EXISTS notifications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            order_id INTEGER,
            title TEXT NOT NULL,
            message TEXT NOT NULL,
            type TEXT DEFAULT 'ORDER_STATUS',
            is_read INTEGER DEFAULT 0,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS app_settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        )
    """)

    cursor.execute("""
        INSERT OR IGNORE INTO app_settings (key, value)
        VALUES ('canteen_open', '1')
    """)

    # -----------------------------------------------------
    # ORDERS TABLE MIGRATION
    # -----------------------------------------------------

    cursor.execute("PRAGMA table_info(orders)")

    order_columns = [
        column["name"]
        for column in cursor.fetchall()
    ]

    if "qr_token" not in order_columns:

        cursor.execute("""
            ALTER TABLE orders
            ADD COLUMN qr_token TEXT
        """)

    if "created_at" not in order_columns:

        cursor.execute("""
            ALTER TABLE orders
            ADD COLUMN created_at TEXT
        """)

    cursor.execute("""
        UPDATE orders
        SET created_at = CURRENT_TIMESTAMP
        WHERE created_at IS NULL
    """)

    if "payment_status" not in order_columns:

        cursor.execute("""
            ALTER TABLE orders
            ADD COLUMN payment_status TEXT NOT NULL DEFAULT 'UNPAID'
        """)

        cursor.execute("""
            UPDATE orders
            SET payment_status = 'PAID'
            WHERE status IN (
                'PAID', 'CONFIRMED', 'PREPARING', 'READY', 'COLLECTED'
            )
        """)

    if "refunded_amount" not in order_columns:

        cursor.execute("""
            ALTER TABLE orders
            ADD COLUMN refunded_amount REAL NOT NULL DEFAULT 0
        """)

    conn.commit()

    conn.close()


# =========================================================
# SAMPLE MENU
# =========================================================

def add_sample_menu():

    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT COUNT(*) AS count
        FROM menu
    """)

    count = cursor.fetchone()["count"]

    if count == 0:

        menu_items = [

            (
                "Idly",
                "Breakfast",
                "Soft and freshly steamed idly",
                25,
                1,
                20,
                "idly.jpg",
                4.5,
                8
            ),

            (
                "Pongal",
                "Breakfast",
                "Hot and delicious South Indian pongal",
                40,
                1,
                15,
                "pongal.jpg",
                4.6,
                10
            ),

            (
                "Poori",
                "Breakfast",
                "Fluffy poori served with tasty masala",
                40,
                1,
                12,
                "poori.jpg",
                4.4,
                12
            ),

            (
                "Masala Dosa",
                "Breakfast",
                "Crispy dosa with flavorful potato masala",
                50,
                1,
                15,
                "dosa.jpg",
                4.7,
                12
            ),

            (
                "Vada",
                "Breakfast",
                "Crispy golden South Indian vada",
                20,
                1,
                25,
                "vada.jpg",
                4.5,
                8
            ),

            (
                "Veg Meals",
                "Main Course",
                "Fresh and delicious campus meal",
                60,
                1,
                10,
                "veg-meals.jpg",
                4.6,
                15
            ),

            (
                "Lemon Rice",
                "Main Course",
                "Tangy and flavorful lemon rice",
                40,
                1,
                12,
                "lemon-rice.jpg",
                4.4,
                8
            ),

            (
                "Tomato Rice",
                "Main Course",
                "Spicy and flavorful tomato rice",
                40,
                1,
                12,
                "tomato-rice.jpg",
                4.5,
                8
            ),

            (
                "Curd Rice",
                "Main Course",
                "Cool and creamy curd rice",
                35,
                1,
                8,
                "curd-rice.jpg",
                4.3,
                5
            ),

            (
                "Veg Biryani",
                "Main Course",
                "Aromatic vegetable biryani with rich flavors",
                70,
                1,
                10,
                "briyani.jpg",
                4.7,
                18
            ),

            (
                "Samosa",
                "Snacks",
                "Crispy samosa with spicy potato filling",
                15,
                1,
                20,
                "samosa.jpg",
                4.5,
                5
            ),

            (
                "Sandwich",
                "Snacks",
                "Freshly prepared vegetable sandwich",
                35,
                1,
                8,
                "sandwich.jpg",
                4.4,
                8
            ),

            (
                "Veg Noodles",
                "Snacks",
                "Hot and tasty vegetable noodles",
                50,
                1,
                12,
                "veg-noodles.jpg",
                4.6,
                12
            ),

            (
                "French Fries",
                "Snacks",
                "Crispy golden fries",
                45,
                1,
                10,
                "french-fries.jpg",
                4.5,
                10
            ),

            (
                "Veg Puff",
                "Snacks",
                "Flaky puff filled with seasoned vegetables",
                20,
                1,
                6,
                "puffs.jpg",
                4.3,
                6
            ),

            (
                "Veg Cutlet",
                "Snacks",
                "Crispy vegetable cutlet",
                25,
                1,
                8,
                "cutlet.jpg",
                4.4,
                8
            ),

            (
                "Tea",
                "Drinks",
                "Hot refreshing tea",
                15,
                1,
                30,
                "tea.jpg",
                4.5,
                5
            ),

            (
                "Coffee",
                "Drinks",
                "Freshly brewed hot coffee",
                20,
                1,
                30,
                "coffee.jpg",
                4.7,
                5
            ),

            (
                "Fresh Lime",
                "Drinks",
                "Refreshing fresh lime drink",
                25,
                1,
                15,
                "lime-juice.jpg",
                4.4,
                4
            ),

            (
                "Rose Milk",
                "Drinks",
                "Chilled and refreshing rose milk",
                30,
                1,
                12,
                "rosemilk.jpg",
                4.5,
                5
            ),

            (
                "Milkshake",
                "Drinks",
                "Creamy and refreshing milkshake",
                50,
                1,
                8,
                "milkshake.jpg",
                4.6,
                8
            ),

            (
                "Ice Cream",
                "Desserts",
                "Creamy and chilled ice cream",
                30,
                1,
                5,
                "icecream.jpg",
                4.5,
                3
            ),

            (
                "Gulab Jamun",
                "Desserts",
                "Soft and sweet gulab jamun",
                25,
                1,
                5,
                "gulab-jamun.jpg",
                4.6,
                3
            )
        ]

        cursor.executemany("""
            INSERT INTO menu
            (
                name,
                category,
                description,
                price,
                available,
                stock_quantity,
                image,
                rating,
                prep_time
            )

            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, menu_items)

    conn.commit()

    conn.close()


# =========================================================
# STUDENT - GET MENU
# =========================================================

@app.route("/menu", methods=["GET"])
def get_menu():

    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT
            id,
            name,
            category,
            description,
            price,
            available,
            stock_quantity,
            image,
            rating,
            prep_time

        FROM menu

        WHERE available = 1

        ORDER BY id
    """)

    menu = cursor.fetchall()

    conn.close()

    menu_list = []

    for item in menu:

        menu_list.append({
            "id": item["id"],
            "name": item["name"],
            "category": item["category"],
            "description": item["description"],
            "price": item["price"],
            "available": item["available"],
            "stock_quantity": item["stock_quantity"],
            "image": item["image"],
            "rating": item["rating"],
            "prep_time": item["prep_time"]
        })

    return {
        "menu": menu_list
    }


# =========================================================
# STAFF - GET ALL MENU
# =========================================================

@app.route("/staff/menu", methods=["GET"])
def staff_get_menu():

    conn = get_db_connection()

    menu = conn.execute("""
        SELECT
            id,
            name,
            category,
            description,
            price,
            available,
            stock_quantity,
            image,
            rating,
            prep_time

        FROM menu

        ORDER BY id DESC
    """).fetchall()

    conn.close()

    menu_list = []

    for item in menu:

        menu_list.append({
            "id": item["id"],
            "name": item["name"],
            "category": item["category"],
            "description": item["description"],
            "price": float(item["price"]),
            "available": item["available"],
            "stock_quantity": item["stock_quantity"],
            "image": item["image"],
            "rating": item["rating"],
            "prep_time": item["prep_time"]
        })

    return {
        "success": True,
        "menu": menu_list
    }


# =========================================================
# STAFF - ADD MENU ITEM
# =========================================================

@app.route("/staff/menu", methods=["POST"])
def staff_add_menu():

    data = request.get_json()

    name = data.get("name")
    category = data.get("category")
    description = data.get("description", "")
    price = data.get("price")
    stock_quantity = data.get("stock_quantity", 0)
    image = data.get("image", "")
    rating = data.get("rating", 4.5)
    prep_time = data.get("prep_time", 10)
    available = data.get("available", 1)

    if not name or not category or price is None:

        return {
            "success": False,
            "message": "Name, category and price are required!"
        }, 400

    try:

        price = float(price)
        stock_quantity = int(stock_quantity)
        rating = float(rating)
        prep_time = int(prep_time)
        available = int(available)

    except (ValueError, TypeError):

        return {
            "success": False,
            "message": "Invalid menu values!"
        }, 400

    if price < 0:

        return {
            "success": False,
            "message": "Price cannot be negative!"
        }, 400

    if stock_quantity < 0:

        return {
            "success": False,
            "message": "Stock quantity cannot be negative!"
        }, 400

    if available not in (0, 1):

        available = 1

    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
        INSERT INTO menu
        (
            name,
            category,
            description,
            price,
            available,
            stock_quantity,
            image,
            rating,
            prep_time
        )

        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        name.strip(),
        category.strip(),
        description.strip(),
        price,
        available,
        stock_quantity,
        image.strip(),
        rating,
        prep_time
    ))

    menu_id = cursor.lastrowid

    conn.commit()

    conn.close()

    return {
        "success": True,
        "message": "Menu item added successfully!",
        "item": {
            "id": menu_id,
            "name": name.strip(),
            "category": category.strip(),
            "description": description.strip(),
            "price": price,
            "available": available,
            "stock_quantity": stock_quantity,
            "image": image.strip(),
            "rating": rating,
            "prep_time": prep_time
        }
    }, 201


# =========================================================
# STAFF - UPDATE MENU ITEM
# =========================================================

@app.route("/staff/menu/<int:menu_id>", methods=["PUT"])
def staff_update_menu(menu_id):

    data = request.get_json()

    name = data.get("name")
    category = data.get("category")
    description = data.get("description", "")
    price = data.get("price")
    stock_quantity = data.get("stock_quantity", 0)
    image = data.get("image", "")
    rating = data.get("rating", 4.5)
    prep_time = data.get("prep_time", 10)
    available = data.get("available", 1)

    if not name or not category or price is None:

        return {
            "success": False,
            "message": "Name, category and price are required!"
        }, 400

    try:

        price = float(price)
        stock_quantity = int(stock_quantity)
        rating = float(rating)
        prep_time = int(prep_time)
        available = int(available)

    except (ValueError, TypeError):

        return {
            "success": False,
            "message": "Invalid menu values!"
        }, 400

    if price < 0:

        return {
            "success": False,
            "message": "Price cannot be negative!"
        }, 400

    if stock_quantity < 0:

        return {
            "success": False,
            "message": "Stock quantity cannot be negative!"
        }, 400

    if available not in (0, 1):

        available = 1

    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT id
        FROM menu
        WHERE id = ?
    """, (menu_id,))

    existing_item = cursor.fetchone()

    if not existing_item:

        conn.close()

        return {
            "success": False,
            "message": "Menu item not found!"
        }, 404

    cursor.execute("""
        UPDATE menu

        SET
            name = ?,
            category = ?,
            description = ?,
            price = ?,
            available = ?,
            stock_quantity = ?,
            image = ?,
            rating = ?,
            prep_time = ?

        WHERE id = ?
    """, (
        name.strip(),
        category.strip(),
        description.strip(),
        price,
        available,
        stock_quantity,
        image.strip(),
        rating,
        prep_time,
        menu_id
    ))

    conn.commit()

    conn.close()

    return {
        "success": True,
        "message": "Menu item updated successfully!"
    }


# =========================================================
# STAFF - DELETE MENU ITEM
# =========================================================

@app.route("/staff/menu/<int:menu_id>", methods=["DELETE"])
def staff_delete_menu(menu_id):

    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT id
        FROM menu
        WHERE id = ?
    """, (menu_id,))

    existing_item = cursor.fetchone()

    if not existing_item:

        conn.close()

        return {
            "success": False,
            "message": "Menu item not found!"
        }, 404

    cursor.execute("""
        DELETE FROM cart
        WHERE menu_id = ?
    """, (menu_id,))

    cursor.execute("""
        DELETE FROM menu
        WHERE id = ?
    """, (menu_id,))

    conn.commit()

    conn.close()

    return {
        "success": True,
        "message": "Menu item deleted successfully!"
    }


# =========================================================
# ADD TO CART
# =========================================================

@app.route("/cart/add", methods=["POST"])
def add_to_cart():

    data = request.get_json()

    user_id = data.get("user_id")
    menu_id = data.get("menu_id")

    if not user_id or not menu_id:

        return {
            "message": "User ID and menu ID are required!"
        }, 400

    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT
            id,
            quantity

        FROM cart

        WHERE user_id = ?
        AND menu_id = ?
    """, (user_id, menu_id))

    existing_item = cursor.fetchone()

    if existing_item:

        new_quantity = existing_item["quantity"] + 1

        cursor.execute("""
            UPDATE cart

            SET quantity = ?

            WHERE id = ?
        """, (
            new_quantity,
            existing_item["id"]
        ))

    else:

        cursor.execute("""
            INSERT INTO cart
            (user_id, menu_id, quantity)

            VALUES (?, ?, ?)
        """, (
            user_id,
            menu_id,
            1
        ))

    conn.commit()

    conn.close()

    return {
        "message": "Food added to cart!"
    }


# =========================================================
# GET CART
# =========================================================

@app.route("/cart/<int:user_id>", methods=["GET"])
def get_cart(user_id):

    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT
            cart.id AS cart_id,
            menu.id AS menu_id,
            menu.name,
            menu.price,
            cart.quantity,
            (menu.price * cart.quantity) AS subtotal

        FROM cart

        JOIN menu
        ON cart.menu_id = menu.id

        WHERE cart.user_id = ?

        ORDER BY cart.id DESC
    """, (user_id,))

    cart_items = cursor.fetchall()

    conn.close()

    items = []

    for item in cart_items:

        items.append({
            "cart_id": item["cart_id"],
            "menu_id": item["menu_id"],
            "name": item["name"],
            "price": item["price"],
            "quantity": item["quantity"],
            "subtotal": item["subtotal"]
        })

    return {
        "cart": items
    }


# =========================================================
# UPDATE CART QUANTITY
# =========================================================

@app.route("/cart/update", methods=["PUT"])
def update_cart():

    data = request.get_json()

    cart_id = data.get("cart_id")
    quantity = data.get("quantity")

    if cart_id is None or quantity is None:

        return {
            "message": "Cart ID and quantity are required!"
        }, 400

    try:

        quantity = int(quantity)

    except (ValueError, TypeError):

        return {
            "message": "Quantity must be a number!"
        }, 400

    conn = get_db_connection()
    cursor = conn.cursor()

    if quantity <= 0:

        cursor.execute("""
            DELETE FROM cart
            WHERE id = ?
        """, (cart_id,))

    else:

        cursor.execute("""
            UPDATE cart

            SET quantity = ?

            WHERE id = ?
        """, (
            quantity,
            cart_id
        ))

    conn.commit()

    conn.close()

    return {
        "message": "Cart updated successfully!"
    }


# =========================================================
# REMOVE FROM CART
# =========================================================

@app.route("/cart/remove/<int:cart_id>", methods=["DELETE"])
def remove_from_cart(cart_id):

    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
        DELETE FROM cart

        WHERE id = ?
    """, (cart_id,))

    conn.commit()

    conn.close()

    return {
        "message": "Item removed from cart!"
    }


# =========================================================
# CREATE ORDER
# =========================================================

@app.route("/orders/create", methods=["POST"])
def create_order():

    data = request.get_json()

    user_id = data.get("user_id")
    pickup_slot = data.get("pickup_slot")

    if not user_id or not pickup_slot:

        return {
            "message": "User ID and pickup slot are required!"
        }, 400

    conn = get_db_connection()
    cursor = conn.cursor()

    if not get_canteen_is_open(conn):

        conn.close()

        return {
            "success": False,
            "message": "The canteen is closed and is not accepting new orders."
        }, 409

    cursor.execute("""
        SELECT
            cart.menu_id,
            cart.quantity,
            menu.price

        FROM cart

        JOIN menu
        ON cart.menu_id = menu.id

        WHERE cart.user_id = ?
    """, (user_id,))

    cart_items = cursor.fetchall()

    if not cart_items:

        conn.close()

        return {
            "message": "Cart is empty!"
        }, 400

    total = 0

    for item in cart_items:

        total += item["quantity"] * item["price"]

    cursor.execute("""
        INSERT INTO orders
        (
            user_id,
            pickup_slot,
            total_amount,
            status
        )

        VALUES (?, ?, ?, ?)
    """, (
        user_id,
        pickup_slot,
        total,
        "PLACED"
    ))

    order_id = cursor.lastrowid

    for item in cart_items:

        cursor.execute("""
            INSERT INTO order_items
            (
                order_id,
                menu_id,
                quantity,
                price
            )

            VALUES (?, ?, ?, ?)
        """, (
            order_id,
            item["menu_id"],
            item["quantity"],
            item["price"]
        ))

    conn.commit()

    conn.close()

    return {
        "message": "Order created successfully!",
        "order_id": order_id,
        "total_amount": total,
        "pickup_slot": pickup_slot
    }


# =========================================================
# PAYMENT SUCCESS
# =========================================================

@app.route("/payment/success", methods=["POST"])
def payment_success():

    data = request.get_json()

    order_id = data.get("order_id")

    if not order_id:

        return {
            "message": "Order ID is required!"
        }, 400

    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT
            id,
            user_id,
            total_amount,
            pickup_slot,
            status

        FROM orders

        WHERE id = ?
    """, (order_id,))

    order = cursor.fetchone()

    if order is None:

        conn.close()

        return {
            "message": "Order not found!"
        }, 404

    if order["status"] == "CANCELLED":

        conn.close()

        return {
            "success": False,
            "message": "This order has been cancelled and cannot be paid."
        }, 400

    qr_token = secrets.token_urlsafe(16)

    cursor.execute("""
        UPDATE orders

        SET
            status = ?,
            qr_token = ?,
            payment_status = 'PAID'

        WHERE id = ?
    """, (
        "PAID",
        qr_token,
        order_id
    ))

    cursor.execute("""
        DELETE FROM cart

        WHERE user_id = ?
    """, (
        order["user_id"],
    ))

    create_order_notification(
        conn,
        order["user_id"],
        order_id,
        "Payment Successful",
        f"Payment for your CampusBite order #{order_id} was successful. Your QR pickup code is ready."
    )

    conn.commit()

    if not os.path.exists(QR_FOLDER):

        os.makedirs(QR_FOLDER)

    qr_data = (
        f"CampusBite|"
        f"Order:{order_id}|"
        f"Token:{qr_token}"
    )

    qr = qrcode.make(qr_data)

    qr_filename = f"order_{order_id}.png"

    qr_path = os.path.join(
        QR_FOLDER,
        qr_filename
    )

    qr.save(qr_path)

    conn.close()

    return {
        "message": "Payment successful!",
        "order_id": order["id"],
        "total_amount": order["total_amount"],
        "pickup_slot": order["pickup_slot"],
        "status": "PAID",
        "qr_token": qr_token,
        "qr_image": qr_filename
    }


# =========================================================
# STUDENT REGISTER
# =========================================================

@app.route("/register", methods=["POST"])
def register():

    data = request.get_json()

    name = data.get("name")
    register_number = data.get("register_number")
    email = data.get("email")
    password = data.get("password")

    if not name or not register_number or not email or not password:

        return {
            "message": "All fields are required!"
        }, 400

    name = name.strip()
    register_number = register_number.strip()
    email = email.strip().lower()

    conn = get_db_connection()
    cursor = conn.cursor()

    try:

        cursor.execute("""
            INSERT INTO users
            (
                name,
                register_number,
                email,
                password,
                role
            )

            VALUES (?, ?, ?, ?, ?)
        """, (
            name,
            register_number,
            email,
            generate_password_hash(password),
            "student"
        ))

        conn.commit()

        student_id = cursor.lastrowid

        conn.close()

        return {
            "message": "Student registered successfully!",
            "user": {
                "id": student_id,
                "name": name,
                "register_number": register_number,
                "email": email,
                "role": "student"
            }
        }, 201

    except sqlite3.IntegrityError:

        conn.close()

        return {
            "message": "Register number or email already registered!"
        }, 409


# =========================================================
# STUDENT LOGIN
# =========================================================

@app.route("/login", methods=["POST"])
def login():

    data = request.get_json()

    register_number = data.get("register_number")
    password = data.get("password")

    if not register_number or not password:

        return {
            "message": "Register number and password are required!"
        }, 400

    register_number = register_number.strip()

    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT
            id,
            name,
            register_number,
            email,
            role,
            password

        FROM users

        WHERE register_number = ?
        AND role = 'student'
    """, (
        register_number,
    ))

    user = cursor.fetchone()
    password_is_valid = user and verify_user_password(
        conn,
        user,
        password
    )

    conn.close()

    if password_is_valid:

        return {
            "message": "Login successful!",
            "user": {
                "id": user["id"],
                "name": user["name"],
                "register_number": user["register_number"],
                "email": user["email"],
                "role": user["role"]
            }
        }, 200

    return {
        "message": "Invalid register number or password!"
    }, 401


# =========================================================
# STAFF REGISTER
# =========================================================

@app.route("/staff/register", methods=["POST"])
def staff_register():

    data = request.get_json()

    name = data.get("name")
    email = data.get("email")
    password = data.get("password")

    if not name or not email or not password:

        return {
            "message": "All fields are required!"
        }, 400

    name = name.strip()
    email = email.strip().lower()

    conn = get_db_connection()
    cursor = conn.cursor()

    try:

        cursor.execute("""
            INSERT INTO users
            (
                name,
                register_number,
                email,
                password,
                role
            )

            VALUES (?, ?, ?, ?, ?)
        """, (
            name,
            None,
            email,
            generate_password_hash(password),
            "staff"
        ))

        conn.commit()

        staff_id = cursor.lastrowid

        conn.close()

        return {
            "message": "Staff registration successful!",
            "user": {
                "id": staff_id,
                "name": name,
                "email": email,
                "role": "staff"
            }
        }, 201

    except sqlite3.IntegrityError:

        conn.close()

        return {
            "message": "Email already registered!"
        }, 409


# =========================================================
# STAFF LOGIN
# =========================================================

@app.route("/staff/login", methods=["POST"])
def staff_login():

    data = request.get_json()

    email = data.get("email")
    password = data.get("password")

    if not email or not password:

        return {
            "message": "Email and password are required!"
        }, 400

    email = email.strip().lower()

    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT
            id,
            name,
            email,
            password,
            role

        FROM users

        WHERE email = ?
        AND role = 'staff'
    """, (
        email,
    ))

    staff = cursor.fetchone()

    password_is_valid = staff and verify_user_password(
        conn,
        staff,
        password
    )

    conn.close()

    if password_is_valid:

        return {
            "message": "Staff login successful!",
            "user": {
                "id": staff["id"],
                "name": staff["name"],
                "email": staff["email"],
                "role": staff["role"]
            }
        }, 200

    return {
        "message": "Invalid staff email or password!"
    }, 401


# =========================================================
# STUDENT - GET ORDERS
# =========================================================

@app.route("/orders/<int:user_id>", methods=["GET"])
def get_orders(user_id):

    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT
            id,
            total_amount,
            pickup_slot,
            status,
            payment_status,
            qr_token,
            refunded_amount,
            created_at

        FROM orders

        WHERE user_id = ?

        ORDER BY id DESC
    """, (user_id,))

    orders = cursor.fetchall()

    conn.close()

    order_list = []

    for order in orders:

        order_list.append({
            "order_id": order["id"],
            "total_amount": order["total_amount"],
            "pickup_slot": order["pickup_slot"],
            "status": order["status"],
            "payment_status": order["payment_status"],
            "qr_image": f"order_{order['id']}.png" if order["qr_token"] else None,
            "refunded_amount": float(order["refunded_amount"] or 0),
            "created_at": order["created_at"]
        })

    return {
        "orders": order_list
    }


# =========================================================
# STUDENT - GET NOTIFICATIONS
# =========================================================

@app.route("/notifications/<int:user_id>", methods=["GET"])
def get_notifications(user_id):

    conn = get_db_connection()

    notifications = conn.execute("""
        SELECT
            id,
            order_id,
            title,
            message,
            type,
            is_read,
            created_at

        FROM notifications

        WHERE user_id = ?

        ORDER BY id DESC

        LIMIT 50
    """, (user_id,)).fetchall()

    unread_count = conn.execute("""
        SELECT COUNT(*) AS count

        FROM notifications

        WHERE user_id = ?
        AND is_read = 0
    """, (user_id,)).fetchone()["count"]

    conn.close()

    notification_list = []

    for notification in notifications:

        notification_list.append({
            "id": notification["id"],
            "order_id": notification["order_id"],
            "title": notification["title"],
            "message": notification["message"],
            "type": notification["type"],
            "is_read": bool(notification["is_read"]),
            "created_at": notification["created_at"]
        })

    return {
        "success": True,
        "notifications": notification_list,
        "unread_count": unread_count
    }


# =========================================================
# STUDENT - MARK NOTIFICATION AS READ
# =========================================================

@app.route("/notifications/<int:notification_id>/read", methods=["PUT"])
def mark_notification_read(notification_id):

    conn = get_db_connection()

    cursor = conn.cursor()

    cursor.execute("""
        UPDATE notifications

        SET is_read = 1

        WHERE id = ?
    """, (notification_id,))

    if cursor.rowcount == 0:

        conn.close()

        return {
            "success": False,
            "message": "Notification not found!"
        }, 404

    conn.commit()

    conn.close()

    return {
        "success": True,
        "message": "Notification marked as read!"
    }


# =========================================================
# STUDENT - MARK ALL NOTIFICATIONS AS READ
# =========================================================

@app.route("/notifications/user/<int:user_id>/read-all", methods=["PUT"])
def mark_all_notifications_read(user_id):

    conn = get_db_connection()

    conn.execute("""
        UPDATE notifications

        SET is_read = 1

        WHERE user_id = ?
        AND is_read = 0
    """, (user_id,))

    conn.commit()

    conn.close()

    return {
        "success": True,
        "message": "All notifications marked as read!"
    }


# =========================================================
# QR IMAGE
# =========================================================

@app.route("/qr/<filename>", methods=["GET"])
def get_qr(filename):

    return send_from_directory(
        QR_FOLDER,
        filename,
        as_attachment=request.args.get("download") == "1"
    )


# =========================================================
# HOME
# =========================================================

@app.route("/", methods=["GET"])
def home():

    return "CampusBite Backend is Running!"


@app.route("/canteen/status", methods=["GET"])
def canteen_status():

    conn = get_db_connection()
    is_open = get_canteen_is_open(conn)
    conn.close()

    return {
        "success": True,
        "is_open": is_open,
        "status": "OPEN" if is_open else "CLOSED"
    }


@app.route("/staff/canteen/status", methods=["PUT"])
def staff_update_canteen_status():

    data = request.get_json(silent=True) or {}
    is_open = data.get("is_open")

    if not isinstance(is_open, bool):

        return {
            "success": False,
            "message": "Canteen status must be open or closed."
        }, 400

    conn = get_db_connection()
    conn.execute("""
        INSERT INTO app_settings (key, value)
        VALUES ('canteen_open', ?)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value
    """, ("1" if is_open else "0",))
    conn.commit()
    conn.close()

    return {
        "success": True,
        "is_open": is_open,
        "status": "OPEN" if is_open else "CLOSED"
    }


# =========================================================
# STAFF - DASHBOARD STATS
# =========================================================

@app.route("/staff/dashboard/stats", methods=["GET"])
def staff_dashboard_stats():

    conn = get_db_connection()

    total_menu_items = conn.execute("""
        SELECT COUNT(*) AS count
        FROM menu
    """).fetchone()["count"]

    available_items = conn.execute("""
        SELECT COUNT(*) AS count
        FROM menu
        WHERE available = 1
        AND stock_quantity > 0
    """).fetchone()["count"]

    out_of_stock_items = conn.execute("""
        SELECT COUNT(*) AS count
        FROM menu
        WHERE stock_quantity = 0
    """).fetchone()["count"]

    today_orders = conn.execute("""
        SELECT COUNT(*) AS count
        FROM orders
        WHERE DATE(created_at, 'localtime')
        = DATE('now', 'localtime')
    """).fetchone()["count"]

    sales_summary = conn.execute("""
        SELECT
            COALESCE(SUM(total_amount), 0) AS total,
            COUNT(*) AS paid_orders

        FROM orders

        WHERE DATE(created_at, 'localtime')
        = DATE('now', 'localtime')

        AND payment_status = 'PAID'
    """).fetchone()

    today_sales = float(
        sales_summary["total"] or 0
    )

    paid_orders = sales_summary["paid_orders"]

    average_order_value = (
        today_sales / paid_orders
        if paid_orders
        else 0
    )

    sales_activity_rows = conn.execute("""
        SELECT
            id,
            total_amount,
            created_at

        FROM orders

        WHERE DATE(created_at, 'localtime')
        = DATE('now', 'localtime')

        AND payment_status = 'PAID'

        ORDER BY created_at DESC, id DESC
    """).fetchall()

    sales_activity = [
        {
            "order_id": row["id"],
            "total_amount": float(row["total_amount"] or 0),
            "created_at": row["created_at"]
        }
        for row in sales_activity_rows
    ]

    pending_orders = conn.execute("""
        SELECT COUNT(*) AS count
        FROM orders

        WHERE status IN (
            'PLACED',
            'PAID',
            'CONFIRMED',
            'PREPARING'
        )
    """).fetchone()["count"]

    placed_orders = conn.execute("""
        SELECT COUNT(*) AS count
        FROM orders
        WHERE status = 'PLACED'
    """).fetchone()["count"]

    preparing_orders = conn.execute("""
        SELECT COUNT(*) AS count
        FROM orders

        WHERE status IN (
            'PAID',
            'CONFIRMED',
            'PREPARING'
        )
    """).fetchone()["count"]

    ready_orders = conn.execute("""
        SELECT COUNT(*) AS count
        FROM orders
        WHERE status = 'READY'
    """).fetchone()["count"]

    collected_orders = conn.execute("""
        SELECT COUNT(*) AS count
        FROM orders
        WHERE status = 'COLLECTED'
    """).fetchone()["count"]

    conn.close()

    return {
        "success": True,
        "stats": {
            "today_orders": today_orders,
            "today_sales": today_sales,
            "sales_activity": sales_activity,
            "paid_orders": paid_orders,
            "average_order_value": average_order_value,
            "pending_orders": pending_orders,
            "menu_items": total_menu_items,
            "placed_orders": placed_orders,
            "preparing_orders": preparing_orders,
            "ready_orders": ready_orders,
            "collected_orders": collected_orders,
            "available_items": available_items,
            "out_of_stock_items": out_of_stock_items
        }
    }


# =========================================================
# STAFF - RECENT ORDERS
# =========================================================

@app.route("/staff/dashboard/recent-orders", methods=["GET"])
def staff_recent_orders():

    conn = get_db_connection()

    orders = conn.execute("""
        SELECT
            orders.id,
            orders.pickup_slot,
            orders.total_amount,
            orders.status,
            orders.payment_status,
            orders.refunded_amount,
            orders.created_at,
            users.name AS student_name,
            users.register_number

        FROM orders

        LEFT JOIN users
        ON orders.user_id = users.id

        ORDER BY orders.id DESC

        LIMIT 10
    """).fetchall()

    conn.close()

    recent_orders = []

    for order in orders:

        recent_orders.append({
            "id": order["id"],
            "student_name": order["student_name"],
            "register_number": order["register_number"],
            "pickup_slot": order["pickup_slot"],
            "total_amount": float(
                order["total_amount"] or 0
            ),
            "status": order["status"],
            "created_at": order["created_at"]
        })

    return {
        "success": True,
        "orders": recent_orders
    }


# =========================================================
# STAFF - FULL ORDERS
# =========================================================

@app.route("/staff/orders", methods=["GET"])
def staff_get_orders():

    conn = get_db_connection()

    orders = conn.execute("""
        SELECT
            orders.id AS order_id,
            orders.user_id,
            orders.pickup_slot,
            orders.total_amount,
            orders.status,
            orders.payment_status,
            orders.refunded_amount,
            orders.created_at,
            users.name AS student_name,
            users.register_number,
            users.email

        FROM orders

        LEFT JOIN users
        ON orders.user_id = users.id

        ORDER BY orders.id DESC
    """).fetchall()

    staff_orders = []

    for order in orders:

        items = conn.execute("""
            SELECT
                order_items.id,
                order_items.menu_id,
                order_items.quantity,
                order_items.price,
                menu.name AS food_name

            FROM order_items

            LEFT JOIN menu
            ON order_items.menu_id = menu.id

            WHERE order_items.order_id = ?

            ORDER BY order_items.id
        """, (
            order["order_id"],
        )).fetchall()

        item_list = []

        for item in items:

            item_list.append({
                "id": item["id"],
                "menu_id": item["menu_id"],
                "food_name": item["food_name"],
                "quantity": item["quantity"],
                "price": float(item["price"] or 0),
                "subtotal": float(
                    (item["price"] or 0) *
                    (item["quantity"] or 0)
                )
            })

        staff_orders.append({
            "order_id": order["order_id"],
            "student_name": order["student_name"],
            "register_number": order["register_number"],
            "email": order["email"],
            "pickup_slot": order["pickup_slot"],
            "total_amount": float(
                order["total_amount"] or 0
            ),
            "status": order["status"],
            "payment_status": order["payment_status"],
            "refunded_amount": float(
                order["refunded_amount"] or 0
            ),
            "created_at": order["created_at"],
            "items": item_list
        })

    conn.close()

    return {
        "success": True,
        "orders": staff_orders
    }


# =========================================================
# STAFF - UPDATE ORDER STATUS
# =========================================================

@app.route("/staff/orders/<int:order_id>/status", methods=["PUT"])
def staff_update_order_status(order_id):

    data = request.get_json()

    new_status = data.get("status")

    allowed_statuses = [
        "CONFIRMED",
        "PREPARING",
        "READY",
        "CANCELLED"
    ]

    if not new_status:

        return {
            "success": False,
            "message": "Order status is required!"
        }, 400

    new_status = new_status.strip().upper()

    if new_status not in allowed_statuses:

        return {
            "success": False,
            "message": "Invalid order status!"
        }, 400

    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT
            id,
            user_id,
            status,
            payment_status,
            total_amount
        FROM orders
        WHERE id = ?
    """, (order_id,))

    order = cursor.fetchone()

    if not order:

        conn.close()

        return {
            "success": False,
            "message": "Order not found!"
        }, 404

    current_status = order["status"]

    valid_transitions = {
        "PLACED": ["CONFIRMED", "CANCELLED"],
        "PAID": ["CONFIRMED", "CANCELLED"],
        "CONFIRMED": ["PREPARING", "CANCELLED"],
        "PREPARING": ["READY"],
        "READY": [],
        "COLLECTED": [],
        "CANCELLED": []
    }

    if new_status not in valid_transitions.get(current_status, []):

        conn.close()

        return {
            "success": False,
            "message": "That order status change is not allowed."
        }, 400

    refunded_amount = 0

    if new_status == "CANCELLED" and order["payment_status"] == "PAID":

        refunded_amount = float(order["total_amount"] or 0)

        cursor.execute("""
            UPDATE orders
            SET status = ?, payment_status = 'REFUNDED', refunded_amount = ?
            WHERE id = ?
        """, (new_status, refunded_amount, order_id))

    else:

        cursor.execute("""
            UPDATE orders
            SET status = ?
            WHERE id = ?
        """, (new_status, order_id))

    notification_messages = {
        "CONFIRMED": (
            "Order Confirmed",
            f"Your CampusBite order #{order_id} has been confirmed."
        ),
        "PREPARING": (
            "Order Preparing",
            f"Your CampusBite order #{order_id} is now being prepared."
        ),
        "READY": (
            "Order Ready",
            f"Your CampusBite order #{order_id} is ready for pickup."
        ),
        "CANCELLED": (
            "Order Cancelled",
            f"Your CampusBite order #{order_id} has been cancelled. "
            + (f"A refund of Rs. {refunded_amount:.2f} was recorded." if refunded_amount else "")
        )
    }

    if new_status != current_status and new_status in notification_messages:

        title, message = notification_messages[new_status]

        create_order_notification(
            conn,
            order["user_id"],
            order_id,
            title,
            message
        )

    conn.commit()

    conn.close()

    return {
        "success": True,
        "message": "Order status updated successfully!",
        "order_id": order_id,
        "status": new_status,
        "payment_status": "REFUNDED" if refunded_amount else order["payment_status"],
        "refunded_amount": refunded_amount
    }


# =========================================================
# STAFF - GET SINGLE ORDER
# =========================================================

@app.route("/staff/orders/<int:order_id>", methods=["GET"])
def staff_get_single_order(order_id):

    conn = get_db_connection()

    order = conn.execute("""
        SELECT
            orders.id AS order_id,
            orders.user_id,
            orders.pickup_slot,
            orders.total_amount,
            orders.status,
            orders.created_at,
            orders.qr_token,
            users.name AS student_name,
            users.register_number,
            users.email

        FROM orders

        LEFT JOIN users
        ON orders.user_id = users.id

        WHERE orders.id = ?
    """, (
        order_id,
    )).fetchone()

    if not order:

        conn.close()

        return {
            "success": False,
            "message": "Order not found!"
        }, 404

    items = conn.execute("""
        SELECT
            order_items.menu_id,
            order_items.quantity,
            order_items.price,
            menu.name AS food_name

        FROM order_items

        LEFT JOIN menu
        ON order_items.menu_id = menu.id

        WHERE order_items.order_id = ?
    """, (
        order_id,
    )).fetchall()

    item_list = []

    for item in items:

        item_list.append({
            "menu_id": item["menu_id"],
            "food_name": item["food_name"],
            "quantity": item["quantity"],
            "price": float(item["price"] or 0),
            "subtotal": float(
                (item["price"] or 0) *
                (item["quantity"] or 0)
            )
        })

    result = {
        "order_id": order["order_id"],
        "student_name": order["student_name"],
        "register_number": order["register_number"],
        "email": order["email"],
        "pickup_slot": order["pickup_slot"],
        "total_amount": float(
            order["total_amount"] or 0
        ),
        "status": order["status"],
        "created_at": order["created_at"],
        "qr_token": order["qr_token"],
        "items": item_list
    }

    conn.close()

    return {
        "success": True,
        "order": result
    }


# =========================================================
# STAFF - POPULAR ITEM
# =========================================================

@app.route("/staff/dashboard/popular-item", methods=["GET"])
def staff_popular_item():

    conn = get_db_connection()

    popular_item = conn.execute("""
        SELECT
            menu.name,
            SUM(order_items.quantity) AS total_quantity

        FROM order_items

        JOIN menu
        ON order_items.menu_id = menu.id

        JOIN orders
        ON order_items.order_id = orders.id

        WHERE orders.status != 'CANCELLED'

        GROUP BY order_items.menu_id

        ORDER BY total_quantity DESC

        LIMIT 1
    """).fetchone()

    conn.close()

    if not popular_item:

        return {
            "success": True,
            "item": None
        }

    return {
        "success": True,
        "item": {
            "name": popular_item["name"],
            "total_quantity": popular_item["total_quantity"]
        }
    }


# =========================================================
# STAFF - LOW STOCK
# =========================================================

@app.route("/staff/dashboard/low-stock", methods=["GET"])
def staff_low_stock():

    conn = get_db_connection()

    items = conn.execute("""
        SELECT
            id,
            name,
            stock_quantity,
            available

        FROM menu

        WHERE stock_quantity > 0
        AND stock_quantity <= 5

        ORDER BY stock_quantity ASC
    """).fetchall()

    conn.close()

    low_stock_items = []

    for item in items:

        low_stock_items.append({
            "id": item["id"],
            "name": item["name"],
            "stock_quantity": item["stock_quantity"],
            "available": item["available"]
        })

    return {
        "success": True,
        "items": low_stock_items
    }


# =========================================================
# STAFF - QR SCANNER VERIFY
# =========================================================

@app.route("/staff/qr/verify", methods=["POST"])
def staff_verify_qr():

    data = request.get_json()

    qr_token = data.get("qr_token")
    qr_data = data.get("qr_data")
    order_id = data.get("order_id")

    # -----------------------------------------------------
    # If scanner sends complete QR text
    # Example:
    # CampusBite|Order:12|Token:abcdef
    # -----------------------------------------------------

    if qr_data and not qr_token:

        try:

            parts = qr_data.split("|")

            for part in parts:

                if part.startswith("Order:"):

                    order_id = int(
                        part.replace("Order:", "")
                    )

                elif part.startswith("Token:"):

                    qr_token = part.replace(
                        "Token:",
                        ""
                    )

        except (AttributeError, ValueError, TypeError):

            return {
                "success": False,
                "message": "Invalid QR data!"
            }, 400

        if not qr_token or not order_id:

            return {
                "success": False,
                "valid": False,
                "message": "Invalid pickup QR code!"
            }, 400

    if not qr_token and not order_id:

        return {
            "success": False,
            "message": "QR token or order ID is required!"
        }, 400

    conn = get_db_connection()

    if qr_token:

        order = conn.execute("""
            SELECT
                orders.id AS order_id,
                orders.user_id,
                orders.pickup_slot,
                orders.total_amount,
                orders.status,
                orders.created_at,
                users.name AS student_name,
                users.register_number

            FROM orders

            LEFT JOIN users
            ON orders.user_id = users.id

            WHERE orders.qr_token = ?
            AND (? IS NULL OR orders.id = ?)
        """, (
            qr_token,
            order_id,
            order_id,
        )).fetchone()

    else:

        order = conn.execute("""
            SELECT
                orders.id AS order_id,
                orders.user_id,
                orders.pickup_slot,
                orders.total_amount,
                orders.status,
                orders.created_at,
                users.name AS student_name,
                users.register_number

            FROM orders

            LEFT JOIN users
            ON orders.user_id = users.id

            WHERE orders.id = ?
        """, (
            order_id,
        )).fetchone()

    if not order:

        conn.close()

        return {
            "success": False,
            "valid": False,
            "message": "Invalid or unknown QR code!"
        }, 404

    items = conn.execute("""
        SELECT
            order_items.quantity,
            order_items.price,
            menu.name AS food_name

        FROM order_items

        LEFT JOIN menu
        ON order_items.menu_id = menu.id

        WHERE order_items.order_id = ?
    """, (
        order["order_id"],
    )).fetchall()

    item_list = []

    for item in items:

        item_list.append({
            "food_name": item["food_name"],
            "quantity": item["quantity"],
            "price": float(item["price"] or 0)
        })

    conn.close()

    # -----------------------------------------------------
    # Already collected
    # -----------------------------------------------------

    if order["status"] == "COLLECTED":

        return {
            "success": True,
            "valid": False,
            "collected": True,
            "message": "This order has already been collected!",
            "order": {
                "order_id": order["order_id"],
                "student_name": order["student_name"],
                "register_number": order["register_number"],
                "pickup_slot": order["pickup_slot"],
                "total_amount": float(
                    order["total_amount"] or 0
                ),
                "status": order["status"],
                "items": item_list
            }
        }

    # -----------------------------------------------------
    # Cancelled
    # -----------------------------------------------------

    if order["status"] == "CANCELLED":

        return {
            "success": True,
            "valid": False,
            "message": "This order has been cancelled!",
            "order": {
                "order_id": order["order_id"],
                "student_name": order["student_name"],
                "register_number": order["register_number"],
                "pickup_slot": order["pickup_slot"],
                "total_amount": float(
                    order["total_amount"] or 0
                ),
                "status": order["status"],
                "items": item_list
            }
        }

    if order["status"] not in (
        "PAID",
        "CONFIRMED",
        "PREPARING",
        "READY"
    ):

        return {
            "success": True,
            "valid": False,
            "message": "Payment is not confirmed for this order!",
            "order": {
                "order_id": order["order_id"],
                "student_name": order["student_name"],
                "register_number": order["register_number"],
                "pickup_slot": order["pickup_slot"],
                "total_amount": float(
                    order["total_amount"] or 0
                ),
                "status": order["status"],
                "items": item_list
            }
        }

    return {
        "success": True,
        "valid": True,
        "message": "QR code verified successfully!",
        "order": {
            "order_id": order["order_id"],
            "student_name": order["student_name"],
            "register_number": order["register_number"],
            "pickup_slot": order["pickup_slot"],
            "total_amount": float(
                order["total_amount"] or 0
            ),
            "status": order["status"],
            "created_at": order["created_at"],
            "items": item_list
        }
    }


# =========================================================
# STAFF - QR SCANNER COLLECT ORDER
# =========================================================

@app.route("/staff/qr/collect", methods=["POST"])
def staff_collect_order():

    data = request.get_json()

    qr_token = data.get("qr_token")
    order_id = data.get("order_id")

    if not qr_token and not order_id:

        return {
            "success": False,
            "message": "QR token or order ID is required!"
        }, 400

    conn = get_db_connection()
    cursor = conn.cursor()

    if qr_token:

        cursor.execute("""
            SELECT
                id,
                user_id,
                status

            FROM orders

            WHERE qr_token = ?
        """, (
            qr_token,
        ))

    else:

        cursor.execute("""
            SELECT
                id,
                user_id,
                status

            FROM orders

            WHERE id = ?
        """, (
            order_id,
        ))

    order = cursor.fetchone()

    if not order:

        conn.close()

        return {
            "success": False,
            "message": "Order not found!"
        }, 404

    if order["status"] == "COLLECTED":

        conn.close()

        return {
            "success": False,
            "message": "Order already collected!"
        }, 400

    if order["status"] == "CANCELLED":

        conn.close()

        return {
            "success": False,
            "message": "Cancelled order cannot be collected!"
        }, 400

    if order["status"] not in (
        "PAID",
        "CONFIRMED",
        "PREPARING",
        "READY"
    ):

        conn.close()

        return {
            "success": False,
            "message": "Payment is not confirmed for this order!"
        }, 400

    cursor.execute("""
        UPDATE orders

        SET status = 'COLLECTED'

        WHERE id = ?
    """, (
        order["id"],
    ))

    create_order_notification(
        conn,
        order["user_id"],
        order["id"],
        "Order Collected",
        f"Your CampusBite order #{order['id']} has been collected successfully."
    )

    conn.commit()

    conn.close()

    return {
        "success": True,
        "message": "Order collected successfully!",
        "order_id": order["id"],
        "status": "COLLECTED"
    }


# =========================================================
# STAFF - REPORTS
# =========================================================

@app.route("/staff/reports", methods=["GET"])
def staff_reports():

    date_from = request.args.get("date_from")
    date_to = request.args.get("date_to")

    conn = get_db_connection()

    # -----------------------------------------------------
    # Default date range
    # -----------------------------------------------------

    if not date_from:

        date_from = conn.execute("""
            SELECT DATE('now', 'localtime')
        """).fetchone()[0]

    if not date_to:

        date_to = date_from

    # -----------------------------------------------------
    # Summary
    # -----------------------------------------------------

    summary = conn.execute("""
        SELECT
            COUNT(*) AS total_orders,

            COALESCE(
                SUM(
                    CASE
                        WHEN payment_status = 'PAID'
                        THEN total_amount
                        ELSE 0
                    END
                ),
                0
            ) AS total_sales,

            COALESCE(SUM(refunded_amount), 0) AS refunded_sales,

            SUM(CASE WHEN payment_status = 'PAID' THEN 1 ELSE 0 END) AS paid_orders,

            COALESCE(
                SUM(
                    CASE
                        WHEN status = 'COLLECTED'
                        THEN 1
                        ELSE 0
                    END
                ),
                0
            ) AS collected_orders,

            COALESCE(
                SUM(
                    CASE
                        WHEN status = 'CANCELLED'
                        THEN 1
                        ELSE 0
                    END
                ),
                0
            ) AS cancelled_orders

        FROM orders

        WHERE DATE(COALESCE(created_at, CURRENT_TIMESTAMP), 'localtime')
        BETWEEN DATE(?) AND DATE(?)
    """, (
        date_from,
        date_to
    )).fetchone()

    total_orders = summary["total_orders"] or 0
    total_sales = float(summary["total_sales"] or 0)
    collected_orders = summary["collected_orders"] or 0
    cancelled_orders = summary["cancelled_orders"] or 0

    completed_sales_orders = summary["paid_orders"] or 0

    average_order_value = (
        total_sales / completed_sales_orders
        if completed_sales_orders
        else 0
    )

    # -----------------------------------------------------
    # Status breakdown
    # -----------------------------------------------------

    status_rows = conn.execute("""
        SELECT
            status,
            COUNT(*) AS count

        FROM orders

        WHERE DATE(COALESCE(created_at, CURRENT_TIMESTAMP), 'localtime')
        BETWEEN DATE(?) AND DATE(?)

        GROUP BY status

        ORDER BY count DESC
    """, (
        date_from,
        date_to
    )).fetchall()

    status_breakdown = []

    for row in status_rows:

        status_breakdown.append({
            "status": row["status"],
            "count": row["count"]
        })

    # -----------------------------------------------------
    # Daily sales
    # -----------------------------------------------------

    daily_rows = conn.execute("""
        SELECT
            DATE(COALESCE(created_at, CURRENT_TIMESTAMP), 'localtime') AS report_date,
            SUM(CASE WHEN payment_status = 'PAID' THEN 1 ELSE 0 END) AS order_count,
            COALESCE(
                SUM(
                    CASE
                        WHEN payment_status = 'PAID'
                        THEN total_amount
                        ELSE 0
                    END
                ),
                0
            ) AS sales

        FROM orders

        WHERE DATE(COALESCE(created_at, CURRENT_TIMESTAMP), 'localtime')
        BETWEEN DATE(?) AND DATE(?)

        GROUP BY DATE(COALESCE(created_at, CURRENT_TIMESTAMP), 'localtime')

        ORDER BY report_date ASC
    """, (
        date_from,
        date_to
    )).fetchall()

    daily_sales = []

    for row in daily_rows:

        daily_sales.append({
            "date": row["report_date"],
            "order_count": row["order_count"],
            "sales": float(row["sales"] or 0)
        })

    # -----------------------------------------------------
    # Popular food items
    # -----------------------------------------------------

    popular_rows = conn.execute("""
        SELECT
            menu.name AS food_name,
            SUM(order_items.quantity) AS quantity_sold,
            SUM(
                order_items.quantity *
                order_items.price
            ) AS revenue

        FROM order_items

        JOIN orders
        ON order_items.order_id = orders.id

        JOIN menu
        ON order_items.menu_id = menu.id

        WHERE DATE(COALESCE(orders.created_at, CURRENT_TIMESTAMP), 'localtime')
        BETWEEN DATE(?) AND DATE(?)

        AND orders.payment_status = 'PAID'

        GROUP BY order_items.menu_id

        ORDER BY quantity_sold DESC

        LIMIT 10
    """, (
        date_from,
        date_to
    )).fetchall()

    popular_items = []

    for row in popular_rows:

        popular_items.append({
            "food_name": row["food_name"],
            "quantity_sold": row["quantity_sold"],
            "revenue": float(row["revenue"] or 0)
        })

    conn.close()

    return {
        "success": True,
        "date_from": date_from,
        "date_to": date_to,

        "summary": {
            "total_orders": total_orders,
            "total_sales": total_sales,
            "refunded_sales": float(summary["refunded_sales"] or 0),
            "average_order_value": average_order_value,
            "collected_orders": collected_orders,
            "cancelled_orders": cancelled_orders
        },

        "status_breakdown": status_breakdown,
        "daily_sales": daily_sales,
        "popular_items": popular_items
    }


# =========================================================
# UPDATE EXISTING MENU STOCK
# =========================================================

def update_existing_menu_stock():

    conn = get_db_connection()

    stock_values = {

        "Idly": 20,
        "Pongal": 15,
        "Poori": 12,
        "Masala Dosa": 15,
        "Vada": 25,

        "Veg Meals": 10,
        "Lemon Rice": 12,
        "Tomato Rice": 12,
        "Curd Rice": 8,
        "Veg Biryani": 10,

        "Samosa": 20,
        "Sandwich": 8,
        "Veg Noodles": 12,
        "French Fries": 10,
        "Veg Puff": 6,
        "Veg Cutlet": 8,

        "Tea": 30,
        "Coffee": 30,
        "Fresh Lime": 15,
        "Rose Milk": 12,
        "Milkshake": 8,

        "Ice Cream": 5,
        "Gulab Jamun": 5
    }

    for item_name, stock in stock_values.items():

        conn.execute("""
            UPDATE menu

            SET stock_quantity = ?

            WHERE name = ?
        """, (
            stock,
            item_name
        ))

    conn.commit()

    conn.close()


# =========================================================
# START SERVER
# =========================================================

if __name__ == "__main__":

    init_db()

    add_sample_menu()

    # Keep this commented after initial stock setup.
    # Uncomment only when you intentionally want to reset
    # existing menu stock values.
    #
    # update_existing_menu_stock()

    app.run(
        debug=True,
        host="127.0.0.1",
        port=5000
    )