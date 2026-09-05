import { useState, useEffect, useRef } from "react";
import { getDashboardSummary, getDashboardRecentTransactions } from "../lib/api.js";

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
      { label: "Balancesheet",    page: "Reports" },
      { label: "Profit and Loss", page: "Reports" },
      { label: "Budget Report",   page: "Reports" },
    ],
  },
];

export default function Dashboard({ authUser, onNavigate }) {
  const [openTab, setOpenTab] = useState(null);
  const [summary, setSummary] = useState(null);
  const [recentTxns, setRecentTxns] = useState(null);
  const [loading, setLoading] = useState(true);
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

  useEffect(() => {
    let mounted = true;
    async function loadDash() {
      try {
        const [sData, rData] = await Promise.all([
          getDashboardSummary(),
          getDashboardRecentTransactions(5),
        ]);
        if (mounted) {
          setSummary(sData);
          setRecentTxns(rData);
        }
      } catch (e) {
        console.error("Dashboard data load error:", e);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadDash();
    return () => { mounted = false; };
  }, []);

  const toggleTab = (tab) => setOpenTab(openTab === tab ? null : tab);

  const handleNavItem = (page) => {
    setOpenTab(null);
    if (onNavigate) onNavigate(page);
  };

  const greetingHour = new Date().getHours();
  const greeting = greetingHour < 12 ? "Good Morning" : greetingHour < 17 ? "Good Afternoon" : "Good Evening";

  const formatMoney = (val) => `₹${Number(val || 0).toLocaleString("en-IN")}`;

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
          <span className="dash-date">
            {new Date().toLocaleDateString("en-IN", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </span>
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
              <p className="dash-section-sub">Customers & total sales</p>
            </div>
            <button className="dash-action-btn dash-btn-primary" onClick={() => handleNavItem("Sales")}>
              + New
            </button>
          </div>
          <div className="dash-stat-row">
            <button className="dash-stat-chip stat-blue" onClick={() => handleNavItem("Sales")}>
              <span className="dash-stat-val">{summary?.total_customers ?? 0}</span>
              <span className="dash-stat-label">Customers</span>
            </button>
            <button className="dash-stat-chip stat-green" onClick={() => handleNavItem("Sales")}>
              <span className="dash-stat-val">{formatMoney(summary?.total_sales)}</span>
              <span className="dash-stat-label">Total Sales</span>
            </button>
          </div>
          <div className="dash-section-footer">
            <button className="dash-view-link" onClick={() => handleNavItem("Sales")}>View Sales →</button>
          </div>
        </div>

        {/* Purchase */}
        <div className="dash-section-card">
          <div className="dash-section-header">
            <div>
              <h3 className="dash-section-title">Purchases</h3>
              <p className="dash-section-sub">Vendors & total purchases</p>
            </div>
            <button className="dash-action-btn dash-btn-primary" onClick={() => handleNavItem("Purchases")}>
              + New
            </button>
          </div>
          <div className="dash-stat-row">
            <button className="dash-stat-chip stat-blue" onClick={() => handleNavItem("Purchases")}>
              <span className="dash-stat-val">{summary?.total_vendors ?? 0}</span>
              <span className="dash-stat-label">Vendors</span>
            </button>
            <button className="dash-stat-chip stat-orange" onClick={() => handleNavItem("Purchases")}>
              <span className="dash-stat-val">{formatMoney(summary?.total_purchases)}</span>
              <span className="dash-stat-label">Purchases</span>
            </button>
          </div>
          <div className="dash-section-footer">
            <button className="dash-view-link" onClick={() => handleNavItem("Purchases")}>View Purchases →</button>
          </div>
        </div>

        {/* Financial Overview */}
        <div className="dash-section-card">
          <div className="dash-section-header">
            <div>
              <h3 className="dash-section-title">Accounting</h3>
              <p className="dash-section-sub">Bank balance & profit</p>
            </div>
            <button className="dash-action-btn dash-btn-secondary" onClick={() => handleNavItem("Reports")}>
              Reports
            </button>
          </div>
          <div className="dash-stat-row">
            <button className="dash-stat-chip stat-purple" onClick={() => handleNavItem("Reports")}>
              <span className="dash-stat-val">{formatMoney(summary?.cash_bank_balance)}</span>
              <span className="dash-stat-label">Cash & Bank</span>
            </button>
            <button className="dash-stat-chip stat-green" onClick={() => handleNavItem("Reports")}>
              <span className="dash-stat-val">{formatMoney(summary?.net_profit)}</span>
              <span className="dash-stat-label">Net Profit</span>
            </button>
          </div>
          <div className="dash-section-footer">
            <button className="dash-view-link" onClick={() => handleNavItem("Reports")}>View Reports →</button>
          </div>
        </div>
      </div>

      {/* ── Quick Stats Row ────────────────────────────────────────── */}
      <div className="dash-quick-stats">
        <div className="dash-qs-card">
          <div className="dash-qs-icon" style={{ background: "#eff6ff", color: "#1d4ed8" }}>₹</div>
          <div>
            <p className="dash-qs-label">Total Sales</p>
            <p className="dash-qs-val">{formatMoney(summary?.total_sales)}</p>
            <span className="dash-qs-badge green">Income: {formatMoney(summary?.total_income)}</span>
          </div>
        </div>
        <div className="dash-qs-card">
          <div className="dash-qs-icon" style={{ background: "#fff7ed", color: "#c2410c" }}>🛒</div>
          <div>
            <p className="dash-qs-label">Total Purchases</p>
            <p className="dash-qs-val">{formatMoney(summary?.total_purchases)}</p>
            <span className="dash-qs-badge red">Expenses: {formatMoney(summary?.total_expenses)}</span>
          </div>
        </div>
        <div className="dash-qs-card">
          <div className="dash-qs-icon" style={{ background: "#f0fdf4", color: "#166534" }}>📥</div>
          <div>
            <p className="dash-qs-label">Outstanding Invoices</p>
            <p className="dash-qs-val">{formatMoney(summary?.outstanding_invoices)}</p>
            <span className="dash-qs-badge green">Bills: {formatMoney(summary?.outstanding_bills)}</span>
          </div>
        </div>
        <div className="dash-qs-card">
          <div className="dash-qs-icon" style={{ background: "#fdf4ff", color: "#7e22ce" }}>📊</div>
          <div>
            <p className="dash-qs-label">Net Profit</p>
            <p className="dash-qs-val">{formatMoney(summary?.net_profit)}</p>
            <span className="dash-qs-badge green">Cash/Bank: {formatMoney(summary?.cash_bank_balance)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
