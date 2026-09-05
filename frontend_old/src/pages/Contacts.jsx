import { useState } from "react";
import {
  Plus,
  Search,
  Grid3X3,
  List,
  Eye,
  Pencil,
  Trash2,
  X,
  UserRound,
  Building2,
  Mail,
  Phone,
  MapPin,
} from "lucide-react";

const initialContacts = [
  {
    id: 1,
    name: "ABC Furniture",
    type: "Customer",
    email: "abc@example.com",
    phone: "+91 98765 43210",
    city: "Ahmedabad",
    status: "Active",
  },
  {
    id: 2,
    name: "Wood Suppliers Ltd.",
    type: "Vendor",
    email: "wood@example.com",
    phone: "+91 98250 12345",
    city: "Surat",
    status: "Active",
  },
  {
    id: 3,
    name: "Modern Interiors",
    type: "Customer",
    email: "modern@example.com",
    phone: "+91 99123 45678",
    city: "Mumbai",
    status: "Active",
  },
  {
    id: 4,
    name: "Steel & Hardware",
    type: "Vendor",
    email: "steel@example.com",
    phone: "+91 98980 56789",
    city: "Vadodara",
    status: "Inactive",
  },
];

function Contacts() {
  const [contacts, setContacts] = useState(initialContacts);
  const [view, setView] = useState("list");
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingContact, setEditingContact] = useState(null);

  const filteredContacts = contacts.filter((contact) =>
    `${contact.name} ${contact.email} ${contact.city}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  const openAddModal = () => {
    setEditingContact(null);
    setShowModal(true);
  };

  const openEditModal = (contact) => {
    setEditingContact(contact);
    setShowModal(true);
  };

  const deleteContact = (id) => {
    setContacts(contacts.filter((contact) => contact.id !== id));
  };

  const saveContact = (contact) => {
    if (editingContact) {
      setContacts(
        contacts.map((item) =>
          item.id === editingContact.id ? { ...contact, id: item.id } : item
        )
      );
    } else {
      setContacts([
        ...contacts,
        {
          ...contact,
          id: Date.now(),
        },
      ]);
    }

    setShowModal(false);
  };

  return (
    <div className="module-page">

      {/* Page Header */}
      <div className="module-header">
        <div>
          <h1>Contacts</h1>
          <p>Manage customers, vendors and other business contacts.</p>
        </div>

        <button className="primary-button" onClick={openAddModal}>
          <Plus size={18} />
          New Contact
        </button>
      </div>

      {/* Toolbar */}
      <div className="module-toolbar">

        <div className="module-search">
          <Search size={18} />
          <input
            type="text"
            placeholder="Search contacts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="view-buttons">
          <button
            className={view === "list" ? "view-active" : ""}
            onClick={() => setView("list")}
            title="List View"
          >
            <List size={18} />
          </button>

          <button
            className={view === "kanban" ? "view-active" : ""}
            onClick={() => setView("kanban")}
            title="Kanban View"
          >
            <Grid3X3 size={18} />
          </button>
        </div>

      </div>

      {/* List View */}
      {view === "list" && (
        <div className="data-panel">

          <div className="data-panel-header">
            <div>
              <h2>Contact List</h2>
              <span>{filteredContacts.length} contacts found</span>
            </div>
          </div>

          <div className="table-wrapper">
            <table className="contacts-table">
              <thead>
                <tr>
                  <th>Contact</th>
                  <th>Type</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>City</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredContacts.map((contact) => (
                  <tr key={contact.id}>

                    <td>
                      <div className="contact-name-cell">
                        <div className="contact-avatar">
                          {contact.name.charAt(0)}
                        </div>

                        <div>
                          <strong>{contact.name}</strong>
                          <small>#{contact.id}</small>
                        </div>
                      </div>
                    </td>

                    <td>
                      <span
                        className={`contact-type ${contact.type.toLowerCase()}`}
                      >
                        {contact.type}
                      </span>
                    </td>

                    <td>{contact.email}</td>

                    <td>{contact.phone}</td>

                    <td>{contact.city}</td>

                    <td>
                      <span
                        className={`contact-status ${
                          contact.status.toLowerCase()
                        }`}
                      >
                        {contact.status}
                      </span>
                    </td>

                    <td>
                      <div className="action-buttons">

                        <button title="View">
                          <Eye size={16} />
                        </button>

                        <button
                          title="Edit"
                          onClick={() => openEditModal(contact)}
                        >
                          <Pencil size={16} />
                        </button>

                        <button
                          title="Delete"
                          onClick={() => deleteContact(contact.id)}
                        >
                          <Trash2 size={16} />
                        </button>

                      </div>
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </div>
      )}

      {/* Kanban View */}
      {view === "kanban" && (
        <div className="contact-kanban">

          {filteredContacts.map((contact) => (
            <div className="contact-card" key={contact.id}>

              <div className="contact-card-top">

                <div className="large-contact-avatar">
                  {contact.name.charAt(0)}
                </div>

                <span
                  className={`contact-type ${contact.type.toLowerCase()}`}
                >
                  {contact.type}
                </span>

              </div>

              <h3>{contact.name}</h3>

              <div className="contact-detail">
                <Mail size={15} />
                <span>{contact.email}</span>
              </div>

              <div className="contact-detail">
                <Phone size={15} />
                <span>{contact.phone}</span>
              </div>

              <div className="contact-detail">
                <MapPin size={15} />
                <span>{contact.city}</span>
              </div>

              <div className="contact-card-bottom">

                <span
                  className={`contact-status ${
                    contact.status.toLowerCase()
                  }`}
                >
                  {contact.status}
                </span>

                <div className="action-buttons">
                  <button onClick={() => openEditModal(contact)}>
                    <Pencil size={15} />
                  </button>

                  <button onClick={() => deleteContact(contact.id)}>
                    <Trash2 size={15} />
                  </button>
                </div>

              </div>

            </div>
          ))}

        </div>
      )}

      {/* Empty Search Result */}
      {filteredContacts.length === 0 && (
        <div className="empty-state">
          <UserRound size={40} />
          <h3>No contacts found</h3>
          <p>Try another search or create a new contact.</p>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <ContactModal
          contact={editingContact}
          onClose={() => setShowModal(false)}
          onSave={saveContact}
        />
      )}

    </div>
  );
}

function ContactModal({ contact, onClose, onSave }) {
  const [form, setForm] = useState(
    contact || {
      name: "",
      type: "Customer",
      email: "",
      phone: "",
      city: "",
      status: "Active",
    }
  );

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!form.name.trim()) {
      alert("Please enter contact name.");
      return;
    }

    onSave(form);
  };

  return (
    <div className="modal-overlay">

      <div className="contact-modal">

        <div className="modal-header">

          <div>
            <h2>{contact ? "Edit Contact" : "Create Contact"}</h2>
            <p>
              {contact
                ? "Update contact information."
                : "Add a new customer or vendor."}
            </p>
          </div>

          <button className="close-button" onClick={onClose}>
            <X size={20} />
          </button>

        </div>

        <form onSubmit={handleSubmit}>

          <div className="form-section">

            <div className="form-section-title">
              <Building2 size={17} />
              Basic Information
            </div>

            <div className="form-grid">

              <div className="form-group full">
                <label>Contact Name *</label>
                <input
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="Enter contact name"
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

          <div className="form-section">

            <div className="form-section-title">
              <Mail size={17} />
              Contact Information
            </div>

            <div className="form-grid">

              <div className="form-group">
                <label>Email</label>
                <input
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="example@email.com"
                />
              </div>

              <div className="form-group">
                <label>Phone</label>
                <input
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  placeholder="+91 XXXXX XXXXX"
                />
              </div>

              <div className="form-group full">
                <label>City</label>
                <input
                  name="city"
                  value={form.city}
                  onChange={handleChange}
                  placeholder="Enter city"
                />
              </div>

            </div>

          </div>

          <div className="modal-footer">

            <button
              type="button"
              className="secondary-button"
              onClick={onClose}
            >
              Cancel
            </button>

            <button type="submit" className="primary-button">
              {contact ? "Update Contact" : "Create Contact"}
            </button>

          </div>

        </form>

      </div>

    </div>
  );
}

export default Contacts;