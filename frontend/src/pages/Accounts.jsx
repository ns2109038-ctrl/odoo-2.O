import { useState, useEffect } from "react";
import { getAccounts, createAccount, updateAccount, deleteAccount as deleteAccountApi } from "../lib/api.js";
import Alert from "../components/ui/Alert.jsx";
import {
  BookOpen,
  Plus,
  Search,
  Edit3,
  Trash2,
  X,
  Home,
  ArrowLeft,
  Check,
  Archive,
  Layers,
  FileSpreadsheet
} from "lucide-react";

export default function Accounts({ onNavigate }) {
  const [search, setSearch] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editAccountObj, setEditAccountObj] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    code: "",
    name: "",
    type: "Asset",
    group: "",
    status: "Active",
  });

  const loadAccounts = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getAccounts();
      const typeDisplayMap = {
        asset: "Assets",
        assets: "Assets",
        bank: "Assets",
        cash: "Assets",
        liability: "Liabilities",
        liabilities: "Liabilities",
        equity: "Capital",
        capital: "Capital",
        income: "Income",
        expense: "Expense",
        expenses: "Expense",
        "other expense": "Expense",
        "other expenses": "Expense",
      };

      const mapped = (data || []).map((a) => {
        let rawType = (a.account_type || "").toLowerCase();
        let displayType = typeDisplayMap[rawType] || a.account_type || "Assets";
        if (a.name === "Capital A/c") displayType = "Capital";
        if (a.name === "Debtors A/c" || a.name === "Bank A/c" || a.name === "Cash A/c") displayType = "Assets";
        if (a.name === "Creditors A/c") displayType = "Liabilities";
        if (a.name === "Purchase Expense A/c" || a.name === "Other Expense A/c") displayType = "Expense";
        if (a.name === "Sales Income A/c") displayType = "Income";

        return {
          id: a.id,
          code: a.code,
          name: a.name || a.account_name || "",
          type: displayType,
          rawType: a.account_type,
          group: a.description || "",
          status: a.is_active ? "Active" : "Archived",
        };
      });

      // Priority sort matching wireframe pre-configured accounts:
      // 1. Bank A/c | Assets
      // 2. Purchase Expense A/c | Expense
      // 3. Debtors A/c | Assets
      // 4. Creditors A/c | Liabilities
      // 5. Sales Income A/c | Income
      // 6. Cash A/c | Assets
      // 7. Other Expense A/c | Expense
      // 8. Capital A/c | Capital
      const priorityOrder = [
        "Bank A/c",
        "Purchase Expense A/c",
        "Debtors A/c",
        "Creditors A/c",
        "Sales Income A/c",
        "Cash A/c",
        "Other Expense A/c",
        "Capital A/c",
      ];

      mapped.sort((a, b) => {
        const idxA = priorityOrder.indexOf(a.name);
        const idxB = priorityOrder.indexOf(b.name);
        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
        if (idxA !== -1) return -1;
        if (idxB !== -1) return 1;
        return (b.id || 0) - (a.id || 0);
      });

      setAccounts(mapped);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAccounts();
  }, []);

  const filteredAccounts = accounts.filter((account) => {
    const matchesSearch = `${account.code} ${account.name} ${account.type} ${account.group}`
      .toLowerCase()
      .includes(search.toLowerCase());
    const matchesArchive = showArchived ? true : account.status === "Active";
    return matchesSearch && matchesArchive;
  });

  const openAddModal = () => {
    setEditAccountObj(null);
    setForm({
      code: "ACC-" + Math.random().toString(36).substring(2, 6).toUpperCase(),
      name: "",
      type: "Asset",
      group: "",
      status: "Active",
    });
    setShowModal(true);
  };

  const openEditModal = (account) => {
    setEditAccountObj(account);
    setForm({
      code: account.code,
      name: account.name,
      type: account.type,
      group: account.group,
      status: account.status,
    });
    setShowModal(true);
  };

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const saveAccount = async (e) => {
    if (e) e.preventDefault();

    if (!form.name.trim()) {
      alert("Please enter Account Name");
      return;
    }

    const typeBackendMap = {
      Asset: "asset",
      Liability: "liability",
      Bank: "asset",
      Capital: "equity",
      Cash: "asset",
      Income: "income",
      Expenses: "expense",
      "Other Expenses": "expense",
      Assets: "asset",
      Liabilities: "liability",
      Expense: "expense",
    };

    setSubmitting(true);
    try {
      const payload = {
        code: form.code.trim() || ("ACC-" + Math.random().toString(36).substring(2, 6).toUpperCase()),
        name: form.name.trim(),
        account_type: typeBackendMap[form.type] || "asset",
        description: form.type,
        is_active: form.status === "Active",
      };

      if (!editAccountObj) {
        await createAccount(payload);
      } else {
        await updateAccount(editAccountObj.id, payload);
      }

      setShowModal(false);
      await loadAccounts();
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const deleteAccount = async (id) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this account?"
    );
    if (!confirmDelete) return;

    try {
      await deleteAccountApi(id);
      setAccounts(accounts.filter((a) => a.id !== id));
    } catch (err) {
      alert(err.message);
    }
  };

  const getTypeStyle = (type) => {
    switch (type) {
      case "Assets":
        return { bg: "#e6f4fe", text: "#0284c7" };
      case "Liabilities":
        return { bg: "#f3e8ff", text: "#7e22ce" };
      case "Equity":
        return { bg: "#f1f5f9", text: "#475569" };
      case "Income":
        return { bg: "#f0fdf4", text: "#166534" };
      case "Expenses":
        return { bg: "#fff7ed", text: "#c2410c" };
      default:
        return { bg: "#ccdde2", text: "#594236" };
    }
  };

  return (
    <div className="module-page" style={{ padding: "20px 24px" }}>
      {/* ── TOP BAR (Matching wireframe: [New] [Confirm] [Archived] | [Search] | [Home] [Back]) ── */}
      <div
        className="account-topbar"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          background: "#ffffff",
          padding: "12px 18px",
          borderRadius: "12px",
          border: "1px solid #cbd5e1",
          marginBottom: "20px",
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.04)",
          flexWrap: "wrap",
        }}
      >
        {/* Left Action Buttons: [New] [Confirm] [Archived] */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <button
            type="button"
            onClick={openAddModal}
            style={{
              background: "#0284c7",
              color: "#ffffff",
              border: "none",
              padding: "7px 18px",
              borderRadius: "8px",
              fontSize: "13px",
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "5px",
              boxShadow: "0 2px 6px rgba(2, 132, 199, 0.3)",
            }}
          >
            <Plus size={15} /> New
          </button>

          <button
            type="button"
            onClick={() => alert("Chart of Accounts configuration confirmed.")}
            style={{
              background: "#ffffff",
              border: "1.5px solid #cbd5e1",
              color: "#334155",
              padding: "7px 16px",
              borderRadius: "8px",
              fontSize: "13px",
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "5px",
            }}
          >
            <Check size={14} color="#166534" /> Confirm
          </button>

          <button
            type="button"
            onClick={() => setShowArchived(!showArchived)}
            style={{
              background: showArchived ? "#eff6ff" : "#ffffff",
              border: showArchived ? "1.5px solid #3b82f6" : "1.5px solid #cbd5e1",
              color: showArchived ? "#1d4ed8" : "#64748b",
              padding: "7px 16px",
              borderRadius: "8px",
              fontSize: "13px",
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "5px",
            }}
          >
            <Archive size={14} /> {showArchived ? "All Accounts" : "Archived"}
          </button>
        </div>

        {/* Center: [Search] Bar */}
        <div style={{ position: "relative", flex: 1, minWidth: "200px", maxWidth: "420px", marginLeft: "10px" }}>
          <Search
            size={15}
            style={{
              position: "absolute",
              left: "12px",
              top: "50%",
              transform: "translateY(-50%)",
              color: "#94a3b8",
            }}
          />
          <input
            type="text"
            placeholder="Search account name or type..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: "100%",
              height: "36px",
              paddingLeft: "36px",
              paddingRight: "14px",
              borderRadius: "8px",
              border: "1px solid #cbd5e1",
              outline: "none",
              fontSize: "13px",
              background: "#f8fafc",
            }}
          />
        </div>

        {/* Right Action Buttons: [Home] [Back] */}
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "8px" }}>
          <button
            type="button"
            onClick={() => {
              if (onNavigate) onNavigate("Dashboard");
            }}
            style={{
              background: "#ffffff",
              border: "1.5px solid #cbd5e1",
              color: "#334155",
              padding: "7px 16px",
              borderRadius: "8px",
              fontSize: "13px",
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "5px",
            }}
          >
            <Home size={14} /> Home
          </button>

          <button
            type="button"
            onClick={() => {
              if (onNavigate) onNavigate("Dashboard");
            }}
            style={{
              background: "#ffffff",
              border: "1.5px solid #cbd5e1",
              color: "#334155",
              padding: "7px 16px",
              borderRadius: "8px",
              fontSize: "13px",
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "5px",
            }}
          >
            <ArrowLeft size={14} /> Back
          </button>
        </div>
      </div>

      {error && <Alert type="error" style={{ marginBottom: "16px" }}>{error}</Alert>}

      {/* ── CHART OF ACCOUNTS (LIST VIEW) TABLE ── */}
      <div
        className="account-list-card"
        style={{
          background: "#ffffff",
          borderRadius: "12px",
          border: "1px solid #cbd5e1",
          boxShadow: "0 4px 16px rgba(0, 0, 0, 0.04)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1.5px solid #e2e8f0",
            background: "#f8fafc",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "8px",
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: "17px", fontWeight: 800, color: "#0f172a" }}>
              Chart of Accounts (List View)
            </h2>
            <p style={{ margin: "3px 0 0", fontSize: "12px", color: "#d97706", fontWeight: 600 }}>
              All this accounts are to be pre configured
            </p>
          </div>

          <span
            style={{
              fontSize: "12px",
              fontWeight: 700,
              color: "#64748b",
              background: "#e2e8f0",
              padding: "4px 12px",
              borderRadius: "12px",
            }}
          >
            {filteredAccounts.length} Accounts
          </span>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table
            className="data-table"
            style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "13.5px" }}
          >
            <thead>
              <tr style={{ background: "#ffffff", borderBottom: "2px solid #cbd5e1", color: "#334155", fontWeight: 800 }}>
                <th style={{ padding: "14px 20px" }}>Account Name</th>
                <th style={{ padding: "14px 20px" }}>Type</th>
                <th style={{ padding: "14px 20px", textAlign: "right" }}>Actions</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="3" style={{ textAlign: "center", padding: "40px", color: "#94a3b8" }}>
                    Loading chart of accounts...
                  </td>
                </tr>
              ) : filteredAccounts.length > 0 ? (
                filteredAccounts.map((account) => {
                  const styleTheme = getTypeStyle(account.type);
                  return (
                    <tr
                      key={account.id}
                      style={{
                        borderBottom: "1px solid #f1f5f9",
                        transition: "background 0.15s ease",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fafc")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "#ffffff")}
                    >
                      {/* Account Name (Clickable to open form view with saved details) */}
                      <td style={{ padding: "14px 20px" }}>
                        <span
                          onClick={() => openEditModal(account)}
                          title="Click to view & edit account master"
                          style={{
                            fontWeight: 700,
                            color: "#0284c7",
                            cursor: "pointer",
                            textDecoration: "underline",
                            textUnderlineOffset: "3px",
                            fontSize: "14px",
                          }}
                        >
                          {account.name}
                        </span>
                      </td>

                      {/* Type matching wireframe */}
                      <td style={{ padding: "14px 20px" }}>
                        <span
                          style={{
                            padding: "4px 12px",
                            borderRadius: "12px",
                            fontSize: "12px",
                            fontWeight: 700,
                            background: styleTheme.bg,
                            color: styleTheme.text,
                          }}
                        >
                          {account.type}
                        </span>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: "14px 20px", textAlign: "right" }}>
                        <div style={{ display: "inline-flex", gap: "6px" }}>
                          <button
                            onClick={() => openEditModal(account)}
                            title="Edit Account"
                            style={{
                              background: "#f0f9ff",
                              color: "#0284c7",
                              border: "1px solid #bae6fd",
                              padding: "4px 10px",
                              borderRadius: "6px",
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "3px",
                              fontSize: "12px",
                              fontWeight: 600,
                            }}
                          >
                            <Edit3 size={12} /> Edit
                          </button>
                          <button
                            onClick={() => deleteAccount(account.id)}
                            title="Delete Account"
                            style={{
                              background: "#fef2f2",
                              color: "#dc2626",
                              border: "1px solid #fca5a5",
                              padding: "4px 8px",
                              borderRadius: "6px",
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              fontSize: "12px",
                            }}
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="3" style={{ textAlign: "center", padding: "40px", color: "#94a3b8" }}>
                    No accounting ledger records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── ACCOUNT MASTER FORM VIEW MODAL (When clicking on new) ── */}
      {showModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowModal(false)}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(15, 23, 42, 0.6)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "20px",
          }}
        >
          <div
            className="account-master-modal"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#ffffff",
              borderRadius: "14px",
              width: "100%",
              maxWidth: "540px",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              overflow: "hidden",
              border: "1px solid #cbd5e1",
            }}
          >
            {/* Modal Top Bar matching wireframe: [New] [Confirm] on left, [Back] on right */}
            <div
              style={{
                background: "#0f172a",
                padding: "14px 20px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "10px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <button
                  type="button"
                  onClick={() => {
                    setEditAccountObj(null);
                    setForm({
                      code: "ACC-" + Math.random().toString(36).substring(2, 6).toUpperCase(),
                      name: "",
                      type: "Asset",
                      group: "",
                      status: "Active",
                    });
                  }}
                  style={{
                    background: "#334155",
                    border: "none",
                    color: "#ffffff",
                    padding: "7px 16px",
                    borderRadius: "8px",
                    fontSize: "13px",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  New
                </button>

                <button
                  type="button"
                  onClick={saveAccount}
                  disabled={submitting}
                  style={{
                    background: "#0284c7",
                    border: "none",
                    color: "#ffffff",
                    padding: "7px 18px",
                    borderRadius: "8px",
                    fontSize: "13px",
                    fontWeight: 700,
                    cursor: submitting ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "5px",
                    boxShadow: "0 2px 6px rgba(2, 132, 199, 0.4)",
                  }}
                >
                  <Check size={14} /> {submitting ? "Saving..." : "Confirm"}
                </button>
              </div>

              <span style={{ fontSize: "14px", fontWeight: 700, color: "#38bdf8" }}>
                Account Master Form View
              </span>

              <button
                type="button"
                onClick={() => setShowModal(false)}
                style={{
                  background: "transparent",
                  border: "1.5px solid rgba(255, 255, 255, 0.35)",
                  color: "#ffffff",
                  padding: "6px 16px",
                  borderRadius: "8px",
                  fontSize: "13px",
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <ArrowLeft size={13} /> Back
              </button>
            </div>

            {/* Form Body with wireframe underlined inputs */}
            <form onSubmit={saveAccount} style={{ padding: "28px 24px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "22px" }}>
                {/* Account Name */}
                <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                  <label
                    style={{
                      width: "130px",
                      fontSize: "13.5px",
                      fontWeight: 700,
                      color: "#0f172a",
                      flexShrink: 0,
                    }}
                  >
                    Account Name
                  </label>
                  <input
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    placeholder="e.g. Bank A/c, Cash A/c..."
                    required
                    autoFocus
                    style={{
                      flex: 1,
                      border: "none",
                      borderBottom: "2px solid #cbd5e1",
                      borderRadius: 0,
                      padding: "6px 4px",
                      fontSize: "14px",
                      fontWeight: 600,
                      color: "#0f172a",
                      outline: "none",
                      background: "transparent",
                      transition: "border-color 0.2s",
                    }}
                    onFocus={(e) => (e.target.style.borderBottomColor = "#0284c7")}
                    onBlur={(e) => (e.target.style.borderBottomColor = "#cbd5e1")}
                  />
                </div>

                {/* Type Selection */}
                <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                  <label
                    style={{
                      width: "130px",
                      fontSize: "13.5px",
                      fontWeight: 700,
                      color: "#0f172a",
                      flexShrink: 0,
                    }}
                  >
                    Type
                  </label>
                  <select
                    name="type"
                    value={form.type}
                    onChange={handleChange}
                    style={{
                      flex: 1,
                      border: "none",
                      borderBottom: "2px solid #cbd5e1",
                      borderRadius: 0,
                      padding: "6px 4px",
                      fontSize: "14px",
                      fontWeight: 600,
                      color: "#0f172a",
                      outline: "none",
                      background: "transparent",
                      cursor: "pointer",
                      transition: "border-color 0.2s",
                    }}
                    onFocus={(e) => (e.target.style.borderBottomColor = "#0284c7")}
                    onBlur={(e) => (e.target.style.borderBottomColor = "#cbd5e1")}
                  >
                    <optgroup label="── Balancesheet ──">
                      <option value="Asset">Asset</option>
                      <option value="Liability">Liability</option>
                      <option value="Bank">Bank</option>
                      <option value="Capital">Capital</option>
                      <option value="Cash">Cash</option>
                    </optgroup>
                    <optgroup label="── Profit and Loss ──">
                      <option value="Income">Income</option>
                      <option value="Expenses">Expenses</option>
                      <option value="Other Expenses">Other Expenses</option>
                    </optgroup>
                  </select>
                </div>

                {/* Wireframe Annotation Note */}
                <div
                  style={{
                    background: "#f8fafc",
                    border: "1px dashed #94a3b8",
                    borderRadius: "10px",
                    padding: "14px 16px",
                    marginTop: "8px",
                  }}
                >
                  <p style={{ margin: 0, fontSize: "12px", color: "#475569", lineHeight: 1.5 }}>
                    <strong style={{ color: "#0284c7" }}>Note:</strong> Each account is assigned an
                    Account Type, which would further be used for how the account is treated and
                    where it appears in Balance Sheet & Profit and Loss reports.
                  </p>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}