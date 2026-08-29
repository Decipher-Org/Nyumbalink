import { Bell } from "lucide-react";

import {
  AccountSection,
  DeactivateSection,
  SecuritySection,
} from "@/components/app/AccountSettings";
import { PageHeader } from "@/components/app/PageHeader";
import { PushNotificationControl } from "@/components/app/PushNotificationControl";

/**
 * Account settings.
 *
 * The account, password and deactivation sections are shared with the tenant
 * Profile — same endpoints, same rules — and live in
 * `components/app/AccountSettings.tsx`.
 */
export default function LandlordSettings() {
  return (
    <>
      <PageHeader
        title="Settings"
        description="Your account, sign-in and alerts."
      />

      <div className="max-w-3xl space-y-6">
        <AccountSection nameHint="Your name is what tenants see when you haven't set a business name." />

        <SecuritySection />

        <section className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <Bell
                aria-hidden="true"
                className="mt-0.5 size-5 shrink-0 text-muted-foreground"
              />
              <div>
                <h2 className="text-h3 text-foreground">Alerts</h2>
                <p className="mt-1 text-body-sm text-muted-foreground">
                  Receive browser alerts for payments, subscription reminders,
                  and listing activity.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-5">
            <PushNotificationControl />
          </div>
        </section>

        <DeactivateSection keeps="Your listings and details are kept." />
      </div>
    </>
  );
}
