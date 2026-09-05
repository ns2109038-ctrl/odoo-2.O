import { useState, useEffect } from "react";
import { getJournals, getAccounts, createJournal, deleteJournal as deleteJournalApi } from "../lib/api.js";
import Alert from "../components/ui/Alert.jsx";
import {
  Book,
  Plus,
  Search,
  Trash2,
  X,
  Filter,
  ShoppingCart,
  Receipt,
  Wallet,
  Building2,
  FileSpreadsheet,
  CheckCircle2,
  FolderPlus
} from "lucide-react";

function Journals() {
  const [journals, setJournals] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("All"); // "All" | "Sales" | "Purchase" | "Cash" | "Bank"
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    name: "",
    type: "Sales",
    shortCode: "",
    defaultDebitAccountId: "",
    defaultCreditAccountId: "",
    status: "Active",
  });

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const [jData, aData] = await Promise.all([
        getJournals(),
        getAccounts(),
      ]);
      const mapped = (jData || []).map((j) => ({
        id: j.id,
        code: j.journal_type ? j.journal_type.toUpperCase() : "GEN",
        name: j.journal_name || "",
        type: j.journal_type || "Sales",
        shortCode: (j.journal_name || "").slice(0, 3).toUpperCase(),
        status: j.is_active ? "Active" : "Inactive",
      }));
      setJournals(mapped);
      setAccounts(aData || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredJournals = journals.filter((journal) => {
    const matchesSearch =
      journal.name.toLowerCase().includes(search.toLowerCase()) ||
      journal.code.toLowerCase().includes(search.toLowerCase()) ||
      journal.shortCode.toLowerCase().includes(search.toLowerCase());
    const matchesType = filterType === "All" || journal.type.toLowerCase() === filterType.toLowerCase();
    return matchesSearch && matchesType;
  });

  const countSales = journals.filter((j) => j.type.toLowerCase() === "sales").length;
  const countPurchase = journals.filter((j) => j.type.toLowerCase() === "purchase").length;
  const countCash = journals.filter((j) => j.type.toLowerCase() === "cash").length;
  const countBank = journals.filter((j) => j.type.toLowerCase() === "bank").length;

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const addJournal = async (e) => {
    e.preventDefault();

    if (!form.name.trim()) {
      alert("Please enter Journal Name");
      return;
    }

    let debitId = form.defaultDebitAccountId ? Number(form.defaultDebitAccountId) : accounts[0]?.id;
    let creditId = form.defaultCreditAccountId ? Number(form.defaultCreditAccountId) : accounts[1]?.id || accounts[0]?.id;

    if (!debitId || !creditId) {
      alert("Please ensure default debit and credit accounts exist in Chart of Accounts first.");
      return;
    }

    setSubmitting(true);
    try {
      await createJournal({
        journal_name: form.name.trim(),
        journal_type: form.type,
        default_debit_account_id: debitId,
        default_credit_account_id: creditId,
        is_active: form.status === "Active",
      });

      setForm({
        name: "",
        type: "Sales",
        shortCode: "",
        defaultDebitAccountId: "",
        defaultCreditAccountId: "",
        status: "Active",
      });

      setShowForm(false);
      await loadData();
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const deleteJournal = async (id) => {
    const confirmDelete = window.confirm("Are you sure you want to delete this journal?");
    if (!confirmDelete) return;

    try {
      await deleteJournalApi(id);
      setJournals(journals.filter((journal) => journal.id !== id));
    } catch (err) {
      alert(err.message);
    }
  };

  const getTypeTheme = (type) => {
    switch (type.toLowerCase()) {
      case "sales":
        return { bg: "#e6f4fe", text: "#0284c7" };
      case "purchase":
        return { bg: "#fff7ed", text: "#c2410c" };
      case "cash":
        return { bg: "#f0fdf4", text: "#166534" };
      case "bank":
        return { bg: "#f3e8ff", text: "#7e22ce" };
      default:
        return { bg: "#ccdde2", text: "#594236" };
    }
  };

  return (
    <div className="module-page">
      {/* PAGE HEADER */}
      <div className="page-header" style={{ marginBottom: "20px" }}>
        <div>
          <p className="breadcrumb">Masters / Journals</p>
          <h1 style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <Book size={26} style={{ color: "#48acf0" }} /> Accounting Journals
          </h1>
          <p className="subtitle">
            Manage sales, purchases, cash, bank and general entry transaction journals.
          </p>
        </div>

        <button
          className="primary-btn"
          onClick={() => setShowForm(true)}
          style={{ display: "flex", alignItems: "center", gap: "6px" }}
        >
          <FolderPlus size={16} /> Add Journal
        </button>
      </div>

      {error && <Alert type="error" style={{ marginBottom: "16px" }}>{error}</Alert>}

      {/* KPI SUMMARY CARDS */}
      <div className="stats-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)", marginBottom: "20px" }}>
        <div className="stat-card" style={{ padding: "16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <span style={{ fontSize: "11px", color: "#0284c7", fontWeight: "700", textTransform: "uppercase" }}>Sales Journals</span>
            <ShoppingCart size={16} style={{ color: "#0284c7" }} />
          </div>
          <h2 style={{ margin: 0, fontSize: "22px", color: "#594236", fontWeight: "800" }}>{countSales}</h2>
          <p style={{ margin: "4px 0 0", fontSize: "11px", color: "#6f584b" }}>Customer Invoices & Orders</p>
        </div>

        <div className="stat-card" style={{ padding: "16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <span style={{ fontSize: "11px", color: "#c2410c", fontWeight: "700", textTransform: "uppercase" }}>Purchase Journals</span>
            <Receipt size={16} style={{ color: "#c2410c" }} />
          </div>
          <h2 style={{ margin: 0, fontSize: "22px", color: "#594236", fontWeight: "800" }}>{countPurchase}</h2>
          <p style={{ margin: "4px 0 0", fontSize: "11px", color: "#6f584b" }}>Vendor Bills & Expenses</p>
        </div>

        <div className="stat-card" style={{ padding: "16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <span style={{ fontSize: "11px", color: "#166534", fontWeight: "700", textTransform: "uppercase" }}>Cash Journals</span>
            <Wallet size={16} style={{ color: "#166534" }} />
          </div>
          <h2 style={{ margin: 0, fontSize: "22px", color: "#594236", fontWeight: "800" }}>{countCash}</h2>
          <p style={{ margin: "4px 0 0", fontSize: "11px", color: "#6f584b" }}>Petty Cash & Hand Cash</p>
        </div>

        <div className="stat-card" style={{ padding: "16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <span style={{ fontSize: "11px", color: "#7e22ce", fontWeight: "700", textTransform: "uppercase" }}>Bank Journals</span>
            <Building2 size={16} style={{ color: "#7e22ce" }} />
          </div>
          <h2 style={{ margin: 0, fontSize: "22px", color: "#594236", fontWeight: "800" }}>{countBank}</h2>
          <p style={{ margin: "4px 0 0", fontSize: "11px", color: "#6f584b" }}>Bank Ledger Accounts</p>
        </div>
      </div>

      {/* SEARCH TOOLBAR & TYPE FILTERS */}
      <div className="module-toolbar" style={{
        background: "#ffffff", padding: "14px 20px", borderRadius: "12px",
        border: "1px solid rgba(204, 221, 226, 0.7)", marginBottom: "20px",
        display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", flex: 1, minWidth: "280px" }}>
          <div style={{ position: "relative", flex: 1, maxWidth: "380px" }}>
            <Search size={16} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#93a3bc" }} />
            <input
              type="text"
              placeholder="Search journal name, type, short code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: "100%", height: "38px", paddingLeft: "36px", paddingRight: "14px",
                borderRadius: "8px", border: "1px solid #93a3bc", outline: "none", fontSize: "13px",
                background: "#f4f8fb"
              }}
            />
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <Filter size={15} style={{ color: "#6f584b" }} />
            {["All", "Sales", "Purchase", "Cash", "Bank"].map((t) => (
              <button
                key={t}
                onClick={() => setFilterType(t)}
                style={{
                  border: "none", padding: "6px 14px", borderRadius: "6px", fontSize: "12px",
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
          Showing: <strong>{filteredJournals.length}</strong> of <strong>{journals.length}</strong>
        </div>
      </div>

      {/* TABLE */}
      <div className="module-card" style={{
        background: "#ffffff", borderRadius: "12px", border: "1px solid rgba(204, 221, 226, 0.8)",
        boxShadow: "0 4px 16px rgba(89, 66, 54, 0.05)", overflow: "hidden"
      }}>
        <div className="table-wrapper" style={{ overflowX: "auto" }}>
          <table className="data-table" style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "13px" }}>
            <thead>
              <tr style={{ background: "#f8fafc", borderBottom: "1px solid #ccdde2", color: "#594236", fontWeight: "700" }}>
                <th style={{ padding: "14px 18px", width: "110px" }}>Journal Code</th>
                <th style={{ padding: "14px 18px" }}>Journal Name</th>
                <th style={{ padding: "14px 18px" }}>Type</th>
                <th style={{ padding: "14px 18px" }}>Short Code</th>
                <th style={{ padding: "14px 18px" }}>Status</th>
                <th style={{ padding: "14px 18px", textAlign: "right" }}>Action</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" className="empty-state" style={{ textAlign: "center", padding: "40px", color: "#93a3bc" }}>
                    Loading journals...
                  </td>
                </tr>
              ) : filteredJournals.length > 0 ? (
                filteredJournals.map((journal) => {
                  const tTheme = getTypeTheme(journal.type);
                  return (
                    <tr key={journal.id} style={{ borderBottom: "1px solid #f1f5f9", transition: "background 0.15s" }}>
                      <td style={{ padding: "14px 18px" }}>
                        <span style={{
                          background: "rgba(89, 66, 54, 0.08)", color: "#594236", padding: "4px 8px",
                          borderRadius: "6px", fontFamily: "monospace", fontWeight: "700", fontSize: "12px"
                        }}>
                          {journal.code}
                        </span>
                      </td>

                      <td style={{ padding: "14px 18px", color: "#594236", fontWeight: "700" }}>
                        {journal.name}
                      </td>

                      <td style={{ padding: "14px 18px" }}>
                        <span style={{
                          padding: "4px 10px", borderRadius: "12px", fontSize: "11px", fontWeight: "700",
                          background: tTheme.bg, color: tTheme.text
                        }}>
                          {journal.type}
                        </span>
                      </td>

                      <td style={{ padding: "14px 18px", color: "#6f584b", fontFamily: "monospace", fontWeight: "600" }}>
                        {journal.shortCode}
                      </td>

                      <td style={{ padding: "14px 18px" }}>
                        <span style={{
                          padding: "4px 10px", borderRadius: "12px", fontSize: "11px", fontWeight: "700",
                          background: journal.status === "Active" ? "#f0fdf4" : "#fef2f2",
                          color: journal.status === "Active" ? "#166534" : "#991b1b"
                        }}>
                          {journal.status}
                        </span>
                      </td>

                      <td style={{ padding: "14px 18px", textAlign: "right" }}>
                        <button
                          className="delete-btn"
                          onClick={() => deleteJournal(journal.id)}
                          style={{
                            background: "#fef2f2", color: "#dc2626", border: "1px solid #fca5a5",
                            padding: "6px 12px", borderRadius: "6px", fontSize: "12px", fontWeight: "600",
                            cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "4px"
                          }}
                        >
                          <Trash2 size={13} /> Delete
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="6" className="empty-state" style={{ textAlign: "center", padding: "40px", color: "#93a3bc" }}>
                    No matching accounting journals found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADD JOURNAL MODAL */}
      {showForm && (
        <div
          className="modal-overlay"
          onClick={() => setShowForm(false)}
          style={{
            position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
            background: "rgba(15, 23, 42, 0.5)", backdropFilter: "blur(4px)",
            display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "20px"
          }}
        >
          <div
            className="modal-box"
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
              <h2 style={{ margin: 0, fontSize: "18px", fontWeight: "700", display: "flex", alignItems: "center", gap: "8px" }}>
                <FolderPlus size={18} style={{ color: "#48acf0" }} /> Create New Accounting Journal
              </h2>

              <button
                className="close-btn"
                onClick={() => setShowForm(false)}
                style={{ background: "none", border: "none", color: "#ffffff", cursor: "pointer" }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={addJournal} style={{ padding: "24px" }}>
              <div className="form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                <div className="form-group" style={{ gridColumn: "span 2" }}>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "#594236", marginBottom: "6px" }}>
                    Journal Name *
                  </label>
                  <input
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    placeholder="e.g. Domestic Sales Journal / HDFC Bank Journal"
                    required
                    style={{
                      width: "100%", height: "40px", borderRadius: "8px", border: "1px solid #93a3bc",
                      padding: "0 12px", fontSize: "13px", outline: "none"
                    }}
                  />
                </div>

                <div className="form-group">
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "#594236", marginBottom: "6px" }}>
                    Journal Type
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
                    <option value="Sales">Sales</option>
                    <option value="Purchase">Purchase</option>
                    <option value="Cash">Cash</option>
                    <option value="Bank">Bank</option>
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
                    Default Debit Account
                  </label>
                  <select
                    name="defaultDebitAccountId"
                    value={form.defaultDebitAccountId}
                    onChange={handleChange}
                    style={{
                      width: "100%", height: "40px", borderRadius: "8px", border: "1px solid #93a3bc",
                      padding: "0 12px", fontSize: "13px", outline: "none", background: "#ffffff"
                    }}
                  >
                    <option value="">— Select Account —</option>
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.code} - {a.name || a.account_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group" style={{ gridColumn: "span 2" }}>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "#594236", marginBottom: "6px" }}>
                    Default Credit Account
                  </label>
                  <select
                    name="defaultCreditAccountId"
                    value={form.defaultCreditAccountId}
                    onChange={handleChange}
                    style={{
                      width: "100%", height: "40px", borderRadius: "8px", border: "1px solid #93a3bc",
                      padding: "0 12px", fontSize: "13px", outline: "none", background: "#ffffff"
                    }}
                  >
                    <option value="">— Select Account —</option>
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.code} - {a.name || a.account_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-actions" style={{
                display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "24px", paddingTop: "16px",
                borderTop: "1px solid #e2e8f0"
              }}>
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => setShowForm(false)}
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
                  {submitting ? "Saving..." : "Save Journal"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Journals;