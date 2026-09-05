import { useState, useEffect, useRef } from "react";

// ── Navigation mega-menu config ───────────────────────────────────────────────
const NAV_COLUMNS = [
  {
    key: "Sales",
    items: [
      { label: "Sales Order",   page: "Sales" },
      { label: "Sale Invoice",  page: "Sales" },
      { label: "Receipt",       page: "Sales" },
    ],
  },
  {
    key: "Purchase",
    items: [
      { label: "Purchase Order", page: "Purchases" },
      { label: "Purchase Bill",  page: "Purchases" },
      { label: "Payment",        page: "Payments" },
    ],
  },
  {
    key: "Account",
    items: [
      { label: "Contact",           page: "Contacts" },
      { label: "Product",           page: "Products" },
      { label: "Analyticals",       page: "Analytics" },
      { label: "Analytical Budget", page: "Budget" },
      { label: "Chart of Account",  page: "Chart of Accounts" },
      { label: "Journals",          page: "Journals" },
      { label: "Journal Entries",   page: "Journal Entries" },
    ],
  },
  {
    key: "Report",
    items: [
      { label: "Balancesheet",   page: "Reports" },
      { label: "Profit and Loss", page: "Reports" },
      { label: "Budget Report",  page: "Budget" },
    ],
  },
];

// ── Stats data ─────────────────────────────────────────────────────────────
const SALES_STATS = [
  { label: "All",       value: 12, color: "stat-blue" },
  { label: "Confirmed", value: 10, color: "stat-green" },
  { label: "Draft",     value: 2,  color: "stat-orange" },
];

const PURCHASE_STATS = [
  { label: "All",       value: 12, color: "stat-blue" },
  { label: "Confirmed", value: 10, color: "stat-green" },
  { label: "Draft",     value: 2,  color: "stat-orange" },
];

const BUDGET_STATS = [
  { label: "Achieved",   value: 3, color: "stat-green" },
  { label: "Budget",     value: 2, color: "stat-blue" },
  { label: "Committed",  value: 4, color: "stat-purple" },
];

