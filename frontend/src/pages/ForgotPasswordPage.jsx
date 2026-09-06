import { useState } from "react";
import { forgotPassword } from "../lib/api.js";
import Alert from "../components/ui/Alert.jsx";
import Button from "../components/ui/Button.jsx";
import FormField from "../components/ui/FormField.jsx";

export default function ForgotPasswordPage({ onGoLogin }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!email.trim()) return setError("Email is required.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
      return setError("Please enter a valid email address.");

    setLoading(true);
    try {
      await forgotPassword(email.trim());
      setSuccess(true);
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
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
            Don&apos;t worry — we&apos;ll send a secure password reset link to your registered email address.
          </p>
          <div className="auth-brand-features">
            <div className="auth-feature-item"><span className="auth-feature-dot blue" />Secure Reset Link</div>
            <div className="auth-feature-item"><span className="auth-feature-dot teal" />30-Minute Expiry</div>
            <div className="auth-feature-item"><span className="auth-feature-dot orange" />Email Verified</div>
            <div className="auth-feature-item"><span className="auth-feature-dot green" />Instant Delivery</div>
          </div>
        </div>
      </div>

      {/* RIGHT FORM PANEL */}
      <div className="auth-form-panel">
        <div className="auth-card">
          <div className="auth-card-header">
            <h2 className="auth-card-title">Forgot Password?</h2>
            <p className="auth-card-sub">
              Enter your registered email address and we&apos;ll send you a password reset link.
            </p>
          </div>

          {error && <Alert type="error">{error}</Alert>}

          {success ? (
            <div>
              <Alert type="success">
                <strong>Reset Link Sent via Email!</strong>
                <br />
                If an account with that email exists, a password reset link has been sent directly to your registered email address. The link is valid for <strong>30 minutes</strong>.
              </Alert>

              <div style={{ marginTop: "12px", fontSize: "13px", color: "var(--c-text-muted, #64748b)", lineHeight: "1.6" }}>
                Didn&apos;t receive it? Check your spam folder or make sure you entered your registered account email.
              </div>
              <div style={{ marginTop: "20px" }}>
                <Button variant="secondary" fullWidth onClick={onGoLogin}>
                  ← Back to Sign In
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate>
              <FormField label="Email Address" required>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(""); }}
                  placeholder="you@example.com"
                  className="uf-input"
                  autoComplete="email"
                  autoFocus
                />
              </FormField>

              <Button type="submit" variant="primary" loading={loading} fullWidth style={{ marginTop: "8px" }}>
                {loading ? "Sending Reset Link..." : "Send Reset Link"}
              </Button>

              <div className="auth-switch" style={{ marginTop: "16px" }}>
                <span>Remember your password?</span>
                <button className="auth-link-btn" type="button" onClick={onGoLogin}>
                  Sign In
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
