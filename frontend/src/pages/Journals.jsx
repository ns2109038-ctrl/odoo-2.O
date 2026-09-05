import { useState } from "react";

function Journals() {
  const [journals, setJournals] = useState([
    {
      id: 1,
      code: "SALES",
      name: "Sales Journal",
      type: "Sales",
      shortCode: "SAL",
      status: "Active",
    },
    {
      id: 2,
      code: "PURCHASE",
      name: "Purchase Journal",
      type: "Purchase",
      shortCode: "PUR",
      status: "Active",
    },
    {
      id: 3,
      code: "CASH",
      name: "Cash Journal",
      type: "Cash",
      shortCode: "CSH",
      status: "Active",
    },
    {
      id: 4,
      code: "BANK",
      name: "Bank Journal",
      type: "Bank",
      shortCode: "BNK",
      status: "Active",
    },
  ]);

  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);

  const [form, setForm] = useState({
    code: "",
    name: "",
    type: "Sales",
    shortCode: "",
    status: "Active",
  });

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

  const addJournal = (e) => {
    e.preventDefault();

    if (!form.code.trim() || !form.name.trim()) {
      alert("Please enter Journal Code and Journal Name");
      return;
    }

    const newJournal = {
      id: Date.now(),
      ...form,
    };

    setJournals([...journals, newJournal]);

    setForm({
      code: "",
      name: "",
      type: "Sales",
      shortCode: "",
      status: "Active",
    });

    setShowForm(false);
  };

  const deleteJournal = (id) => {
    setJournals(
      journals.filter((journal) => journal.id !== id)
    );
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
              {filteredJournals.length > 0 ? (
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
                  <label>Journal Code</label>

                  <input
                    name="code"
                    value={form.code}
                    onChange={handleChange}
                    placeholder="Example: SALES"
                  />
                </div>

                <div className="form-group">
                  <label>Journal Name</label>

                  <input
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    placeholder="Example: Sales Journal"
                  />
                </div>

                <div className="form-group">
                  <label>Journal Type</label>

                  <select
                    name="type"
                    value={form.type}
                    onChange={handleChange}
                  >
                    <option>Sales</option>
                    <option>Purchase</option>
                    <option>Cash</option>
                    <option>Bank</option>
                    <option>General</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Short Code</label>

                  <input
                    name="shortCode"
                    value={form.shortCode}
                    onChange={handleChange}
                    placeholder="Example: SAL"
                  />
                </div>

                <div className="form-group">
                  <label>Status</label>

                  <select
                    name="status"
                    value={form.status}
                    onChange={handleChange}
                  >
                    <option>Active</option>
                    <option>Inactive</option>
                  </select>
                </div>

              </div>

              <div className="form-actions">

                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => setShowForm(false)}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="primary-btn"
                >
                  Save Journal
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