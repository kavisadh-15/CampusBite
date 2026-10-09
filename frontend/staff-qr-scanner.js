const API_BASE_URL = "https://campusbite-lo8a.onrender.com";

const video = document.getElementById("qr-video");
const canvas = document.getElementById("qr-canvas");
const canvasContext = canvas.getContext("2d", { willReadFrequently: true });
const cameraPlaceholder = document.getElementById("camera-placeholder");
const scannerState = document.getElementById("scanner-state");
const startCameraButton = document.getElementById("start-camera-btn");
const stopCameraButton = document.getElementById("stop-camera-btn");
const verifyButton = document.getElementById("verify-btn");
const qrInput = document.getElementById("qr-input");
const resultPanel = document.getElementById("result-panel");
const toast = document.getElementById("toast");

let cameraStream = null;
let scanAnimationId = null;
let barcodeDetector = null;
let verifiedOrder = null;

if ("BarcodeDetector" in window) {
    try {
        barcodeDetector = new BarcodeDetector({ formats: ["qr_code"] });
    } catch (error) {
        console.warn("Native QR detection is unavailable:", error);
    }
}

document.addEventListener("DOMContentLoaded", () => {
    updateStoreStatus();
    startCameraButton.addEventListener("click", startCamera);
    stopCameraButton.addEventListener("click", stopCamera);
    verifyButton.addEventListener("click", verifyInput);
    startCamera();
});

async function startCamera() {
    setState("Requesting camera", "Allow camera access to scan pickup QR codes.");

    if (!barcodeDetector && typeof window.jsQR !== "function") {
        setState("Use manual entry", "Camera QR scanning is not supported in this browser.");
        return;
    }

    try {
        if (!navigator.mediaDevices?.getUserMedia) {
            throw new Error("Camera access requires HTTPS or localhost.");
        }
        cameraStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { ideal: "environment" } },
            audio: false
        });
        video.srcObject = cameraStream;
        await video.play();
        video.style.display = "block";
        cameraPlaceholder.style.display = "none";
        startCameraButton.disabled = true;
        stopCameraButton.disabled = false;
        setState("Scanning", "Point the camera at a pickup QR code.");
        scanFrame();
    } catch (error) {
        console.error("Camera error:", error);
        setState("Camera unavailable", "Use the manual QR text field instead.");
        showToast(error.message || "Camera permission was not granted.");
    }
}

function stopCamera() {
    if (scanAnimationId) {
        cancelAnimationFrame(scanAnimationId);
        scanAnimationId = null;
    }
    if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
        cameraStream = null;
    }
    video.srcObject = null;
    video.style.display = "none";
    cameraPlaceholder.style.display = "block";
    startCameraButton.disabled = false;
    stopCameraButton.disabled = true;
    setState("Ready", "Camera stopped.");
}

async function scanFrame() {
    if (!cameraStream) {
        return;
    }

    try {
        let rawValue = "";
        if (barcodeDetector) {
            const codes = await barcodeDetector.detect(video);
            rawValue = codes[0]?.rawValue || "";
        } else if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            canvasContext.drawImage(video, 0, 0, canvas.width, canvas.height);
            const frame = canvasContext.getImageData(0, 0, canvas.width, canvas.height);
            rawValue = window.jsQR(frame.data, frame.width, frame.height, {
                inversionAttempts: "dontInvert"
            })?.data || "";
        }

        if (rawValue) {
            qrInput.value = rawValue;
            await verifyValue(rawValue);
            stopCamera();
            return;
        }
    } catch (error) {
        console.error("QR scan error:", error);
    }

    scanAnimationId = requestAnimationFrame(scanFrame);
}

function verifyInput() {
    const value = qrInput.value.trim();
    if (!value) {
        showToast("Enter a QR text or order ID first.");
        return;
    }
    verifyValue(value);
}

