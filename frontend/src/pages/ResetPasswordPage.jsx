import { useState } from "react";
import { resetPassword } from "../lib/api.js";
import Alert from "../components/ui/Alert.jsx";
import Button from "../components/ui/Button.jsx";
import FormField from "../components/ui/FormField.jsx";
import PasswordInput from "../components/ui/PasswordInput.jsx";

/**
 * ResetPasswordPage
 * Shown when the user clicks the reset link in their email.
 * Expects `token` prop (pulled from ?token= query param).
 */
export default function ResetPasswordPage({ token, onGoLogin }) {
  const [form, setForm] = useState({ new_password: "", confirm_password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const change = (e) => {
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
    setError("");
  };

  const validate = () => {
    const { new_password, confirm_password } = form;
    if (!new_password) return "New password is required.";
    if (new_password.length < 8) return "Password must be at least 8 characters.";
    if (!/[a-z]/.test(new_password)) return "Password must contain a lowercase letter.";
    if (!/[A-Z]/.test(new_password)) return "Password must contain an uppercase letter.";
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(new_password))
      return 'Password must contain a special character (e.g. !@#$%).';
    if (new_password !== confirm_password) return "Passwords do not match.";
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const err = validate();
    if (err) return setError(err);

    if (!token) return setError("Invalid or missing reset token. Please request a new link.");

    setLoading(true);
    try {
      await resetPassword(token, form.new_password, form.confirm_password);
      setSuccess(true);
    } catch (err) {
      setError(err.message || "Failed to reset password. The link may have expired.");
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
            Choose a strong new password for your Urban Furniture account.
          </p>
          <div className="auth-brand-features">
            <div className="auth-feature-item"><span className="auth-feature-dot blue" />Min 8 characters</div>
            <div className="auth-feature-item"><span className="auth-feature-dot teal" />Uppercase &amp; lowercase</div>
            <div className="auth-feature-item"><span className="auth-feature-dot orange" />Special character</div>
            <div className="auth-feature-item"><span className="auth-feature-dot green" />Passwords must match</div>
          </div>
        </div>
      </div>

      {/* RIGHT FORM PANEL */}
      <div className="auth-form-panel">
        <div className="auth-card">
          <div className="auth-card-header">
            <h2 className="auth-card-title">Reset Password</h2>
            <p className="auth-card-sub">Enter your new password below to complete the reset.</p>
          </div>

          {error && <Alert type="error">{error}</Alert>}

          {success ? (
            <div>
              <Alert type="success">
                <strong>Password reset successfully!</strong>
                <br />
                You can now sign in with your new password.
              </Alert>
              <div style={{ marginTop: "20px" }}>
                <Button variant="primary" fullWidth onClick={onGoLogin}>
                  Sign In Now
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate>
              <FormField label="New Password" required>
                <PasswordInput
                  name="new_password"
                  value={form.new_password}
                  onChange={change}
                  placeholder="Min 8 chars · Aa · special char"
                  autoComplete="new-password"
                  hasError={false}
                />
              </FormField>

              <FormField label="Confirm New Password" required>
                <PasswordInput
                  name="confirm_password"
                  value={form.confirm_password}
                  onChange={change}
                  placeholder="Re-enter your new password"
                  autoComplete="new-password"
                  hasError={false}
                />
              </FormField>

              {/* Password strength hint */}
              <p style={{ fontSize: "11px", color: "var(--c-text-muted, #64748b)", marginTop: "6px", lineHeight: "1.7" }}>
                Must have &gt;8 chars · lowercase · UPPERCASE · special character
              </p>

              <Button type="submit" variant="primary" loading={loading} fullWidth style={{ marginTop: "12px" }}>
                {loading ? "Resetting Password..." : "Reset Password"}
              </Button>

              <div className="auth-switch" style={{ marginTop: "16px" }}>
                <span>Remembered it?</span>
                <button className="auth-link-btn" type="button" onClick={onGoLogin}>
                  Back to Sign In
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
