import { useState, useEffect } from "react";
import { getJournalEntries, getJournals, getAccounts, createJournalEntry, postJournalEntry, cancelJournalEntry } from "../lib/api.js";
import Alert from "../components/ui/Alert.jsx";

function JournalEntries() {
  const [entries, setEntries] = useState([]);
  const [journals, setJournals] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    date: new Date().toISOString().split("T")[0],
    journal_id: "",
    reference: "",
    description: "",
  });

  const [lines, setLines] = useState([
    {
      id: 1,
      account: "",
      description: "",
      debit: "",
      credit: "",
    },
    {
      id: 2,
      account: "",
      description: "",
      debit: "",
      credit: "",
    },
  ]);

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const [eData, jData, aData] = await Promise.all([
        getJournalEntries(),
        getJournals(),
        getAccounts(),
      ]);

      const mapped = (eData || []).map((entry) => ({
        id: entry.id,
        number: `JE-${String(entry.id).padStart(4, "0")}`,
        date: entry.entry_date || entry.date || "",
        journal: entry.journal?.journal_name || "General",
        reference: entry.reference || "-",
        description: entry.description || "-",
        debit: Number(entry.total_debit || 0),
        credit: Number(entry.total_credit || 0),
        status: entry.status ? entry.status.charAt(0).toUpperCase() + entry.status.slice(1) : "Draft",
      }));

      setEntries(mapped);
      setJournals(jData || []);
      setAccounts(aData || []);
      if (jData && jData.length > 0 && !form.journal_id) {
        setForm((f) => ({ ...f, journal_id: String(jData[0].id) }));
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredEntries = entries.filter(
    (entry) =>
      entry.number.toLowerCase().includes(search.toLowerCase()) ||
      entry.journal.toLowerCase().includes(search.toLowerCase()) ||
      entry.reference.toLowerCase().includes(search.toLowerCase()) ||
      entry.description.toLowerCase().includes(search.toLowerCase())
  );

  const totalDebit = lines.reduce(
    (total, line) => total + Number(line.debit || 0),
    0
  );

  const totalCredit = lines.reduce(
    (total, line) => total + Number(line.credit || 0),
    0
  );

  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.001 && totalDebit > 0;

  const handleFormChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleLineChange = (id, field, value) => {
    setLines(
      lines.map((line) =>
        line.id === id
          ? {
              ...line,
              [field]: value,
            }
          : line
      )
    );
  };

  const addLine = () => {
    setLines([
      ...lines,
      {
        id: Date.now(),
        account: "",
        description: "",
        debit: "",
        credit: "",
      },
    ]);
  };

  const removeLine = (id) => {
    if (lines.length <= 2) {
      alert("At least two journal lines are required.");
      return;
    }
    setLines(lines.filter((line) => line.id !== id));
  };

  const resetForm = () => {
    setForm({
      date: new Date().toISOString().split("T")[0],
      journal_id: journals[0]?.id ? String(journals[0].id) : "",
      reference: "",
      description: "",
    });

    setLines([
      {
        id: 1,
        account: "",
        description: "",
        debit: "",
        credit: "",
      },
      {
        id: 2,
        account: "",
        description: "",
        debit: "",
        credit: "",
      },
    ]);
  };

  const handleSave = async (e) => {
    e.preventDefault();

    if (!form.date) {
      alert("Please select a date.");
      return;
    }

    if (!form.description.trim()) {
      alert("Please enter journal description.");
      return;
    }

    if (!isBalanced) {
      alert("Journal Entry is not balanced. Debit and Credit must be equal and greater than 0.");
      return;
    }

    const journalId = form.journal_id ? Number(form.journal_id) : journals[0]?.id;
    if (!journalId) {
      alert("Please select or create a journal first.");
      return;
    }

    const payloadLines = [];
    for (const l of lines) {
      if (!l.account) {
        alert("All lines must have an account selected.");
        return;
      }
      payloadLines.push({
        account_id: Number(l.account),
        description: l.description || form.description,
        debit: Number(l.debit || 0),
        credit: Number(l.credit || 0),
      });
    }

    setSubmitting(true);
    try {
      await createJournalEntry({
        journal_id: journalId,
        entry_date: form.date,
        reference: form.reference || null,
        description: form.description.trim(),
        status: "draft",
        lines: payloadLines,
      });

      resetForm();
      setShowForm(false);
      await loadData();
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handlePost = async (id) => {
    try {
      await postJournalEntry(id);
      await loadData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleCancel = async (id) => {
    try {
      await cancelJournalEntry(id);
      await loadData();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="module-page">
      {/* PAGE HEADER */}
      <div className="page-header">
        <div>
          <h1>Journal Entries</h1>
          <p>Create and manage accounting journal entries.</p>
        </div>

        <button
          className="primary-btn"
          onClick={() => setShowForm(true)}
        >
          + Create Journal Entry
        </button>
      </div>

      {error && <Alert type="error" style={{ marginBottom: "16px" }}>{error}</Alert>}

      {/* TOOLBAR */}
      <div className="module-toolbar">
        <input
          type="text"
          placeholder="Search journal entries..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <div className="contact-count">
          Total Entries: <strong>{filteredEntries.length}</strong>
        </div>
      </div>

      {/* TABLE */}
      <div className="module-card">
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Entry Number</th>
                <th>Date</th>
                <th>Journal</th>
                <th>Reference</th>
                <th>Description</th>
                <th>Debit</th>
                <th>Credit</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="9" className="empty-state">
                    Loading journal entries...
                  </td>
                </tr>
              ) : filteredEntries.length > 0 ? (
                filteredEntries.map((entry) => (
                  <tr key={entry.id}>
                    <td>
                      <strong>{entry.number}</strong>
                    </td>

                    <td>{entry.date}</td>

                    <td>
                      <span className="badge blue">{entry.journal}</span>
                    </td>

                    <td>{entry.reference}</td>

                    <td>{entry.description}</td>

                    <td>₹{entry.debit.toLocaleString("en-IN")}</td>

                    <td>₹{entry.credit.toLocaleString("en-IN")}</td>

                    <td>
                      <span
                        className={
                          entry.status === "Posted"
                            ? "status-active"
                            : entry.status === "Draft"
                            ? "badge orange"
                            : "status-inactive"
                        }
                      >
                        {entry.status}
                      </span>
                    </td>

                    <td>
                      {entry.status === "Draft" ? (
                        <button
                          className="small-btn"
                          onClick={() => handlePost(entry.id)}
                        >
                          Post
                        </button>
                      ) : entry.status === "Posted" ? (
                        <button
                          className="delete-btn"
                          onClick={() => handleCancel(entry.id)}
                        >
                          Cancel
                        </button>
                      ) : (
                        "-"
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="9" className="empty-state">
                    No journal entries found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE MODAL */}
      {showForm && (
        <div
          className="modal-overlay"
          onClick={() => {
            resetForm();
            setShowForm(false);
          }}
        >
          <div
            className="modal-box"
            style={{ maxWidth: "800px" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <h2>Create Journal Entry</h2>
                <p>Enter debit and credit details.</p>
              </div>

              <button
                className="close-btn"
                onClick={() => {
                  resetForm();
                  setShowForm(false);
                }}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSave}>
              {/* BASIC INFORMATION */}
              <div className="form-grid">
                <div className="form-group">
                  <label>Date</label>
                  <input
                    type="date"
                    name="date"
                    value={form.date}
                    onChange={handleFormChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Journal</label>
                  <select
                    name="journal_id"
                    value={form.journal_id}
                    onChange={handleFormChange}
                    required
                  >
                    {journals.map((j) => (
                      <option key={j.id} value={j.id}>
                        {j.journal_name} ({j.journal_type})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Reference</label>
                  <input
                    type="text"
                    name="reference"
                    value={form.reference}
                    onChange={handleFormChange}
                    placeholder="Example: SO-001"
                  />
                </div>

                <div className="form-group">
                  <label>Description</label>
                  <input
                    type="text"
                    name="description"
                    value={form.description}
                    onChange={handleFormChange}
                    placeholder="Enter journal description"
                    required
                  />
                </div>
              </div>

              {/* JOURNAL LINES */}
              <div style={{ marginTop: "16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <div>
                    <h3>Journal Lines</h3>
                    <small style={{ color: "#64748b" }}>Debit and Credit amounts must be equal.</small>
                  </div>

                  <button
                    type="button"
                    className="secondary-btn"
                    onClick={addLine}
                  >
                    + Add Line
                  </button>
                </div>

                <div className="table-wrapper">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Account</th>
                        <th>Description</th>
                        <th>Debit</th>
                        <th>Credit</th>
                        <th></th>
                      </tr>
                    </thead>

                    <tbody>
                      {lines.map((line) => (
                        <tr key={line.id}>
                          <td>
                            <select
                              value={line.account}
                              onChange={(e) =>
                                handleLineChange(
                                  line.id,
                                  "account",
                                  e.target.value
                                )
                              }
                              required
                            >
                              <option value="">Select Account</option>
                              {accounts.map((a) => (
                                <option key={a.id} value={a.id}>
                                  {a.code} - {a.name || a.account_name}
                                </option>
                              ))}
                            </select>
                          </td>

                          <td>
                            <input
                              type="text"
                              value={line.description}
                              placeholder="Line description"
                              onChange={(e) =>
                                handleLineChange(
                                  line.id,
                                  "description",
                                  e.target.value
                                )
                              }
                            />
                          </td>

                          <td>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={line.debit}
                              placeholder="0.00"
                              onChange={(e) =>
                                handleLineChange(
                                  line.id,
                                  "debit",
                                  e.target.value
                                )
                              }
                            />
                          </td>

                          <td>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={line.credit}
                              placeholder="0.00"
                              onChange={(e) =>
                                handleLineChange(
                                  line.id,
                                  "credit",
                                  e.target.value
                                )
                              }
                            />
                          </td>

                          <td>
                            <button
                              type="button"
                              className="delete-btn"
                              onClick={() => removeLine(line.id)}
                            >
                              ×
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>

                    <tfoot>
                      <tr>
                        <th colSpan="2">Total</th>
                        <th>₹{totalDebit.toLocaleString("en-IN")}</th>
                        <th>₹{totalCredit.toLocaleString("en-IN")}</th>
                        <th>
                          <span className={isBalanced ? "badge green" : "badge red"}>
                            {isBalanced ? "Balanced" : "Unbalanced"}
                          </span>
                        </th>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              <div className="form-actions" style={{ marginTop: "20px" }}>
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => {
                    resetForm();
                    setShowForm(false);
                  }}
                  disabled={submitting}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="primary-btn"
                  disabled={submitting || !isBalanced}
                >
                  {submitting ? "Saving..." : "Save Entry"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default JournalEntries;