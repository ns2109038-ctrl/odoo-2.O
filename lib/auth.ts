export type Role = "admin" | "accountant" | "contact";
export type Permission = "master.manage" | "transaction.manage" | "report.view" | string;

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export const ROLE_LABELS: Record<string, string> = {
  admin: "Administrator",
  accountant: "Accountant",
  contact: "Contact",
};

export function useAuth() {
  const user: User | null = {
    id: "1",
    name: "Admin User",
    email: "admin@example.com",
    role: "admin",
  };

  const can = (permission: Permission): boolean => {
    return true;
  };

  const signOut = (reason?: string) => {
    console.log("Sign out:", reason);
  };

  const refreshSession = () => {
    console.log("Refresh session");
  };

  return {
    user,
    loading: false,
    can,
    signOut,
    expiresAt: Date.now() + 3600 * 1000,
    refreshSession,
  };
}

export function passwordScore(password: string) {
  let score = 0;
  const checks = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[a-z]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ];
  score = checks.filter(Boolean).length;
  const labels = ["Very Weak", "Weak", "Fair", "Good", "Strong", "Very Strong"];
  return {
    score,
    label: labels[score] ?? "Weak",
    checks,
  };
}
