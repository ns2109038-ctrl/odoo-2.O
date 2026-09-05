import { useState } from "react";
import {
  LayoutDashboard,
  Users,
  Package,
  Landmark,
  WalletCards,
  BookOpen,
  FileText,
  ShoppingCart,
  Receipt,
  CreditCard,
  BarChart3,
  Settings,
  Menu,
  Search,
  Bell,
  LogOut,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  IndianRupee,
  CheckCircle2,
} from "lucide-react";

import Contacts from "./pages/Contacts";
import Products from "./pages/Products";
import Accounts from "./pages/Accounts";
import Budget from "./pages/Budget";
import BudgetReport from "./pages/BudgetReport";
import JournalEntries from "./pages/JournalEntries";
import Login from "./pages/Login";
import Register from "./pages/Register";

import "./App.css";

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(
    localStorage.getItem("urbanFinanceLoggedIn") === "true"
  );

  const [authPage, setAuthPage] = useState("login");

  const [activePage, setActivePage] = useState("Dashboard");

  const [sidebarOpen, setSidebarOpen] = useState(true);

  const registeredUser = JSON.parse(
    localStorage.getItem("urbanFinanceUser") || "null"
  );

  const userName = registeredUser?.name || "Admin User";
  const userRole = registeredUser?.role || "Administrator";

  /* =====================================================
     LOGIN / REGISTER
     ===================================================== */

  if (!isLoggedIn) {
    if (authPage === "register") {
      return (
        <>
          <Register onLogin={() => setAuthPage("login")} />

          <style>{authStyles}</style>
        </>
      );
    }

    return (
      <>
        <Login
          onLogin={() => {
            localStorage.setItem("urbanFinanceLoggedIn", "true");
            setIsLoggedIn(true);
            setActivePage("Dashboard");
          }}
          onRegister={() => setAuthPage("register")}
        />

        <style>{authStyles}</style>
      </>
    );
  }

  /* =====================================================
     LOGOUT
     ===================================================== */

  const handleLogout = () => {
    localStorage.removeItem("urbanFinanceLoggedIn");

    setIsLoggedIn(false);
    setAuthPage("login");
    setActivePage("Dashboard");
  };

  /* =====================================================
     MENU
     ===================================================== */

  const menuSections = [
    {
      title: "MAIN",
      items: [
        {
          name: "Dashboard",
          icon: LayoutDashboard,
        },
      ],
    },
    {
      title: "MASTERS",
      items: [
        {
          name: "Contacts",
          icon: Users,
        },
        {
          name: "Products",
          icon: Package,
        },
        {
          name: "Chart of Accounts",
          icon: Landmark,
        },
        {
          name: "Budget",
          icon: WalletCards,
        },
        {
          name: "Journals",
          icon: BookOpen,
        },
      ],
    },
    {
      title: "TRANSACTIONS",
      items: [
        {
          name: "Journal Entries",
          icon: FileText,
        },
        {
          name: "Sales",
          icon: ShoppingCart,
        },
        {
          name: "Purchases",
          icon: Receipt,
        },
        {
          name: "Payments",
          icon: CreditCard,
        },
      ],
    },
    {
      title: "REPORTS",
      items: [
        {
          name: "Budget Report",
          icon: BarChart3,
        },
        {
          name: "Reports",
          icon: BarChart3,
        },
        {
          name: "Settings",
          icon: Settings,
        },
      ],
    },
  ];

  /* =====================================================
     PAGE CONTENT
     ===================================================== */

  const renderPage = () => {
    switch (activePage) {
      case "Contacts":
        return <Contacts />;

      case "Products":
        return <Products />;

      case "Chart of Accounts":
        return <Accounts />;

      case "Budget":
        return <Budget />;

      case "Budget Report":
        return <BudgetReport />;

      case "Journal Entries":
        return <JournalEntries />;

      case "Sales":
        return <ComingSoon title="Sales" />;

      case "Purchases":
        return <ComingSoon title="Purchases" />;

      case "Payments":
        return <ComingSoon title="Payments" />;

      case "Reports":
        return <ComingSoon title="Reports" />;

      case "Settings":
        return <ComingSoon title="Settings" />;

      default:
        return <Dashboard onNavigate={setActivePage} />;
    }
  };

  return (
    <div className="app-layout">
      {/* =================================================
          SIDEBAR
      ================================================= */}

      <aside
        className="sidebar"
        style={{
          width: sidebarOpen ? "250px" : "0px",
          minWidth: sidebarOpen ? "250px" : "0px",
          padding: sidebarOpen ? "22px 14px" : "0px",
        }}
      >
        <div className="logo-section">
          <div className="logo-icon">UF</div>

          <div className="logo-text">
            <h2>Urban Furniture</h2>
            <p>Accounting System</p>
          </div>
        </div>

        <div className="sidebar-menu">
          {menuSections.map((section) => (
            <div className="menu-section" key={section.title}>
              <div className="menu-title">{section.title}</div>

              {section.items.map((item) => {
                const Icon = item.icon;

                return (
                  <button
                    key={item.name}
                    className={
                      activePage === item.name
                        ? "menu-item active"
                        : "menu-item"
                    }
                    onClick={() => setActivePage(item.name)}
                  >
                    <Icon size={18} />

                    <span>{item.name}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        <div className="sidebar-footer">
          <div>Urban Finance</div>
          <div>Version 1.0.0</div>
        </div>
      </aside>

      {/* =================================================
          MAIN AREA
      ================================================= */}

      <main
        className="main-area"
        style={{
          width: sidebarOpen ? "calc(100% - 250px)" : "100%",
          marginLeft: sidebarOpen ? "250px" : "0px",
        }}
      >
        {/* TOPBAR */}

        <header className="topbar">
          <div className="topbar-left">
            <button
              className="menu-toggle"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              <Menu size={20} />
            </button>

            <div className="search-box">
              <Search size={17} />

              <input
                type="text"
                placeholder="Search transactions, contacts..."
              />
            </div>
          </div>

          <div className="topbar-right">
            <button className="notification-btn">
              <Bell size={18} />

              <span className="notification-count">3</span>
            </button>

            <div className="user-profile">
              <div className="user-avatar">
                {userName.charAt(0).toUpperCase()}
              </div>

              <div className="user-info">
                <div className="user-name">{userName}</div>
                <div className="user-role">{userRole}</div>
              </div>
            </div>

            <button
              className="menu-toggle"
              title="Logout"
              onClick={handleLogout}
            >
              <LogOut size={17} />
            </button>
          </div>
        </header>

        {/* PAGE */}

        <div className="page-content">{renderPage()}</div>
      </main>
    </div>
  );
}

/* =========================================================
   DASHBOARD
   ========================================================= */

function Dashboard({ onNavigate }) {
  return (
    <div>
      <div className="dashboard-header">
        <h1>Dashboard</h1>

        <p>Welcome back! Here is what's happening with your business.</p>
      </div>

      {/* STATS */}

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-card-top">
            <div>
              <div className="stat-title">Total Sales</div>

              <div className="stat-value">₹2,45,000</div>

              <div className="stat-change">↑ 12.5% this month</div>
            </div>

            <div className="stat-icon">
              <ArrowUpRight size={20} />
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-top">
            <div>
              <div className="stat-title">Total Purchases</div>

              <div className="stat-value">₹1,28,500</div>

              <div className="stat-change">↑ 8.2% this month</div>
            </div>

            <div className="stat-icon">
              <ArrowDownRight size={20} />
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-top">
            <div>
              <div className="stat-title">Receivables</div>

              <div className="stat-value">₹58,000</div>

              <div className="stat-change">↓ 5.4% pending</div>
            </div>

            <div className="stat-icon">
              <IndianRupee size={20} />
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-top">
            <div>
              <div className="stat-title">Net Profit</div>

              <div className="stat-value">₹43,000</div>

              <div className="stat-change">↑ 15.8% this month</div>
            </div>

            <div className="stat-icon">
              <CheckCircle2 size={20} />
            </div>
          </div>
        </div>
      </div>

      {/* DASHBOARD GRID */}

      <div className="dashboard-grid">
        {/* RECENT TRANSACTIONS */}

        <div className="panel">
          <div className="panel-header">
            <div>
              <h3>Recent Transactions</h3>

              <p>Latest accounting activities</p>
            </div>

            <button
              className="btn btn-secondary"
              onClick={() => onNavigate("Journal Entries")}
            >
              View All
            </button>
          </div>

          <div className="panel-body">
            <Transaction
              icon="S"
              title="Sales Order #SO-001"
              name="ABC Furniture"
              amount="₹45,000"
              status="Paid"
              statusClass="badge-success"
            />

            <Transaction
              icon="P"
              title="Purchase Order #PO-002"
              name="Wood Suppliers Ltd."
              amount="₹32,500"
              status="Pending"
              statusClass="badge-warning"
            />

            <Transaction
              icon="₹"
              title="Customer Payment"
              name="Modern Interiors"
              amount="₹25,000"
              status="Received"
              statusClass="badge-success"
            />

            <Transaction
              icon="E"
              title="Office Expense"
              name="Office Supplies"
              amount="₹8,500"
              status="Paid"
              statusClass="badge-success"
            />
          </div>
        </div>

        {/* QUICK SUMMARY */}

        <div className="panel">
          <div className="panel-header">
            <div>
              <h3>Quick Summary</h3>

              <p>Business overview</p>
            </div>
          </div>

          <div className="panel-body">
            <SummaryRow label="Total Contacts" value="128" />
            <SummaryRow label="Total Products" value="64" />
            <SummaryRow label="Active Journals" value="4" />
            <SummaryRow label="Active Accounts" value="7" />
            <SummaryRow label="Pending Invoices" value="12" />
          </div>
        </div>
      </div>

      {/* QUICK ACTIONS */}

      <div className="panel" style={{ marginTop: "20px" }}>
        <div className="panel-header">
          <div>
            <h3>Quick Actions</h3>

            <p>Create and manage accounting records</p>
          </div>
        </div>

        <div className="panel-body">
          <div className="quick-actions">
            <button
              className="quick-action"
              onClick={() => onNavigate("Contacts")}
            >
              <Plus size={15} /> Add Contact
            </button>

            <button
              className="quick-action"
              onClick={() => onNavigate("Products")}
            >
              <Plus size={15} /> Add Product
            </button>

            <button
              className="quick-action"
              onClick={() => onNavigate("Journal Entries")}
            >
              <Plus size={15} /> Journal Entry
            </button>

            <button
              className="quick-action"
              onClick={() => onNavigate("Budget")}
            >
              <Plus size={15} /> Create Budget
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   TRANSACTION
   ========================================================= */

function Transaction({
  icon,
  title,
  name,
  amount,
  status,
  statusClass,
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "12px",
        padding: "14px 0",
        borderBottom: "1px solid #edf1f5",
      }}
    >
      <div
        style={{
          width: "36px",
          height: "36px",
          minWidth: "36px",
          borderRadius: "10px",
          background: "#edf3ff",
          color: "#3478f6",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: "700",
          fontSize: "12px",
        }}
      >
        {icon}
      </div>

      <div style={{ flex: 1 }}>
        <div
          style={{
            fontSize: "12px",
            fontWeight: "650",
            color: "#172033",
          }}
        >
          {title}
        </div>

        <div
          style={{
            fontSize: "10px",
            color: "#8492a6",
            marginTop: "3px",
          }}
        >
          {name}
        </div>
      </div>

      <div style={{ textAlign: "right" }}>
        <div
          style={{
            fontSize: "12px",
            fontWeight: "700",
            color: "#172033",
          }}
        >
          {amount}
        </div>

        <span className={`badge ${statusClass}`}>{status}</span>
      </div>
    </div>
  );
}

/* =========================================================
   SUMMARY ROW
   ========================================================= */

function SummaryRow({ label, value }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "14px 0",
        borderBottom: "1px solid #edf1f5",
      }}
    >
      <span
        style={{
          fontSize: "11px",
          color: "#71819a",
        }}
      >
        {label}
      </span>

      <strong
        style={{
          fontSize: "13px",
          color: "#172033",
        }}
      >
        {value}
      </strong>
    </div>
  );
}

/* =========================================================
   COMING SOON
   ========================================================= */

function ComingSoon({ title }) {
  return (
    <div className="module-page">
      <div className="page-header">
        <div>
          <h1>{title}</h1>

          <p>{title} management module</p>
        </div>
      </div>

      <div
        className="module-card"
        style={{
          minHeight: "350px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          gap: "10px",
        }}
      >
        <div
          style={{
            width: "60px",
            height: "60px",
            borderRadius: "16px",
            background: "#edf3ff",
            color: "#3478f6",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <BarChart3 size={28} />
        </div>

        <h2
          style={{
            fontSize: "20px",
            color: "#172033",
          }}
        >
          {title} Module
        </h2>

        <p
          style={{
            fontSize: "12px",
            color: "#8492a6",
          }}
        >
          This module will be added next.
        </p>
      </div>
    </div>
  );
}

/* =========================================================
   AUTH PAGE CSS
   ========================================================= */

const authStyles = `
.auth-page {
  min-height: 100vh;
  width: 100%;
  display: flex;
  background: #f4f7fb;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif;
}

.auth-left {
  width: 48%;
  min-height: 100vh;
  background: linear-gradient(145deg, #07182d, #0b2545);
  color: #ffffff;
  padding: 55px 65px;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.auth-brand {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 70px;
}

.auth-logo {
  width: 52px;
  height: 52px;
  border-radius: 14px;
  background: linear-gradient(135deg, #4f46e5, #7c3aed);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 17px;
  font-weight: 800;
  color: #ffffff;
  box-shadow: 0 10px 25px rgba(79, 70, 229, 0.3);
}

.auth-brand h1 {
  font-size: 22px;
  line-height: 26px;
  margin: 0;
}

.auth-brand p {
  color: #9bb0cb;
  font-size: 12px;
  margin-top: 3px;
}

.auth-intro {
  max-width: 520px;
}

.auth-intro h2 {
  font-size: 38px;
  line-height: 1.15;
  margin-bottom: 20px;
  font-weight: 750;
}

.auth-intro > p {
  color: #aebed2;
  font-size: 14px;
  line-height: 1.8;
  max-width: 470px;
}

.auth-features {
  margin-top: 35px;
  display: grid;
  gap: 15px;
}

.auth-features div {
  color: #d7e2ef;
  font-size: 13px;
}

.auth-right {
  flex: 1;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 35px;
  background: #f7f9fc;
}

.auth-card {
  width: 100%;
  max-width: 450px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 18px;
  padding: 38px;
  box-shadow: 0 20px 55px rgba(15, 23, 42, 0.08);
}

.register-card {
  max-width: 560px;
}

.auth-heading {
  margin-bottom: 28px;
}

.auth-heading h2 {
  color: #172033;
  font-size: 25px;
  margin-bottom: 7px;
}

.auth-heading p {
  color: #8290a5;
  font-size: 12px;
}

.auth-field {
  margin-bottom: 17px;
}

.auth-field label {
  display: block;
  color: #45556d;
  font-size: 11px;
  font-weight: 650;
  margin-bottom: 7px;
}

.auth-field input,
.auth-field select {
  width: 100%;
  height: 44px;
  border: 1px solid #dbe3ed;
  border-radius: 9px;
  padding: 0 13px;
  outline: none;
  font-size: 12px;
  color: #172033;
  background: #ffffff;
}

.auth-field input:focus,
.auth-field select:focus {
  border-color: #4f8df7;
  box-shadow: 0 0 0 3px rgba(79, 141, 247, 0.1);
}

.auth-field input::placeholder {
  color: #a1adbd;
}

.auth-two-column {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}

.auth-submit {
  width: 100%;
  height: 45px;
  border: none;
  border-radius: 9px;
  background: linear-gradient(135deg, #3478f6, #4f8df7);
  color: #ffffff;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 8px 18px rgba(52, 120, 246, 0.22);
  transition: 0.2s ease;
}

.auth-submit:hover {
  transform: translateY(-1px);
  box-shadow: 0 11px 22px rgba(52, 120, 246, 0.28);
}

.auth-error {
  background: #fff0f0;
  border: 1px solid #ffd1d1;
  color: #dc2626;
  border-radius: 8px;
  padding: 10px 12px;
  font-size: 11px;
  margin-bottom: 14px;
}

.auth-success {
  background: #ecfdf3;
  border: 1px solid #bbf7d0;
  color: #15803d;
  border-radius: 8px;
  padding: 10px 12px;
  font-size: 11px;
  margin-bottom: 14px;
}

.auth-demo {
  margin-top: 20px;
  padding: 13px;
  border-radius: 9px;
  background: #f7f9fc;
  border: 1px solid #e8edf3;
  display: flex;
  flex-direction: column;
  gap: 3px;
  font-size: 10px;
  color: #71819a;
}

.auth-demo strong {
  color: #45556d;
  font-size: 11px;
  margin-bottom: 2px;
}

.auth-switch {
  margin-top: 24px;
  text-align: center;
  color: #7d8ba0;
  font-size: 11px;
}

.auth-switch button {
  border: none;
  background: transparent;
  color: #3478f6;
  font-weight: 700;
  cursor: pointer;
  margin-left: 5px;
}

.mobile-brand {
  display: none;
}

@media (max-width: 850px) {
  .auth-left {
    display: none;
  }

  .auth-right {
    width: 100%;
    padding: 20px;
  }

  .auth-card {
    padding: 28px 22px;
  }
}

@media (max-width: 520px) {
  .auth-two-column {
    grid-template-columns: 1fr;
    gap: 0;
  }

  .auth-card {
    padding: 25px 18px;
  }

  .auth-heading h2 {
    font-size: 22px;
  }
}
`;

export default App;