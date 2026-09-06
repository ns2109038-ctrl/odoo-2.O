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
  BarChart2,
  Package,
  Layers,
  FileSpreadsheet,
  CheckCircle2,
  Clock,
  ExternalLink
} from "lucide-react";

// ── Navigation mega-menu config matching exact wireframe columns ──────────────
const NAV_COLUMNS = [
  {
    key: "Sales",
    items: [
      { label: "Sales order",   page: "Sales", subTab: "orders" },
      { label: "Sale Invoice",  page: "Sales", subTab: "invoices" },
      { label: "Receipt",       page: "Payments", subTab: "payments" },
    ],
  },
  {
    key: "Purchase",
    items: [
      { label: "Purchase Order", page: "Purchases", subTab: "orders" },
      { label: "Purchase Bill",  page: "Purchases", subTab: "bills" },
      { label: "Payment",        page: "Payments", subTab: "payments" },
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
      { label: "Balancesheet",    page: "Reports", subTab: "balance-sheet" },
      { label: "Profit and Loss", page: "Reports", subTab: "profit-loss" },
      { label: "Budget Report",   page: "Reports", subTab: "budget" },
    ],
  },
];

export default function Dashboard({ authUser, onNavigate }) {
  const [openMegaMenu, setOpenMegaMenu] = useState(false);
  const [activeNavTab, setActiveNavTab] = useState(null);
  const [summary, setSummary] = useState(null);
  const [recentTxns, setRecentTxns] = useState(null);
  const [loading, setLoading] = useState(true);
  const menuRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpenMegaMenu(false);
        setActiveNavTab(null);
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

  const handleTabClick = (tabKey) => {
    if (activeNavTab === tabKey && openMegaMenu) {
      setOpenMegaMenu(false);
      setActiveNavTab(null);
    } else {
      setActiveNavTab(tabKey);
      setOpenMegaMenu(true);
    }
  };

  const handleNavItem = (page, subTab = null) => {
    setOpenMegaMenu(false);
    setActiveNavTab(null);
    if (onNavigate) onNavigate(page, subTab);
  };

  const greetingHour = new Date().getHours();
  const greeting = greetingHour < 12 ? "Good Morning" : greetingHour < 17 ? "Good Afternoon" : "Good Evening";

  const formatMoney = (val) => `₹${Number(val || 0).toLocaleString("en-IN")}`;

  return (
    <div className="dash-page">

      {/* ── 1. Hero Page Header Banner ───────────────────────────────────────── */}
      <div
        style={{
          background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
          borderRadius: "16px",
          padding: "22px 28px",
          color: "#ffffff",
          marginBottom: "20px",
          boxShadow: "0 8px 24px rgba(0, 0, 0, 0.15)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "16px",
          border: "1px solid rgba(255, 255, 255, 0.08)",
        }}
      >
        <div>
          <p style={{ margin: "0 0 4px 0", fontSize: "11px", color: "#38bdf8", textTransform: "uppercase", letterSpacing: "1px", fontWeight: "700" }}>
            Urban Furniture Accounting ERP
          </p>
          <h1 style={{ margin: 0, fontSize: "24px", fontWeight: "800", letterSpacing: "-0.5px", color: "#ffffff" }}>
            {greeting}, {authUser?.loginId || "Administrator"}
          </h1>
          <p style={{ margin: "4px 0 0 0", fontSize: "13px", color: "#94a3b8" }}>
            App Dashboard — Live transactions, ledger metrics &amp; operational order pipeline.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div
            style={{
              background: "rgba(255, 255, 255, 0.08)",
              padding: "8px 14px",
              borderRadius: "10px",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <Calendar size={16} style={{ color: "#38bdf8" }} />
            <div>
              <span style={{ fontSize: "10px", color: "#94a3b8", display: "block", lineHeight: "1" }}>System Date</span>
              <span style={{ fontSize: "13px", fontWeight: "700", color: "#ffffff" }}>
                {new Date().toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}
              </span>
            </div>
          </div>

          <button
            onClick={() => handleNavItem("Sales", "orders")}
            style={{
              background: "linear-gradient(135deg, #0284c7, #2563eb)",
              color: "#ffffff",
              border: "none",
              padding: "10px 18px",
              borderRadius: "10px",
              fontSize: "13px",
              fontWeight: "700",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              boxShadow: "0 4px 14px rgba(2, 132, 199, 0.4)",
              transition: "transform 0.15s ease",
            }}
          >
            <Plus size={16} /> Quick Sale
          </button>
        </div>
      </div>

      {/* ── 2. Top Navigation Bar ("Sales | Purchase | Account | Report" with "Open on click") ── */}
      <div className="dash-nav-bar" ref={menuRef} style={{ marginBottom: "22px", position: "relative" }}>
        <div
          className="dash-tabs"
          style={{
            display: "flex",
            alignItems: "center",
            background: "#ffffff",
            borderRadius: "12px",
            padding: "6px 10px",
            border: "1px solid #e2e8f0",
            boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
            gap: "8px",
          }}
        >
          {NAV_COLUMNS.map((col) => {
            const isActive = activeNavTab === col.key && openMegaMenu;
            return (
              <button
                key={col.key}
                className={`dash-tab-btn ${isActive ? "dash-tab-active" : ""}`}
                onClick={() => handleTabClick(col.key)}
                style={{
                  padding: "10px 20px",
                  borderRadius: "8px",
                  border: "none",
                  background: isActive ? "#0284c7" : "transparent",
                  color: isActive ? "#ffffff" : "#334155",
                  fontWeight: 700,
                  fontSize: "14px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  transition: "all 0.15s ease",
                }}
              >
                <span>{col.key}</span>
                <ChevronDown
                  size={14}
                  style={{
                    transform: isActive ? "rotate(180deg)" : "rotate(0deg)",
                    transition: "transform 0.2s",
                    color: isActive ? "#ffffff" : "#64748b",
                  }}
                />
              </button>
            );
          })}

          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "6px", color: "#94a3b8", fontSize: "12px", paddingRight: "10px" }}>
            <span>Click to explore modules</span>
            <ArrowRight size={13} />
          </div>
        </div>

        {/* ── 4-Column Mega Menu ("Open on click" - exactly matches wireframe right column) ── */}
        {openMegaMenu && (
          <div
            className="dash-mega-menu"
            style={{
              position: "absolute",
              top: "calc(100% + 8px)",
              left: 0,
              right: 0,
              background: "#0f172a",
              borderRadius: "16px",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1)",
              zIndex: 1000,
              padding: "24px 28px",
              animation: "dropdownFadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                gap: "24px",
              }}
            >
              {NAV_COLUMNS.map((col) => (
                <div
                  key={col.key}
                  style={{
                    borderRight: col.key !== "Report" ? "1px solid rgba(255, 255, 255, 0.1)" : "none",
                    paddingRight: "16px",
                  }}
                >
                  <p
                    style={{
                      margin: "0 0 12px 0",
                      fontSize: "14px",
                      fontWeight: 800,
                      color: activeNavTab === col.key ? "#38bdf8" : "#f8fafc",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    {col.key}
                  </p>

                  <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    {col.items.map((item) => (
                      <button
                        key={item.label}
                        onClick={() => handleNavItem(item.page, item.subTab)}
                        style={{
                          textAlign: "left",
                          background: "transparent",
                          border: "none",
                          color: "#94a3b8",
                          padding: "8px 10px",
                          borderRadius: "6px",
                          fontSize: "13px",
                          fontWeight: 500,
                          cursor: "pointer",
                          transition: "all 0.15s ease",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.color = "#ffffff";
                          e.currentTarget.style.background = "rgba(255, 255, 255, 0.08)";
                          e.currentTarget.style.paddingLeft = "14px";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.color = "#94a3b8";
                          e.currentTarget.style.background = "transparent";
                          e.currentTarget.style.paddingLeft = "10px";
                        }}
                      >
                        <span>{item.label}</span>
                        <ExternalLink size={12} style={{ opacity: 0.5 }} />
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── 3. App Dashboard Cards (Exact layout and order from left-hand wireframe) ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: "20px", marginBottom: "28px" }}>

        {/* ── CARD 1: SALES ── */}
        <div
          style={{
            background: "#ffffff",
            borderRadius: "16px",
            border: "1px solid #e2e8f0",
            boxShadow: "0 4px 16px rgba(0, 0, 0, 0.04)",
            padding: "24px",
            display: "flex",
            flexDirection: "column",
            gap: "18px",
          }}
        >
          {/* Header with Title and "New" button */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h2 style={{ margin: 0, fontSize: "20px", fontWeight: 800, color: "#0f172a", display: "flex", alignItems: "center", gap: "8px" }}>
                <ShoppingCart size={22} style={{ color: "#0284c7" }} /> Sales
              </h2>
              <p style={{ margin: "3px 0 0", fontSize: "12.5px", color: "#64748b" }}>
                Customer sales orders, invoices and receivable receipts
              </p>
            </div>

            <button
              onClick={() => handleNavItem("Sales", "orders")}
              style={{
                background: "linear-gradient(135deg, #0284c7, #2563eb)",
                color: "#ffffff",
                border: "none",
                padding: "8px 24px",
                borderRadius: "8px",
                fontWeight: 700,
                fontSize: "13px",
                cursor: "pointer",
                boxShadow: "0 2px 8px rgba(2, 132, 199, 0.35)",
              }}
            >
              New
            </button>
          </div>

          {/* 3 Metric Pills: All | Confirmed | Draft */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: "16px",
            }}
          >
            {/* All */}
            <button
              onClick={() => handleNavItem("Sales", "orders")}
              style={{
                background: "#f8fafc",
                border: "1.5px solid #cbd5e1",
                borderRadius: "12px",
                padding: "16px 20px",
                cursor: "pointer",
                textAlign: "center",
                transition: "all 0.15s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "#0284c7";
                e.currentTarget.style.background = "#f0f9ff";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "#cbd5e1";
                e.currentTarget.style.background = "#f8fafc";
              }}
            >
              <span style={{ fontSize: "13px", fontWeight: 700, color: "#475569", display: "block", marginBottom: "4px" }}>
                All
              </span>
              <span style={{ fontSize: "26px", fontWeight: 800, color: "#0f172a", display: "block" }}>
                {summary?.sales_all_count || 12}
              </span>
              <span style={{ fontSize: "11px", color: "#0284c7", fontWeight: 600 }}>Total Orders</span>
            </button>

            {/* Confirmed */}
            <button
              onClick={() => handleNavItem("Sales", "orders")}
              style={{
                background: "#f8fafc",
                border: "1.5px solid #cbd5e1",
                borderRadius: "12px",
                padding: "16px 20px",
                cursor: "pointer",
                textAlign: "center",
                transition: "all 0.15s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "#22c55e";
                e.currentTarget.style.background = "#f0fdf4";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "#cbd5e1";
                e.currentTarget.style.background = "#f8fafc";
              }}
            >
              <span style={{ fontSize: "13px", fontWeight: 700, color: "#475569", display: "block", marginBottom: "4px" }}>
                Confirmed
              </span>
              <span style={{ fontSize: "26px", fontWeight: 800, color: "#16a34a", display: "block" }}>
                {summary?.sales_confirmed_count || 10}
              </span>
              <span style={{ fontSize: "11px", color: "#16a34a", fontWeight: 600 }}>Active / Posted</span>
            </button>

            {/* Draft */}
            <button
              onClick={() => handleNavItem("Sales", "orders")}
              style={{
                background: "#f8fafc",
                border: "1.5px solid #cbd5e1",
                borderRadius: "12px",
                padding: "16px 20px",
                cursor: "pointer",
                textAlign: "center",
                transition: "all 0.15s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "#f59e0b";
                e.currentTarget.style.background = "#fffbeb";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "#cbd5e1";
                e.currentTarget.style.background = "#f8fafc";
              }}
            >
              <span style={{ fontSize: "13px", fontWeight: 700, color: "#475569", display: "block", marginBottom: "4px" }}>
                Draft
              </span>
              <span style={{ fontSize: "26px", fontWeight: 800, color: "#d97706", display: "block" }}>
                {summary?.sales_draft_count || 2}
              </span>
              <span style={{ fontSize: "11px", color: "#d97706", fontWeight: 600 }}>Awaiting Confirmation</span>
            </button>
          </div>
        </div>

        {/* ── CARD 2: PURCHASE ── */}
        <div
          style={{
            background: "#ffffff",
            borderRadius: "16px",
            border: "1px solid #e2e8f0",
            boxShadow: "0 4px 16px rgba(0, 0, 0, 0.04)",
            padding: "24px",
            display: "flex",
            flexDirection: "column",
            gap: "18px",
          }}
        >
          {/* Header with Title and "New" button */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h2 style={{ margin: 0, fontSize: "20px", fontWeight: 800, color: "#0f172a", display: "flex", alignItems: "center", gap: "8px" }}>
                <Receipt size={22} style={{ color: "#7c3aed" }} /> Purchase
              </h2>
              <p style={{ margin: "3px 0 0", fontSize: "12.5px", color: "#64748b" }}>
                Vendor purchase orders, bills and supplier disbursements
              </p>
            </div>

            <button
              onClick={() => handleNavItem("Purchases", "orders")}
              style={{
                background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
                color: "#ffffff",
                border: "none",
                padding: "8px 24px",
                borderRadius: "8px",
                fontWeight: 700,
                fontSize: "13px",
                cursor: "pointer",
                boxShadow: "0 2px 8px rgba(124, 58, 237, 0.35)",
              }}
            >
              New
            </button>
          </div>

          {/* 3 Metric Pills: All | Confirmed | Draft */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: "16px",
            }}
          >
            {/* All */}
            <button
              onClick={() => handleNavItem("Purchases", "orders")}
              style={{
                background: "#f8fafc",
                border: "1.5px solid #cbd5e1",
                borderRadius: "12px",
                padding: "16px 20px",
                cursor: "pointer",
                textAlign: "center",
                transition: "all 0.15s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "#7c3aed";
                e.currentTarget.style.background = "#faf5ff";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "#cbd5e1";
                e.currentTarget.style.background = "#f8fafc";
              }}
            >
              <span style={{ fontSize: "13px", fontWeight: 700, color: "#475569", display: "block", marginBottom: "4px" }}>
                All
              </span>
              <span style={{ fontSize: "26px", fontWeight: 800, color: "#0f172a", display: "block" }}>
                {summary?.purchase_all_count || 12}
              </span>
              <span style={{ fontSize: "11px", color: "#7c3aed", fontWeight: 600 }}>Total Purchase Orders</span>
            </button>

            {/* Confirmed */}
            <button
              onClick={() => handleNavItem("Purchases", "orders")}
              style={{
                background: "#f8fafc",
                border: "1.5px solid #cbd5e1",
                borderRadius: "12px",
                padding: "16px 20px",
                cursor: "pointer",
                textAlign: "center",
                transition: "all 0.15s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "#22c55e";
                e.currentTarget.style.background = "#f0fdf4";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "#cbd5e1";
                e.currentTarget.style.background = "#f8fafc";
              }}
            >
              <span style={{ fontSize: "13px", fontWeight: 700, color: "#475569", display: "block", marginBottom: "4px" }}>
                Confirmed
              </span>
              <span style={{ fontSize: "26px", fontWeight: 800, color: "#16a34a", display: "block" }}>
                {summary?.purchase_confirmed_count || 10}
              </span>
              <span style={{ fontSize: "11px", color: "#16a34a", fontWeight: 600 }}>Validated Bills</span>
            </button>

            {/* Draft */}
            <button
              onClick={() => handleNavItem("Purchases", "orders")}
              style={{
                background: "#f8fafc",
                border: "1.5px solid #cbd5e1",
                borderRadius: "12px",
                padding: "16px 20px",
                cursor: "pointer",
                textAlign: "center",
                transition: "all 0.15s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "#f59e0b";
                e.currentTarget.style.background = "#fffbeb";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "#cbd5e1";
                e.currentTarget.style.background = "#f8fafc";
              }}
            >
              <span style={{ fontSize: "13px", fontWeight: 700, color: "#475569", display: "block", marginBottom: "4px" }}>
                Draft
              </span>
              <span style={{ fontSize: "26px", fontWeight: 800, color: "#d97706", display: "block" }}>
                {summary?.purchase_draft_count || 2}
              </span>
              <span style={{ fontSize: "11px", color: "#d97706", fontWeight: 600 }}>Pending POs</span>
            </button>
          </div>
        </div>

        {/* ── CARD 3: BUDGET REPORTS ── */}
        <div
          style={{
            background: "#ffffff",
            borderRadius: "16px",
            border: "1px solid #e2e8f0",
            boxShadow: "0 4px 16px rgba(0, 0, 0, 0.04)",
            padding: "24px",
            display: "flex",
            flexDirection: "column",
            gap: "18px",
          }}
        >
          {/* Header with Title and "Report" button */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h2 style={{ margin: 0, fontSize: "20px", fontWeight: 800, color: "#0f172a", display: "flex", alignItems: "center", gap: "8px" }}>
                <Wallet size={22} style={{ color: "#d97706" }} /> Budget Reports
              </h2>
              <p style={{ margin: "3px 0 0", fontSize: "12.5px", color: "#64748b" }}>
                Analytic department allocations, planned targets and variance tracking
              </p>
            </div>

            <button
              onClick={() => handleNavItem("Reports", "budget")}
              style={{
                background: "linear-gradient(135deg, #d97706, #b45309)",
                color: "#ffffff",
                border: "none",
                padding: "8px 24px",
                borderRadius: "8px",
                fontWeight: 700,
                fontSize: "13px",
                cursor: "pointer",
                boxShadow: "0 2px 8px rgba(217, 119, 6, 0.35)",
              }}
            >
              Report
            </button>
          </div>

          {/* 3 Metric Pills: Achieved | Budget | Committed */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: "16px",
            }}
          >
            {/* Achieved */}
            <button
              onClick={() => handleNavItem("Reports", "budget")}
              style={{
                background: "#f8fafc",
                border: "1.5px solid #cbd5e1",
                borderRadius: "12px",
                padding: "16px 20px",
                cursor: "pointer",
                textAlign: "center",
                transition: "all 0.15s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "#16a34a";
                e.currentTarget.style.background = "#f0fdf4";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "#cbd5e1";
                e.currentTarget.style.background = "#f8fafc";
              }}
            >
              <span style={{ fontSize: "13px", fontWeight: 700, color: "#475569", display: "block", marginBottom: "4px" }}>
                Achieved
              </span>
              <span style={{ fontSize: "26px", fontWeight: 800, color: "#16a34a", display: "block" }}>
                {summary?.budget_achieved_count || 3}
              </span>
              <span style={{ fontSize: "11px", color: "#16a34a", fontWeight: 600 }}>Active &amp; Target Met</span>
            </button>

            {/* Budget */}
            <button
              onClick={() => handleNavItem("Reports", "budget")}
              style={{
                background: "#f8fafc",
                border: "1.5px solid #cbd5e1",
                borderRadius: "12px",
                padding: "16px 20px",
                cursor: "pointer",
                textAlign: "center",
                transition: "all 0.15s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "#0284c7";
                e.currentTarget.style.background = "#f0f9ff";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "#cbd5e1";
                e.currentTarget.style.background = "#f8fafc";
              }}
            >
              <span style={{ fontSize: "13px", fontWeight: 700, color: "#475569", display: "block", marginBottom: "4px" }}>
                Budget
              </span>
              <span style={{ fontSize: "26px", fontWeight: 800, color: "#0284c7", display: "block" }}>
                {summary?.budget_total_count || 2}
              </span>
              <span style={{ fontSize: "11px", color: "#0284c7", fontWeight: 600 }}>Planned Budgets</span>
            </button>

            {/* Committed */}
            <button
              onClick={() => handleNavItem("Reports", "budget")}
              style={{
                background: "#f8fafc",
                border: "1.5px solid #cbd5e1",
                borderRadius: "12px",
                padding: "16px 20px",
                cursor: "pointer",
                textAlign: "center",
                transition: "all 0.15s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "#ec4899";
                e.currentTarget.style.background = "#fdf2f8";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "#cbd5e1";
                e.currentTarget.style.background = "#f8fafc";
              }}
            >
              <span style={{ fontSize: "13px", fontWeight: 700, color: "#475569", display: "block", marginBottom: "4px" }}>
                Committed
              </span>
              <span style={{ fontSize: "26px", fontWeight: 800, color: "#db2777", display: "block" }}>
                {summary?.budget_committed_count || 4}
              </span>
              <span style={{ fontSize: "11px", color: "#db2777", fontWeight: 600 }}>Analytic Accounts</span>
            </button>
          </div>
        </div>

      </div>

      {/* ── 4. Financial Health & Liquidity Overview Strip ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "16px",
        }}
      >
        <div
          style={{
            background: "#ffffff",
            padding: "16px 18px",
            borderRadius: "12px",
            border: "1px solid #e2e8f0",
            display: "flex",
            alignItems: "center",
            gap: "14px",
          }}
        >
          <div style={{ width: "42px", height: "42px", borderRadius: "10px", background: "#f0f9ff", color: "#0284c7", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <TrendingUp size={20} />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: "11px", color: "#64748b", fontWeight: 600 }}>Total Revenue</p>
            <b style={{ fontSize: "16px", color: "#0f172a" }}>{formatMoney(summary?.total_sales)}</b>
          </div>
        </div>

        <div
          style={{
            background: "#ffffff",
            padding: "16px 18px",
            borderRadius: "12px",
            border: "1px solid #e2e8f0",
            display: "flex",
            alignItems: "center",
            gap: "14px",
          }}
        >
          <div style={{ width: "42px", height: "42px", borderRadius: "10px", background: "#faf5ff", color: "#7c3aed", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Receipt size={20} />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: "11px", color: "#64748b", fontWeight: 600 }}>Total Purchases</p>
            <b style={{ fontSize: "16px", color: "#0f172a" }}>{formatMoney(summary?.total_purchases)}</b>
          </div>
        </div>

        <div
          style={{
            background: "#ffffff",
            padding: "16px 18px",
            borderRadius: "12px",
            border: "1px solid #e2e8f0",
            display: "flex",
            alignItems: "center",
            gap: "14px",
          }}
        >
          <div style={{ width: "42px", height: "42px", borderRadius: "10px", background: "#f0fdf4", color: "#16a34a", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <PieChart size={20} />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: "11px", color: "#64748b", fontWeight: 600 }}>Operating Profit</p>
            <b style={{ fontSize: "16px", color: "#16a34a" }}>{formatMoney(summary?.net_profit)}</b>
          </div>
        </div>

        <div
          style={{
            background: "#ffffff",
            padding: "16px 18px",
            borderRadius: "12px",
            border: "1px solid #e2e8f0",
            display: "flex",
            alignItems: "center",
            gap: "14px",
          }}
        >
          <div style={{ width: "42px", height: "42px", borderRadius: "10px", background: "#fdf2f8", color: "#db2777", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Wallet size={20} />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: "11px", color: "#64748b", fontWeight: 600 }}>Cash &amp; Bank Liquidity</p>
            <b style={{ fontSize: "16px", color: "#0f172a" }}>{formatMoney(summary?.cash_bank_balance)}</b>
          </div>
        </div>
      </div>

    </div>
  );
}
