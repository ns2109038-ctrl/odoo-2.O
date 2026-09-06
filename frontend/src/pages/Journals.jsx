import { useState, useEffect } from "react";
import {
  getJournals,
  getAccounts,
  createJournal,
  updateJournal,
  deleteJournal as deleteJournalApi,
} from "../lib/api.js";
import Alert from "../components/ui/Alert.jsx";
import {
  Book,
  Plus,
  Search,
  Trash2,
  Edit3,
  Check,
  ArrowLeft,
  Layers,
  BookOpen,
} from "lucide-react";

export default function Journals({ onNavigate }) {
  const [journals, setJournals] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editJournalObj, setEditJournalObj] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    name: "",
    type: "Sales",
    defaultAccountId: "",
    status: "Active",
  });

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const [jData, aData] = await Promise.all([getJournals(), getAccounts()]);
      const accountsList = aData || [];
      setAccounts(accountsList);

      const rawJournals = Array.isArray(jData)
        ? jData
        : jData?.items || jData?.data || [];

      const mapped = rawJournals.map((j) => {
        return {
          id: j.id,
          name: j.journal_name || "",
          type: j.journal_type || "Sales",
          default_debit_account_id: j.default_debit_account_id,
          default_credit_account_id: j.default_credit_account_id,
          status: j.is_active ? "Active" : "Inactive",
        };
      });

      // Priority sort matching wireframe pre-configured journals:
      // 1. Sales | Sales | Sales Income A/c
      // 2. Purchase | Purchase | Purchase Expense A/c
      // 3. Bank | Bank | Bank A/c
      // 4. Cash | Cash | Cash A/c
      const priorityOrder = ["Sales", "Purchase", "Bank", "Cash"];
      mapped.sort((a, b) => {
        const idxA = priorityOrder.indexOf(a.name);
        const idxB = priorityOrder.indexOf(b.name);
        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
        if (idxA !== -1) return -1;
        if (idxB !== -1) return 1;
        return (b.id || 0) - (a.id || 0);
      });

      setJournals(mapped);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const resolveDefaultAccount = (journal) => {
    const directNameMap = {
      sales: "Sales Income A/c",
      purchase: "Purchase Expense A/c",
      bank: "Bank A/c",
      cash: "Cash A/c",
    };

    const normName = (journal.name || "").toLowerCase().trim();
    const normType = (journal.type || "").toLowerCase().trim();

    let targetId = journal.default_debit_account_id;
    if (normType === "sales" && journal.default_credit_account_id) {
      targetId = journal.default_credit_account_id;
    }

    const found =
      accounts.find((a) => a.id === targetId) ||
      accounts.find((a) => a.id === journal.default_debit_account_id) ||
      accounts.find((a) => a.id === journal.default_credit_account_id);

    if (found) {
      return found.name || found.account_name;
    }

    if (directNameMap[normName]) return directNameMap[normName];
    if (directNameMap[normType]) return directNameMap[normType];

    return "—";
  };

  const filteredJournals = journals.filter((journal) => {
    const accName = resolveDefaultAccount(journal);
    const matchesSearch = `${journal.name} ${journal.type} ${accName}`
      .toLowerCase()
      .includes(search.toLowerCase());
    return matchesSearch;
  });

  const openAddModal = () => {
    setEditJournalObj(null);
    // Find matching default account for 'Sales'
    const salesAcc = accounts.find((a) =>
      (a.name || a.account_name || "").toLowerCase().includes("sales income")
    );
    setForm({
      name: "",
      type: "Sales",
      defaultAccountId: salesAcc?.id ? String(salesAcc.id) : (accounts[0]?.id ? String(accounts[0].id) : ""),
      status: "Active",
    });
    setShowModal(true);
  };

  const openEditModal = (journal) => {
    setEditJournalObj(journal);
    let chosenAccId = journal.default_debit_account_id;
    if (journal.type.toLowerCase() === "sales" && journal.default_credit_account_id) {
      chosenAccId = journal.default_credit_account_id;
    }
    setForm({
      name: journal.name,
      type: journal.type,
      defaultAccountId: chosenAccId ? String(chosenAccId) : "",
      status: journal.status,
    });
    setShowModal(true);
  };

  const handleTypeChange = (newType) => {
    // Smartly suggest default account matching type
    let targetAcc = null;
    if (newType === "Sales") {
      targetAcc = accounts.find((a) =>
        (a.name || a.account_name || "").toLowerCase().includes("sales income")
      );
    } else if (newType === "Purchase") {
      targetAcc = accounts.find((a) =>
        (a.name || a.account_name || "").toLowerCase().includes("purchase expense")
      );
    } else if (newType === "Bank") {
      targetAcc = accounts.find((a) =>
        (a.name || a.account_name || "").toLowerCase().includes("bank")
      );
    } else if (newType === "Cash") {
      targetAcc = accounts.find((a) =>
        (a.name || a.account_name || "").toLowerCase().includes("cash")
      );
    }

    setForm((prev) => ({
      ...prev,
      type: newType,
      defaultAccountId: targetAcc?.id ? String(targetAcc.id) : prev.defaultAccountId,
    }));
  };

  const saveJournal = async (e) => {
    if (e) e.preventDefault();

    if (!form.name.trim()) {
      alert("Please enter Journal Name");
      return;
    }

    let defaultAccId = form.defaultAccountId
      ? Number(form.defaultAccountId)
      : accounts[0]?.id;

    if (!defaultAccId) {
      alert("Please select a Default Account from Chart of Accounts.");
      return;
    }

    let debitId = defaultAccId;
    let creditId = defaultAccId;

    if (form.type === "Sales") {
      creditId = defaultAccId;
      const debtors = accounts.find((a) =>
        (a.name || a.account_name || "").toLowerCase().includes("debtors")
      );
      debitId = debtors?.id || defaultAccId;
    } else if (form.type === "Purchase") {
      debitId = defaultAccId;
      const creditors = accounts.find((a) =>
        (a.name || a.account_name || "").toLowerCase().includes("creditors")
      );
      creditId = creditors?.id || defaultAccId;
    }

    setSubmitting(true);
    try {
      const payload = {
        journal_name: form.name.trim(),
        journal_type: form.type,
        default_debit_account_id: debitId,
        default_credit_account_id: creditId,
        is_active: form.status === "Active",
      };

      if (!editJournalObj) {
        await createJournal(payload);
      } else {
        await updateJournal(editJournalObj.id, payload);
      }

      setShowModal(false);
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
      setJournals((prev) => prev.filter((journal) => journal.id !== id));
    } catch (err) {
      alert(err.message);
    }
  };

  const getTypeStyle = (type) => {
    switch ((type || "").toLowerCase()) {
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
      {/* ── TOP BAR (Matching wireframe: [New] | [Search] | [Back]) ── */}
      <div
        className="journal-topbar"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          background: "#ffffff",
          padding: "12px 18px",
          borderRadius: "12px",
          border: "1px solid #cbd5e1",
          marginBottom: "20px",
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.04)",
          flexWrap: "wrap",
        }}
      >
        {/* Left: [New] Button */}
        <button
          type="button"
          onClick={openAddModal}
          style={{
            background: "#0284c7",
            color: "#ffffff",
            border: "none",
            padding: "8px 20px",
            borderRadius: "8px",
            fontSize: "13.5px",
            fontWeight: 700,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "6px",
            boxShadow: "0 2px 6px rgba(2, 132, 199, 0.3)",
          }}
        >
          <Plus size={16} /> New
        </button>

        {/* Center: Search input */}
        <div style={{ position: "relative", flex: 1, minWidth: "220px", maxWidth: "420px" }}>
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
            placeholder="Search journal name, type, default account..."
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

        {/* Right: [Back] Button matching wireframe */}
        <div style={{ marginLeft: "auto" }}>
          <button
            type="button"
            onClick={() => {
              if (onNavigate) onNavigate("Dashboard");
            }}
            style={{
              background: "#ffffff",
              border: "1.5px solid #cbd5e1",
              color: "#334155",
              padding: "7px 18px",
              borderRadius: "8px",
              fontSize: "13px",
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <ArrowLeft size={14} /> Back
          </button>
        </div>
      </div>

      {error && <Alert type="error" style={{ marginBottom: "16px" }}>{error}</Alert>}

      {/* ── JOURNALS (LIST VIEW) TABLE MATCHING WIREFRAME ── */}
      <div
        className="journal-list-card"
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
              Journals (List View)
            </h2>
            <p style={{ margin: "3px 0 0", fontSize: "12px", color: "#64748b" }}>
              Pre-configured accounting journals with default ledger accounts
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
            {filteredJournals.length} Journals
          </span>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table
            className="data-table"
            style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "13.5px" }}
          >
            <thead>
              <tr style={{ background: "#ffffff", borderBottom: "2px solid #cbd5e1", color: "#334155", fontWeight: 800 }}>
                <th style={{ padding: "14px 20px" }}>Journal Name</th>
                <th style={{ padding: "14px 20px" }}>Type</th>
                <th style={{ padding: "14px 20px" }}>Default Account</th>
                <th style={{ padding: "14px 20px", textAlign: "right" }}>Actions</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="4" style={{ textAlign: "center", padding: "40px", color: "#94a3b8" }}>
                    Loading accounting journals...
                  </td>
                </tr>
              ) : filteredJournals.length > 0 ? (
                filteredJournals.map((journal) => {
                  const styleTheme = getTypeStyle(journal.type);
                  const defaultAccName = resolveDefaultAccount(journal);
                  return (
                    <tr
                      key={journal.id}
                      style={{
                        borderBottom: "1px solid #f1f5f9",
                        transition: "background 0.15s ease",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fafc")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "#ffffff")}
                    >
                      {/* Journal Name (Clickable link) */}
                      <td style={{ padding: "14px 20px" }}>
                        <span
                          onClick={() => openEditModal(journal)}
                          title="Click to view & edit journal master"
                          style={{
                            fontWeight: 700,
                            color: "#0284c7",
                            cursor: "pointer",
                            textDecoration: "underline",
                            textUnderlineOffset: "3px",
                            fontSize: "14px",
                          }}
                        >
                          {journal.name}
                        </span>
                      </td>

                      {/* Type */}
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
                          {journal.type}
                        </span>
                      </td>

                      {/* Default Account */}
                      <td style={{ padding: "14px 20px", color: "#0f172a", fontWeight: 600 }}>
                        <span
                          style={{
                            background: "#f1f5f9",
                            padding: "4px 10px",
                            borderRadius: "6px",
                            border: "1px solid #e2e8f0",
                            fontSize: "13px",
                          }}
                        >
                          {defaultAccName}
                        </span>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: "14px 20px", textAlign: "right" }}>
                        <div style={{ display: "inline-flex", gap: "6px" }}>
                          <button
                            onClick={() => openEditModal(journal)}
                            title="Edit Journal"
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
                            onClick={() => deleteJournal(journal.id)}
                            title="Delete Journal"
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
                  <td colSpan="4" style={{ textAlign: "center", padding: "40px", color: "#94a3b8" }}>
                    No accounting journals found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── JOURNAL MASTER FORM VIEW MODAL (When Clicking on New) ── */}
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
            className="journal-master-modal"
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
                    setEditJournalObj(null);
                    setForm({
                      name: "",
                      type: "Sales",
                      defaultAccountId: accounts[0]?.id ? String(accounts[0].id) : "",
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
                  onClick={saveJournal}
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
                Journal Master Form View
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
            <form onSubmit={saveJournal} style={{ padding: "28px 24px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "22px" }}>
                {/* Journal Name */}
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
                    Journal Name
                  </label>
                  <input
                    name="name"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. Sales, Purchase, Bank, Cash..."
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

                {/* Journal Type (Selection from Sales, Purchase, Bank, Cash) */}
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
                    Journal Type
                  </label>
                  <select
                    value={form.type}
                    onChange={(e) => handleTypeChange(e.target.value)}
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
                    <option value="Sales">Sales</option>
                    <option value="Purchase">Purchase</option>
                    <option value="Bank">Bank</option>
                    <option value="Cash">Cash</option>
                  </select>
                </div>

                {/* Default Account (From Chart of Accounts Many to one) */}
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
                    Default Account
                  </label>
                  <select
                    value={form.defaultAccountId}
                    onChange={(e) => setForm({ ...form, defaultAccountId: e.target.value })}
                    required
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
                    <option value="">— Select from Chart of Accounts —</option>
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name || acc.account_name} ({acc.account_type || acc.type || "Account"})
                      </option>
                    ))}
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
                  <p style={{ margin: "0 0 6px 0", fontSize: "12px", color: "#475569", lineHeight: 1.5 }}>
                    <strong style={{ color: "#0284c7" }}>Journal Type:</strong> Select from{" "}
                    <strong>Sales</strong>, <strong>Purchase</strong>, <strong>Bank</strong>, or <strong>Cash</strong>.
                  </p>
                  <p style={{ margin: 0, fontSize: "12px", color: "#475569", lineHeight: 1.5 }}>
                    <strong style={{ color: "#0284c7" }}>Default Account:</strong> Linked Many-to-One
                    from <strong>Chart of Accounts</strong> for automatic ledger postings.
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