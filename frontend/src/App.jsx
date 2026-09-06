import { useState, useEffect } from "react";
import "./index.css";
import {
  LayoutDashboard,
  Users,
  Package,
  BookOpen,
  Book,
  FileText,
  Wallet,
  ShoppingCart,
  Receipt,
  CreditCard,
  UserPlus,
  BarChart3,
  Search,
  Bell,
  LogOut,
  HelpCircle,
  ClipboardList,
  ShieldCheck
} from "lucide-react";

// ── Auth ──────────────────────────────────────────────────────────
import { getStoredAuth, clearAuth } from "./lib/auth.js";
import LoginPage           from "./pages/LoginPage.jsx";
import SignupPage          from "./pages/SignupPage.jsx";
import ForgotPasswordPage  from "./pages/ForgotPasswordPage.jsx";
import ResetPasswordPage   from "./pages/ResetPasswordPage.jsx";
import AccountSecurityModal from "./components/AccountSecurityModal.jsx";
import HelpSupportModal    from "./components/HelpSupportModal.jsx";
import AiChatbot           from "./components/AiChatbot.jsx";
import NotificationPopover from "./components/NotificationPopover.jsx";

// ── Authenticated pages ───────────────────────────────────────────
import Contacts       from "./pages/Contacts.jsx";
import Products       from "./pages/Products.jsx";
import Accounts       from "./pages/Accounts.jsx";
import Journals       from "./pages/Journals.jsx";
import JournalEntries from "./pages/JournalEntries.jsx";
import Sales          from "./pages/Sales.jsx";
import Purchases      from "./pages/Purchases.jsx";
import Payments       from "./pages/Payments.jsx";
import Budget         from "./pages/Budget.jsx";
import BudgetReport   from "./pages/BudgetReport.jsx";
import CreateUserPage from "./pages/CreateUserPage.jsx";
import Dashboard      from "./pages/Dashboard.jsx";

