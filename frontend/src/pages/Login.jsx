import { useState } from "react";

function Login({ onLogin, onRegister }) {
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();

    setError("");

    if (!loginId || !password) {
      setError("Please enter Login ID and Password.");
      return;
    }

    const registeredUser = JSON.parse(
      localStorage.getItem("urbanFinanceUser")
    );

    if (registeredUser) {
      if (
        loginId === registeredUser.loginId &&
        password === registeredUser.password
      ) {
        localStorage.setItem("urbanFinanceLoggedIn", "true");
        onLogin();
      } else {
        setError("Invalid Login ID or Password.");
      }

      return;
    }

    // Demo admin login
    if (loginId === "admin" && password === "admin123") {
      localStorage.setItem("urbanFinanceLoggedIn", "true");
      onLogin();
      return;
    }

    setError(
      "Invalid credentials. Use admin / admin123 or create a new account."
    );
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
          <h2>Manage your business finances with ease.</h2>

          <p>
            Track sales, purchases, contacts, products, journals, budgets and
            financial reports from one simple accounting dashboard.
          </p>

          <div className="auth-features">
            <div>✓ Sales & Purchase Management</div>
            <div>✓ Contact & Product Management</div>
            <div>✓ Journal & Accounting Management</div>
            <div>✓ Budget & Financial Reports</div>
          </div>
        </div>
      </div>

      <div className="auth-right">
        <div className="auth-card">
          <div className="mobile-brand">
            <div className="auth-logo">UF</div>
          </div>

          <div className="auth-heading">
            <h2>Welcome Back 👋</h2>
            <p>Sign in to your Urban Finance account</p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="auth-field">
              <label>Login ID</label>

              <input
                type="text"
                placeholder="Enter your login ID"
                value={loginId}
                onChange={(e) => setLoginId(e.target.value)}
              />
            </div>

            <div className="auth-field">
              <label>Password</label>

              <input
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {error && <div className="auth-error">{error}</div>}

            <button type="submit" className="auth-submit">
              Login
            </button>
          </form>

          <div className="auth-demo">
            <strong>Demo Login</strong>
            <span>Login ID: admin</span>
            <span>Password: admin123</span>
          </div>

          <div className="auth-switch">
            Don't have an account?
            <button onClick={onRegister}>Create Account</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;