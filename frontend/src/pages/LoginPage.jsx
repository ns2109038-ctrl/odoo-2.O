import { useState } from "react";
import { loginUser } from "../lib/api.js";
import { storeAuth, decodeToken } from "../lib/auth.js";
import Alert from "../components/ui/Alert.jsx";
import Button from "../components/ui/Button.jsx";
import FormField from "../components/ui/FormField.jsx";
import PasswordInput from "../components/ui/PasswordInput.jsx";

export default function LoginPage({ onLoginSuccess, onGoSignup, onGoForgotPassword }) {
  const [form, setForm]       = useState({ login_id: "", password: "" });
  const [errors, setErrors]   = useState({});
  const [apiError, setApiError] = useState("");
  const [loading, setLoading] = useState(false);

  const change = (e) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
    setErrors((p) => ({ ...p, [name]: "" }));
    setApiError("");
  };

  const validate = () => {
    const e = {};
    if (!form.login_id.trim())  e.login_id = "Login ID is required.";
    if (!form.password)         e.password = "Password is required.";
    return e;
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setLoading(true);
    setApiError("");
    try {
      const data    = await loginUser(form.login_id.trim(), form.password);
      const decoded = decodeToken(data.access_token);
      const role    = decoded?.role || "contact";
      storeAuth(data.access_token, form.login_id.trim(), role);
      onLoginSuccess({ token: data.access_token, loginId: form.login_id.trim(), role });
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
            Complete financial management for your furniture business —
            invoices, journals, accounts and reports in one place.
          </p>
          <div className="auth-brand-features">
            <div className="auth-feature-item"><span className="auth-feature-dot blue" />Chart of Accounts</div>
            <div className="auth-feature-item"><span className="auth-feature-dot teal" />Journal Entries</div>
            <div className="auth-feature-item"><span className="auth-feature-dot orange" />Financial Reports</div>
            <div className="auth-feature-item"><span className="auth-feature-dot green" />Sales & Purchases</div>
          </div>
        </div>
      </div>

      {/* RIGHT FORM PANEL */}
      <div className="auth-form-panel">
        <div className="auth-card">
          <div className="auth-card-header">
            <h2 className="auth-card-title">Welcome Back</h2>
            <p className="auth-card-sub">Sign in to your Urban Furniture account</p>
          </div>

          {apiError && (
            <Alert type="error">{apiError}</Alert>
          )}

          <form onSubmit={handleSubmit} noValidate autoComplete="on">
            <FormField label="Login ID" error={errors.login_id} required>
              <input
                type="text"
                name="login_id"
                value={form.login_id}
                onChange={change}
                placeholder="Enter your Login ID"
                className={`uf-input ${errors.login_id ? "uf-input-err" : ""}`}
                autoComplete="username"
              />
            </FormField>

            <FormField label="Password" error={errors.password} required>
              <PasswordInput
                name="password"
                value={form.password}
                onChange={change}
                placeholder="Enter your password"
                autoComplete="current-password"
                hasError={!!errors.password}
              />
            </FormField>

            <div className="auth-forgot-row">
              <button
                type="button"
                className="auth-link-btn"
                onClick={onGoForgotPassword}
              >
                Forgot Password?
              </button>
            </div>

            <Button type="submit" variant="primary" loading={loading} fullWidth>
              {loading ? "Signing In..." : "Sign In"}
            </Button>
          </form>

          <div className="auth-switch">
            <span>Don&apos;t have an account?</span>
            <button className="auth-link-btn" onClick={onGoSignup}>Sign Up</button>
          </div>
        </div>
      </div>
    </div>
  );
}
