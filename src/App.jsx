import { useState, useEffect, useRef } from "react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";

/* =====================================================
   SETTINGS — connect your Hugging Face model here
   -----------------------------------------------------
   Point this at a Hugging Face text-classification model,
   either called directly from the browser or (better, so
   your API key stays hidden) through a small backend route
   that forwards to Hugging Face.

   Direct example:
   "https://api-inference.huggingface.co/models/cybersectony/phishing-email-detection-distilbert_v2.4.1"

   Through your own backend (recommended):
   "http://localhost:8000/analyze"

   Leave it empty ("") to keep using the built-in demo
   analyzer, which works fully offline for your demo.
   ===================================================== */
const HF_API_URL = "";
const HF_API_TOKEN = ""; // only needed if calling Hugging Face directly

const SEV_COLOR = {
  Critical: "#f43f5e",
  High: "#fb923c",
  Medium: "#facc15",
  Low: "#34d399",
};

/* =====================================================
   FAKE DATA (your backend teammate's real data replaces this later)
   ===================================================== */
const startAlerts = [
  { id: 1, time: "10:42", severity: "Critical", type: "Ransomware behavior", source: "10.0.4.17", status: "Open" },
  { id: 2, time: "10:31", severity: "High", type: "Brute force on SSH", source: "203.0.113.9", status: "Open" },
  { id: 3, time: "10:18", severity: "High", type: "Suspicious PowerShell", source: "WS-114", status: "Open" },
  { id: 4, time: "09:57", severity: "Medium", type: "Phishing link clicked", source: "j.rao@corp.com", status: "Open" },
  { id: 5, time: "09:40", severity: "Medium", type: "Port scan detected", source: "198.51.100.23", status: "Blocked" },
  { id: 6, time: "09:12", severity: "Low", type: "Certificate expiring", source: "api.internal", status: "Open" },
  { id: 7, time: "08:55", severity: "Low", type: "New device on network", source: "10.0.2.61", status: "Resolved" },
];

const weekData = [
  { day: "Mon", detected: 42, blocked: 38 },
  { day: "Tue", detected: 58, blocked: 51 },
  { day: "Wed", detected: 47, blocked: 44 },
  { day: "Thu", detected: 83, blocked: 70 },
  { day: "Fri", detected: 66, blocked: 61 },
  { day: "Sat", detected: 31, blocked: 30 },
  { day: "Sun", detected: 39, blocked: 36 },
];

const feedPool = [
  "Blocked login attempt from 198.51.100.44",
  "Port scan detected on 10.0.2.8",
  "Suspicious PowerShell command on WS-114",
  "Phishing email quarantined from billing@paypa1-secure.com",
  "New device joined VLAN 20",
  "Certificate on api.internal expires in 6 days",
  "Brute force stopped on SSH (203.0.113.9)",
  "Outbound traffic spike from 10.0.4.17",
];

const pages = [
  { id: "dashboard", label: "Dashboard", icon: "dashboard", title: "Security overview", sub: "What is happening across your network right now" },
  { id: "alerts", label: "Alerts", icon: "alerts", title: "Alerts", sub: "Review threats, then block or resolve them" },
  { id: "triage", label: "Email Triage", icon: "mail", title: "Email triage console", sub: "Drop in an email and get an instant phishing verdict" },
  { id: "scanner", label: "Scanner", icon: "scanner", title: "Vulnerability scanner", sub: "Check a domain or IP address for weak spots" },
];

/* =====================================================
   SMALL HELPERS
   ===================================================== */
const ICONS = {
  shield: <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" />,
  dashboard: (
    <>
      <rect x="3" y="3" width="7" height="9" rx="1" />
      <rect x="14" y="3" width="7" height="5" rx="1" />
      <rect x="14" y="12" width="7" height="9" rx="1" />
      <rect x="3" y="16" width="7" height="5" rx="1" />
    </>
  ),
  alerts: <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0" />,
  mail: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 7l9 6 9-6" />
    </>
  ),
  scanner: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="4" />
      <path d="M12 12l6-5" />
    </>
  ),
  check: <path d="M20 6L9 17l-5-5" />,
  spark: <path d="M12 2l2.2 6.8L21 11l-6.8 2.2L12 20l-2.2-6.8L3 11l6.8-2.2z" />,
  upload: (
    <>
      <path d="M12 16V4M7 9l5-5 5 5" />
      <path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
    </>
  ),
  activity: <path d="M22 12h-4l-3 9L9 3l-3 9H2" />,
  close: <path d="M18 6L6 18M6 6l12 12" />,
  globe: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3a15 15 0 0 1 0 18 15 15 0 0 1 0-18z" />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </>
  ),
  moon: <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />,
};

