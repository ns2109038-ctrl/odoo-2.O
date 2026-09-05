import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ShieldCheck, Armchair } from "lucide-react";

export function AuthLayout({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="surface-grain flex min-h-screen flex-col lg:flex-row">
      <aside className="hidden flex-1 flex-col justify-between bg-primary p-12 text-primary-foreground lg:flex">
        <Link to="/" className="flex items-center gap-3 font-display text-2xl">
          <Armchair className="size-6" />
          Urban Furniture
        </Link>
        <div className="max-w-md space-y-5">
          <h2 className="font-display text-5xl leading-[1.05]">
            Secure access to your accounting workspace
          </h2>
          <p className="text-sm opacity-80">
            Role based sign in for owners, accountants and contacts. Every login,
            reset and permission change is recorded.
          </p>
          <ul className="space-y-3 text-sm opacity-90">
            {[
              "Role based permissions (Admin / Accountant / Contact)",
              "Two step verification for privileged accounts",
              "Auto sign out after inactivity",
              "Activity log of every security event",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2">
                <ShieldCheck className="mt-0.5 size-4 shrink-0" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
        <p className="text-xs opacity-60">
          Front end module — connects to your team&apos;s API.
        </p>
      </aside>

      <main className="flex flex-1 items-center justify-center px-5 py-12">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center gap-2 lg:hidden">
            <Armchair className="size-5 text-primary" />
            <span className="font-semibold">Urban Furniture</span>
          </div>
          <h1 className="font-display text-4xl">{title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>
          <div className="mt-8">{children}</div>
          {footer ? (
            <div className="mt-6 text-sm text-muted-foreground">{footer}</div>
          ) : null}
        </div>
      </main>
    </div>
  );
}