// ── Component ──────────────────────────────────────────────────────────────
export default function Dashboard({ authUser, onNavigate }) {
  const [openTab, setOpenTab] = useState(null);
  const menuRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpenTab(null);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const toggleTab = (tab) => setOpenTab(openTab === tab ? null : tab);

  const handleNavItem = (page) => {
    setOpenTab(null);
    if (onNavigate) onNavigate(page);
  };

  const greetingHour = new Date().getHours();
  const greeting = greetingHour < 12 ? "Good Morning" : greetingHour < 17 ? "Good Afternoon" : "Good Evening";

  return (
    <div className="dash-page">

      {/* ── Page header ────────────────────────────────────────────── */}
      <div className="dash-page-header">
        <div>
          <p className="breadcrumb">Home / Dashboard</p>
          <h1>Dashboard</h1>
          <p className="subtitle">
            {greeting}, <strong>{authUser?.loginId || "User"}</strong>.
            Here's your business overview.
          </p>
        </div>
        <div className="dash-header-meta">
          <span className="dash-date">{new Date().toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</span>
        </div>
      </div>

      {/* ── Module Navigation Bar ──────────────────────────────────── */}
      <div className="dash-nav-bar" ref={menuRef}>
        <div className="dash-tabs">
          {NAV_COLUMNS.map((col) => (
            <button
              key={col.key}
              className={`dash-tab-btn ${openTab === col.key ? "dash-tab-active" : ""}`}
              onClick={() => toggleTab(col.key)}
              aria-expanded={openTab === col.key}
            >
              {col.key}
              <svg className="dash-tab-caret" width="10" height="6" viewBox="0 0 10 6">
                <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
              </svg>
            </button>
          ))}
        </div>

        {/* Mega dropdown */}
        {openTab && (
          <div className="dash-mega-menu">
            <div className="dash-mega-inner">
              {NAV_COLUMNS.map((col) => (
                <div key={col.key} className="dash-mega-col">
                  <p className="dash-mega-col-title">{col.key}</p>
                  {col.items.map((item) => (
                    <button
                      key={item.label}
                      className="dash-mega-item"
                      onClick={() => handleNavItem(item.page)}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Summary Sections ───────────────────────────────────────── */}
      <div className="dash-sections">

        {/* Sales */}
        <div className="dash-section-card">
          <div className="dash-section-header">
            <div>
              <h3 className="dash-section-title">Sales</h3>
              <p className="dash-section-sub">Sales orders & invoices</p>
            </div>
            <button className="dash-action-btn dash-btn-primary" onClick={() => handleNavItem("Sales")}>
              + New
            </button>
          </div>
          <div className="dash-stat-row">
            {SALES_STATS.map((s) => (
              <button key={s.label} className={`dash-stat-chip ${s.color}`} onClick={() => handleNavItem("Sales")}>
                <span className="dash-stat-val">{s.value}</span>
                <span className="dash-stat-label">{s.label}</span>
              </button>
            ))}
          </div>
          <div className="dash-section-footer">
            <button className="dash-view-link" onClick={() => handleNavItem("Sales")}>View all Sales Orders →</button>
          </div>
        </div>

        {/* Purchase */}
        <div className="dash-section-card">
          <div className="dash-section-header">
            <div>
              <h3 className="dash-section-title">Purchase</h3>
              <p className="dash-section-sub">Purchase orders & bills</p>
            </div>
            <button className="dash-action-btn dash-btn-primary" onClick={() => handleNavItem("Purchases")}>
              + New
            </button>
          </div>
          <div className="dash-stat-row">
            {PURCHASE_STATS.map((s) => (
              <button key={s.label} className={`dash-stat-chip ${s.color}`} onClick={() => handleNavItem("Purchases")}>
                <span className="dash-stat-val">{s.value}</span>
                <span className="dash-stat-label">{s.label}</span>
              </button>
            ))}
          </div>
          <div className="dash-section-footer">
            <button className="dash-view-link" onClick={() => handleNavItem("Purchases")}>View all Purchase Orders →</button>
          </div>
        </div>

        {/* Budget Reports */}
        <div className="dash-section-card">
          <div className="dash-section-header">
            <div>
              <h3 className="dash-section-title">Budget Reports</h3>
              <p className="dash-section-sub">Budget tracking & analysis</p>
            </div>
            <button className="dash-action-btn dash-btn-secondary" onClick={() => handleNavItem("Budget")}>
              Report
            </button>
          </div>
          <div className="dash-stat-row">
            {BUDGET_STATS.map((s) => (
              <button key={s.label} className={`dash-stat-chip ${s.color}`} onClick={() => handleNavItem("Budget")}>
                <span className="dash-stat-val">{s.value}</span>
                <span className="dash-stat-label">{s.label}</span>
              </button>
            ))}
          </div>
          <div className="dash-section-footer">
            <button className="dash-view-link" onClick={() => handleNavItem("Reports")}>View Budget Report →</button>
          </div>
        </div>

      </div>

      {/* ── Quick Stats Row ────────────────────────────────────────── */}
      <div className="dash-quick-stats">
        <div className="dash-qs-card">
          <div className="dash-qs-icon" style={{ background: "#eff6ff", color: "#1d4ed8" }}>₹</div>
          <div>
            <p className="dash-qs-label">Total Sales</p>
            <p className="dash-qs-val">₹2,45,000</p>
            <span className="dash-qs-badge green">↑ 12.5%</span>
          </div>
        </div>
        <div className="dash-qs-card">
          <div className="dash-qs-icon" style={{ background: "#fff7ed", color: "#c2410c" }}>🛒</div>
          <div>
            <p className="dash-qs-label">Total Purchases</p>
            <p className="dash-qs-val">₹1,28,500</p>
            <span className="dash-qs-badge red">↓ 8.2%</span>
          </div>
        </div>
        <div className="dash-qs-card">
          <div className="dash-qs-icon" style={{ background: "#f0fdf4", color: "#166534" }}>📥</div>
          <div>
            <p className="dash-qs-label">Receivables</p>
            <p className="dash-qs-val">₹58,000</p>
            <span className="dash-qs-badge green">↑ 7.8%</span>
          </div>
        </div>
        <div className="dash-qs-card">
          <div className="dash-qs-icon" style={{ background: "#fdf4ff", color: "#7e22ce" }}>📊</div>
          <div>
            <p className="dash-qs-label">Net Profit</p>
            <p className="dash-qs-val">₹43,000</p>
            <span className="dash-qs-badge green">↑ 15.3%</span>
          </div>
        </div>
      </div>

    </div>
  );
}
