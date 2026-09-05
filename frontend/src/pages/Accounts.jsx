import { useState } from "react";

function Accounts() {
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editIndex, setEditIndex] = useState(null);

  const [accounts, setAccounts] = useState([
    {
      code: "1001",
      name: "Cash",
      type: "Assets",
      group: "Current Assets",
      balance: 45000,
      status: "Active",
    },
    {
      code: "1002",
      name: "Bank Account",
      type: "Assets",
      group: "Current Assets",
      balance: 185000,
      status: "Active",
    },
    {
      code: "1101",
      name: "Accounts Receivable",
      type: "Assets",
      group: "Current Assets",
      balance: 58000,
      status: "Active",
    },
    {
      code: "2001",
      name: "Accounts Payable",
      type: "Liabilities",
      group: "Current Liabilities",
      balance: 42000,
      status: "Active",
    },
    {
      code: "3001",
      name: "Capital Account",
      type: "Equity",
      group: "Equity",
      balance: 250000,
      status: "Active",
    },
    {
      code: "4001",
      name: "Sales Income",
      type: "Income",
      group: "Operating Income",
      balance: 245000,
      status: "Active",
    },
    {
      code: "5001",
      name: "Purchase Expense",
      type: "Expenses",
      group: "Operating Expenses",
      balance: 128500,
      status: "Active",
    },
  ]);

  const [form, setForm] = useState({
    code: "",
    name: "",
    type: "Assets",
    group: "Current Assets",
    balance: "",
    status: "Active",
  });

  const filteredAccounts = accounts.filter((account) =>
    `${account.code} ${account.name} ${account.type} ${account.group}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  const openAddModal = () => {
    setEditIndex(null);

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

  const openEditModal = (index) => {
    setEditIndex(index);
    setForm(accounts[index]);
    setShowModal(true);
  };

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const saveAccount = (e) => {
    e.preventDefault();

    if (!form.code || !form.name) {
      alert("Please enter Account Code and Account Name");
      return;
    }

    const newAccount = {
      ...form,
      balance: Number(form.balance) || 0,
    };

    if (editIndex === null) {
      setAccounts([...accounts, newAccount]);
    } else {
      const updatedAccounts = [...accounts];
      updatedAccounts[editIndex] = newAccount;
      setAccounts(updatedAccounts);
    }

    setShowModal(false);
  };

  const deleteAccount = (index) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this account?"
    );

    if (!confirmDelete) return;

    setAccounts(accounts.filter((_, i) => i !== index));
  };

  const getTypeClass = (type) => {
    return type.toLowerCase();
  };

  return (
    <div className="module-page">

      {/* HEADER */}
      <div className="page-header">

        <div>
          <p className="breadcrumb">
            Home / Chart of Accounts
          </p>

          <h1>Chart of Accounts</h1>

          <p className="subtitle">
            Manage your accounting accounts and account groups
          </p>
        </div>

        <button
          className="primary-btn"
          onClick={openAddModal}
        >
          + New Account
        </button>

      </div>

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
                <th>Balance</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>

            </thead>

            <tbody>

              {filteredAccounts.map((account, index) => (

                <tr key={index}>

                  <td>
                    <span className="account-code">
                      {account.code}
                    </span>
                  </td>

                  <td>
                    <div className="account-name-cell">

                      <div className="account-icon">
                        📚
                      </div>

                      <b>
                        {account.name}
                      </b>

                    </div>
                  </td>

                  <td>
                    <span
                      className={`account-type ${getTypeClass(
                        account.type
                      )}`}
                    >
                      {account.type}
                    </span>
                  </td>

                  <td>
                    {account.group}
                  </td>

                  <td>
                    ₹{account.balance.toLocaleString("en-IN")}
                  </td>

                  <td>
                    <span className="product-status">
                      {account.status}
                    </span>
                  </td>

                  <td>

                    <button
                      className="small-btn"
                      onClick={() =>
                        openEditModal(index)
                      }
                    >
                      Edit
                    </button>

                    <button
                      className="delete-btn"
                      onClick={() =>
                        deleteAccount(index)
                      }
                    >
                      Delete
                    </button>

                  </td>

                </tr>

              ))}

            </tbody>

          </table>

        </div>

      </div>

      {/* EMPTY STATE */}
      {filteredAccounts.length === 0 && (

        <div className="empty-card">

          <div className="empty-icon">
            📚
          </div>

          <h2>
            No Accounts Found
          </h2>

          <p>
            Try another search or create a new account.
          </p>

        </div>

      )}

      {/* MODAL */}
      {showModal && (

        <div className="modal-overlay">

          <div className="product-modal">

            <div className="modal-header">

              <div>

                <h2>
                  {editIndex === null
                    ? "Create Account"
                    : "Edit Account"}
                </h2>

                <p>
                  Enter account information
                </p>

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

                <h3>
                  Account Information
                </h3>

                <div className="form-grid">

                  <div className="form-group">

                    <label>
                      Account Code *
                    </label>

                    <input
                      name="code"
                      value={form.code}
                      onChange={handleChange}
                      placeholder="1001"
                    />

                  </div>

                  <div className="form-group">

                    <label>
                      Account Name *
                    </label>

                    <input
                      name="name"
                      value={form.name}
                      onChange={handleChange}
                      placeholder="Cash Account"
                    />

                  </div>

                  <div className="form-group">

                    <label>
                      Account Type
                    </label>

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

                    <label>
                      Account Group
                    </label>

                    <select
                      name="group"
                      value={form.group}
                      onChange={handleChange}
                    >
                      <option>Current Assets</option>
                      <option>Fixed Assets</option>
                      <option>Current Liabilities</option>
                      <option>Long Term Liabilities</option>
                      <option>Equity</option>
                      <option>Operating Income</option>
                      <option>Other Income</option>
                      <option>Operating Expenses</option>
                      <option>Other Expenses</option>
                    </select>

                  </div>

                  <div className="form-group">

                    <label>
                      Opening Balance
                    </label>

                    <input
                      type="number"
                      name="balance"
                      value={form.balance}
                      onChange={handleChange}
                      placeholder="0"
                    />

                  </div>

                  <div className="form-group">

                    <label>
                      Status
                    </label>

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

              <div className="modal-footer">

                <button
                  type="button"
                  className="cancel-btn"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="primary-btn"
                >
                  {editIndex === null
                    ? "Create Account"
                    : "Save Changes"}
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