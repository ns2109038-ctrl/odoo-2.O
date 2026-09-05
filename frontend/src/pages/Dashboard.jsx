import { useState, useEffect, useRef } from "react";
import { getDashboardSummary, getDashboardRecentTransactions } from "../lib/api.js";
import {
  TrendingUp,
  ShoppingCart,
  Receipt,
  Wallet,
  Users,
  Building2,
  Plus,
  ArrowRight,
  ChevronDown,
  Calendar,
  FileText,
  DollarSign,
  PieChart,
  BarChart2
} from "lucide-react";

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

      {/* ── 1. Hero Page Header Banner ───────────────────────────────────────── */}
      <div style={{
        background: "linear-gradient(135deg, #594236 0%, #6f584b 100%)",
        borderRadius: "16px",
        padding: "24px 28px",
        color: "#ffffff",
        marginBottom: "22px",
        boxShadow: "0 8px 24px rgba(89, 66, 54, 0.18)",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: "16px"
      }}>
        <div>
          <p style={{ margin: "0 0 4px 0", fontSize: "11px", color: "#ccdde2", textTransform: "uppercase", letterSpacing: "1px", fontWeight: "700" }}>
            Financial Accounting ERP
          </p>
          <h1 style={{ margin: 0, fontSize: "24px", fontWeight: "800", letterSpacing: "-0.5px", color: "#ffffff" }}>
            {greeting}, {authUser?.loginId || "User"}
          </h1>
          <p style={{ margin: "4px 0 0 0", fontSize: "13px", color: "#ccdde2", opacity: 0.9 }}>
            Here is your live accounting summary & business metrics for today.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ background: "rgba(204, 221, 226, 0.12)", padding: "8px 14px", borderRadius: "10px", border: "1px solid rgba(204, 221, 226, 0.2)", display: "flex", alignItems: "center", gap: "8px" }}>
            <Calendar size={16} style={{ color: "#48acf0" }} />
            <div>
              <span style={{ fontSize: "10px", color: "#ccdde2", display: "block", lineHeight: "1" }}>System Date</span>
              <span style={{ fontSize: "13px", fontWeight: "700", color: "#ffffff" }}>
                {new Date().toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}
              </span>
            </div>
          </div>

          <button
            onClick={() => handleNavItem("Sales")}
            style={{
              background: "#48acf0", color: "#ffffff", border: "none",
              padding: "10px 18px", borderRadius: "10px", fontSize: "13px",
              fontWeight: "700", cursor: "pointer", display: "flex",
              alignItems: "center", gap: "6px", boxShadow: "0 4px 14px rgba(72, 172, 240, 0.4)",
              transition: "transform 0.15s ease"
            }}
          >
            <Plus size={16} /> Quick Order
          </button>
        </div>
      </div>

      {/* ── 2. Module Navigation Bar ────────────────────────────────────────── */}
      <div className="dash-nav-bar" ref={menuRef} style={{ marginBottom: "22px" }}>
        <div className="dash-tabs">
          {NAV_COLUMNS.map((col) => (
            <button
              key={col.key}
              className={`dash-tab-btn ${openTab === col.key ? "dash-tab-active" : ""}`}
              onClick={() => toggleTab(col.key)}
              aria-expanded={openTab === col.key}
            >
              {col.key}
              <ChevronDown size={14} className="dash-tab-caret" style={{ transform: openTab === col.key ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }} />
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

      {/* ── 3. Summary Sections Grid ─────────────────────────────────────────── */}
      <div className="dash-sections">
        {/* Sales */}
        <div className="dash-section-card">
          <div className="dash-section-header">
            <div>
              <h3 className="dash-section-title">Sales</h3>
              <p className="dash-section-sub">Customers & total sales revenue</p>
            </div>
            <button className="dash-action-btn dash-btn-primary" onClick={() => handleNavItem("Sales")}>
              <Plus size={14} /> New
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
            <button className="dash-view-link" onClick={() => handleNavItem("Sales")}>
              View Sales Orders <ArrowRight size={14} />
            </button>
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
              <Plus size={14} /> New
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
            <button className="dash-view-link" onClick={() => handleNavItem("Purchases")}>
              View Purchase Orders <ArrowRight size={14} />
            </button>
          </div>
        </div>

        {/* Financial Overview */}
        <div className="dash-section-card">
          <div className="dash-section-header">
            <div>
              <h3 className="dash-section-title">Accounting Overview</h3>
              <p className="dash-section-sub">Bank balance & net profit</p>
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
            <button className="dash-view-link" onClick={() => handleNavItem("Reports")}>
              View Financial Reports <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* ── 4. Quick KPI Stats Row ───────────────────────────────────────────── */}
      <div className="dash-quick-stats">
        <div className="dash-qs-card">
          <div className="dash-qs-icon" style={{ background: "#e6f4fe", color: "#48acf0" }}>
            <TrendingUp size={22} />
          </div>
          <div>
            <p className="dash-qs-label">Total Sales</p>
            <p className="dash-qs-val" style={{ color: "#594236" }}>{formatMoney(summary?.total_sales)}</p>
            <span className="dash-qs-badge green">Income: {formatMoney(summary?.total_income)}</span>
          </div>
        </div>

        <div className="dash-qs-card">
          <div className="dash-qs-icon" style={{ background: "#fff7ed", color: "#c2410c" }}>
            <ShoppingCart size={22} />
          </div>
          <div>
            <p className="dash-qs-label">Total Purchases</p>
            <p className="dash-qs-val" style={{ color: "#594236" }}>{formatMoney(summary?.total_purchases)}</p>
            <span className="dash-qs-badge red">Expenses: {formatMoney(summary?.total_expenses)}</span>
          </div>
        </div>

        <div className="dash-qs-card">
          <div className="dash-qs-icon" style={{ background: "#f0fdf4", color: "#166534" }}>
            <FileText size={22} />
          </div>
          <div>
            <p className="dash-qs-label">Outstanding Invoices</p>
            <p className="dash-qs-val" style={{ color: "#594236" }}>{formatMoney(summary?.outstanding_invoices)}</p>
            <span className="dash-qs-badge green">Bills: {formatMoney(summary?.outstanding_bills)}</span>
          </div>
        </div>

        <div className="dash-qs-card">
          <div className="dash-qs-icon" style={{ background: "#ccdde2", color: "#594236" }}>
            <PieChart size={22} />
          </div>
          <div>
            <p className="dash-qs-label">Net Operating Profit</p>
            <p className="dash-qs-val" style={{ color: "#594236" }}>{formatMoney(summary?.net_profit)}</p>
            <span className="dash-qs-badge green">Cash/Bank: {formatMoney(summary?.cash_bank_balance)}</span>
          </div>
        </div>
      </div>

    </div>
  );
}