async function verifyValue(value) {
    verifyButton.disabled = true;
    setState("Verifying", "Checking the pickup code with the server.");

    const payload = /^\d+$/.test(value)
        ? { order_id: Number(value) }
        : { qr_data: value };

    try {
        const response = await fetch(`${API_BASE_URL}/staff/qr/verify`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        const data = await response.json();
        renderResult(data);
    } catch (error) {
        console.error("QR verification error:", error);
        setState("Connection error", "The server could not be reached.");
        showToast("Unable to verify the pickup code.");
    } finally {
        verifyButton.disabled = false;
    }
}

function renderResult(data) {
    verifiedOrder = data.order || null;
    if (!data.success || !data.order) {
        resultPanel.innerHTML = `<div class="result-empty"><span class="result-icon">!</span><h2>Code not verified</h2><p>${escapeHTML(data.message || "Unknown QR code")}</p></div>`;
        setState("Invalid code", data.message || "The QR code could not be verified.");
        return;
    }

    const order = data.order;
    const items = Array.isArray(order.items) ? order.items : [];
    const itemsHtml = items.length
        ? items.map(item => `<div class="result-item"><span>${escapeHTML(item.food_name || "Food")} x${Number(item.quantity || 0)}</span><span>Rs. ${Number(item.price || 0).toFixed(2)}</span></div>`).join("")
        : `<div class="result-item"><span>No item details</span></div>`;
    const isCollected = data.collected === true || String(order.status || "").toUpperCase() === "COLLECTED";
    const canCollect = data.valid === true && !isCollected;

    resultPanel.innerHTML = `<div class="verified-order">
        <div class="order-result-head"><div><span>Verified order</span><strong>#${escapeHTML(order.order_id)}</strong></div><span class="result-status">${isCollected ? "Food collected" : escapeHTML(order.status || "PLACED")}</span></div>
        <div class="result-details"><div><span class="result-label">Student</span><span class="result-value">${escapeHTML(order.student_name || "Unknown student")}</span></div><div><span class="result-label">Register number</span><span class="result-value">${escapeHTML(order.register_number || "N/A")}</span></div><div><span class="result-label">Pickup slot</span><span class="result-value">${escapeHTML(order.pickup_slot || "Not specified")}</span></div></div>
        <div class="result-items">${itemsHtml}</div>
        <div class="result-total"><span>Total</span><span>Rs. ${Number(order.total_amount || 0).toFixed(2)}</span></div>
        <button class="primary-btn collect-btn" id="collect-btn" ${canCollect ? "" : "disabled"}>${canCollect ? "Mark Order Picked" : isCollected ? "Food collected" : escapeHTML(data.message || "Not available for collection")}</button>
    </div>`;

    const newCollectButton = document.getElementById("collect-btn");
    if (newCollectButton && canCollect) {
        newCollectButton.addEventListener("click", collectOrder);
    }
    setState(isCollected ? "Food collected" : data.valid ? "Verified" : "Review required", data.message || "Order details loaded.");
}

async function collectOrder() {
    if (!verifiedOrder) {
        return;
    }
    const button = document.getElementById("collect-btn");
    button.disabled = true;
    try {
        const response = await fetch(`${API_BASE_URL}/staff/qr/collect`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ order_id: verifiedOrder.order_id })
        });
        const data = await response.json();
        if (!response.ok || !data.success) {
            throw new Error(data.message || "Unable to collect order.");
        }
        verifiedOrder.status = "COLLECTED";
        renderResult({ success: true, valid: false, collected: true, message: data.message, order: verifiedOrder });
        showToast("Order marked as collected.");
    } catch (error) {
        button.disabled = false;
        showToast(error.message);
    }
}

function setState(title, message) {
    scannerState.textContent = title;
    scannerState.title = message;
}

function updateStoreStatus() {
    if (window.refreshCanteenStatus) {
        window.refreshCanteenStatus();
    }
}

function showToast(message) {
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => toast.classList.remove("show"), 2600);
}

function escapeHTML(value) {
    return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;").replace(/'/g, "&#039;");
}
