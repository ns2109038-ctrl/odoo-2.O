import { useState, useEffect } from "react";
import { getJournals, getAccounts, createJournal, deleteJournal as deleteJournalApi } from "../lib/api.js";
import Alert from "../components/ui/Alert.jsx";

function Journals() {
  const [journals, setJournals] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
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

  const filteredJournals = journals.filter(
    (journal) =>
      journal.name.toLowerCase().includes(search.toLowerCase()) ||
      journal.code.toLowerCase().includes(search.toLowerCase())
  );

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

  return (
    <div className="module-page">
      {/* PAGE HEADER */}
      <div className="page-header">
        <div>
          <h1>Journals</h1>
          <p>
            Manage accounting journals for sales, purchases,
            cash and bank transactions.
          </p>
        </div>

        <button
          className="primary-btn"
          onClick={() => setShowForm(true)}
        >
          + Add Journal
        </button>
      </div>

      {error && <Alert type="error" style={{ marginBottom: "16px" }}>{error}</Alert>}

      {/* TOOLBAR */}
      <div className="module-toolbar">
        <input
          type="text"
          placeholder="Search journals..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <div className="contact-count">
          Total Journals:{" "}
          <strong>{filteredJournals.length}</strong>
        </div>
      </div>

      {/* TABLE */}
      <div className="module-card">
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Journal Name</th>
                <th>Type</th>
                <th>Short Code</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" className="empty-state">
                    Loading journals...
                  </td>
                </tr>
              ) : filteredJournals.length > 0 ? (
                filteredJournals.map((journal) => (
                  <tr key={journal.id}>
                    <td>
                      <strong>{journal.code}</strong>
                    </td>

                    <td>{journal.name}</td>

                    <td>
                      <span className="badge blue">
                        {journal.type}
                      </span>
                    </td>

                    <td>{journal.shortCode}</td>

                    <td>
                      <span
                        className={
                          journal.status === "Active"
                            ? "badge green"
                            : "badge red"
                        }
                      >
                        {journal.status}
                      </span>
                    </td>

                    <td>
                      <button
                        className="delete-btn"
                        onClick={() =>
                          deleteJournal(journal.id)
                        }
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan="6"
                    className="empty-state"
                  >
                    No journals found
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
        >
          <div
            className="modal-box"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2>Add Journal</h2>

              <button
                className="close-btn"
                onClick={() => setShowForm(false)}
              >
                ×
              </button>
            </div>

            <form onSubmit={addJournal}>
              <div className="form-grid">
                <div className="form-group">
                  <label>Journal Name *</label>
                  <input
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    placeholder="Example: Sales Journal"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Journal Type</label>
                  <select
                    name="type"
                    value={form.type}
                    onChange={handleChange}
                  >
                    <option value="Sales">Sales</option>
                    <option value="Purchase">Purchase</option>
                    <option value="Cash">Cash</option>
                    <option value="Bank">Bank</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Default Debit Account</label>
                  <select
                    name="defaultDebitAccountId"
                    value={form.defaultDebitAccountId}
                    onChange={handleChange}
                  >
                    <option value="">— Select Account —</option>
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.code} - {a.name || a.account_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Default Credit Account</label>
                  <select
                    name="defaultCreditAccountId"
                    value={form.defaultCreditAccountId}
                    onChange={handleChange}
                  >
                    <option value="">— Select Account —</option>
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.code} - {a.name || a.account_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Status</label>
                  <select
                    name="status"
                    value={form.status}
                    onChange={handleChange}
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => setShowForm(false)}
                  disabled={submitting}
                >
                  Cancel
                </button>

                <button type="submit" className="primary-btn" disabled={submitting}>
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