// ─────────────────────────────────────────────────────────────────
function App() {
  // Auth view: "login" | "signup" | "forgot" | "reset"
  // Detect password reset token in URL on mount
  const [resetToken] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("token") || null;
  });
  const [authView, setAuthView] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("token") ? "reset" : "login";
  });

  // Authenticated user state — initialized from sessionStorage
  const [authUser, setAuthUser] = useState(() => getStoredAuth());

  // Current page inside main app
  const [activePage, setActivePage] = useState("Dashboard");
  const [activeSubTab, setActiveSubTab] = useState(null);

  const handleNavigate = (page, subTab = null) => {
    setActivePage(page);
    setActiveSubTab(subTab);
  };

  // Security modal open state
  const [showSecurityModal, setShowSecurityModal] = useState(false);

  // Help & Support modal open state
  const [showHelpModal, setShowHelpModal] = useState(false);

  // ── Notifications State ──────────────────────────────────────────
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([
    {
      id: "notif-1",
      type: "payment",
      title: "UPI Payment Received",
      message: "₹45,000 received from Sharma Interiors via UPI QR (Ref: UPI-982341201).",
      time: "5m ago",
      read: false,
      targetPage: "Payments",
    },
    {
      id: "notif-2",
      type: "invoice",
      title: "Customer Invoice Overdue",
      message: "Invoice #INV-2026-003 for ₹18,500 is due today.",
      time: "25m ago",
      read: false,
      targetPage: "Sales",
    },
    {
      id: "notif-3",
      type: "inventory",
      title: "Low Inventory Alert",
      message: "Teak Wood Executive Desk is down to 3 units in stock.",
      time: "2h ago",
      read: false,
      targetPage: "Products",
    },
    {
      id: "notif-4",
      type: "security",
      title: "Account Security Active",
      message: "Two-Factor Authentication (2FA) is active for administrator session.",
      time: "1d ago",
      read: true,
      targetPage: "Dashboard",
    },
    {
      id: "notif-5",
      type: "budget",
      title: "Budget Threshold Warning",
      message: "Marketing & Operations budget has crossed 80% utilization.",
      time: "1d ago",
      read: true,
      targetPage: "Budget Report",
    },
  ]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleMarkAsRead = (id) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const handleMarkAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const handleClearAllNotifications = () => {
    setNotifications([]);
  };

  const handleDeleteNotification = (id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

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
    if (authView === "reset") {
      return (
        <ResetPasswordPage
          token={resetToken}
          onGoLogin={() => {
            // Clear the ?token= and path from URL and return to root login
            window.history.replaceState({}, "", "/");
            setAuthView("login");
          }}
        />
      );
    }
    if (authView === "forgot") {
      return (
        <ForgotPasswordPage
          onGoLogin={() => setAuthView("login")}
        />
      );
    }
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
        onGoForgotPassword={() => setAuthView("forgot")}
        onLoginSuccess={(user) => {
          setAuthUser(user);
          setActivePage("Dashboard");
        }}
      />
    );
  }

  // ── Sidebar nav config ───────────────────────────────────────────
  const masterItems = [
    { name: "Contacts",          icon: Users },
    { name: "Products",          icon: Package },
    { name: "Chart of Accounts", icon: BookOpen },
    { name: "Journals",          icon: Book },
    { name: "Journal Entries",   icon: FileText },
    { name: "Budget",            icon: Wallet },
  ];
  const txnItems = [
    { name: "Sales",     icon: ShoppingCart },
    { name: "Purchases", icon: Receipt },
    { name: "Payments",  icon: CreditCard },
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
          <div className="empty-icon"><ClipboardList size={36} /></div>
          <h2>{activePage}</h2>
          <p>This module is ready for the next UI development step.</p>
        </div>
      </div>
    );
  }

  function renderPage() {
    if (activePage === "Dashboard")          return <Dashboard authUser={authUser} onNavigate={handleNavigate} />;
    if (activePage === "Contacts")           return <Contacts onNavigate={handleNavigate} />;
    if (activePage === "Products")           return <Products onNavigate={handleNavigate} />;
    if (activePage === "Chart of Accounts")  return <Accounts onNavigate={handleNavigate} />;
    if (activePage === "Journals")           return <Journals onNavigate={handleNavigate} />;
    if (activePage === "Journal Entries")   return <JournalEntries />;
    if (activePage === "Budget")             return <Budget />;
    if (activePage === "Sales")              return <Sales initialTab={activeSubTab || "orders"} />;
    if (activePage === "Purchases")          return <Purchases initialTab={activeSubTab || "orders"} />;
    if (activePage === "Payments")           return <Payments />;
    if (activePage === "Reports" || activePage === "Analytics") return <BudgetReport initialReportType={activeSubTab || "budget"} authUser={authUser} />;
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
            <span className="menu-icon"><LayoutDashboard size={17} /></span> Dashboard
          </button>
        </div>

        {/* MASTERS */}
        <p className="menu-title">MASTERS</p>
        <div className="menu-list">
          {masterItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.name}
                className={`menu-item ${activePage === item.name ? "active" : ""}`}
                onClick={() => setActivePage(item.name)}
              >
                <span className="menu-icon"><Icon size={17} /></span> {item.name}
              </button>
            );
          })}
        </div>

        {/* TRANSACTIONS */}
        <p className="menu-title">TRANSACTIONS</p>
        <div className="menu-list">
          {txnItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.name}
                className={`menu-item ${activePage === item.name ? "active" : ""}`}
                onClick={() => setActivePage(item.name)}
              >
                <span className="menu-icon"><Icon size={17} /></span> {item.name}
              </button>
            );
          })}
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
                <span className="menu-icon"><UserPlus size={17} /></span> Create User
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
            <span className="menu-icon"><BarChart3 size={17} /></span> Reports
          </button>
        </div>

        <div
          className="sidebar-help"
          onClick={() => setShowHelpModal(true)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setShowHelpModal(true); }}
          title="Click to get support, open a ticket, or view system status"
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <HelpCircle size={15} style={{ color: "#48acf0" }} />
              <b>Need Help?</b>
            </div>
            <span style={{ fontSize: "10px", background: "rgba(72,172,240,0.15)", color: "#48acf0", padding: "1px 6px", borderRadius: "10px", fontWeight: 600 }}>24/7</span>
          </div>
          <p>Contact system support & docs &rarr;</p>
        </div>

      </aside>

      {/* ═══════════════ MAIN AREA ═══════════════ */}
      <main className="main-area">

        {/* TOPBAR */}
        <header className="topbar">
          <div className="topbar-search-wrap">
            <Search size={16} className="search-icon" />
            <input className="global-search" placeholder="Search transactions, contacts, journals..." />
          </div>
          <div className="topbar-right">
            <button
              className="topbar-icon-btn"
              title="Account Security & 2FA Settings"
              onClick={() => setShowSecurityModal(true)}
            >
              <ShieldCheck size={18} style={{ color: "#48acf0" }} />
            </button>
            <div style={{ position: "relative" }}>
              <button
                className="topbar-icon-btn"
                title="Notifications"
                onClick={() => setShowNotifications((prev) => !prev)}
                aria-label="View notifications"
              >
                <Bell size={18} />
                {unreadCount > 0 && <span className="dot-badge" />}
              </button>

              <NotificationPopover
                isOpen={showNotifications}
                onClose={() => setShowNotifications(false)}
                notifications={notifications}
                onMarkAsRead={handleMarkAsRead}
                onMarkAllAsRead={handleMarkAllAsRead}
                onClearAll={handleClearAllNotifications}
                onDeleteNotification={handleDeleteNotification}
                onNavigate={(page) => setActivePage(page)}
              />
            </div>

            <div
              className="user-profile-trigger"
              onClick={() => setShowSecurityModal(true)}
              title="Click to manage profile, 2FA & security settings"
              style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", padding: "4px 8px", borderRadius: "8px", transition: "background 0.2s" }}
            >
              <div className="user-avatar">{initials}</div>
              <div className="user-info">
                <b>{authUser.loginId}</b>
                <small style={{ color: "#48acf0" }}>{roleLabel} • 2FA 🛡️</small>
              </div>
            </div>

            <button
              className="topbar-logout-btn"
              onClick={handleLogout}
              title="Sign Out"
            >
              <LogOut size={15} /> Sign Out
            </button>
          </div>
        </header>

        {/* CONTENT */}
        <section className="content-area">
          {renderPage()}
        </section>

      </main>

      {/* ═══════════════ USER PROFILE & 2FA ACCOUNT SECURITY MODAL ═══════════════ */}
      {showSecurityModal && (
        <AccountSecurityModal
          authUser={authUser}
          onClose={() => setShowSecurityModal(false)}
          onUpdateUser={(updated) => {
            setAuthUser((prev) => ({ ...prev, ...updated }));
          }}
        />
      )}

      {/* ═══════════════ HELP & SUPPORT / SYSTEM STATUS MODAL ═══════════════ */}
      {showHelpModal && (
        <HelpSupportModal
          authUser={authUser}
          onClose={() => setShowHelpModal(false)}
        />
      )}

      {/* ═══════════════ AI COPILOT CHATBOT ═══════════════ */}
      <AiChatbot
        activePage={activePage}
        setActivePage={setActivePage}
        authUser={authUser}
      />

    </div>
  );
}

export default App;
