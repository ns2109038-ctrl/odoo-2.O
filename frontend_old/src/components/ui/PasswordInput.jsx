import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

export default function PasswordInput({ name, value, onChange, placeholder, autoComplete, hasError }) {
  const [show, setShow] = useState(false);
  return (
    <div className="uf-pw-wrap">
      <input
        type={show ? "text" : "password"}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete={autoComplete || "current-password"}
        className={`uf-input ${hasError ? "uf-input-err" : ""}`}
        aria-invalid={!!hasError}
      />
      <button
        type="button"
        className="uf-pw-toggle"
        onClick={() => setShow((s) => !s)}
        tabIndex={-1}
        aria-label={show ? "Hide password" : "Show password"}
      >
        {show ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  );
}
