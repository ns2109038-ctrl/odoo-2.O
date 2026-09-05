import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { passwordScore } from "@/lib/auth";

export function PasswordField({
  id,
  label,
  value,
  onChange,
  autoComplete = "current-password",
  showStrength = false,
  placeholder = "••••••••",
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete?: string;
  showStrength?: boolean;
  placeholder?: string;
}) {
  const [visible, setVisible] = useState(false);
  const { score, label: strength, checks } = passwordScore(value);
  const bar = ["bg-destructive", "bg-destructive", "bg-warning", "bg-warning", "bg-success", "bg-success"];

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          type={visible ? "text" : "password"}
          value={value}
          autoComplete={autoComplete}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className="pr-10"
        />
        <button
          type="button"
          aria-label={visible ? "Hide password" : "Show password"}
          onClick={() => setVisible((v) => !v)}
          className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground hover:text-foreground"
        >
          {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
      {showStrength && value.length > 0 ? (
        <div className="space-y-2">
          <div className="flex gap-1">
            {[0, 1, 2, 3, 4].map((i) => (
              <span
                key={i}
                className={`h-1.5 flex-1 rounded-full ${
                  i < score ? bar[Math.min(Math.max(0, score), bar.length - 1)] ?? "bg-muted" : "bg-muted"
                }`}
              />
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Strength: <span className="font-medium text-foreground">{strength}</span> —
            needs 8+ characters, upper &amp; lower case, a number and a symbol
            {checks?.every(Boolean) ? " ✓" : ""}
          </p>
        </div>
      ) : null}
    </div>
  );
}
