import { useState, useEffect } from "react";
import { getContacts, createContact, deleteContact as deleteContactApi } from "../lib/api.js";
import Alert from "../components/ui/Alert.jsx";

function Contacts() {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    name: "",
    type: "Customer",
    email: "",
    phone: "",
    city: "",
    status: "Active",
  });

  const loadContacts = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getContacts();
      const mapped = (data || []).map((c) => ({
        id: c.id,
        name: c.name,
        type: c.contact_type ? c.contact_type.charAt(0).toUpperCase() + c.contact_type.slice(1) : "Customer",
        email: c.email || "-",
        phone: c.phone || "-",
        city: c.city || "-",
        status: c.is_active ? "Active" : "Inactive",
      }));
      setContacts(mapped);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadContacts();
  }, []);

  const filteredContacts = contacts.filter((contact) =>
    contact.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const addContact = async (e) => {
    e.preventDefault();

    if (!form.name.trim()) {
      alert("Please enter contact name");
      return;
    }

    setSubmitting(true);
    try {
      await createContact({
        name: form.name.trim(),
        contact_type: form.type.toLowerCase(),
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        city: form.city.trim() || null,
        is_active: form.status === "Active",
      });

      setForm({
        name: "",
        type: "Customer",
        email: "",
        phone: "",
        city: "",
        status: "Active",
      });

      setShowForm(false);
      await loadContacts();
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const deleteContact = async (id) => {
    const confirmDelete = window.confirm("Are you sure you want to delete this contact?");
    if (!confirmDelete) return;

    try {
      await deleteContactApi(id);
      setContacts(contacts.filter((contact) => contact.id !== id));
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="module-page">
      <div className="page-header">
        <div>
          <h1>Contacts</h1>
          <p>Manage customers, vendors and other contacts.</p>
        </div>

        <button
          className="primary-btn"
          onClick={() => setShowForm(true)}
        >
          + Add Contact
        </button>
      </div>

      {error && <Alert type="error" style={{ marginBottom: "16px" }}>{error}</Alert>}

      <div className="module-toolbar">
        <input
          type="text"
          placeholder="Search contacts..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <div className="contact-count">
          Total Contacts: <strong>{filteredContacts.length}</strong>
        </div>
      </div>

      <div className="module-card">
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Contact</th>
                <th>Type</th>
                <th>Email</th>
                <th>Phone</th>
                <th>City</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" className="empty-state">
                    Loading contacts...
                  </td>
                </tr>
              ) : filteredContacts.length > 0 ? (
                filteredContacts.map((contact) => (
                  <tr key={contact.id}>
                    <td>
                      <strong>{contact.name}</strong>
                    </td>

                    <td>
                      <span className="badge blue">
                        {contact.type}
                      </span>
                    </td>

                    <td>{contact.email}</td>

                    <td>{contact.phone}</td>

                    <td>{contact.city}</td>

                    <td>
                      <span
                        className={
                          contact.status === "Active"
                            ? "badge green"
                            : "badge red"
                        }
                      >
                        {contact.status}
                      </span>
                    </td>

                    <td>
                      <button
                        className="delete-btn"
                        onClick={() => deleteContact(contact.id)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="empty-state">
                    No contacts found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

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
              <h2>Add Contact</h2>

              <button
                className="close-btn"
                onClick={() => setShowForm(false)}
              >
                ×
              </button>
            </div>

            <form onSubmit={addContact}>
              <div className="form-grid">
                <div className="form-group">
                  <label>Contact Name</label>
                  <input
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    placeholder="Enter contact name"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Contact Type</label>
                  <select
                    name="type"
                    value={form.type}
                    onChange={handleChange}
                  >
                    <option>Customer</option>
                    <option>Vendor</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="Enter email"
                  />
                </div>

                <div className="form-group">
                  <label>Phone</label>
                  <input
                    name="phone"
                    value={form.phone}
                    onChange={handleChange}
                    placeholder="Enter phone"
                  />
                </div>

                <div className="form-group">
                  <label>City</label>
                  <input
                    name="city"
                    value={form.city}
                    onChange={handleChange}
                    placeholder="Enter city"
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
                  disabled={submitting}
                >
                  Cancel
                </button>

                <button type="submit" className="primary-btn" disabled={submitting}>
                  {submitting ? "Saving..." : "Save Contact"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Contacts;