function Icon({ name, className = "icon" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {ICONS[name]}
    </svg>
  );
}

function Badge({ severity }) {
  return <span className={`badge sev-${severity.toLowerCase()}`}>{severity}</span>;
}

function Clock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return <span className="clock">{now.toLocaleTimeString()}</span>;
}

const tooltipStyle = {
  background: "#0a0f1c",
  border: "1px solid #1f2b47",
  borderRadius: 8,
  color: "#e6ecf7",
};

/* =====================================================
   TOASTS (small confirmations that slide in and fade out)
   ===================================================== */
function useToasts() {
  const [toasts, setToasts] = useState([]);
  function push(text) {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  }
  return { toasts, push };
}

function ToastStack({ toasts }) {
  return (
    <div className="toast-stack">
      {toasts.map((t) => (
        <div key={t.id} className="toast">
          <Icon name="check" className="icon small" />
          {t.text}
        </div>
      ))}
    </div>
  );
}

/* =====================================================
   ACTIVITY PANEL (log history + GET requests, slides in
   from the right). Any page can call log(...) or
   logRequest(...) to add an entry here.
   ===================================================== */
function useActivity() {
  const [logs, setLogs] = useState([
    { id: 1, time: nowTime(), text: "Session started", kind: "info" },
  ]);
  const [requests, setRequests] = useState([]);

  function log(text, kind = "info") {
    setLogs((prev) => [{ id: Date.now() + Math.random(), time: nowTime(), text, kind }, ...prev].slice(0, 50));
  }

  // status starts as "pending" and is updated to "200" / "error" a moment later,
  // so the panel shows requests actually resolving, like a real network tab
  function logRequest(method, url) {
    const id = Date.now() + Math.random();
    setRequests((prev) => [{ id, time: nowTime(), method, url, status: "pending" }, ...prev].slice(0, 50));
    return id;
  }

  function resolveRequest(id, status) {
    setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
  }

  return { logs, requests, log, logRequest, resolveRequest };
}

