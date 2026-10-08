(() => {
    const root = document.getElementById("staff-sidebar-root");
    if (!root) return;

    const links = [
        ["staff-dashboard.html", "&#8962;", "Dashboard"],
        ["staff-menu.html", "&#9776;", "Menu"],
        ["staff-orders.html", "&#128722;", "Orders"],
        ["staff-qr-scanner.html", "&#9635;", "QR Scanner"],
        ["staff-reports.html", "&#9638;", "Reports"]
    ];
    const currentPage = window.location.pathname.split("/").pop() || "staff-dashboard.html";
    let staffName = localStorage.getItem("staffName");

    if (!staffName) {
        try {
            staffName = JSON.parse(localStorage.getItem("staffUser") || "{}").name;
        } catch {
            staffName = "";
        }
    }

    root.innerHTML = `
        <aside class="staff-sidebar">
            <div class="staff-brand">
                <div class="brand-icon">&#9749;</div>
                <div class="brand-text"><h2>CampusBite</h2><span>Staff Panel</span></div>
            </div>
            <nav class="staff-navigation" aria-label="Staff navigation">
                ${links.map(([href, icon, label]) => `
                    <a href="${href}" class="staff-nav-item${currentPage === href ? " active" : ""}"${currentPage === href ? ' aria-current="page"' : ""}>
                        <span class="nav-icon">${icon}</span><span>${label}</span>
                    </a>
                `).join("")}
            </nav>
            <div class="sidebar-bottom">
                <div class="staff-user-card">
                    <div class="staff-avatar">${escapeHTML((staffName || "S").trim().charAt(0).toUpperCase())}</div>
                    <div class="staff-user-info"><strong>${escapeHTML(staffName || "Canteen Staff")}</strong><span>Staff Account</span></div>
                </div>
                <button class="staff-logout-btn" id="logout-btn" type="button">
                    <span class="logout-icon">&#8617;</span><span>Logout</span>
                </button>
            </div>
        </aside>
    `;

    document.getElementById("logout-btn").addEventListener("click", () => {
        ["staffLoggedIn", "staffUser", "staffName", "staffEmail"].forEach(key => localStorage.removeItem(key));
        window.location.href = "staff-login.html";
    });

    window.refreshCanteenStatus = async function () {
        const labels = document.querySelectorAll("#store-status-text, #storeStatusText");
        const dots = document.querySelectorAll(".status-dot, #store-status-dot");

        try {
            const response = await fetch("http://127.0.0.1:5000/canteen/status");
            const data = await response.json();
            if (!response.ok || !data.success) throw new Error("Unable to load canteen status.");

            const isOpen = Boolean(data.is_open);
            labels.forEach(element => {
                element.textContent = isOpen ? "Canteen open" : "Canteen closed";
            });
            dots.forEach(dot => dot.classList.toggle("offline", !isOpen));
            return isOpen;
        } catch (error) {
            labels.forEach(element => {
                element.textContent = "Status unavailable";
            });
            dots.forEach(dot => dot.classList.add("offline"));
            return null;
        }
    };

    window.refreshCanteenStatus();
    window.setInterval(window.refreshCanteenStatus, 15000);

    function escapeHTML(value) {
        return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;").replace(/'/g, "&#039;");
    }
})();