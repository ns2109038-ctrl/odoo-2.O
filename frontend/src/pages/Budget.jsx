import { useState } from "react";

function Budget() {
  const [budgets, setBudgets] = useState([
    {
      id: 1,
      name: "FY 2026-27 Sales Budget",
      period: "2026-27",
      department: "Sales",
      amount: 500000,
      revisedAmount: 550000,
      status: "Active",
    },
    {
      id: 2,
      name: "FY 2026-27 Purchase Budget",
      period: "2026-27",
      department: "Purchase",
      amount: 300000,
      revisedAmount: 320000,
      status: "Active",
    },
    {
      id: 3,
      name: "Administrative Expenses",
      period: "2026-27",
      department: "Administration",
      amount: 150000,
      revisedAmount: 145000,
      status: "Draft",
    },
    {
      id: 4,
      name: "Marketing Budget",
      period: "2026-27",
      department: "Marketing",
      amount: 100000,
      revisedAmount: 120000,
      status: "Active",
    },
  ]);

  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);

  const [form, setForm] = useState({
    name: "",
    period: "2026-27",
    department: "Sales",
    amount: "",
    revisedAmount: "",
    status: "Draft",
  });

  const filteredBudgets = budgets.filter(
    (budget) =>
      budget.name.toLowerCase().includes(search.toLowerCase()) ||
      budget.department.toLowerCase().includes(search.toLowerCase()) ||
      budget.period.toLowerCase().includes(search.toLowerCase())
  );

  const totalOriginal = budgets.reduce(
    (total, budget) => total + Number(budget.amount),
    0
  );

  const totalRevised = budgets.reduce(
    (total, budget) => total + Number(budget.revisedAmount),
    0
  );

  const activeBudgets = budgets.filter(
    (budget) => budget.status === "Active"
  ).length;

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const resetForm = () => {
    setForm({
      name: "",
      period: "2026-27",
      department: "Sales",
      amount: "",
      revisedAmount: "",
      status: "Draft",
    });
  };

  const handleSave = (e) => {
    e.preventDefault();

    if (!form.name.trim()) {
      alert("Please enter budget name.");
      return;
    }

    if (!form.amount || Number(form.amount) <= 0) {
      alert("Please enter a valid original budget amount.");
      return;
    }

    if (
      form.revisedAmount === "" ||
      Number(form.revisedAmount) < 0
    ) {
      alert("Please enter a valid revised budget amount.");
      return;
    }

    const newBudget = {
      id: Date.now(),
      name: form.name,
      period: form.period,
      department: form.department,
      amount: Number(form.amount),
      revisedAmount: Number(form.revisedAmount),
      status: form.status,
    };

    setBudgets([newBudget, ...budgets]);

    resetForm();
    setShowForm(false);
  };

  const deleteBudget = (id) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this budget?"
    );

    if (!confirmDelete) {
      return;
    }

    setBudgets(
      budgets.filter((budget) => budget.id !== id)
    );
  };

  return (
    <div className="module-page">
      <div className="page-header">
        <div>
          <h1>Budget</h1>
          <p>
            Create, manage and monitor original and revised budgets.
          </p>
        </div>

        <button
          className="primary-btn"
          onClick={() => setShowForm(true)}
        >
          + Create Budget
        </button>
      </div>

      {/* SUMMARY CARDS */}

      <div className="account-summary">
        <div className="account-summary-card">
          <div>
            <span>Total Budgets</span>
            <strong>{budgets.length}</strong>
          </div>

          <div className="account-summary-icon">
            $
          </div>
        </div>

        <div className="account-summary-card">
          <div>
            <span>Original Budget</span>
            <strong>
              ₹{totalOriginal.toLocaleString("en-IN")}
            </strong>
          </div>

          <div className="account-summary-icon">
            O
          </div>
        </div>

        <div className="account-summary-card">
          <div>
            <span>Revised Budget</span>
            <strong>
              ₹{totalRevised.toLocaleString("en-IN")}
            </strong>
          </div>

          <div className="account-summary-icon">
            R
          </div>
        </div>

        <div className="account-summary-card">
          <div>
            <span>Active Budgets</span>
            <strong>{activeBudgets}</strong>
          </div>

          <div className="account-summary-icon">
            ✓
          </div>
        </div>
      </div>

      {/* TOOLBAR */}

      <div className="module-toolbar">
        <input
          type="text"
          placeholder="Search budgets..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <div className="contact-count">
          Total Budgets:{" "}
          <strong>{filteredBudgets.length}</strong>
        </div>
      </div>

      {/* TABLE */}

      <div className="module-card">
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Budget Name</th>
                <th>Period</th>
                <th>Department</th>
                <th>Original Budget</th>
                <th>Revised Budget</th>
                <th>Difference</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {filteredBudgets.length > 0 ? (
                filteredBudgets.map((budget) => {
                  const difference =
                    budget.revisedAmount - budget.amount;

                  return (
                    <tr key={budget.id}>
                      <td>
                        <strong>{budget.name}</strong>
                      </td>

                      <td>{budget.period}</td>

                      <td>
                        <span className="badge blue">
                          {budget.department}
                        </span>
                      </td>

                      <td>
                        ₹
                        {budget.amount.toLocaleString(
                          "en-IN"
                        )}
                      </td>

                      <td>
                        ₹
                        {budget.revisedAmount.toLocaleString(
                          "en-IN"
                        )}
                      </td>

                      <td>
                        <span
                          className={
                            difference > 0
                              ? "budget-positive"
                              : difference < 0
                              ? "budget-negative"
                              : "budget-neutral"
                          }
                        >
                          {difference > 0 ? "+" : ""}
                          ₹
                          {difference.toLocaleString(
                            "en-IN"
                          )}
                        </span>
                      </td>

                      <td>
                        <span
                          className={
                            budget.status === "Active"
                              ? "badge green"
                              : "badge orange"
                          }
                        >
                          {budget.status}
                        </span>
                      </td>

                      <td>
                        <button
                          className="delete-btn"
                          onClick={() =>
                            deleteBudget(budget.id)
                          }
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td
                    colSpan="8"
                    className="empty-state"
                  >
                    No budgets found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE BUDGET MODAL */}

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
              <div>
                <h2>Create Budget</h2>
                <p>
                  Add original and revised budget details.
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
              <div className="form-grid">
                <div className="form-group">
                  <label>Budget Name</label>

                  <input
                    type="text"
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    placeholder="Example: FY 2026-27 Sales Budget"
                  />
                </div>

                <div className="form-group">
                  <label>Budget Period</label>

                  <select
                    name="period"
                    value={form.period}
                    onChange={handleChange}
                  >
                    <option value="2026-27">
                      2026-27
                    </option>

                    <option value="2027-28">
                      2027-28
                    </option>

                    <option value="2028-29">
                      2028-29
                    </option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Department</label>

                  <select
                    name="department"
                    value={form.department}
                    onChange={handleChange}
                  >
                    <option value="Sales">
                      Sales
                    </option>

                    <option value="Purchase">
                      Purchase
                    </option>

                    <option value="Administration">
                      Administration
                    </option>

                    <option value="Marketing">
                      Marketing
                    </option>

                    <option value="Finance">
                      Finance
                    </option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Status</label>

                  <select
                    name="status"
                    value={form.status}
                    onChange={handleChange}
                  >
                    <option value="Draft">
                      Draft
                    </option>

                    <option value="Active">
                      Active
                    </option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Original Budget</label>

                  <input
                    type="number"
                    min="0"
                    name="amount"
                    value={form.amount}
                    onChange={handleChange}
                    placeholder="Enter original amount"
                  />
                </div>

                <div className="form-group">
                  <label>Revised Budget</label>

                  <input
                    type="number"
                    min="0"
                    name="revisedAmount"
                    value={form.revisedAmount}
                    onChange={handleChange}
                    placeholder="Enter revised amount"
                  />
                </div>
              </div>

              <div className="budget-preview">
                <div>
                  <span>Original Budget</span>

                  <strong>
                    ₹
                    {Number(
                      form.amount || 0
                    ).toLocaleString("en-IN")}
                  </strong>
                </div>

                <div>
                  <span>Revised Budget</span>

                  <strong>
                    ₹
                    {Number(
                      form.revisedAmount || 0
                    ).toLocaleString("en-IN")}
                  </strong>
                </div>

                <div>
                  <span>Difference</span>

                  <strong>
                    ₹
                    {(
                      Number(form.revisedAmount || 0) -
                      Number(form.amount || 0)
                    ).toLocaleString("en-IN")}
                  </strong>
                </div>
              </div>

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
                  Save Budget
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Budget;