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
  const [devResetUrl, setDevResetUrl] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!email.trim()) return setError("Email is required.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
      return setError("Please enter a valid email address.");

    setLoading(true);
    try {
      const data = await forgotPassword(email.trim());
      setSuccess(true);
      if (data?.dev_reset_url) {
        setDevResetUrl(data.dev_reset_url);
      }
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
                <strong>Reset Request Processed!</strong>
                <br />
                If an account with that email exists, a password reset link has been generated. The link is valid for <strong>30 minutes</strong>.
              </Alert>

              {devResetUrl && (
                <div style={{
                  marginTop: "16px",
                  padding: "14px",
                  background: "rgba(72, 172, 240, 0.08)",
                  border: "1px dashed #38bdf8",
                  borderRadius: "8px"
                }}>
                  <p style={{ margin: "0 0 8px", fontSize: "12px", fontWeight: 600, color: "#38bdf8" }}>
                    ⚡ Development Notice (SMTP Not Configured):
                  </p>
                  <p style={{ margin: "0 0 12px", fontSize: "12px", color: "var(--c-text-muted, #94a3b8)", lineHeight: "1.5" }}>
                    SMTP email sending is not configured in <code>.env</code>. You can test your reset link directly right here:
                  </p>
                  <a
                    href={devResetUrl}
                    style={{
                      display: "block",
                      textAlign: "center",
                      backgroundColor: "#0284c7",
                      color: "#ffffff",
                      padding: "10px 16px",
                      borderRadius: "6px",
                      fontSize: "13px",
                      fontWeight: "600",
                      textDecoration: "none"
                    }}
                  >
                    Open Password Reset Link →
                  </a>
                </div>
              )}

              <div style={{ marginTop: "12px", fontSize: "13px", color: "var(--c-text-muted, #64748b)", lineHeight: "1.6" }}>
                {!devResetUrl && "Didn't receive it? Check your spam folder or make sure you entered your registered account email."}
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
