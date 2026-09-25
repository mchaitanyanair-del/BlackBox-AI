console.log("PhishGuard Floating Shield & DOM Guardian Active.");

let pageChecked = false;
let isSuspiciousSite = false;

// Analyze DOM links directly in-page
function analyzeDOM() {
    const anchors = document.querySelectorAll("a");
    let total = anchors.length;
    let suspicious = 0;
    const suspiciousKeywords = ["login", "verify", "update", "secure", "account", "signin", "free", "claim"];

    anchors.forEach(a => {
        const href = a.href || "";
        const isExternal = href.startsWith("http") && !href.includes(window.location.hostname);
        const hasKeyword = suspiciousKeywords.some(kw => href.toLowerCase().includes(kw));
        if (isExternal && hasKeyword) suspicious++;
    });

    return { total, suspicious };
}

// Inject Floating Red Shield Widget onto the page
function injectFloatingShield(threatDetected, linkStats) {
    if (document.getElementById("phishguard-floating-shield")) return;

    const shield = document.createElement("div");
    shield.id = "phishguard-floating-shield";
    
    const bgColor = threatDetected ? "#fee2e2" : "#f0fdf4";
    const borderColor = threatDetected ? "#ef4444" : "#22c55e";
    const textColor = threatDetected ? "#991b1b" : "#166534";
    const icon = threatDetected ? "🛡️⚠️" : "🛡️✅";

    shield.style.cssText = `
        position: fixed; bottom: 20px; right: 20px; z-index: 999999;
        background-color: ${bgColor}; border: 2px solid ${borderColor}; color: ${textColor};
        padding: 12px 16px; border-radius: 12px; font-family: sans-serif; font-size: 13px;
        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); cursor: pointer;
        transition: transform 0.2s ease;
    `;
    
    shield.innerHTML = `
        <div style="display: flex; align-items: center; gap: 8px; font-weight: bold; margin-bottom: 4px;">
            <span>${icon} PhishGuard Shield</span>
        </div>
        <div style="font-size: 12px; opacity: 0.9;">
            Links: <b>${linkStats.total}</b> | Suspicious: <b style="color: #dc2626;">${linkStats.suspicious}</b>
        </div>
        <div style="font-size: 11px; margin-top: 4px; border-top: 1px solid rgba(0,0,0,0.1); pt: 4px;">
            Status: <b>${threatDetected ? "THREAT DETECTED" : "SECURE"}</b>
        </div>
    `;

    document.body.appendChild(shield);
}

// Trigger scan on sensitive input focus or page load
document.addEventListener("focusin", async (event) => {
    const target = event.target;
    const isSensitive = target.matches('input[type="password"], input[name*="card"], input[name*="cvv"], input[name*="password"]');

    const linkStats = analyzeDOM();

    if (!pageChecked) {
        pageChecked = true;
        const pageText = document.body.innerText.substring(0, 2000);
        const currentUrl = window.location.href;

        try {
            const response = await fetch("http://127.0.0.1:8000/api/scan-site", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ url: currentUrl, html_snippet: pageText })
            });
            const data = await response.json();
            
            if (data.is_threat) {
                isSuspiciousSite = true;
            }
        } catch (err) {
            console.error("PhishGuard Backend offline:", err);
            isSuspiciousSite = true; // Fallback safety
        }
    }

    injectFloatingShield(isSuspiciousSite, linkStats);
});