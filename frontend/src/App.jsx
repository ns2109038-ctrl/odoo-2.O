import { useState, useEffect } from "react";
import "./index.css";

// ── Auth ──────────────────────────────────────────────────────────
import { getStoredAuth, clearAuth } from "./lib/auth.js";
import LoginPage    from "./pages/LoginPage.jsx";
import SignupPage   from "./pages/SignupPage.jsx";

// ── Authenticated pages ───────────────────────────────────────────
import Contacts       from "./pages/Contacts.jsx";
import Products       from "./pages/Products.jsx";
import Accounts       from "./pages/Accounts.jsx";
import Journals       from "./pages/Journals.jsx";
import JournalEntries from "./pages/JournalEntries.jsx";
import Sales          from "./pages/Sales.jsx";
import Purchases      from "./pages/Purchases.jsx";
import Budget         from "./pages/Budget.jsx";
import BudgetReport   from "./pages/BudgetReport.jsx";
import CreateUserPage from "./pages/CreateUserPage.jsx";
import Dashboard      from "./pages/Dashboard.jsx";

// ─────────────────────────────────────────────────────────────────
function App() {
  // Auth view: "login" | "signup"
  const [authView, setAuthView] = useState("login");

  // Authenticated user state — initialized from sessionStorage
  const [authUser, setAuthUser] = useState(() => getStoredAuth());

  // Current page inside main app
  const [activePage, setActivePage] = useState("Dashboard");

  // ── Auth Expired Listener ────────────────────────────────────────
  useEffect(() => {
    const handleAuthExpired = () => {
      handleLogout();
    };
    window.addEventListener("uf:auth-expired", handleAuthExpired);
    return () => window.removeEventListener("uf:auth-expired", handleAuthExpired);
  }, []);

  // ── Logout ───────────────────────────────────────────────────────
  const handleLogout = () => {
    clearAuth();
    setAuthUser(null);
    setAuthView("login");
  };

  // ── Auth gate ────────────────────────────────────────────────────
  if (!authUser) {
    if (authView === "signup") {
      return (
        <SignupPage
          onGoLogin={() => setAuthView("login")}
        />
      );
    }
    return (
      <LoginPage
        onGoSignup={() => setAuthView("signup")}
        onLoginSuccess={(user) => {
          setAuthUser(user);
          setActivePage("Dashboard");
        }}
      />
    );
  }

  // ── Sidebar nav config ───────────────────────────────────────────
  const masterItems = [
    { name: "Contacts",          icon: "👥" },
    { name: "Products",          icon: "📦" },
    { name: "Chart of Accounts", icon: "📚" },
    { name: "Journals",          icon: "📒" },
    { name: "Journal Entries",   icon: "📖" },
    { name: "Budget",            icon: "💰" },
  ];
  const txnItems = [
    { name: "Sales",     icon: "🛒" },
    { name: "Purchases", icon: "🧾" },
    { name: "Payments",  icon: "💳" },
  ];

  function renderSimplePage() {
    return (
      <div className="module-page">
        <div className="page-header">
          <div>
            <p className="breadcrumb">Home / {activePage}</p>
            <h1>{activePage}</h1>
            <p className="subtitle">Manage your {activePage.toLowerCase()}.</p>
          </div>
          <button className="primary-btn">+ New {activePage}</button>
        </div>
        <div className="empty-card">
          <div className="empty-icon">📋</div>
          <h2>{activePage}</h2>
          <p>This module is ready for the next UI development step.</p>
        </div>
      </div>
    );
  }

  function renderPage() {
    if (activePage === "Dashboard")          return <Dashboard authUser={authUser} onNavigate={setActivePage} />;
    if (activePage === "Contacts")           return <Contacts />;
    if (activePage === "Products")           return <Products />;
    if (activePage === "Chart of Accounts")  return <Accounts />;
    if (activePage === "Journals")           return <Journals />;
    if (activePage === "Journal Entries")   return <JournalEntries />;
    if (activePage === "Budget")             return <Budget />;
    if (activePage === "Sales")              return <Sales initialTab="orders" />;
    if (activePage === "Purchases")          return <Purchases initialTab="orders" />;
    if (activePage === "Payments")           return <Sales initialTab="payments" />;
    if (activePage === "Reports" || activePage === "Analytics") return <BudgetReport />;
    if (activePage === "Create User") {
      return <CreateUserPage authUser={authUser} />;
    }
    return renderSimplePage();
  }

  // ── Topbar avatar initials ─────────────────────────────────────
  const initials = authUser.loginId?.slice(0, 2).toUpperCase() || "??";

  const roleLabelMap = { admin: "Administrator", accountant: "Accountant", contact: "User" };
  const roleLabel = roleLabelMap[authUser.role] || authUser.role;

  // ─────────────────────────────────────────────────────────────────
  return (
    <div className="app-layout">

      {/* ═══════════════ SIDEBAR ═══════════════ */}
      <aside className="sidebar">

        <div className="brand">
          <img
            src="/urban_furniture_logo.png"
            alt="Urban Furniture"
            style={{ height: "44px", width: "auto", backgroundColor: "#fff",
                     borderRadius: "8px", padding: "2px 6px", objectFit: "contain" }}
          />
          <div>
            <h2>Urban Furniture</h2>
            <p>Accounting System</p>
          </div>
        </div>

        {/* MAIN */}
        <p className="menu-title">MAIN</p>
        <div className="menu-list">
          <button
            className={`menu-item ${activePage === "Dashboard" ? "active" : ""}`}
            onClick={() => setActivePage("Dashboard")}
          >
            <span>📊</span> Dashboard
          </button>
        </div>

        {/* MASTERS */}
        <p className="menu-title">MASTERS</p>
        <div className="menu-list">
          {masterItems.map((item) => (
            <button
              key={item.name}
              className={`menu-item ${activePage === item.name ? "active" : ""}`}
              onClick={() => setActivePage(item.name)}
            >
              <span>{item.icon}</span> {item.name}
            </button>
          ))}
        </div>

        {/* TRANSACTIONS */}
        <p className="menu-title">TRANSACTIONS</p>
        <div className="menu-list">
          {txnItems.map((item) => (
            <button
              key={item.name}
              className={`menu-item ${activePage === item.name ? "active" : ""}`}
              onClick={() => setActivePage(item.name)}
            >
              <span>{item.icon}</span> {item.name}
            </button>
          ))}
        </div>

        {/* USER MANAGEMENT — admin only */}
        {authUser.role === "admin" && (
          <>
            <p className="menu-title">USER MANAGEMENT</p>
            <div className="menu-list">
              <button
                className={`menu-item ${activePage === "Create User" ? "active" : ""}`}
                onClick={() => setActivePage("Create User")}
              >
                <span>👤</span> Create User
              </button>
            </div>
          </>
        )}

        {/* REPORTS */}
        <p className="menu-title">REPORTS</p>
        <div className="menu-list">
          <button
            className={`menu-item ${activePage === "Reports" ? "active" : ""}`}
            onClick={() => setActivePage("Reports")}
          >
            <span>📈</span> Reports
          </button>
        </div>

        <div className="sidebar-help">
          <b>Need Help?</b>
          <p>Contact support</p>
        </div>

      </aside>

      {/* ═══════════════ MAIN AREA ═══════════════ */}
      <main className="main-area">

        {/* TOPBAR */}
        <header className="topbar">
          <input className="global-search" placeholder="🔍 Search transactions, contacts..." />
          <div className="topbar-right">
            <span className="notification">🔔</span>
            <div className="user-avatar">{initials}</div>
            <div className="user-info">
              <b>{authUser.loginId}</b>
              <small>{roleLabel}</small>
            </div>
            <button
              className="topbar-logout-btn"
              onClick={handleLogout}
              title="Sign Out"
            >
              Sign Out
            </button>
          </div>
        </header>

        {/* CONTENT */}
        <section className="content-area">
          {renderPage()}
        </section>

      </main>

    </div>
  );
}

export default App;
