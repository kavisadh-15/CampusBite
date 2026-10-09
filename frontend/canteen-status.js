const CANTEEN_STATUS_API = "https://campusbite-lo8a.onrender.com/canteen/status";

async function refreshStudentCanteenStatus() {
    const banner = document.getElementById("canteen-status-banner");
    const homepageStatus = document.getElementById("homepage-canteen-status");
    if (!banner && !homepageStatus) return;

    try {
        const response = await fetch(CANTEEN_STATUS_API, { cache: "no-store" });
        const data = await response.json();
        if (!response.ok || !data.success) throw new Error("Status unavailable");

        if (homepageStatus) {
            homepageStatus.classList.toggle("offline", !data.is_open);
            homepageStatus.innerHTML = `<span aria-hidden="true"></span>Canteen ${data.is_open ? "Open" : "Offline"}`;
        }

        if (data.is_open) {
            if (banner) {
                banner.className = "canteen-status-banner open";
                banner.innerHTML = `
                <span class="canteen-status-mark" aria-hidden="true">&#10003;</span>
                <span><strong>Canteen open</strong><small>New orders are being accepted.</small></span>
            `;
            }
        } else {
            if (banner) {
                banner.className = "canteen-status-banner closed";
                banner.innerHTML = `
                <span class="canteen-status-mark" aria-hidden="true">&#8212;</span>
                <span><strong>Canteen closed</strong><small>New orders are paused. Your cart is still saved.</small></span>
            `;
            }
        }
    } catch {
        if (homepageStatus) {
            homepageStatus.classList.add("offline");
            homepageStatus.innerHTML = "<span aria-hidden=\"true\"></span>Status unavailable";
        }
        if (banner) {
            banner.className = "canteen-status-banner unavailable";
            banner.innerHTML = `
            <span class="canteen-status-mark" aria-hidden="true">!</span>
            <span><strong>Canteen status unavailable</strong><small>Check the connection before placing an order.</small></span>
        `;
        }
    }
}

document.addEventListener("DOMContentLoaded", () => {
    const banner = document.createElement("section");
    banner.id = "canteen-status-banner";
    banner.className = "canteen-status-banner unavailable";
    banner.setAttribute("role", "status");
    banner.setAttribute("aria-live", "polite");
    banner.innerHTML = "<span class=\"canteen-status-mark\" aria-hidden=\"true\">...</span><span><strong>Checking canteen status</strong></span>";
    document.body.prepend(banner);

    refreshStudentCanteenStatus();
    window.setInterval(refreshStudentCanteenStatus, 15000);
});