import { useState, useEffect } from "react";
import { getBudgets, getAccounts, getAnalyticAccounts, createBudget, activateBudget, closeBudget, deleteBudget as deleteBudgetApi } from "../lib/api.js";
import Alert from "../components/ui/Alert.jsx";

function Budget() {
  const [budgets, setBudgets] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [analytics, setAnalytics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    name: "",
    period: "2026-27",
    department: "Sales",
    account_id: "",
    analytic_account_id: "",
    amount: "",
    status: "Draft",
  });

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const [bData, aData, anData] = await Promise.all([
        getBudgets(),
        getAccounts(),
        getAnalyticAccounts(),
      ]);

      const mapped = (bData || []).map((b) => ({
        id: b.id,
        name: b.name,
        period: `${b.start_date || "2026"} to ${b.end_date || "2027"}`,
        department: b.analytic_account?.name || "General",
        amount: Number(b.planned || b.total_amount || 0),
        revisedAmount: Number(b.actual || 0),
        status: b.status ? b.status.charAt(0).toUpperCase() + b.status.slice(1) : "Draft",
      }));

      setBudgets(mapped);
      setAccounts(aData || []);
      setAnalytics(anData?.data || anData || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

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
      account_id: accounts[0]?.id ? String(accounts[0].id) : "",
      analytic_account_id: "",
      amount: "",
      status: "Draft",
    });
  };

  const handleSave = async (e) => {
    e.preventDefault();

    if (!form.name.trim()) {
      alert("Please enter budget name.");
      return;
    }

    if (!form.amount || Number(form.amount) <= 0) {
      alert("Please enter a valid planned budget amount.");
      return;
    }

    const accountId = form.account_id ? Number(form.account_id) : accounts[0]?.id;
    if (!accountId) {
      alert("Please select or create an account first.");
      return;
    }

    setSubmitting(true);
    try {
      const budgetRes = await createBudget({
        name: form.name.trim(),
        analytic_account_id: form.analytic_account_id ? Number(form.analytic_account_id) : null,
        start_date: "2026-04-01",
        end_date: "2027-03-31",
        lines: [
          {
            account_id: accountId,
            planned_amount: Number(form.amount),
            period: form.period,
          },
        ],
      });

      if (form.status === "Active" && budgetRes?.id) {
        await activateBudget(budgetRes.id);
      }

      resetForm();
      setShowForm(false);
      await loadData();
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleActivate = async (id) => {
    try {
      await activateBudget(id);
      await loadData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleClose = async (id) => {
    try {
      await closeBudget(id);
      await loadData();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="module-page">
      <div className="page-header">
        <div>
          <h1>Budget</h1>
          <p>Create, manage and monitor original and revised budgets.</p>
        </div>

        <button
          className="primary-btn"
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
        >
          + Create Budget
        </button>
      </div>

      {error && <Alert type="error" style={{ marginBottom: "16px" }}>{error}</Alert>}

      {/* SUMMARY CARDS */}
      <div className="account-summary">
        <div className="account-summary-card">
          <div>
            <span>Total Budgets</span>
            <strong>{budgets.length}</strong>
          </div>
          <div className="account-summary-icon">₹</div>
        </div>

        <div className="account-summary-card">
          <div>
            <span>Planned Budget</span>
            <strong>₹{totalOriginal.toLocaleString("en-IN")}</strong>
          </div>
          <div className="account-summary-icon">P</div>
        </div>

        <div className="account-summary-card">
          <div>
            <span>Actual Spend</span>
            <strong>₹{totalRevised.toLocaleString("en-IN")}</strong>
          </div>
          <div className="account-summary-icon">A</div>
        </div>

        <div className="account-summary-card">
          <div>
            <span>Active Budgets</span>
            <strong>{activeBudgets}</strong>
          </div>
          <div className="account-summary-icon">✓</div>
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
          Total Budgets: <strong>{filteredBudgets.length}</strong>
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
                <th>Department / Analytic</th>
                <th>Planned Budget</th>
                <th>Actual Spend</th>
                <th>Variance</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr><td colSpan="8" className="empty-state">Loading budgets...</td></tr>
              ) : filteredBudgets.length > 0 ? (
                filteredBudgets.map((budget) => {
                  const difference = budget.amount - budget.revisedAmount;

                  return (
                    <tr key={budget.id}>
                      <td><strong>{budget.name}</strong></td>
                      <td>{budget.period}</td>
                      <td>
                        <span className="badge blue">{budget.department}</span>
                      </td>
                      <td>₹{budget.amount.toLocaleString("en-IN")}</td>
                      <td>₹{budget.revisedAmount.toLocaleString("en-IN")}</td>
                      <td>
                        <span className={difference >= 0 ? "budget-positive" : "budget-negative"}>
                          {difference >= 0 ? "+" : ""}₹{difference.toLocaleString("en-IN")}
                        </span>
                      </td>
                      <td>
                        <span className={budget.status === "Active" ? "badge green" : "badge orange"}>
                          {budget.status}
                        </span>
                      </td>
                      <td>
                        {budget.status === "Draft" ? (
                          <button className="small-btn" onClick={() => handleActivate(budget.id)}>
                            Activate
                          </button>
                        ) : budget.status === "Active" ? (
                          <button className="delete-btn" onClick={() => handleClose(budget.id)}>
                            Close
                          </button>
                        ) : (
                          "-"
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr><td colSpan="8" className="empty-state">No budgets found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE BUDGET MODAL */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2>Create Budget</h2>
                <p>Add planned budget details.</p>
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
                  <label>Budget Name *</label>
                  <input
                    type="text"
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    placeholder="Example: FY 2026-27 Sales Budget"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Budget Period</label>
                  <select
                    name="period"
                    value={form.period}
                    onChange={handleChange}
                  >
                    <option value="2026-27">2026-27</option>
                    <option value="2027-28">2027-28</option>
                    <option value="2028-29">2028-29</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Analytic Account / Department</label>
                  <select
                    name="analytic_account_id"
                    value={form.analytic_account_id}
                    onChange={handleChange}
                  >
                    <option value="">— Select Analytic Account —</option>
                    {analytics.map((an) => (
                      <option key={an.id} value={an.id}>
                        {an.name} ({an.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Account *</label>
                  <select
                    name="account_id"
                    value={form.account_id}
                    onChange={handleChange}
                    required
                  >
                    <option value="">Select Expense / Income Account</option>
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.code} - {a.name || a.account_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Planned Budget Amount (₹) *</label>
                  <input
                    type="number"
                    min="1"
                    name="amount"
                    value={form.amount}
                    onChange={handleChange}
                    placeholder="Enter planned amount"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Initial Status</label>
                  <select
                    name="status"
                    value={form.status}
                    onChange={handleChange}
                  >
                    <option value="Draft">Draft</option>
                    <option value="Active">Active</option>
                  </select>
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
                  disabled={submitting}
                >
                  Cancel
                </button>

                <button type="submit" className="primary-btn" disabled={submitting}>
                  {submitting ? "Saving..." : "Save Budget"}
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