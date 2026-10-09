(() => {
    window.alert = (message) => {
        const toast = document.createElement("div");
        toast.className = "campusbite-toast";
        toast.textContent = String(message);

        Object.assign(toast.style, {
            position: "fixed",
            top: "24px",
            right: "24px",
            zIndex: "9999",
            maxWidth: "min(380px, calc(100vw - 48px))",
            padding: "14px 18px",
            border: "1px solid #dce4db",
            borderRadius: "10px",
            background: "#20332a",
            color: "#ffffff",
            boxShadow: "0 14px 38px rgba(31, 55, 42, 0.18)",
            font: "500 14px/1.5 'DM Sans', 'Segoe UI', sans-serif",
            opacity: "0",
            transform: "translateY(-10px)",
            transition: "opacity 0.2s ease, transform 0.2s ease"
        });

        document.body.appendChild(toast);

        requestAnimationFrame(() => {
            toast.style.opacity = "1";
            toast.style.transform = "translateY(0)";
        });

        window.setTimeout(() => {
            toast.style.opacity = "0";
            toast.style.transform = "translateY(-10px)";
            window.setTimeout(() => toast.remove(), 220);
        }, 3000);
    };

    const notifiedIds = new Set();
    let pollingNotifications = false;

    async function pollOrderNotifications() {
        if (pollingNotifications) return;

        let student;
        try {
            student = JSON.parse(localStorage.getItem("student") || "null");
        } catch {
            return;
        }

        if (!student?.id || student.role !== "student") return;

        pollingNotifications = true;
        try {
            const response = await fetch(
                `https://campusbite-lo8a.onrender.com/notifications/${encodeURIComponent(student.id)}`,
                { cache: "no-store" }
            );
            if (!response.ok) return;

            const data = await response.json();
            const unread = (data.notifications || [])
                .filter(notification => !notification.is_read && !notifiedIds.has(notification.id))
                .slice(0, 3)
                .reverse();

            for (const notification of unread) {
                showOrderNotification(notification);
                notifiedIds.add(notification.id);
                fetch(`https://campusbite-lo8a.onrender.com/notifications/${notification.id}/read`, {
                    method: "PUT"
                }).catch(() => {});
            }
        } catch (error) {
            console.warn("Order notifications are temporarily unavailable:", error);
        } finally {
            pollingNotifications = false;
        }
    }

    function showOrderNotification(notification) {
        const region = document.getElementById("order-notification-region") || createNotificationRegion();
        const toast = document.createElement("div");
        const title = document.createElement("strong");
        const message = document.createElement("span");

        toast.className = "order-notification-toast";
        toast.setAttribute("role", "status");
        title.textContent = notification.title || "Order update";
        message.textContent = notification.message || "Your order status has changed.";
        toast.append(title, message);

        if (notification.order_id) {
            toast.tabIndex = 0;
            toast.setAttribute("role", "link");
            toast.setAttribute("aria-label", `${title.textContent}. Open your orders.`);
            toast.addEventListener("click", () => {
                window.location.href = "student-orders.html";
            });
            toast.addEventListener("keydown", event => {
                if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    window.location.href = "student-orders.html";
                }
            });
        }

        region.appendChild(toast);
        window.setTimeout(() => toast.remove(), 6000);
    }

    function createNotificationRegion() {
        const region = document.createElement("div");
        region.id = "order-notification-region";
        region.className = "order-notification-region";
        region.setAttribute("aria-label", "Order notifications");
        document.body.appendChild(region);
        return region;
    }

    pollOrderNotifications();
    window.setInterval(pollOrderNotifications, 10000);
})();
