import { useState } from "react";

function JournalEntries() {
  const [entries, setEntries] = useState([
    {
      id: 1,
      number: "JE-0001",
      date: "05-09-2026",
      journal: "Sales Journal",
      reference: "SO-001",
      description: "Sales transaction",
      debit: 45000,
      credit: 45000,
      status: "Posted",
    },
    {
      id: 2,
      number: "JE-0002",
      date: "05-09-2026",
      journal: "Purchase Journal",
      reference: "PO-002",
      description: "Purchase transaction",
      debit: 32500,
      credit: 32500,
      status: "Posted",
    },
    {
      id: 3,
      number: "JE-0003",
      date: "04-09-2026",
      journal: "Cash Journal",
      reference: "PAY-003",
      description: "Customer payment received",
      debit: 25000,
      credit: 25000,
      status: "Draft",
    },
  ]);

  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);

  const [form, setForm] = useState({
    date: "",
    journal: "Sales Journal",
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

  const isBalanced = totalDebit === totalCredit && totalDebit > 0;

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
      date: "",
      journal: "Sales Journal",
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

  const handleSave = (e) => {
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
      alert("Journal Entry is not balanced. Debit and Credit must be equal.");
      return;
    }

    const newEntry = {
      id: Date.now(),
      number: `JE-${String(entries.length + 1).padStart(4, "0")}`,
      date: form.date,
      journal: form.journal,
      reference: form.reference || "-",
      description: form.description,
      debit: totalDebit,
      credit: totalCredit,
      status: "Draft",
    };

    setEntries([newEntry, ...entries]);

    resetForm();
    setShowForm(false);
  };

  const deleteEntry = (id) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this journal entry?"
    );

    if (!confirmDelete) {
      return;
    }

    setEntries(
      entries.filter((entry) => entry.id !== id)
    );
  };

  return (
    <div className="module-page">

      {/* PAGE HEADER */}
      <div className="page-header">
        <div>
          <h1>Journal Entries</h1>
          <p>
            Create and manage accounting journal entries.
          </p>
        </div>

        <button
          className="primary-btn"
          onClick={() => setShowForm(true)}
        >
          + Create Journal Entry
        </button>
      </div>

      {/* TOOLBAR */}
      <div className="module-toolbar">

        <input
          type="text"
          placeholder="Search journal entries..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <div className="contact-count">
          Total Entries:{" "}
          <strong>{filteredEntries.length}</strong>
        </div>

      </div>

      {/* TABLE */}
      <div className="module-card">

        <div className="table-wrapper">

          <table className="data-table">

            <thead>
              <tr>
                <th>Entry No.</th>
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

              {filteredEntries.length > 0 ? (
                filteredEntries.map((entry) => (
                  <tr key={entry.id}>

                    <td>
                      <strong>{entry.number}</strong>
                    </td>

                    <td>{entry.date}</td>

                    <td>
                      <span className="badge blue">
                        {entry.journal}
                      </span>
                    </td>

                    <td>{entry.reference}</td>

                    <td>{entry.description}</td>

                    <td>
                      ₹{entry.debit.toLocaleString("en-IN")}
                    </td>

                    <td>
                      ₹{entry.credit.toLocaleString("en-IN")}
                    </td>

                    <td>
                      <span
                        className={
                          entry.status === "Posted"
                            ? "badge green"
                            : "badge orange"
                        }
                      >
                        {entry.status}
                      </span>
                    </td>

                    <td>
                      <button
                        className="delete-btn"
                        onClick={() =>
                          deleteEntry(entry.id)
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
                    colSpan="9"
                    className="empty-state"
                  >
                    No journal entries found.
                  </td>
                </tr>
              )}

            </tbody>

          </table>

        </div>

      </div>

      {/* CREATE JOURNAL ENTRY MODAL */}
      {showForm && (
        <div
          className="modal-overlay"
          onClick={() => setShowForm(false)}
        >

          <div
            className="modal-box journal-entry-modal"
            onClick={(e) => e.stopPropagation()}
          >

            {/* MODAL HEADER */}
            <div className="modal-header">

              <div>
                <h2>Create Journal Entry</h2>
                <p>
                  Enter debit and credit details.
                </p>
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
              <div className="journal-basic-grid">

                <div className="form-group">
                  <label>Date</label>

                  <input
                    type="date"
                    name="date"
                    value={form.date}
                    onChange={handleFormChange}
                  />
                </div>

                <div className="form-group">
                  <label>Journal</label>

                  <select
                    name="journal"
                    value={form.journal}
                    onChange={handleFormChange}
                  >
                    <option>Sales Journal</option>
                    <option>Purchase Journal</option>
                    <option>Cash Journal</option>
                    <option>Bank Journal</option>
                    <option>General Journal</option>
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

                <div className="form-group journal-description">
                  <label>Description</label>

                  <input
                    type="text"
                    name="description"
                    value={form.description}
                    onChange={handleFormChange}
                    placeholder="Enter journal description"
                  />
                </div>

              </div>

              {/* JOURNAL LINES */}
              <div className="journal-lines-section">

                <div className="journal-lines-header">

                  <div>
                    <h3>Journal Lines</h3>
                    <p>
                      Debit and Credit amount must be equal.
                    </p>
                  </div>

                  <button
                    type="button"
                    className="secondary-btn"
                    onClick={addLine}
                  >
                    + Add Line
                  </button>

                </div>

                <div className="journal-lines-table-wrapper">

                  <table className="journal-lines-table">

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
                            >
                              <option value="">
                                Select Account
                              </option>

                              <option value="1001">
                                1001 - Cash
                              </option>

                              <option value="1002">
                                1002 - Bank Account
                              </option>

                              <option value="1101">
                                1101 - Accounts Receivable
                              </option>

                              <option value="2001">
                                2001 - Accounts Payable
                              </option>

                              <option value="3001">
                                3001 - Capital Account
                              </option>

                              <option value="4001">
                                4001 - Sales Income
                              </option>

                              <option value="5001">
                                5001 - Purchase Expense
                              </option>
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
                              className="line-delete-btn"
                              onClick={() =>
                                removeLine(line.id)
                              }
                            >
                              ×
                            </button>
                          </td>

                        </tr>
                      ))}

                    </tbody>

                    <tfoot>

                      <tr>

                        <td
                          colSpan="2"
                          className="total-label"
                        >
                          Total
                        </td>

                        <td className="total-amount">
                          ₹
                          {totalDebit.toLocaleString(
                            "en-IN"
                          )}
                        </td>

                        <td className="total-amount">
                          ₹
                          {totalCredit.toLocaleString(
                            "en-IN"
                          )}
                        </td>

                        <td></td>

                      </tr>

                    </tfoot>

                  </table>

                </div>

                {/* BALANCE WARNING */}
                <div
                  className={
                    isBalanced
                      ? "journal-balance balanced"
                      : "journal-balance unbalanced"
                  }
                >

                  {isBalanced ? (
                    <>
                      <span>✓</span>
                      <div>
                        <strong>
                          Journal Entry is Balanced
                        </strong>
                        <small>
                          Total Debit and Total Credit
                          are equal.
                        </small>
                      </div>
                    </>
                  ) : (
                    <>
                      <span>!</span>
                      <div>
                        <strong>
                          Journal Entry is Not Balanced
                        </strong>
                        <small>
                          Total Debit and Total Credit
                          must be equal before saving.
                        </small>
                      </div>
                    </>
                  )}

                </div>

              </div>

              {/* FORM ACTIONS */}
              <div className="form-actions">

                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => {
                    resetForm();
                    setShowForm(false);
                  }}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="primary-btn"
                >
                  Save Journal Entry
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