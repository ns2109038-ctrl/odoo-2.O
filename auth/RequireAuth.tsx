import { useEffect, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useAuth, type Permission, type Role } from "@/lib/auth";

export function RequireAuth({
  children,
  roles,
  permission,
}: {
  children: ReactNode;
  roles?: Role[];
  permission?: Permission;
}) {
  const { user, loading, can } = useAuth();
  const navigate = useNavigate();

  const allowed =
    !!user &&
    (!roles || roles.includes(user.role)) &&
    (!permission || can(permission));

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate({ to: "/login", replace: true });
    } else if (!allowed) {
      navigate({ to: "/unauthorized", replace: true });
    }
  }, [loading, user, allowed, navigate]);

  if (loading || !allowed) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return <>{children}</>;
}
