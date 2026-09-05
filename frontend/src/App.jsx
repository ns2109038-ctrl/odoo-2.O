import { useState } from "react";
import "./index.css";

// ── Auth ──────────────────────────────────────────────────────────
import { getStoredAuth, clearAuth } from "./lib/auth.js";
import LoginPage    from "./pages/LoginPage.jsx";
import SignupPage   from "./pages/SignupPage.jsx";

// ── Authenticated pages ───────────────────────────────────────────
import Contacts       from "./pages/Contacts.jsx";
import Products       from "./pages/Products.jsx";
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

  // ── Static account data (placeholder until CoA is live) ──────────
  const accounts = [
    ["Bank A/c",             "Assets"],
    ["Purchase Expense A/c", "Expenses"],
    ["Debtors A/c",          "Assets"],
    ["Creditors A/c",        "Liabilities"],
    ["Sales Income A/c",     "Income"],
    ["Cash A/c",             "Assets"],
    ["Capital A/c",          "Capital"],
  ];

  // ── Sidebar nav config ───────────────────────────────────────────
  const masterItems = [
    { name: "Contacts",          icon: "👥" },
    { name: "Products",          icon: "📦" },
    { name: "Chart of Accounts", icon: "📚" },
    { name: "Budget",            icon: "💰" },
    { name: "Journals",          icon: "📒" },
  ];
  const txnItems = [
    { name: "Sales",     icon: "🛒" },
    { name: "Purchases", icon: "🧾" },
    { name: "Payments",  icon: "💳" },
  ];

  // ── Page renderers ───────────────────────────────────────────────
  function renderDashboard() {
    return (
      <>
        <div className="page-header">
          <div>
            <p className="breadcrumb">Home / Dashboard</p>
            <h1>Dashboard</h1>
            <p className="subtitle">
              Welcome back, <strong>{authUser.loginId}</strong>! Here's what's happening with your business.
            </p>
          </div>
        </div>

        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon blue">₹</div>
            <p>Total Sales</p>
            <h2>₹2,45,000</h2>
            <span className="positive">↑ 12.5% this month</span>
          </div>
          <div className="stat-card">
            <div className="stat-icon orange">🛒</div>
            <p>Total Purchases</p>
            <h2>₹1,28,500</h2>
            <span className="negative">↓ 8.2% this month</span>
          </div>
          <div className="stat-card">
            <div className="stat-icon green">↑</div>
            <p>Receivables</p>
            <h2>₹58,000</h2>
            <span className="positive">↑ 7.8% this month</span>
          </div>
          <div className="stat-card">
            <div className="stat-icon purple">📈</div>
            <p>Net Profit</p>
            <h2>₹43,000</h2>
            <span className="positive">↑ 15.3% this month</span>
          </div>
        </div>

        <div className="dashboard-bottom">
          <div className="panel">
            <h3>Recent Transactions</h3>
            <div className="transaction-row">
              <div><b>Sale Order #S0001</b><p>Raj Furniture</p></div>
              <span>₹25,000</span>
              <strong className="success">Posted</strong>
            </div>
            <div className="transaction-row">
              <div><b>Purchase #P0001</b><p>Wood Suppliers</p></div>
              <span>₹18,500</span>
              <strong className="pending">Draft</strong>
            </div>
            <div className="transaction-row">
              <div><b>Sale Order #S0002</b><p>Modern Home</p></div>
              <span>₹12,000</span>
              <strong className="success">Posted</strong>
            </div>
          </div>
          <div className="panel">
            <h3>Quick Summary</h3>
            <div className="summary-item"><span>Sales Orders</span><b>12</b></div>
            <div className="summary-item"><span>Purchase Orders</span><b>08</b></div>
            <div className="summary-item"><span>Pending Payments</span><b>05</b></div>
          </div>
        </div>
      </>
    );
  }

  function renderChartOfAccounts() {
    return (
      <div className="module-page">
        <div className="page-header">
          <div>
            <p className="breadcrumb">Home / Chart of Accounts</p>
            <h1>Chart of Accounts</h1>
            <p className="subtitle">Manage your accounting accounts</p>
          </div>
          <button className="primary-btn">+ New Account</button>
        </div>
        <div className="table-card">
          <div className="table-top">
            <input placeholder="Search accounts..." />
            <span className="count-badge">{accounts.length} Accounts</span>
          </div>
          <div className="responsive-table">
            <table>
              <thead>
                <tr><th>Account Name</th><th>Account Type</th><th>Action</th></tr>
              </thead>
              <tbody>
                {accounts.map((a, i) => (
                  <tr key={i}>
                    <td><b>{a[0]}</b></td>
                    <td>{a[1]}</td>
                    <td>
                      <button className="small-btn">View</button>
                      <button className="small-btn">Edit</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

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
    if (activePage === "Chart of Accounts")  return renderChartOfAccounts();
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
