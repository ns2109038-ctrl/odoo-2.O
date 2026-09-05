import { useState } from "react";

export default function CreateUser() {
  const [formData, setFormData] = useState({
    name: "Admin User",
    login_id: "admin01",
    email: "admin@urbanfurniture.com",
    role: "admin",
    password: "Admin123!",
    confirm_password: "Admin123!",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [clientError, setClientError] = useState("");
  const [apiError, setApiError] = useState(null); // { status: number, message: string }
  const [successData, setSuccessData] = useState(null);

  const roleOptions = [
    { label: "Administrator", value: "admin" },
    { label: "Accountant", value: "accountant" },
    { label: "Contact / User", value: "contact" },
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setClientError("");
    setApiError(null);
  };

  const handleClear = () => {
    setFormData({
      name: "",
      login_id: "",
      email: "",
      role: "admin",
      password: "",
      confirm_password: "",
    });
    setClientError("");
    setApiError(null);
    setSuccessData(null);
  };

  const validate = () => {
    if (!formData.name.trim()) return "Name is required.";
    if (formData.name.trim().length < 2 || formData.name.trim().length > 100)
      return "Name must be between 2 and 100 characters.";

    if (!formData.login_id.trim()) return "Login ID is required.";
    if (formData.login_id.length < 6 || formData.login_id.length > 12)
      return "Login ID must be between 6 and 12 characters.";

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim()) return "Email is required.";
    if (!emailRegex.test(formData.email)) return "Please enter a valid email address.";

    if (!formData.password) return "Password is required.";
    if (formData.password.length < 8) return "Password must be at least 8 characters long.";

    const hasUpper = /[A-Z]/.test(formData.password);
    const hasLower = /[a-z]/.test(formData.password);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(formData.password);
    if (!hasUpper || !hasLower || !hasSpecial) {
      return "Password must contain a lowercase letter, an uppercase letter, and a special character.";
    }

    if (formData.password !== formData.confirm_password)
      return "Password and Re-entered Password do not match.";

    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setClientError("");
    setApiError(null);
    setSuccessData(null);

    const validationMsg = validate();
    if (validationMsg) {
      setClientError(validationMsg);
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("http://127.0.0.1:8000/users/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          login_id: formData.login_id.trim(),
          email: formData.email.trim(),
          role: formData.role,
          password: formData.password,
          confirm_password: formData.confirm_password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        let msg = "An error occurred during registration.";
        if (typeof data.detail === "string") {
          msg = data.detail;
        } else if (Array.isArray(data.detail)) {
          msg = data.detail.map((err) => `${err.loc?.join(".")}: ${err.msg}`).join(" | ");
        } else if (data.message) {
          msg = data.message;
        }

        setApiError({
          status: response.status,
          message: msg,
        });
      } else {
        setSuccessData(data);
        // Requirement 15: After successful registration, clear password fields
        setFormData((prev) => ({
          ...prev,
          password: "",
          confirm_password: "",
        }));
      }
    } catch (err) {
      setApiError({
        status: 0,
        message: `Network Error: Failed to connect to FastAPI backend at http://127.0.0.1:8000 (${err.message})`,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        {/* Header / Logo (Referenced from official Urban Furniture photo) */}
        <div style={styles.header}>
          <div style={styles.logoContainer}>
            <img
              src="/urban_furniture_logo.png"
              alt="Urban Furniture Logo"
              style={styles.logoImage}
            />
          </div>
          <h2 style={styles.title}>Create User</h2>
          <p style={styles.subtitle}>Temporary API Testing &bull; Urban Furniture</p>
          <div style={styles.endpointBadge}>
            POST <code>http://127.0.0.1:8000/users/register</code>
          </div>
        </div>

        {/* Client Error Banner */}
        {clientError && (
          <div style={styles.alertError}>
            <strong>Validation Error:</strong> {clientError}
          </div>
        )}

        {/* API Error Banner */}
        {apiError && (
          <div style={styles.alertError}>
            <strong>
              HTTP {apiError.status || "Connection Error"}:
            </strong>{" "}
            {apiError.message}
          </div>
        )}

        {/* Success Banner */}
        {successData && (
          <div style={styles.alertSuccess}>
            <strong>Registration Succeeded (HTTP 201)!</strong>
            <p style={{ margin: "6px 0 2px 0" }}>User ID: #{successData.id}</p>
            <p style={{ margin: "2px 0" }}>Name: {successData.name}</p>
            <p style={{ margin: "2px 0" }}>Login ID: {successData.login_id}</p>
            <p style={{ margin: "2px 0" }}>Role: {successData.role}</p>
            <p style={{ margin: "2px 0 0 0", fontSize: "12px", color: "#166534" }}>
              (Notice: Plain-text password is never returned or exposed in responses).
            </p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Full Name *</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g. Admin User"
              style={styles.input}
              required
            />
          </div>

          <div style={styles.row}>
            <div style={{ ...styles.formGroup, flex: 1 }}>
              <label style={styles.label}>Login ID * (6-12 chars)</label>
              <input
                type="text"
                name="login_id"
                value={formData.login_id}
                onChange={handleChange}
                placeholder="e.g. admin01"
                style={styles.input}
                required
              />
            </div>

            <div style={{ ...styles.formGroup, flex: 1 }}>
              <label style={styles.label}>Email ID *</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="admin@urbanfurniture.com"
                style={styles.input}
                required
              />
            </div>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Role *</label>
            <div style={styles.radioGroup}>
              {roleOptions.map((opt) => (
                <label key={opt.value} style={styles.radioLabel}>
                  <input
                    type="radio"
                    name="role"
                    value={opt.value}
                    checked={formData.role === opt.value}
                    onChange={handleChange}
                    style={{ marginRight: "6px" }}
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </div>

          <div style={styles.row}>
            <div style={{ ...styles.formGroup, flex: 1 }}>
              <label style={styles.label}>Password * (min 8 chars)</label>
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Enter password"
                style={styles.input}
                required
              />
            </div>

            <div style={{ ...styles.formGroup, flex: 1 }}>
              <label style={styles.label}>Re-enter Password *</label>
              <input
                type={showPassword ? "text" : "password"}
                name="confirm_password"
                value={formData.confirm_password}
                onChange={handleChange}
                placeholder="Confirm password"
                style={styles.input}
                required
              />
            </div>
          </div>

          <div style={styles.showPasswordRow}>
            <label style={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={showPassword}
                onChange={(e) => setShowPassword(e.target.checked)}
                style={{ marginRight: "8px" }}
              />
              Show Password
            </label>
          </div>

          {/* Action Buttons */}
          <div style={styles.buttonRow}>
            <button
              type="submit"
              disabled={loading}
              style={{
                ...styles.submitBtn,
                opacity: loading ? 0.7 : 1,
                cursor: loading ? "not-allowed" : "pointer",
              }}
            >
              {loading ? "Creating..." : "Create"}
            </button>

            <button
              type="button"
              onClick={handleClear}
              disabled={loading}
              style={styles.clearBtn}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    minHeight: "80vh",
    padding: "20px",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  },
  card: {
    width: "100%",
    maxWidth: "560px",
    backgroundColor: "#ffffff",
    borderRadius: "12px",
    boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
    border: "1px solid #e2e8f0",
    padding: "32px",
  },
  header: {
    textAlign: "center",
    marginBottom: "20px",
  },
  logoContainer: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: "8px",
  },
  logoImage: {
    height: "75px",
    maxWidth: "100%",
    objectFit: "contain",
  },
  title: {
    margin: "0 0 4px 0",
    fontSize: "22px",
    color: "#0f172a",
    fontWeight: "700",
  },
  subtitle: {
    margin: "0 0 12px 0",
    fontSize: "14px",
    color: "#64748b",
  },
  endpointBadge: {
    display: "inline-block",
    backgroundColor: "#f1f5f9",
    color: "#334155",
    padding: "4px 10px",
    borderRadius: "6px",
    fontSize: "12px",
    fontWeight: "500",
  },
  alertError: {
    backgroundColor: "#fef2f2",
    border: "1px solid #fecaca",
    color: "#991b1b",
    padding: "12px 16px",
    borderRadius: "8px",
    marginBottom: "20px",
    fontSize: "14px",
    lineHeight: "1.5",
  },
  alertSuccess: {
    backgroundColor: "#f0fdf4",
    border: "1px solid #bbf7d0",
    color: "#166534",
    padding: "14px 16px",
    borderRadius: "8px",
    marginBottom: "20px",
    fontSize: "14px",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  row: {
    display: "flex",
    gap: "16px",
  },
  formGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  label: {
    fontSize: "13px",
    fontWeight: "600",
    color: "#334155",
  },
  input: {
    padding: "10px 14px",
    borderRadius: "8px",
    border: "1px solid #cbd5e1",
    fontSize: "14px",
    outline: "none",
    transition: "border-color 0.2s",
    backgroundColor: "#f8fafc",
  },
  radioGroup: {
    display: "flex",
    gap: "16px",
    padding: "8px 0",
  },
  radioLabel: {
    fontSize: "13px",
    color: "#334155",
    display: "flex",
    alignItems: "center",
    cursor: "pointer",
  },
  showPasswordRow: {
    display: "flex",
    alignItems: "center",
    marginTop: "-4px",
  },
  checkboxLabel: {
    fontSize: "13px",
    color: "#475569",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
  },
  buttonRow: {
    display: "flex",
    gap: "12px",
    marginTop: "12px",
  },
  submitBtn: {
    flex: 2,
    padding: "12px 20px",
    backgroundColor: "#2563eb",
    color: "#ffffff",
    border: "none",
    borderRadius: "8px",
    fontWeight: "600",
    fontSize: "14px",
  },
  clearBtn: {
    flex: 1,
    padding: "12px 20px",
    backgroundColor: "#f1f5f9",
    color: "#475569",
    border: "1px solid #cbd5e1",
    borderRadius: "8px",
    fontWeight: "600",
    fontSize: "14px",
    cursor: "pointer",
  },
};