function nowTime() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function ActivityPanel({ open, onClose, logs, requests }) {
  const [tab, setTab] = useState("logs");

  return (
    <>
      <div className={`panel-backdrop ${open ? "open" : ""}`} onClick={onClose} />
      <aside className={`log-panel ${open ? "open" : ""}`}>
        <div className="log-panel-head">
          <h3>Activity</h3>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <Icon name="close" className="icon small" />
          </button>
        </div>

        <div className="chips log-tabs">
          <button className={`chip ${tab === "logs" ? "active" : ""}`} onClick={() => setTab("logs")}>
            Log history
          </button>
          <button className={`chip ${tab === "requests" ? "active" : ""}`} onClick={() => setTab("requests")}>
            GET requests
          </button>
        </div>

        {tab === "logs" && (
          <ul className="log-list">
            {logs.length === 0 && <p className="empty">Nothing logged yet.</p>}
            {logs.map((l) => (
              <li key={l.id} className="log-item">
                <span className={`log-dot dot-${l.kind}`} />
                <div>
                  <p>{l.text}</p>
                  <p className="muted small mono">{l.time}</p>
                </div>
              </li>
            ))}
          </ul>
        )}

        {tab === "requests" && (
          <ul className="log-list">
            {requests.length === 0 && <p className="empty">No requests yet. Run a scan or analyze an email.</p>}
            {requests.map((r) => (
              <li key={r.id} className="req-item">
                <span className={`method-badge m-${r.method.toLowerCase()}`}>{r.method}</span>
                <div className="req-body">
                  <p className="mono req-url">{r.url}</p>
                  <p className="muted small mono">{r.time}</p>
                </div>
                <span className={`req-status s-${r.status === "pending" ? "pending" : r.status === "200" ? "ok" : "err"}`}>
                  {r.status === "pending" ? "..." : r.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </aside>
    </>
  );
}

/* =====================================================
   DENSE WIDGET LAYOUT
   Small, data-heavy cards grouped under a colored label,
   inspired by log/analytics dashboards.
   ===================================================== */
function MiniBars({ data, color }) {
  const max = Math.max(...data, 1);
  const w = 100 / data.length;
  return (
    <svg viewBox="0 0 100 32" preserveAspectRatio="none" className="mini-chart">
      {data.map((v, i) => {
        const h = Math.max((v / max) * 28, 2);
        return <rect key={i} x={i * w + w * 0.15} y={30 - h} width={w * 0.7} height={h} rx="1" fill={color} />;
      })}
    </svg>
  );
}

function MiniLine({ data, color }) {
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const pts = data
    .map((v, i) => `${(i / (data.length - 1)) * 100},${28 - ((v - min) / range) * 24}`)
    .join(" ");
  return (
    <svg viewBox="0 0 100 32" preserveAspectRatio="none" className="mini-chart">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Widget({ title, value, sub, chart, wide }) {
  return (
    <div className={`widget${wide ? " widget-wide" : ""}`}>
      <p className="widget-title">{title}</p>
      <h3 className="widget-value">{value}</h3>
      {sub && <p className="widget-sub muted small">{sub}</p>}
      {chart && <div className="widget-chart">{chart}</div>}
    </div>
  );
}

function SectionRow({ label, tone, children }) {
  return (
    <div className="section-row">
      <div className={`row-label tone-${tone}`}>
        <span>{label}</span>
      </div>
      <div className="row-widgets">{children}</div>
    </div>
  );
}

/* =====================================================
   PAGE 1: DASHBOARD
   ===================================================== */
function Dashboard({ alerts }) {
  const open = alerts.filter((a) => a.status === "Open");
  const criticalOpen = open.filter((a) => a.severity === "Critical").length;
  const blocked = 1240 + alerts.filter((a) => a.status === "Blocked").length;

  const sevData = Object.keys(SEV_COLOR)
    .map((s) => ({ name: s, value: open.filter((a) => a.severity === s).length }))
    .filter((d) => d.value > 0);

  const [feed, setFeed] = useState(
    feedPool.slice(0, 4).map((text, i) => ({ id: i, text, time: `10:${50 - i * 3}` }))
  );

  useEffect(() => {
    const t = setInterval(() => {
      const text = feedPool[Math.floor(Math.random() * feedPool.length)];
      const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      setFeed((prev) => [{ id: Date.now(), text, time }, ...prev].slice(0, 6));
    }, 4500);
    return () => clearInterval(t);
  }, []);

  const detectedTrend = weekData.map((d) => d.detected);
  const blockedTrend = weekData.map((d) => d.blocked);
  const respTrend = [22, 20, 19, 17, 16, 15, 14];
  const assetTrend = [280, 288, 294, 300, 305, 309, 312];

  return (
    <div className="enter dense">
      <SectionRow label="Detection" tone="detect">
        <Widget
          title="Open threats"
          value={open.length}
          sub={`${criticalOpen} need action now`}
          chart={<MiniBars data={detectedTrend} color="#f43f5e" />}
        />
        <Widget
          title="Blocked today"
          value={blocked.toLocaleString()}
          sub="Up 8% vs yesterday"
          chart={<MiniBars data={blockedTrend} color="#34d399" />}
        />
        {sevData.length === 0 ? (
          <Widget title="Open by severity" value="0" sub="No open threats" />
        ) : (
          sevData.map((d) => (
            <Widget key={d.name} title={d.name} value={d.value} sub="open right now" />
          ))
        )}
      </SectionRow>

      <SectionRow label="Response" tone="response">
        <Widget
          title="Avg response time"
          value="14 min"
          sub="Down from 22 min"
          chart={<MiniLine data={respTrend} color="#4cc9f0" />}
        />
        <Widget
          title="Assets monitored"
          value="312"
          sub="6 added this week"
          chart={<MiniLine data={assetTrend} color="#4cc9f0" />}
        />
        <Widget title="Resolved this week" value="41" sub="Across all severities" />
        <Widget title="Reopened this week" value="3" sub="Needs re-review" />
      </SectionRow>

      <SectionRow label="Trend" tone="trend">
        <div className="widget widget-wide2">
          <p className="widget-title">Threats detected and blocked · last 7 days</p>
          <div className="chart-box small">
            <ResponsiveContainer>
              <AreaChart data={weekData} margin={{ top: 6, right: 4, left: -22, bottom: 0 }}>
                <defs>
                  <linearGradient id="gDet" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#f43f5e" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gBlk" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#4cc9f0" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#4cc9f0" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--line)" vertical={false} />
                <XAxis dataKey="day" stroke="var(--muted)" tickLine={false} axisLine={false} fontSize={11} />
                <YAxis stroke="var(--muted)" tickLine={false} axisLine={false} fontSize={11} />
                <Tooltip contentStyle={tooltipStyle} />
                <Area type="monotone" dataKey="detected" name="Detected" stroke="#f43f5e" strokeWidth={2} fill="url(#gDet)" />
                <Area type="monotone" dataKey="blocked" name="Blocked" stroke="#4cc9f0" strokeWidth={2} fill="url(#gBlk)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="widget">
          <p className="widget-title">Open threats by severity</p>
          {sevData.length === 0 ? (
            <p className="empty small">No open threats</p>
          ) : (
            <div className="donut-wrap small">
              <div className="donut small">
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={sevData} dataKey="value" innerRadius={30} outerRadius={44} paddingAngle={3} stroke="none">
                      {sevData.map((d) => (
                        <Cell key={d.name} fill={SEV_COLOR[d.name]} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="legend small">
                {sevData.map((d) => (
                  <li key={d.name}>
                    <span className="dot" style={{ background: SEV_COLOR[d.name] }} />
                    {d.name}
                    <strong>{d.value}</strong>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </SectionRow>

      <SectionRow label="Activity" tone="activity">
        <div className="widget widget-wide3">
          <p className="widget-title">Live activity · updates automatically</p>
          <ul className="feed dense-feed">
            {feed.map((f) => (
              <li key={f.id} className="feed-item">
                <span className="mono muted">{f.time}</span>
                <span>{f.text}</span>
              </li>
            ))}
          </ul>
        </div>
      </SectionRow>
    </div>
  );
}

/* =====================================================
   PAGE 2: ALERTS
   ===================================================== */
function Alerts({ alerts, setAlerts, toast, log }) {
  const [filter, setFilter] = useState("All");
  const [query, setQuery] = useState("");

  const shown = alerts.filter(
    (a) =>
      (filter === "All" || a.severity === filter) &&
      (a.type + a.source).toLowerCase().includes(query.toLowerCase())
  );

  function setStatus(id, status) {
    const alert = alerts.find((a) => a.id === id);
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)));
    toast(status === "Blocked" ? "Source blocked" : status === "Resolved" ? "Alert resolved" : "Alert reopened");
    log(
      `${status === "Blocked" ? "Blocked" : status === "Resolved" ? "Resolved" : "Reopened"} "${alert?.type}" from ${alert?.source}`,
      status === "Blocked" ? "danger" : status === "Resolved" ? "success" : "info"
    );
  }

  const bySeverity = ["Critical", "High", "Medium", "Low"].map((s) => ({
    name: s,
    open: alerts.filter((a) => a.severity === s && a.status === "Open").length,
    total: alerts.filter((a) => a.severity === s).length,
  }));
  const blockedCount = alerts.filter((a) => a.status === "Blocked").length;
  const resolvedCount = alerts.filter((a) => a.status === "Resolved").length;

  return (
    <div className="enter dense">
      <SectionRow label="Overview" tone="detect">
        {bySeverity.map((s) => (
          <Widget key={s.name} title={s.name} value={s.open} sub={`${s.total} total`} />
        ))}
        <Widget title="Blocked" value={blockedCount} sub="sources blocked" />
        <Widget title="Resolved" value={resolvedCount} sub="closed out" />
      </SectionRow>

      <SectionRow label="Queue" tone="response">
        <div className="widget widget-wide3">
          <div className="toolbar">
            <div className="chips">
              {["All", "Critical", "High", "Medium", "Low"].map((f) => (
                <button key={f} className={`chip ${filter === f ? "active" : ""}`} onClick={() => setFilter(f)}>
                  {f}
                </button>
              ))}
            </div>
            <input
              className="input search"
              placeholder="Search by threat or source"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          <div className="table-wrap">
            <table className="dense-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Severity</th>
                  <th>Threat</th>
                  <th>Source</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((a) => (
                  <tr key={a.id}>
                    <td className="mono muted">{a.time}</td>
                    <td><Badge severity={a.severity} /></td>
                    <td>{a.type}</td>
                    <td className="mono">{a.source}</td>
                    <td><span className={`status st-${a.status.toLowerCase()}`}>{a.status}</span></td>
                    <td>
                      {a.status === "Open" ? (
                        <div className="actions">
                          <button className="btn small danger" onClick={() => setStatus(a.id, "Blocked")}>Block</button>
                          <button className="btn small ghost" onClick={() => setStatus(a.id, "Resolved")}>Resolve</button>
                        </div>
                      ) : (
                        <button className="btn small ghost" onClick={() => setStatus(a.id, "Open")}>Reopen</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {shown.length === 0 && <p className="empty">No alerts match. Try a different filter or search.</p>}
          </div>
        </div>
      </SectionRow>
    </div>
  );
}

/* =====================================================
   PAGE 3: EMAIL TRIAGE CONSOLE
   Left: drop zone for an email. Right: live reasoning
   steps, then a verdict card, then action buttons.
   ===================================================== */
const sampleEmail = `From: "PayPa1 Security" <alerts@paypa1-secure-verify.com>
Reply-To: support@mail-verify-center.ru
Subject: URGENT: Your account will be suspended in 24 hours

Dear Customer,

We detected unusual activity on your account. Click the link below
immediately to verify your identity or your account will be
permanently suspended.

http://paypa1-secure-login.verify-account.tk/confirm?id=8841

Failure to verify within 24 hours will result in permanent loss
of access and funds.

PayPal Security Team`;

const URGENCY_WORDS = ["urgent", "immediately", "suspend", "24 hours", "verify your account", "act now", "limited time", "failure to"];
const CRED_WORDS = ["password", "ssn", "social security", "credit card", "bank account", "pin number", "login details"];

function analyzeHeuristics(text) {
  const lower = text.toLowerCase();
  const signals = [];
  let score = 8;

  const fromMatch = text.match(/From:.*<([^>]+)>/i);
  const replyMatch = text.match(/Reply-To:\s*(\S+)/i);
  if (fromMatch && replyMatch) {
    const fromDomain = fromMatch[1].split("@")[1];
    const replyDomain = replyMatch[1].split("@")[1];
    if (fromDomain && replyDomain && fromDomain !== replyDomain) {
      signals.push({ text: `Sender domain (${fromDomain}) doesn't match Reply-To (${replyDomain})`, weight: 26 });
    }
  }

  const linkMatch = text.match(/https?:\/\/[^\s)]+/);
  if (linkMatch) {
    const link = linkMatch[0];
    if (/paypa1|paypal-|-secure-|verify-account|\.tk|\.ru\b|\d+\.\d+\.\d+\.\d+/i.test(link)) {
      signals.push({ text: "Link uses a look-alike or suspicious domain", weight: 30 });
    }
  }

  const urgencyHits = URGENCY_WORDS.filter((w) => lower.includes(w));
  if (urgencyHits.length) {
    signals.push({ text: `Urgent, pressuring language ("${urgencyHits[0]}")`, weight: 14 + urgencyHits.length * 3 });
  }

  const credHits = CRED_WORDS.filter((w) => lower.includes(w));
  if (credHits.length) {
    signals.push({ text: `Asks for sensitive information ("${credHits[0]}")`, weight: 18 });
  }

  if (/dear customer|dear user|valued customer/i.test(lower)) {
    signals.push({ text: "Generic greeting instead of your name", weight: 8 });
  }

  score += signals.reduce((s, x) => s + x.weight, 0);
  score = Math.max(2, Math.min(98, score));

  if (signals.length === 0) {
    signals.push({ text: "No common phishing patterns found in this text", weight: 0 });
  }

  return { score, signals };
}

function verdictFor(score) {
  if (score >= 60) return { label: "Phishing", color: "#f43f5e" };
  if (score >= 30) return { label: "Suspicious", color: "#fb923c" };
  return { label: "Safe", color: "#34d399" };
}

const baseSteps = [
  "Parsing headers and sender information",
  "Comparing sender domain with Reply-To",
  "Extracting and checking links",
  "Scanning language for urgency and pressure tactics",
  "Checking for requests for sensitive data",
  "Running Hugging Face phishing classifier",
  "Calculating final verdict",
];

function Triage({ toast, log, logRequest, resolveRequest }) {
  const [emailText, setEmailText] = useState("");
  const [fileName, setFileName] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [running, setRunning] = useState(false);
  const [visibleSteps, setVisibleSteps] = useState(0);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [actionTaken, setActionTaken] = useState(null);
  const stepTimer = useRef(null);

  useEffect(() => () => clearInterval(stepTimer.current), []);

  function loadFile(file) {
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => setEmailText(String(e.target.result || ""));
    reader.readAsText(file);
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files?.[0]) loadFile(e.dataTransfer.files[0]);
  }

  async function runAnalysis() {
    if (!emailText.trim() || running) return;
    setRunning(true);
    setResult(null);
    setActionTaken(null);
    setVisibleSteps(0);

    const subject = extractSubject(emailText);
    const reqId = logRequest("GET", HF_API_URL || "/demo/analyze");
    log(`Started analysis of "${subject}"`, "info");

    let i = 0;
    stepTimer.current = setInterval(() => {
      i += 1;
      setVisibleSteps(i);
      if (i >= baseSteps.length) clearInterval(stepTimer.current);
    }, 420);

    // Wait for the step animation, then get a verdict.
    // If HF_API_URL is set, this calls your real model; otherwise
    // it falls back to the built-in heuristic analyzer below.
    const [verdictData] = await Promise.all([
      getVerdict(emailText),
      new Promise((r) => setTimeout(r, baseSteps.length * 420 + 300)),
    ]);

    setRunning(false);
    setResult(verdictData);
    resolveRequest(reqId, "200");
    log(`Verdict for "${subject}": ${verdictData.verdict.label} (${verdictData.score}%)`,
      verdictData.verdict.label === "Phishing" ? "danger" : verdictData.verdict.label === "Suspicious" ? "warn" : "success");
    setHistory((h) => [
      { id: Date.now(), subject, verdict: verdictData.verdict.label, score: verdictData.score },
      ...h,
    ].slice(0, 6));
  }

  async function getVerdict(text) {
    if (HF_API_URL) {
      try {
        const res = await fetch(HF_API_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(HF_API_TOKEN ? { Authorization: `Bearer ${HF_API_TOKEN}` } : {}),
          },
          body: JSON.stringify({ inputs: text }),
        });
        const data = await res.json();
        // Hugging Face text-classification models typically return
        // something like [{ label: "PHISHING", score: 0.94 }, ...]
        const top = Array.isArray(data?.[0]) ? data[0][0] : data[0];
        const score = Math.round((top?.score ?? 0.5) * 100);
        const heuristics = analyzeHeuristics(text);
        return { score, signals: heuristics.signals, verdict: verdictFor(score), source: "model" };
      } catch (err) {
        // Falls through to the local analyzer below if the request fails
      }
    }
    const { score, signals } = analyzeHeuristics(text);
    return { score, signals, verdict: verdictFor(score), source: "demo" };
  }

  function extractSubject(text) {
    const m = text.match(/Subject:\s*(.+)/i);
    return m ? m[1].trim().slice(0, 40) : "Untitled email";
  }

  function act(label) {
    setActionTaken(label);
    toast(`${label} — action logged`);
    log(label, label.includes("blocked") || label.includes("quarantined") ? "danger" : "info");
  }

  return (
    <div className="triage enter">
      <div className="card drop-col">
        <h3>Email input</h3>
        <p className="muted small">Paste raw email text, or drop a .eml / .txt file</p>

        <div
          className={`dropzone ${dragOver ? "drag" : ""} ${emailText ? "filled" : ""}`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
        >
          <Icon name="upload" className="icon big" />
          <p>Drag a file here, or click to browse</p>
          {fileName && <p className="muted small mono">{fileName}</p>}
          <input
            type="file"
            accept=".eml,.txt"
            className="file-input"
            onChange={(e) => loadFile(e.target.files?.[0])}
          />
        </div>

        <textarea
          className="input textarea"
          placeholder="...or paste the full email here, headers included"
          value={emailText}
          onChange={(e) => setEmailText(e.target.value)}
        />

        <div className="drop-actions">
          <button className="btn" onClick={runAnalysis} disabled={running || !emailText.trim()}>
            {running ? "Analyzing..." : "Analyze email"}
          </button>
          <button className="btn ghost" onClick={() => { setEmailText(sampleEmail); setFileName(""); }}>
            Load sample
          </button>
        </div>

        {history.length > 0 && (
          <div className="history">
            <p className="muted small">Recent scans</p>
            <ul>
              {history.map((h) => (
                <li key={h.id}>
                  <Badge severity={h.verdict === "Phishing" ? "Critical" : h.verdict === "Suspicious" ? "Medium" : "Low"} />
                  <span className="hist-subject">{h.subject}</span>
                  <span className="muted small mono">{h.score}%</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="card reason-col">
        <h3>Analysis</h3>
        <p className="muted small">
          {HF_API_URL ? "Connected to Hugging Face model" : "Demo analyzer — connect HF_API_URL for the real model"}
        </p>

        {!running && !result && (
          <div className="reason-empty">
            <Icon name="spark" className="icon big" />
            <p className="muted">Drop in an email and click Analyze to see the reasoning steps and verdict here.</p>
          </div>
        )}

        {(running || result) && (
          <ul className="steps">
            {baseSteps.map((s, i) => (
              <li key={s} className={i < visibleSteps ? "done" : "pending"} style={{ transitionDelay: `${i * 40}ms` }}>
                <span className="step-dot">{i < visibleSteps ? <Icon name="check" className="icon tiny" /> : null}</span>
                {s}
              </li>
            ))}
          </ul>
        )}

        {result && (
          <div className="verdict-card" style={{ "--verdict-color": result.verdict.color }}>
            <div className="verdict-top">
              <div>
                <p className="muted small">Verdict</p>
                <h2 style={{ color: result.verdict.color }}>{result.verdict.label}</h2>
              </div>
              <div className="confidence-ring">
                <svg width="72" height="72" viewBox="0 0 72 72">
                  <circle cx="36" cy="36" r="30" fill="none" stroke="#1f2b47" strokeWidth="7" />
                  <circle
                    cx="36" cy="36" r="30" fill="none" stroke={result.verdict.color} strokeWidth="7"
                    strokeLinecap="round"
                    strokeDasharray={`${(2 * Math.PI * 30 * result.score) / 100} ${2 * Math.PI * 30}`}
                    transform="rotate(-90 36 36)"
                  />
                  <text x="36" y="41" textAnchor="middle" className="ring-num-sm">{result.score}%</text>
                </svg>
              </div>
            </div>

            <ul className="signals">
              {result.signals.map((s, i) => (
                <li key={i}>
                  <span className="signal-dot" />
                  {s.text}
                </li>
              ))}
            </ul>

            <div className="verdict-actions">
              <button className="btn danger" disabled={!!actionTaken} onClick={() => act("Sender blocked")}>Block sender</button>
              <button className="btn" disabled={!!actionTaken} onClick={() => act("Email quarantined")}>Quarantine</button>
              <button className="btn ghost" disabled={!!actionTaken} onClick={() => act("Marked as safe")}>Mark safe</button>
              <button className="btn ghost" disabled={!!actionTaken} onClick={() => act("Reported to security team")}>Report</button>
            </div>
            {actionTaken && <p className="action-done"><Icon name="check" className="icon small" /> {actionTaken}</p>}
          </div>
        )}
      </div>
    </div>
  );
}

/* =====================================================
   PAGE 4: SCANNER
   ===================================================== */
const scanSteps = [
  "Resolving host",
  "Scanning open ports",
  "Checking the TLS certificate",
  "Testing common vulnerabilities",
  "Calculating risk score",
];

const findingLibrary = [
  { sev: "Critical", text: "Remote desktop (port 3389) is open to the internet", fix: "Close the port or put it behind a VPN." },
  { sev: "High", text: "Outdated web server with known vulnerabilities", fix: "Update to the latest version." },
  { sev: "Medium", text: "TLS certificate expires in 12 days", fix: "Renew the certificate before it expires." },
  { sev: "Medium", text: "Missing security headers (HSTS, CSP)", fix: "Add the headers in your server settings." },
  { sev: "Low", text: "Server reveals its software version", fix: "Hide version banners in the server config." },
];

function makeResult(target) {
  let h = 0;
  for (const c of target) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const start = h % findingLibrary.length;
  const findings = [0, 1, 2].map((i) => findingLibrary[(start + i) % findingLibrary.length]);
  const weight = { Critical: 30, High: 20, Medium: 10, Low: 4 };
  const score = Math.min(98, 10 + (h % 12) + findings.reduce((s, f) => s + weight[f.sev], 0));
  return { target, score, findings };
}

const blipSpots = [
  { top: "24%", left: "60%" },
  { top: "62%", left: "28%" },
  { top: "70%", left: "66%" },
];

function Scanner({ log, logRequest, resolveRequest }) {
  const [target, setTarget] = useState("");
  const [progress, setProgress] = useState(0);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);
  const timer = useRef(null);

  useEffect(() => () => clearInterval(timer.current), []);

  function start() {
    if (!target.trim() || running) return;
    setResult(null);
    setProgress(0);
    setRunning(true);
    const t = target.trim();
    const reqId = logRequest("GET", `/scan?target=${encodeURIComponent(t)}`);
    log(`Started scan for ${t}`, "info");
    let p = 0;
    timer.current = setInterval(() => {
      p += 4;
      setProgress(p);
      if (p >= 100) {
        clearInterval(timer.current);
        setRunning(false);
        const r = makeResult(t);
        setResult(r);
        resolveRequest(reqId, "200");
        log(`Scan complete for ${t}: risk score ${r.score}`, r.score >= 60 ? "danger" : r.score >= 35 ? "warn" : "success");
      }
    }, 120);
  }

  const level = result
    ? result.score >= 60 ? { label: "High risk", color: "#f43f5e" }
      : result.score >= 35 ? { label: "Moderate risk", color: "#fb923c" }
      : { label: "Low risk", color: "#34d399" }
    : null;

  const circ = 2 * Math.PI * 56;

  return (
    <div className="scanner enter">
      <div className="card scan-panel">
        <div className={`radar ${running ? "on" : ""}`}>
          {result && result.findings.map((f, i) => (
            <span key={i} className="blip" style={{ ...blipSpots[i], background: SEV_COLOR[f.sev] }} />
          ))}
        </div>

        <div className="scan-form">
          <label className="muted small" htmlFor="target">Domain or IP address</label>
          <input
            id="target"
            className="input"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && start()}
            placeholder="example.com or 198.51.100.23"
          />
          <button className="btn" onClick={start} disabled={running || !target.trim()}>
            {running ? "Scanning..." : "Start scan"}
          </button>

          {(running || progress > 0) && (
            <div className="progress-wrap">
              <div className="progress"><div style={{ width: `${progress}%` }} /></div>
              <p className="muted small">
                {running ? scanSteps[Math.min(Math.floor(progress / 20), 4)] : "Scan complete"}
              </p>
            </div>
          )}
          <p className="muted small">Demo results. Your backend scanner can replace this later.</p>
        </div>
      </div>

      {result && (
        <div className="card results">
          <div className="score">
            <svg width="132" height="132" viewBox="0 0 132 132">
              <circle cx="66" cy="66" r="56" fill="none" stroke="#1f2b47" strokeWidth="10" />
              <circle
                cx="66" cy="66" r="56" fill="none" stroke={level.color} strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={`${(circ * result.score) / 100} ${circ}`}
                transform="rotate(-90 66 66)"
              />
              <text x="66" y="74" textAnchor="middle" className="ring-num">{result.score}</text>
            </svg>
            <div>
              <h3 style={{ color: level.color }}>{level.label}</h3>
              <p className="muted small">{result.target}</p>
            </div>
          </div>

          <ul className="findings">
            {result.findings.map((f, i) => (
              <li key={i}>
                <Badge severity={f.sev} />
                <div>
                  <p>{f.text}</p>
                  <p className="muted small">Fix: {f.fix}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/* =====================================================
   MAIN APP
   ===================================================== */
export default function App() {
  const [page, setPage] = useState("dashboard");
  const [alerts, setAlerts] = useState(startAlerts);
  const { toasts, push } = useToasts();
  const { logs, requests, log, logRequest, resolveRequest } = useActivity();
  const [panelOpen, setPanelOpen] = useState(false);

  const current = pages.find((p) => p.id === page);
  const openCount = alerts.filter((a) => a.status === "Open").length;
  const pendingRequests = requests.filter((r) => r.status === "pending").length;

  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem("phishguard-theme") || "dark";
    } catch {
      return "dark";
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("phishguard-theme", theme);
    } catch {
      // ignore if storage isn't available
    }
  }, [theme]);

  return (
    <div className="app" data-theme={theme}>
      <aside className="sidebar">
        <div className="brand">
          <Icon name="shield" />
          <span>PhishGuard</span>
        </div>

        <nav className="nav">
          {pages.map((p) => (
            <button
              key={p.id}
              className={page === p.id ? "active" : ""}
              onClick={() => setPage(p.id)}
            >
              <Icon name={p.icon} />
              {p.label}
              {p.id === "alerts" && openCount > 0 && <span className="count">{openCount}</span>}
            </button>
          ))}
        </nav>

        <button
          className="theme-toggle"
          onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
          aria-label="Toggle theme"
        >
          <Icon name={theme === "dark" ? "sun" : "moon"} className="icon small" />
          {theme === "dark" ? "Light mode" : "Dark mode"}
        </button>

        <div className="agent-status">
          <span className="pulse" />
          <div>
            <p>Model online</p>
            <p className="muted small">Monitoring inbox traffic</p>
          </div>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <h1>{current.title}</h1>
            <p className="muted">{current.sub}</p>
          </div>
          <div className="topbar-right">
            <Clock />
            <button className="icon-btn activity-btn" onClick={() => setPanelOpen(true)} aria-label="Activity">
              <Icon name="activity" className="icon small" />
              Activity
              {pendingRequests > 0 && <span className="count">{pendingRequests}</span>}
            </button>
          </div>
        </header>

        {page === "dashboard" && <Dashboard alerts={alerts} />}
        {page === "alerts" && <Alerts alerts={alerts} setAlerts={setAlerts} toast={push} log={log} />}
        {page === "triage" && (
          <Triage toast={push} log={log} logRequest={logRequest} resolveRequest={resolveRequest} />
        )}
        {page === "scanner" && <Scanner log={log} logRequest={logRequest} resolveRequest={resolveRequest} />}
      </main>

      <ToastStack toasts={toasts} />
      <ActivityPanel open={panelOpen} onClose={() => setPanelOpen(false)} logs={logs} requests={requests} />
    </div>
  );
}