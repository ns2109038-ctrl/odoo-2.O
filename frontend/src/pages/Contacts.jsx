import { useState, useEffect } from "react";
import { getContacts, createContact, deleteContact as deleteContactApi } from "../lib/api.js";
import Alert from "../components/ui/Alert.jsx";
import {
  Users,
  Search,
  Plus,
  Trash2,
  X,
  Building,
  Mail,
  Phone,
  MapPin,
  CheckCircle,
  UserCheck,
  UserX,
  Filter,
  UserPlus
} from "lucide-react";

function Contacts() {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("All"); // "All" | "Customer" | "Vendor"
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

  const filteredContacts = contacts.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase()) ||
      c.city.toLowerCase().includes(search.toLowerCase());
    const matchesType = filterType === "All" || c.type.toLowerCase() === filterType.toLowerCase();
    return matchesSearch && matchesType;
  });

  const totalCustomers = contacts.filter((c) => c.type === "Customer").length;
  const totalVendors = contacts.filter((c) => c.type === "Vendor").length;

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
      {/* Page Header Banner */}
      <div className="page-header" style={{ marginBottom: "20px" }}>
        <div>
          <p className="breadcrumb">Masters / Contacts</p>
          <h1 style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <Users size={26} style={{ color: "#48acf0" }} /> Contact Directory
          </h1>
          <p className="subtitle">Manage customers, suppliers, vendors and account business contacts.</p>
        </div>

        <button
          className="primary-btn"
          onClick={() => setShowForm(true)}
          style={{ display: "flex", alignItems: "center", gap: "6px" }}
        >
          <UserPlus size={16} /> Add Contact
        </button>
      </div>

      {error && <Alert type="error" style={{ marginBottom: "16px" }}>{error}</Alert>}

      {/* KPI Stats Bar */}
      <div className="stats-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)", marginBottom: "20px" }}>
        <div className="stat-card" style={{ display: "flex", alignItems: "center", gap: "14px", padding: "16px 20px" }}>
          <div className="stat-icon blue" style={{ width: "44px", height: "44px", borderRadius: "10px" }}>
            <Users size={22} />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: "12px", color: "#93a3bc", fontWeight: "600" }}>Total Contacts</p>
            <h2 style={{ margin: "2px 0 0", fontSize: "22px", color: "#594236", fontWeight: "800" }}>{contacts.length}</h2>
          </div>
        </div>

        <div className="stat-card" style={{ display: "flex", alignItems: "center", gap: "14px", padding: "16px 20px" }}>
          <div className="stat-icon green" style={{ width: "44px", height: "44px", borderRadius: "10px" }}>
            <UserCheck size={22} />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: "12px", color: "#93a3bc", fontWeight: "600" }}>Customers</p>
            <h2 style={{ margin: "2px 0 0", fontSize: "22px", color: "#594236", fontWeight: "800" }}>{totalCustomers}</h2>
          </div>
        </div>

        <div className="stat-card" style={{ display: "flex", alignItems: "center", gap: "14px", padding: "16px 20px" }}>
          <div className="stat-icon orange" style={{ width: "44px", height: "44px", borderRadius: "10px" }}>
            <Building size={22} />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: "12px", color: "#93a3bc", fontWeight: "600" }}>Vendors & Suppliers</p>
            <h2 style={{ margin: "2px 0 0", fontSize: "22px", color: "#594236", fontWeight: "800" }}>{totalVendors}</h2>
          </div>
        </div>
      </div>

      {/* Toolbar & Search */}
      <div className="module-toolbar" style={{
        background: "#ffffff", padding: "14px 20px", borderRadius: "12px",
        border: "1px solid rgba(204, 221, 226, 0.7)", marginBottom: "20px",
        display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", flex: 1, minWidth: "280px" }}>
          <div style={{ position: "relative", flex: 1, maxWidth: "380px" }}>
            <Search size={16} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#93a3bc" }} />
            <input
              type="text"
              placeholder="Search contacts by name, email, city..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: "100%", height: "38px", paddingLeft: "36px", paddingRight: "14px",
                borderRadius: "8px", border: "1px solid #93a3bc", outline: "none", fontSize: "13px",
                background: "#f4f8fb"
              }}
            />
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <Filter size={15} style={{ color: "#6f584b" }} />
            {["All", "Customer", "Vendor"].map((t) => (
              <button
                key={t}
                onClick={() => setFilterType(t)}
                style={{
                  border: "none", padding: "6px 14px", borderRadius: "6px", fontSize: "12px",
                  fontWeight: "600", cursor: "pointer",
                  background: filterType === t ? "#48acf0" : "#f4f8fb",
                  color: filterType === t ? "#ffffff" : "#594236",
                  transition: "all 0.15s ease"
                }}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="contact-count" style={{ fontSize: "13px", color: "#6f584b" }}>
          Showing: <strong>{filteredContacts.length}</strong> of <strong>{contacts.length}</strong>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="module-card" style={{
        background: "#ffffff", borderRadius: "12px", border: "1px solid rgba(204, 221, 226, 0.8)",
        boxShadow: "0 4px 16px rgba(89, 66, 54, 0.05)", overflow: "hidden"
      }}>
        <div className="table-wrapper" style={{ overflowX: "auto" }}>
          <table className="data-table" style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "13px" }}>
            <thead>
              <tr style={{ background: "#f8fafc", borderBottom: "1px solid #ccdde2", color: "#594236", fontWeight: "700" }}>
                <th style={{ padding: "14px 18px" }}>Contact Name</th>
                <th style={{ padding: "14px 18px" }}>Type</th>
                <th style={{ padding: "14px 18px" }}>Email Address</th>
                <th style={{ padding: "14px 18px" }}>Phone Number</th>
                <th style={{ padding: "14px 18px" }}>City / Location</th>
                <th style={{ padding: "14px 18px" }}>Status</th>
                <th style={{ padding: "14px 18px", textAlign: "right" }}>Action</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" className="empty-state" style={{ textAlign: "center", padding: "40px", color: "#93a3bc" }}>
                    Loading contact directory...
                  </td>
                </tr>
              ) : filteredContacts.length > 0 ? (
                filteredContacts.map((contact) => (
                  <tr key={contact.id} style={{ borderBottom: "1px solid #f1f5f9", transition: "background 0.15s" }}>
                    <td style={{ padding: "14px 18px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <div style={{
                          width: "34px", height: "34px", borderRadius: "50%", background: "#ccdde2",
                          color: "#594236", display: "flex", alignItems: "center", justifyContent: "center",
                          fontWeight: "700", fontSize: "13px"
                        }}>
                          {contact.name.slice(0, 2).toUpperCase()}
                        </div>
                        <strong style={{ color: "#594236", fontWeight: "600" }}>{contact.name}</strong>
                      </div>
                    </td>

                    <td style={{ padding: "14px 18px" }}>
                      <span className={`badge ${contact.type === "Vendor" ? "orange" : "blue"}`} style={{
                        padding: "4px 10px", borderRadius: "12px", fontSize: "11px", fontWeight: "700",
                        background: contact.type === "Vendor" ? "#fff7ed" : "#e6f4fe",
                        color: contact.type === "Vendor" ? "#c2410c" : "#0284c7"
                      }}>
                        {contact.type}
                      </span>
                    </td>

                    <td style={{ padding: "14px 18px", color: "#6f584b" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <Mail size={14} style={{ color: "#93a3bc" }} /> {contact.email}
                      </div>
                    </td>

                    <td style={{ padding: "14px 18px", color: "#6f584b" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <Phone size={14} style={{ color: "#93a3bc" }} /> {contact.phone}
                      </div>
                    </td>

                    <td style={{ padding: "14px 18px", color: "#6f584b" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <MapPin size={14} style={{ color: "#93a3bc" }} /> {contact.city}
                      </div>
                    </td>

                    <td style={{ padding: "14px 18px" }}>
                      <span className={`badge ${contact.status === "Active" ? "green" : "red"}`} style={{
                        padding: "4px 10px", borderRadius: "12px", fontSize: "11px", fontWeight: "700",
                        background: contact.status === "Active" ? "#f0fdf4" : "#fef2f2",
                        color: contact.status === "Active" ? "#166534" : "#991b1b"
                      }}>
                        {contact.status}
                      </span>
                    </td>

                    <td style={{ padding: "14px 18px", textAlign: "right" }}>
                      <button
                        className="delete-btn"
                        onClick={() => deleteContact(contact.id)}
                        style={{
                          background: "#fef2f2", color: "#dc2626", border: "1px solid #fca5a5",
                          padding: "6px 12px", borderRadius: "6px", fontSize: "12px", fontWeight: "600",
                          cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "4px"
                        }}
                      >
                        <Trash2 size={13} /> Delete
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="empty-state" style={{ textAlign: "center", padding: "40px", color: "#93a3bc" }}>
                    No matching contacts found in directory.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Contact Modal Backdrop */}
      {showForm && (
        <div
          className="modal-overlay"
          onClick={() => setShowForm(false)}
          style={{
            position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
            background: "rgba(15, 23, 42, 0.5)", backdropFilter: "blur(4px)",
            display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "20px"
          }}
        >
          <div
            className="modal-box"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#ffffff", borderRadius: "14px", width: "100%", maxWidth: "560px",
              boxShadow: "0 20px 40px rgba(0, 0, 0, 0.2)", overflow: "hidden", border: "1px solid #ccdde2"
            }}
          >
            <div className="modal-header" style={{
              background: "linear-gradient(135deg, #594236, #6f584b)", color: "#ffffff",
              padding: "18px 24px", display: "flex", justifyContent: "space-between", alignItems: "center"
            }}>
              <h2 style={{ margin: 0, fontSize: "18px", fontWeight: "700", display: "flex", alignItems: "center", gap: "8px" }}>
                <UserPlus size={18} style={{ color: "#48acf0" }} /> Create New Contact
              </h2>

              <button
                className="close-btn"
                onClick={() => setShowForm(false)}
                style={{ background: "none", border: "none", color: "#ffffff", cursor: "pointer" }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={addContact} style={{ padding: "24px" }}>
              <div className="form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                <div className="form-group" style={{ gridColumn: "span 2" }}>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "#594236", marginBottom: "6px" }}>
                    Contact Name *
                  </label>
                  <input
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    placeholder="e.g. Acme Corp / Rahul Sharma"
                    required
                    style={{
                      width: "100%", height: "40px", borderRadius: "8px", border: "1px solid #93a3bc",
                      padding: "0 12px", fontSize: "13px", outline: "none"
                    }}
                  />
                </div>

                <div className="form-group">
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "#594236", marginBottom: "6px" }}>
                    Contact Type
                  </label>
                  <select
                    name="type"
                    value={form.type}
                    onChange={handleChange}
                    style={{
                      width: "100%", height: "40px", borderRadius: "8px", border: "1px solid #93a3bc",
                      padding: "0 12px", fontSize: "13px", outline: "none", background: "#ffffff"
                    }}
                  >
                    <option value="Customer">Customer</option>
                    <option value="Vendor">Vendor / Supplier</option>
                  </select>
                </div>

                <div className="form-group">
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "#594236", marginBottom: "6px" }}>
                    Status
                  </label>
                  <select
                    name="status"
                    value={form.status}
                    onChange={handleChange}
                    style={{
                      width: "100%", height: "40px", borderRadius: "8px", border: "1px solid #93a3bc",
                      padding: "0 12px", fontSize: "13px", outline: "none", background: "#ffffff"
                    }}
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>

                <div className="form-group">
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "#594236", marginBottom: "6px" }}>
                    Email Address
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="contact@company.com"
                    style={{
                      width: "100%", height: "40px", borderRadius: "8px", border: "1px solid #93a3bc",
                      padding: "0 12px", fontSize: "13px", outline: "none"
                    }}
                  />
                </div>

                <div className="form-group">
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "#594236", marginBottom: "6px" }}>
                    Phone Number
                  </label>
                  <input
                    name="phone"
                    value={form.phone}
                    onChange={handleChange}
                    placeholder="+91 98765 43210"
                    style={{
                      width: "100%", height: "40px", borderRadius: "8px", border: "1px solid #93a3bc",
                      padding: "0 12px", fontSize: "13px", outline: "none"
                    }}
                  />
                </div>

                <div className="form-group" style={{ gridColumn: "span 2" }}>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "#594236", marginBottom: "6px" }}>
                    City / Location
                  </label>
                  <input
                    name="city"
                    value={form.city}
                    onChange={handleChange}
                    placeholder="Mumbai / Delhi / Bengaluru"
                    style={{
                      width: "100%", height: "40px", borderRadius: "8px", border: "1px solid #93a3bc",
                      padding: "0 12px", fontSize: "13px", outline: "none"
                    }}
                  />
                </div>
              </div>

              <div className="form-actions" style={{
                display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "24px", paddingTop: "16px",
                borderTop: "1px solid #e2e8f0"
              }}>
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => setShowForm(false)}
                  disabled={submitting}
                  style={{
                    background: "#ffffff", border: "1px solid #93a3bc", color: "#594236",
                    padding: "9px 18px", borderRadius: "8px", fontSize: "13px", fontWeight: "600", cursor: "pointer"
                  }}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="primary-btn"
                  disabled={submitting}
                  style={{
                    background: "#48acf0", border: "none", color: "#ffffff",
                    padding: "9px 20px", borderRadius: "8px", fontSize: "13px", fontWeight: "700", cursor: "pointer"
                  }}
                >
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