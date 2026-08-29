import { Bell, BellOff } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  currentPushState,
  enablePushNotifications,
  type PushState,
} from "@/lib/notifications/push";

const LABELS: Record<PushState, string> = {
  unsupported: "Push alerts are not supported by this browser.",
  unconfigured: "Browser alerts are not configured for this environment.",
  default: "Enable browser alerts for payments, subscriptions, and listing activity.",
  denied: "Browser alerts are blocked. Enable them in your browser settings.",
  enabled: "Browser alerts are enabled on this device.",
};

export function PushNotificationControl() {
  const [state, setState] = useState<PushState>(() => currentPushState());
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setState(currentPushState());
  }, []);

  async function enable() {
    setSaving(true);
    setError(null);
    try {
      await enablePushNotifications();
      setState(currentPushState());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not enable browser alerts.");
      setState(currentPushState());
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {state === "default" ? (
        <Button type="button" variant="outline" size="sm" onClick={enable} disabled={saving}>
          <Bell className="size-4" />
          {saving ? "Enabling…" : "Enable browser alerts"}
        </Button>
      ) : state === "enabled" ? (
        <span className="inline-flex items-center gap-1.5 text-body-sm text-muted-foreground">
          <Bell className="size-4 text-success-strong" /> Browser alerts enabled
        </span>
      ) : (
        <span className="inline-flex items-center gap-1.5 text-body-sm text-muted-foreground">
          <BellOff className="size-4" /> {LABELS[state]}
        </span>
      )}
      {error ? <span className="text-body-sm text-destructive">{error}</span> : null}
    </div>
  );
}
