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
  Filter,
  Layers,
  PieChart,
  DollarSign,
  TrendingUp,
  CreditCard,
  FileSpreadsheet
} from "lucide-react";

function Accounts() {
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("All"); // "All" | "Assets" | "Liabilities" | "Equity" | "Income" | "Expenses"
  const [showModal, setShowModal] = useState(false);
  const [editAccountObj, setEditAccountObj] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    code: "",
    name: "",
    type: "Assets",
    group: "Current Assets",
    balance: "",
    status: "Active",
  });

  const loadAccounts = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getAccounts();
      const typeMap = {
        asset: "Assets",
        liability: "Liabilities",
        equity: "Equity",
        income: "Income",
        expense: "Expenses",
      };
      const mapped = (data || []).map((a) => ({
        id: a.id,
        code: a.code,
        name: a.name || a.account_name || "",
        type: typeMap[a.account_type?.toLowerCase()] || a.account_type || "Assets",
        group: a.description || (typeMap[a.account_type?.toLowerCase()] ? `${typeMap[a.account_type?.toLowerCase()]} Group` : "General"),
        balance: 0,
        status: a.is_active ? "Active" : "Inactive",
      }));
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
    const matchesType = filterType === "All" || account.type.toLowerCase() === filterType.toLowerCase();
    return matchesSearch && matchesType;
  });

  const countAssets = accounts.filter((a) => a.type === "Assets").length;
  const countLiabilities = accounts.filter((a) => a.type === "Liabilities").length;
  const countEquity = accounts.filter((a) => a.type === "Equity").length;
  const countIncome = accounts.filter((a) => a.type === "Income").length;
  const countExpenses = accounts.filter((a) => a.type === "Expenses").length;

  const openAddModal = () => {
    setEditAccountObj(null);
    setForm({
      code: "",
      name: "",
      type: "Assets",
      group: "Current Assets",
      balance: "",
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
      balance: account.balance,
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
    e.preventDefault();

    if (!form.code.trim() || !form.name.trim()) {
      alert("Please enter Account Code and Account Name");
      return;
    }

    const typeReverseMap = {
      Assets: "asset",
      Liabilities: "liability",
      Equity: "equity",
      Income: "income",
      Expenses: "expense",
    };

    setSubmitting(true);
    try {
      const payload = {
        code: form.code.trim(),
        name: form.name.trim(),
        account_type: typeReverseMap[form.type] || form.type.toLowerCase(),
        description: form.group || null,
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
    <div className="module-page">
      {/* HEADER */}
      <div className="page-header" style={{ marginBottom: "20px" }}>
        <div>
          <p className="breadcrumb">Masters / Chart of Accounts</p>
          <h1 style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <BookOpen size={26} style={{ color: "#48acf0" }} /> Chart of Accounts
          </h1>
          <p className="subtitle">
            Manage general ledger accounting accounts, classification hierarchy and account groups.
          </p>
        </div>

        <button className="primary-btn" onClick={openAddModal} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <Plus size={16} /> New Account
        </button>
      </div>

      {error && <Alert type="error" style={{ marginBottom: "16px" }}>{error}</Alert>}

      {/* ACCOUNT SUMMARY CARDS */}
      <div className="stats-grid" style={{ gridTemplateColumns: "repeat(5, 1fr)", marginBottom: "20px" }}>
        <div className="stat-card" style={{ padding: "16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <span style={{ fontSize: "11px", color: "#93a3bc", fontWeight: "700", textTransform: "uppercase" }}>Total</span>
            <FileSpreadsheet size={16} style={{ color: "#48acf0" }} />
          </div>
          <h2 style={{ margin: 0, fontSize: "22px", color: "#594236", fontWeight: "800" }}>{accounts.length}</h2>
          <p style={{ margin: "4px 0 0", fontSize: "11px", color: "#6f584b" }}>Active Ledger Accounts</p>
        </div>

        <div className="stat-card" style={{ padding: "16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <span style={{ fontSize: "11px", color: "#0284c7", fontWeight: "700", textTransform: "uppercase" }}>Assets</span>
            <Layers size={16} style={{ color: "#0284c7" }} />
          </div>
          <h2 style={{ margin: 0, fontSize: "22px", color: "#594236", fontWeight: "800" }}>{countAssets}</h2>
          <p style={{ margin: "4px 0 0", fontSize: "11px", color: "#6f584b" }}>Current & Fixed Assets</p>
        </div>

        <div className="stat-card" style={{ padding: "16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <span style={{ fontSize: "11px", color: "#7e22ce", fontWeight: "700", textTransform: "uppercase" }}>Liabilities</span>
            <CreditCard size={16} style={{ color: "#7e22ce" }} />
          </div>
          <h2 style={{ margin: 0, fontSize: "22px", color: "#594236", fontWeight: "800" }}>{countLiabilities}</h2>
          <p style={{ margin: "4px 0 0", fontSize: "11px", color: "#6f584b" }}>Payables & Loans</p>
        </div>

        <div className="stat-card" style={{ padding: "16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <span style={{ fontSize: "11px", color: "#166534", fontWeight: "700", textTransform: "uppercase" }}>Income</span>
            <TrendingUp size={16} style={{ color: "#166534" }} />
          </div>
          <h2 style={{ margin: 0, fontSize: "22px", color: "#594236", fontWeight: "800" }}>{countIncome}</h2>
          <p style={{ margin: "4px 0 0", fontSize: "11px", color: "#6f584b" }}>Sales & Revenue</p>
        </div>

        <div className="stat-card" style={{ padding: "16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <span style={{ fontSize: "11px", color: "#c2410c", fontWeight: "700", textTransform: "uppercase" }}>Expenses</span>
            <PieChart size={16} style={{ color: "#c2410c" }} />
          </div>
          <h2 style={{ margin: 0, fontSize: "22px", color: "#594236", fontWeight: "800" }}>{countExpenses}</h2>
          <p style={{ margin: "4px 0 0", fontSize: "11px", color: "#6f584b" }}>Operating Expenses</p>
        </div>
      </div>

      {/* SEARCH TOOLBAR & FILTER BUTTONS */}
      <div className="module-toolbar" style={{
        background: "#ffffff", padding: "14px 20px", borderRadius: "12px",
        border: "1px solid rgba(204, 221, 226, 0.7)", marginBottom: "20px",
        display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", flex: 1, minWidth: "300px" }}>
          <div style={{ position: "relative", flex: 1, maxWidth: "380px" }}>
            <Search size={16} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#93a3bc" }} />
            <input
              type="text"
              placeholder="Search account code, name or group..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: "100%", height: "38px", paddingLeft: "36px", paddingRight: "14px",
                borderRadius: "8px", border: "1px solid #93a3bc", outline: "none", fontSize: "13px",
                background: "#f4f8fb"
              }}
            />
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
            <Filter size={15} style={{ color: "#6f584b" }} />
            {["All", "Assets", "Liabilities", "Equity", "Income", "Expenses"].map((t) => (
              <button
                key={t}
                onClick={() => setFilterType(t)}
                style={{
                  border: "none", padding: "6px 12px", borderRadius: "6px", fontSize: "12px",
                  fontWeight: "600", cursor: "pointer",
                  background: filterType === t ? "#48acf0" : "#f4f8fb",
                  color: filterType === t ? "#ffffff" : "#594236",
                  transition: "all 0.15s ease"
                }}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div style={{ fontSize: "13px", color: "#6f584b" }}>
          Showing: <strong>{filteredAccounts.length}</strong> of <strong>{accounts.length}</strong>
        </div>
      </div>

      {/* MAIN TABLE */}
      <div className="module-card" style={{
        background: "#ffffff", borderRadius: "12px", border: "1px solid rgba(204, 221, 226, 0.8)",
        boxShadow: "0 4px 16px rgba(89, 66, 54, 0.05)", overflow: "hidden"
      }}>
        <div className="responsive-table" style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "13px" }}>
            <thead>
              <tr style={{ background: "#f8fafc", borderBottom: "1px solid #ccdde2", color: "#594236", fontWeight: "700" }}>
                <th style={{ padding: "14px 18px", width: "120px" }}>Account Code</th>
                <th style={{ padding: "14px 18px" }}>Account Name</th>
                <th style={{ padding: "14px 18px" }}>Account Type</th>
                <th style={{ padding: "14px 18px" }}>Account Group</th>
                <th style={{ padding: "14px 18px" }}>Status</th>
                <th style={{ padding: "14px 18px", textAlign: "right" }}>Actions</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" className="empty-state" style={{ textAlign: "center", padding: "40px", color: "#93a3bc" }}>
                    Loading chart of accounts...
                  </td>
                </tr>
              ) : filteredAccounts.length > 0 ? (
                filteredAccounts.map((account) => {
                  const styleTheme = getTypeStyle(account.type);
                  return (
                    <tr key={account.id} style={{ borderBottom: "1px solid #f1f5f9", transition: "background 0.15s" }}>
                      <td style={{ padding: "14px 18px" }}>
                        <span style={{
                          background: "rgba(89, 66, 54, 0.08)", color: "#594236", padding: "4px 8px",
                          borderRadius: "6px", fontFamily: "monospace", fontWeight: "700", fontSize: "12px"
                        }}>
                          {account.code}
                        </span>
                      </td>

                      <td style={{ padding: "14px 18px", color: "#594236", fontWeight: "700" }}>
                        {account.name}
                      </td>

                      <td style={{ padding: "14px 18px" }}>
                        <span style={{
                          padding: "4px 10px", borderRadius: "12px", fontSize: "11px", fontWeight: "700",
                          background: styleTheme.bg, color: styleTheme.text
                        }}>
                          {account.type}
                        </span>
                      </td>

                      <td style={{ padding: "14px 18px", color: "#6f584b" }}>{account.group}</td>

                      <td style={{ padding: "14px 18px" }}>
                        <span style={{
                          padding: "4px 10px", borderRadius: "12px", fontSize: "11px", fontWeight: "700",
                          background: account.status === "Active" ? "#f0fdf4" : "#fef2f2",
                          color: account.status === "Active" ? "#166534" : "#991b1b"
                        }}>
                          {account.status}
                        </span>
                      </td>

                      <td style={{ padding: "14px 18px", textAlign: "right" }}>
                        <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
                          <button
                            onClick={() => openEditModal(account)}
                            style={{
                              background: "#f4f8fb", color: "#594236", border: "1px solid #93a3bc",
                              padding: "5px 10px", borderRadius: "6px", fontSize: "12px", fontWeight: "600",
                              cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "4px"
                            }}
                          >
                            <Edit3 size={13} /> Edit
                          </button>

                          <button
                            onClick={() => deleteAccount(account.id)}
                            style={{
                              background: "#fef2f2", color: "#dc2626", border: "1px solid #fca5a5",
                              padding: "5px 10px", borderRadius: "6px", fontSize: "12px", fontWeight: "600",
                              cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "4px"
                            }}
                          >
                            <Trash2 size={13} /> Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="6" className="empty-state" style={{ textAlign: "center", padding: "40px", color: "#93a3bc" }}>
                    No accounting ledger records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL */}
      {showModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowModal(false)}
          style={{
            position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
            background: "rgba(15, 23, 42, 0.5)", backdropFilter: "blur(4px)",
            display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "20px"
          }}
        >
          <div
            className="product-modal"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#ffffff", borderRadius: "14px", width: "100%", maxWidth: "560px",
              boxShadow: "0 20px 40px rgba(0, 0, 0, 0.2)", overflow: "hidden", border: "1px solid #ccdde2"
            }}
          >
            <div className="modal-header" style={{
              background: "linear-gradient(135deg, #594236, #6f584b)", color: "#ffffff",
              padding: "18px 24px", display: "flex", justifyContent: "space-between", alignItems: "center"
            }}>
              <div>
                <h2 style={{ margin: 0, fontSize: "18px", fontWeight: "700", display: "flex", alignItems: "center", gap: "8px" }}>
                  <BookOpen size={18} style={{ color: "#48acf0" }} />
                  {!editAccountObj ? "Create New Ledger Account" : "Edit Ledger Account"}
                </h2>
                <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#ccdde2", opacity: 0.9 }}>
                  Enter account code, type classification & group information
                </p>
              </div>

              <button
                className="close-modal"
                onClick={() => setShowModal(false)}
                style={{ background: "none", border: "none", color: "#ffffff", cursor: "pointer" }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={saveAccount} style={{ padding: "24px" }}>
              <div className="form-section">
                <div className="form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                  <div className="form-group">
                    <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "#594236", marginBottom: "6px" }}>
                      Account Code *
                    </label>
                    <input
                      name="code"
                      value={form.code}
                      onChange={handleChange}
                      placeholder="e.g. 1001 / 2005"
                      required
                      style={{
                        width: "100%", height: "40px", borderRadius: "8px", border: "1px solid #93a3bc",
                        padding: "0 12px", fontSize: "13px", outline: "none", fontFamily: "monospace"
                      }}
                    />
                  </div>

                  <div className="form-group">
                    <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "#594236", marginBottom: "6px" }}>
                      Account Name *
                    </label>
                    <input
                      name="name"
                      value={form.name}
                      onChange={handleChange}
                      placeholder="e.g. Cash in Hand / HDFC Bank"
                      required
                      style={{
                        width: "100%", height: "40px", borderRadius: "8px", border: "1px solid #93a3bc",
                        padding: "0 12px", fontSize: "13px", outline: "none"
                      }}
                    />
                  </div>

                  <div className="form-group">
                    <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "#594236", marginBottom: "6px" }}>
                      Account Type Classification
                    </label>
                    <select
                      name="type"
                      value={form.type}
                      onChange={handleChange}
                      style={{
                        width: "100%", height: "40px", borderRadius: "8px", border: "1px solid #93a3bc",
                        padding: "0 12px", fontSize: "13px", outline: "none", background: "#ffffff"
                      }}
                    >
                      <option value="Assets">Assets</option>
                      <option value="Liabilities">Liabilities</option>
                      <option value="Equity">Equity</option>
                      <option value="Income">Income</option>
                      <option value="Expenses">Expenses</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "#594236", marginBottom: "6px" }}>
                      Status
                    </label>
                    <select
                      name="status"
                      value={form.status}
                      onChange={handleChange}
                      style={{
                        width: "100%", height: "40px", borderRadius: "8px", border: "1px solid #93a3bc",
                        padding: "0 12px", fontSize: "13px", outline: "none", background: "#ffffff"
                      }}
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>

                  <div className="form-group" style={{ gridColumn: "span 2" }}>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "#594236", marginBottom: "6px" }}>
                      Account Group / Description
                    </label>
                    <input
                      name="group"
                      value={form.group}
                      onChange={handleChange}
                      placeholder="e.g. Current Assets / Bank Accounts / Operational Expenses"
                      style={{
                        width: "100%", height: "40px", borderRadius: "8px", border: "1px solid #93a3bc",
                        padding: "0 12px", fontSize: "13px", outline: "none"
                      }}
                    />
                  </div>
                </div>
              </div>

              <div className="modal-actions" style={{
                display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "24px", paddingTop: "16px",
                borderTop: "1px solid #e2e8f0"
              }}>
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => setShowModal(false)}
                  disabled={submitting}
                  style={{
                    background: "#ffffff", border: "1px solid #93a3bc", color: "#594236",
                    padding: "9px 18px", borderRadius: "8px", fontSize: "13px", fontWeight: "600", cursor: "pointer"
                  }}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="primary-btn"
                  disabled={submitting}
                  style={{
                    background: "#48acf0", border: "none", color: "#ffffff",
                    padding: "9px 20px", borderRadius: "8px", fontSize: "13px", fontWeight: "700", cursor: "pointer"
                  }}
                >
                  {submitting
                    ? "Saving..."
                    : !editAccountObj
                    ? "Save Account"
                    : "Update Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Accounts;