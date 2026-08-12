import { Bell } from "lucide-react";
import { useState } from "react";

import {
  AccountSection,
  DeactivateSection,
  SecuritySection,
} from "@/components/app/AccountSettings";
import { DemoBadge } from "@/components/app/DemoBadge";
import { PageHeader } from "@/components/app/PageHeader";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

/**
 * Account settings.
 *
 * The account, password and deactivation sections are shared with the tenant
 * Profile — same endpoints, same rules — and live in
 * `components/app/AccountSettings.tsx`. What's left here is the alert
 * preferences, which are landlord-specific in wording and **not real**: nothing
 * generates a notification yet, so they are marked and save nowhere.
 */
export default function LandlordSettings() {
  // Inert on purpose. Local state so the switches still feel like switches, which
  // is what makes the "demo" label meaningful rather than a disabled row nobody
  // can interpret.
  const [alerts, setAlerts] = useState({ enquiries: true, payments: true, digest: false });

  return (
    <>
      <PageHeader title="Settings" description="Your account, sign-in and alerts." />

      <div className="max-w-3xl space-y-6">
        <AccountSection nameHint="Your name is what tenants see when you haven't set a business name." />

        <SecuritySection />

        <section className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <Bell aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
              <div>
                <h2 className="text-h3 text-foreground">Alerts</h2>
                <p className="mt-1 text-body-sm text-muted-foreground">
                  Nothing is sent yet — these switches don't save anywhere.
                </p>
              </div>
            </div>
            <DemoBadge feature="notifications" />
          </div>

          <div className="mt-5 space-y-4">
            <AlertToggle
              id="alert-enquiries"
              label="Tenant enquiries"
              description="When someone asks about one of your listings."
              checked={alerts.enquiries}
              onChange={(next) => setAlerts((prev) => ({ ...prev, enquiries: next }))}
            />
            <AlertToggle
              id="alert-payments"
              label="Payments and renewals"
              description="Receipts, failed charges and plan renewals."
              checked={alerts.payments}
              onChange={(next) => setAlerts((prev) => ({ ...prev, payments: next }))}
            />
            <AlertToggle
              id="alert-digest"
              label="Weekly summary"
              description="How your listings did over the past week."
              checked={alerts.digest}
              onChange={(next) => setAlerts((prev) => ({ ...prev, digest: next }))}
            />
          </div>
        </section>

        <DeactivateSection keeps="Your listings and details are kept." />
      </div>
    </>
  );
}

function AlertToggle({
  id,
  label,
  description,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <Label htmlFor={id} className="text-body text-foreground">
          {label}
        </Label>
        <p className="mt-0.5 text-body-sm text-muted-foreground">{description}</p>
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onChange} className="mt-1 shrink-0" />
    </div>
  );
}
