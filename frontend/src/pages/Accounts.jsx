import { useState, useEffect } from "react";
import { getAccounts, createAccount, updateAccount, deleteAccount as deleteAccountApi } from "../lib/api.js";
import Alert from "../components/ui/Alert.jsx";

function Accounts() {
  const [search, setSearch] = useState("");
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

  const filteredAccounts = accounts.filter((account) =>
    `${account.code} ${account.name} ${account.type} ${account.group}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

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

  return (
    <div className="module-page">
      {/* HEADER */}
      <div className="page-header">
        <div>
          <p className="breadcrumb">Home / Chart of Accounts</p>
          <h1>Chart of Accounts</h1>
          <p className="subtitle">
            Manage your accounting accounts and account groups
          </p>
        </div>

        <button className="primary-btn" onClick={openAddModal}>
          + New Account
        </button>
      </div>

      {error && <Alert type="error" style={{ marginBottom: "16px" }}>{error}</Alert>}

      {/* ACCOUNT SUMMARY */}
      <div className="account-summary">
        <div className="account-summary-card">
          <span>Total Accounts</span>
          <strong>{accounts.length}</strong>
        </div>

        <div className="account-summary-card">
          <span>Assets</span>
          <strong>
            {accounts.filter((a) => a.type === "Assets").length}
          </strong>
        </div>

        <div className="account-summary-card">
          <span>Liabilities</span>
          <strong>
            {accounts.filter((a) => a.type === "Liabilities").length}
          </strong>
        </div>

        <div className="account-summary-card">
          <span>Income</span>
          <strong>
            {accounts.filter((a) => a.type === "Income").length}
          </strong>
        </div>

        <div className="account-summary-card">
          <span>Expenses</span>
          <strong>
            {accounts.filter((a) => a.type === "Expenses").length}
          </strong>
        </div>
      </div>

      {/* TABLE */}
      <div className="table-card">
        <div className="table-top">
          <input
            type="text"
            placeholder="Search account, code or group..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <span className="count-badge">
            {filteredAccounts.length} Accounts
          </span>
        </div>

        <div className="responsive-table">
          <table>
            <thead>
              <tr>
                <th>Code</th>
                <th>Account Name</th>
                <th>Account Type</th>
                <th>Account Group</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" className="empty-state">
                    Loading chart of accounts...
                  </td>
                </tr>
              ) : filteredAccounts.length > 0 ? (
                filteredAccounts.map((account) => (
                  <tr key={account.id}>
                    <td>
                      <span className="account-code">{account.code}</span>
                    </td>

                    <td>
                      <b>{account.name}</b>
                    </td>

                    <td>
                      <span className={`badge ${account.type.toLowerCase()}`}>
                        {account.type}
                      </span>
                    </td>

                    <td>{account.group}</td>

                    <td>
                      <span
                        className={
                          account.status === "Active"
                            ? "status-active"
                            : "status-inactive"
                        }
                      >
                        {account.status}
                      </span>
                    </td>

                    <td>
                      <button
                        className="small-btn"
                        onClick={() => openEditModal(account)}
                      >
                        Edit
                      </button>

                      <button
                        className="delete-btn"
                        onClick={() => deleteAccount(account.id)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="empty-state">
                    No accounts found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL */}
      {showModal && (
        <div className="modal-overlay">
          <div className="product-modal">
            <div className="modal-header">
              <div>
                <h2>
                  {!editAccountObj ? "Create Account" : "Edit Account"}
                </h2>
                <p>Enter account information</p>
              </div>

              <button
                className="close-modal"
                onClick={() => setShowModal(false)}
              >
                ×
              </button>
            </div>

            <form onSubmit={saveAccount}>
              <div className="form-section">
                <h3>Account Information</h3>

                <div className="form-grid">
                  <div className="form-group">
                    <label>Account Code *</label>
                    <input
                      name="code"
                      value={form.code}
                      onChange={handleChange}
                      placeholder="1001"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Account Name *</label>
                    <input
                      name="name"
                      value={form.name}
                      onChange={handleChange}
                      placeholder="Cash Account"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Account Type</label>
                    <select
                      name="type"
                      value={form.type}
                      onChange={handleChange}
                    >
                      <option>Assets</option>
                      <option>Liabilities</option>
                      <option>Equity</option>
                      <option>Income</option>
                      <option>Expenses</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Account Group / Description</label>
                    <input
                      name="group"
                      value={form.group}
                      onChange={handleChange}
                      placeholder="e.g. Current Assets"
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
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => setShowModal(false)}
                  disabled={submitting}
                >
                  Cancel
                </button>

                <button type="submit" className="primary-btn" disabled={submitting}>
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