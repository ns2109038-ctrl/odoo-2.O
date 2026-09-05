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

export default function SignupPage({ onGoLogin }) {
  const [form, setForm] = useState({
    name: "", login_id: "", email: "",
    password: "", confirm_password: "", role: "",
  });
  const [errors, setErrors]   = useState({});
  const [apiError, setApiError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(null);

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

    if (!form.password)                              e.password = "Password is required.";
    else if (form.password.length < 8)               e.password = "Password must be at least 8 characters.";
    else if (new TextEncoder().encode(form.password).length > 72)
                                                     e.password = "Password must not exceed 72 bytes.";

    if (!form.confirm_password)                      e.confirm_password = "Please confirm your password.";
    else if (form.password !== form.confirm_password) e.confirm_password = "Passwords do not match.";

    if (!form.role)                                  e.role = "Please select a role.";
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
      setForm({ name: "", login_id: "", email: "", password: "", confirm_password: "", role: "" });
    } catch (err) {
      setApiError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      {/* LEFT BRAND PANEL */}
      <div className="auth-brand-panel">
        <div className="auth-brand-inner">
          <div className="auth-logo-wrap">
            <img src="/urban_furniture_logo.png" alt="Urban Furniture" className="auth-logo" />
          </div>
          <h1 className="auth-brand-title">Urban Furniture</h1>
          <p className="auth-brand-sub">Accounting System</p>
          <p className="auth-brand-tagline">
            Join the Urban Furniture platform and manage your business
            finances with clarity and confidence.
          </p>
          <div className="auth-brand-features">
            <div className="auth-feature-item"><span className="auth-feature-dot blue" />Multi-role access</div>
            <div className="auth-feature-item"><span className="auth-feature-dot teal" />Secure & encrypted</div>
            <div className="auth-feature-item"><span className="auth-feature-dot orange" />Real-time accounting</div>
            <div className="auth-feature-item"><span className="auth-feature-dot green" />Full audit trail</div>
          </div>
        </div>
      </div>

      {/* RIGHT FORM PANEL */}
      <div className="auth-form-panel">
        <div className="auth-card auth-card-signup">
          <div className="auth-card-header">
            <h2 className="auth-card-title">Create Account</h2>
            <p className="auth-card-sub">Register for Urban Furniture Accounting</p>
          </div>

          {success ? (
            <div className="auth-success-state">
              <Alert type="success">
                <strong>Account created successfully!</strong><br />
                Login ID: <strong>{success.login_id}</strong> &mdash; Role: {success.role}
              </Alert>
              <Button variant="primary" fullWidth onClick={onGoLogin} style={{ marginTop: "20px" }}>
                Go to Sign In
              </Button>
            </div>
          ) : (
            <>
              {apiError && <Alert type="error">{apiError}</Alert>}
              <form onSubmit={handleSubmit} noValidate autoComplete="off">
                <FormField label="Full Name" error={errors.name} required>
                  <input type="text" name="name" value={form.name} onChange={change}
                    placeholder="e.g. Admin User"
                    className={`uf-input ${errors.name ? "uf-input-err" : ""}`}
                    autoComplete="name" />
                </FormField>

                <div className="auth-row-2">
                  <FormField label="Login ID" error={errors.login_id} required hint="6–12 characters">
                    <input type="text" name="login_id" value={form.login_id} onChange={change}
                      placeholder="e.g. admin01"
                      className={`uf-input ${errors.login_id ? "uf-input-err" : ""}`}
                      autoComplete="username" />
                  </FormField>
                  <FormField label="Email ID" error={errors.email} required>
                    <input type="email" name="email" value={form.email} onChange={change}
                      placeholder="you@example.com"
                      className={`uf-input ${errors.email ? "uf-input-err" : ""}`}
                      autoComplete="email" />
                  </FormField>
                </div>

                <FormField label="Role" error={errors.role} required>
                  <select name="role" value={form.role} onChange={change}
                    className={`uf-select ${errors.role ? "uf-input-err" : ""}`}>
                    <option value="">— Select a role —</option>
                    {ROLES.map((r) => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                </FormField>

                <div className="auth-row-2">
                  <FormField label="Password" error={errors.password} required hint="Min 8 chars, max 72 bytes">
                    <PasswordInput name="password" value={form.password} onChange={change}
                      placeholder="Enter password" autoComplete="new-password"
                      hasError={!!errors.password} />
                  </FormField>
                  <FormField label="Confirm Password" error={errors.confirm_password} required>
                    <PasswordInput name="confirm_password" value={form.confirm_password} onChange={change}
                      placeholder="Repeat password" autoComplete="new-password"
                      hasError={!!errors.confirm_password} />
                  </FormField>
                </div>

                <Button type="submit" variant="primary" loading={loading} fullWidth>
                  {loading ? "Creating Account..." : "Create Account"}
                </Button>
              </form>

              <div className="auth-switch">
                <span>Already have an account?</span>
                <button className="auth-link-btn" onClick={onGoLogin}>Sign In</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
