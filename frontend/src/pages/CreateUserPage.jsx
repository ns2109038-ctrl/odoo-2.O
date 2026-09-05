import { useState } from "react";
import { registerUser } from "../lib/api.js";
import Alert from "../components/ui/Alert.jsx";
import Button from "../components/ui/Button.jsx";
import FormField from "../components/ui/FormField.jsx";
import PasswordInput from "../components/ui/PasswordInput.jsx";

const ROLES = [
  { label: "Administrator",  value: "admin" },
  { label: "Accountant",     value: "accountant" },
  { label: "Contact / User", value: "contact" },
];

const EMPTY = { name: "", login_id: "", email: "", role: "", password: "", confirm_password: "" };

export default function CreateUserPage({ authUser }) {
  const [form, setForm]       = useState(EMPTY);
  const [errors, setErrors]   = useState({});
  const [apiError, setApiError] = useState("");
  const [success, setSuccess] = useState(null);
  const [loading, setLoading] = useState(false);

  // Role gate
  if (authUser.role !== "admin") {
    return (
      <div className="module-page">
        <div className="page-header">
          <div>
            <p className="breadcrumb">Home / User Management / Create User</p>
            <h1>Create User</h1>
          </div>
        </div>
        <div className="empty-card">
          <div className="empty-icon">🔒</div>
          <h2>Access Denied</h2>
          <p>Only administrators can create new users. Please contact your system administrator.</p>
        </div>
      </div>
    );
  }

  const change = (e) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
    setErrors((p) => ({ ...p, [name]: "" }));
    setApiError("");
    setSuccess(null);
  };

  const validate = () => {
    const e = {};
    if (!form.name.trim())                           e.name = "Full Name is required.";
    else if (form.name.trim().length < 2)            e.name = "Name must be at least 2 characters.";
    else if (form.name.trim().length > 100)          e.name = "Name must be at most 100 characters.";

    if (!form.login_id.trim())                       e.login_id = "Login ID is required.";
    else if (form.login_id.length < 6 || form.login_id.length > 12)
                                                     e.login_id = "Login ID must be 6–12 characters.";

    if (!form.email.trim())                          e.email = "Email is required.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
                                                     e.email = "Please enter a valid email address.";

    if (!form.role)                                  e.role = "Please select a role.";

    if (!form.password)                              e.password = "Password is required.";
    else if (form.password.length < 8)               e.password = "Password must be at least 8 characters.";
    else if (new TextEncoder().encode(form.password).length > 72)
                                                     e.password = "Password must not exceed 72 bytes.";

    if (!form.confirm_password)                      e.confirm_password = "Please confirm the password.";
    else if (form.password !== form.confirm_password) e.confirm_password = "Passwords do not match.";
    return e;
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setLoading(true);
    setApiError("");
    try {
      const data = await registerUser({
        name: form.name.trim(),
        login_id: form.login_id.trim(),
        email: form.email.trim(),
        password: form.password,
        confirm_password: form.confirm_password,
        role: form.role,
      });
      setSuccess(data);
      setForm(EMPTY);
      setErrors({});
    } catch (err) {
      setApiError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setForm(EMPTY);
    setErrors({});
    setApiError("");
    setSuccess(null);
  };

  return (
    <div className="module-page">
      <div className="page-header">
        <div>
          <p className="breadcrumb">Home / User Management / Create User</p>
          <h1>Create User</h1>
          <p className="subtitle">Add a new user to the Urban Furniture Accounting System</p>
        </div>
      </div>

      <div className="cu-card">
        {success && (
          <Alert type="success" className="cu-alert">
            <strong>User created successfully!</strong>&nbsp;
            Login ID: <strong>{success.login_id}</strong> &mdash; Role: <strong>{success.role}</strong> &mdash; ID #{success.id}
          </Alert>
        )}
        {apiError && (
          <Alert type="error" className="cu-alert">{apiError}</Alert>
        )}

        <form onSubmit={handleSubmit} noValidate autoComplete="off">
          <div className="cu-form-grid">
            <FormField label="Full Name" error={errors.name} required>
              <input type="text" name="name" value={form.name} onChange={change}
                placeholder="e.g. John Smith"
                className={`uf-input ${errors.name ? "uf-input-err" : ""}`} />
            </FormField>

            <FormField label="Login ID" error={errors.login_id} required hint="6–12 characters, unique">
              <input type="text" name="login_id" value={form.login_id} onChange={change}
                placeholder="e.g. john99"
                className={`uf-input ${errors.login_id ? "uf-input-err" : ""}`} />
            </FormField>

            <FormField label="Email ID" error={errors.email} required>
              <input type="email" name="email" value={form.email} onChange={change}
                placeholder="user@urbanfurniture.com"
                className={`uf-input ${errors.email ? "uf-input-err" : ""}`} />
            </FormField>

            <FormField label="Role" error={errors.role} required>
              <select name="role" value={form.role} onChange={change}
                className={`uf-select ${errors.role ? "uf-input-err" : ""}`}>
                <option value="">— Select a role —</option>
                {ROLES.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </FormField>

            <FormField label="Password" error={errors.password} required hint="Min 8 characters, max 72 bytes">
              <PasswordInput name="password" value={form.password} onChange={change}
                placeholder="Set a password" autoComplete="new-password"
                hasError={!!errors.password} />
            </FormField>

            <FormField label="Confirm Password" error={errors.confirm_password} required>
              <PasswordInput name="confirm_password" value={form.confirm_password} onChange={change}
                placeholder="Repeat password" autoComplete="new-password"
                hasError={!!errors.confirm_password} />
            </FormField>
          </div>

          <div className="cu-actions">
            <Button type="submit" variant="primary" loading={loading}>
              {loading ? "Creating User..." : "Create User"}
            </Button>
            <Button type="button" variant="secondary" onClick={handleCancel} disabled={loading}>
              Cancel
            </Button>
          </div>
        </form>
      </div>

      <div className="cu-role-guide">
        <h3>Role Permissions Guide</h3>
        <div className="cu-role-grid">
          <div className="cu-role-item">
            <span className="cu-role-badge admin">Admin</span>
            <span>Full access — manage users, all modules, accounting, reports</span>
          </div>
          <div className="cu-role-item">
            <span className="cu-role-badge accountant">Accountant</span>
            <span>Manage master data, record transactions, view reports</span>
          </div>
          <div className="cu-role-item">
            <span className="cu-role-badge contact">Contact / User</span>
            <span>View own invoices/bills and make payments</span>
          </div>
        </div>
      </div>
    </div>
  );
}
