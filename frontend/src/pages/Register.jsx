import { useState } from "react";

function Register({ onLogin }) {
  const [form, setForm] = useState({
    name: "",
    loginId: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "User",
  });

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    setError("");
    setSuccess("");

    if (
      !form.name ||
      !form.loginId ||
      !form.email ||
      !form.password ||
      !form.confirmPassword
    ) {
      setError("Please fill all required fields.");
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError("Password and Confirm Password do not match.");
      return;
    }

    if (form.password.length < 6) {
      setError("Password must contain at least 6 characters.");
      return;
    }

    const user = {
      name: form.name,
      loginId: form.loginId,
      email: form.email,
      password: form.password,
      role: form.role,
    };

    localStorage.setItem("urbanFinanceUser", JSON.stringify(user));

    setSuccess("Account created successfully! Please login.");

    setTimeout(() => {
      onLogin();
    }, 1200);
  };

  return (
    <div className="auth-page">
      <div className="auth-left">
        <div className="auth-brand">
          <div className="auth-logo">UF</div>

          <div>
            <h1>Urban Furniture</h1>
            <p>Accounting System</p>
          </div>
        </div>

        <div className="auth-intro">
          <h2>Create your accounting account.</h2>

          <p>
            Register your account and manage your complete business accounting
            from one modern dashboard.
          </p>

          <div className="auth-features">
            <div>✓ Easy Accounting Dashboard</div>
            <div>✓ Manage Customers & Vendors</div>
            <div>✓ Manage Products & Accounts</div>
            <div>✓ Track Business Transactions</div>
          </div>
        </div>
      </div>

      <div className="auth-right">
        <div className="auth-card register-card">
          <div className="auth-heading">
            <h2>Create Account</h2>
            <p>Register a new Urban Finance account</p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="auth-two-column">
              <div className="auth-field">
                <label>Full Name</label>

                <input
                  type="text"
                  name="name"
                  placeholder="Enter your name"
                  value={form.name}
                  onChange={handleChange}
                />
              </div>

              <div className="auth-field">
                <label>Login ID</label>

                <input
                  type="text"
                  name="loginId"
                  placeholder="Choose login ID"
                  value={form.loginId}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="auth-field">
              <label>E-mail ID</label>

              <input
                type="email"
                name="email"
                placeholder="Enter your email"
                value={form.email}
                onChange={handleChange}
              />
            </div>

            <div className="auth-field">
              <label>Role</label>

              <select
                name="role"
                value={form.role}
                onChange={handleChange}
              >
                <option value="User">User</option>
                <option value="Administrator">Administrator</option>
              </select>
            </div>

            <div className="auth-two-column">
              <div className="auth-field">
                <label>Password</label>

                <input
                  type="password"
                  name="password"
                  placeholder="Minimum 6 characters"
                  value={form.password}
                  onChange={handleChange}
                />
              </div>

              <div className="auth-field">
                <label>Re-enter Password</label>

                <input
                  type="password"
                  name="confirmPassword"
                  placeholder="Confirm password"
                  value={form.confirmPassword}
                  onChange={handleChange}
                />
              </div>
            </div>

            {error && <div className="auth-error">{error}</div>}

            {success && <div className="auth-success">{success}</div>}

            <button type="submit" className="auth-submit">
              Create Account
            </button>
          </form>

          <div className="auth-switch">
            Already have an account?
            <button onClick={onLogin}>Back to Login</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Register;