import type { ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Armchair,
  LogOut,
  ShieldCheck,
  Users,
  ScrollText,
  KeyRound,
  LayoutDashboard,
  Lock,
  Contact2,
  Package,
  Percent,
  BookOpen,
  ShoppingCart,
  ReceiptText,
  FileText,
  Banknote,
  BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth, ROLE_LABELS, type Permission } from "@/lib/auth";
import { SessionTimer } from "./SessionTimer";

type NavItem = {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  permission?: Permission;
  adminOnly?: boolean;
  staffOnly?: boolean;
};

const NAV_GROUPS: { heading: string; items: NavItem[] }[] = [
  {
    heading: "Overview",
    items: [{ to: "/dashboard", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    heading: "Master data",
    items: [
      { to: "/contacts", label: "Contacts", icon: Contact2, permission: "master.manage" },
      { to: "/products", label: "Products", icon: Package, permission: "master.manage" },
      { to: "/taxes", label: "Taxes", icon: Percent, permission: "master.manage" },
      { to: "/accounts", label: "Chart of Accounts", icon: BookOpen, permission: "master.manage" },
    ],
  },
  {
    heading: "Transactions",
    items: [
      { to: "/purchase-orders", label: "Purchase Orders", icon: ShoppingCart, permission: "transaction.manage" },
      { to: "/vendor-bills", label: "Vendor Bills", icon: ReceiptText, permission: "transaction.manage" },
      { to: "/sales-orders", label: "Sales Orders", icon: FileText, permission: "transaction.manage" },
      { to: "/invoices", label: "Invoices", icon: FileText, permission: "transaction.manage" },
      { to: "/payments", label: "Payments", icon: Banknote, permission: "transaction.manage" },
    ],
  },
  {
    heading: "Reporting",
    items: [{ to: "/reports", label: "Reports", icon: BarChart3, permission: "report.view" }],
  },
  {
    heading: "Administration",
    items: [
      { to: "/users", label: "Users & roles", icon: Users, adminOnly: true },
      { to: "/security-log", label: "Activity log", icon: ScrollText, staffOnly: true },
      { to: "/security", label: "Security", icon: Lock, staffOnly: true },
      { to: "/account", label: "My account", icon: KeyRound },
    ],
  },
];

export function AppShell({ children }: { children: ReactNode }) {
  const { user, signOut, can } = useAuth();
  const navigate = useNavigate();
  const pathname = (useRouterState({ select: (s: any) => s.location.pathname }) as unknown) as string;

  const allow = (item: NavItem) =>
    (!item.adminOnly || user?.role === "admin") &&
    (!item.staffOnly || user?.role === "admin" || user?.role === "accountant") &&
    (!item.permission || (!!user && can(item.permission)));

  const groups = NAV_GROUPS.map((g) => ({ ...g, items: g.items.filter(allow) })).filter(
    (g) => g.items.length > 0,
  );
  const items = groups.flatMap((g) => g.items);

  const initials = (user?.name ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((p: string) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="surface-grain min-h-screen lg:flex">
      <aside className="sticky top-0 z-20 hidden h-screen w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar px-4 py-6 lg:flex">
        <Link to="/dashboard" className="flex items-center gap-2 px-2">
          <Armchair className="size-5 text-primary" />
          <span className="font-display text-xl">Urban Furniture</span>
        </Link>
        <p className="mt-1 px-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          Accounting workspace
        </p>

        <nav className="mt-6 flex flex-1 flex-col gap-5 overflow-y-auto pr-1">
          {groups.map((group) => (
            <div key={group.heading} className="space-y-1">
              <p className="px-3 text-[10px] uppercase tracking-[0.2em] text-muted-foreground/70">
                {group.heading}
              </p>
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = pathname === item.to;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                      active
                        ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                        : "text-muted-foreground hover:bg-sidebar-accent/60"
                    }`}
                  >
                    <Icon className="size-4" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="rounded-xl border border-sidebar-border bg-card p-3">
          <div className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-full bg-primary text-sm font-medium text-primary-foreground">
              {initials || "?"}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{user?.name}</p>
              <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="mt-3 w-full"
            onClick={() => {
              signOut("Manual sign out");
              navigate({ to: "/login", replace: true });
            }}
          >
            <LogOut className="size-4" />
            Sign out
          </Button>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-10 border-b border-border bg-card/80 backdrop-blur">
          <div className="flex flex-wrap items-center gap-3 px-5 py-3">
            <Link to="/dashboard" className="flex items-center gap-2 font-display text-lg lg:hidden">
              <Armchair className="size-5 text-primary" />
              Urban Furniture
            </Link>
            <Badge variant="secondary" className="gap-1">
              <ShieldCheck className="size-3" />
              {user ? (ROLE_LABELS[user.role] ?? user.role) : ""}
            </Badge>
            <div className="ml-auto flex items-center gap-3">
              <SessionTimer />
              <Button
                variant="outline"
                size="sm"
                className="lg:hidden"
                onClick={() => {
                  signOut("Manual sign out");
                  navigate({ to: "/login", replace: true });
                }}
              >
                <LogOut className="size-4" />
              </Button>
            </div>
          </div>
          <nav className="flex gap-1 overflow-x-auto px-3 pb-2 lg:hidden">
            {items.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.to;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors ${
                    active
                      ? "bg-secondary font-medium text-secondary-foreground"
                      : "text-muted-foreground hover:bg-secondary/60"
                  }`}
                >
                  <Icon className="size-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </header>
        <main className="mx-auto max-w-5xl px-5 py-8">{children}</main>
      </div>
    </div>
  );
}
