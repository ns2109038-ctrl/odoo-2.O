import { useEffect, useState } from "react";
import { Clock, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";

export function SessionTimer() {
  const { expiresAt, refreshSession } = useAuth();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  if (!expiresAt) return null;
  const remaining = Math.max(0, expiresAt - now);
  const mins = Math.floor(remaining / 60000);
  const secs = Math.floor((remaining % 60000) / 1000);
  const low = remaining < 5 * 60000;

  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <Clock className={`size-3.5 ${low ? "text-destructive" : ""}`} />
      <span className={low ? "text-destructive" : ""}>
        {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
      </span>
      <Button variant="ghost" size="sm" className="h-7 px-2" onClick={refreshSession}>
        <RefreshCw className="size-3.5" />
      </Button>
    </div>
  );
}
