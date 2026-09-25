document.addEventListener("DOMContentLoaded", async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab) return;

    // Execute script in the active tab to inspect DOM links
    chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: analyzeDomLinks
    }, (results) => {
        if (results && results[0] && results[0].result) {
            const data = results[0].result;
            document.getElementById("total-links").innerText = data.total;
            document.getElementById("phish-links").innerText = data.suspicious;
        }
    });

    // Open the UPI QR scanner in a full tab (camera streams die inside popups)
    const scannerBtn = document.getElementById("openScanner");
    if (scannerBtn) {
        scannerBtn.addEventListener("click", () => {
            chrome.tabs.create({ url: chrome.runtime.getURL("scanner.html") });
        });
    }
});

// Function injected into the active page DOM
function analyzeDomLinks() {
    const anchors = document.querySelectorAll("a");
    let total = anchors.length;
    let suspicious = 0;

    const suspiciousKeywords = ["login", "verify", "update", "secure", "account", "signin", "free", "claim"];

    anchors.forEach(a => {
        const href = a.href || "";
        // Check if link points to external domain with suspicious keywords or mismatch
        const isExternal = href.startsWith("http") && !href.includes(window.location.hostname);
        const hasKeyword = suspiciousKeywords.some(kw => href.toLowerCase().includes(kw));

        if (isExternal && hasKeyword) {
            suspicious++;
        }
    });

    return { total, suspicious };
}
