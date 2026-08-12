import { MessageSquare, Phone } from "lucide-react";
import { Link } from "react-router-dom";

import { DemoNotice } from "@/components/app/DemoBadge";
import { PageHeader } from "@/components/app/PageHeader";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { DEMO_CHATS } from "@/lib/demo/tenant";
import { formatRelative } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Messages — entirely sample data, and the only demo surface with no milestone
 * behind it: in-app chat is not on the roadmap at all.
 *
 * The screen exists because the designs put Chats in the tenant tab bar, and a
 * tab that 404s is worse than a tab that explains itself. Every conversation
 * here is fixed, nothing can be sent, and the honest alternative — calling the
 * landlord on the number from their listing — is offered instead of a disabled
 * message box pretending to be nearly ready.
 */
export default function TenantChats() {
  return (
    <>
      <PageHeader
        title="Messages"
        description="How enquiries would look once messaging exists."
      />

      <DemoNotice feature="messages" className="mb-6" />

      <ul className="space-y-3">
        {DEMO_CHATS.map((chat) => (
          <li
            key={chat.id}
            className={cn(
              "flex items-start gap-3 rounded-xl border bg-card p-4",
              chat.unread ? "border-primary/30" : "border-border",
            )}
          >
            <Avatar className="size-10 shrink-0">
              <AvatarFallback className="bg-secondary text-body-sm font-semibold text-secondary-foreground">
                {chat.landlord.charAt(0)}
              </AvatarFallback>
            </Avatar>

            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-3">
                <p className="text-body font-semibold text-foreground">
                  {chat.landlord}
                  {chat.unread ? (
                    <>
                      {" "}
                      {/* Worded, not a bare dot — a colour-only unread marker is
                          invisible to a screen reader and in greyscale. */}
                      <span className="align-middle text-caption font-semibold text-primary">
                        • New
                      </span>
                    </>
                  ) : null}
                </p>
                <span className="shrink-0 text-caption text-muted-foreground">
                  {formatRelative(chat.at)}
                </span>
              </div>
              <p className="mt-0.5 text-caption text-muted-foreground">{chat.property}</p>
              <p className="mt-1.5 line-clamp-2 text-body-sm text-muted-foreground">
                {chat.preview}
              </p>
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-6 flex flex-col gap-3 rounded-xl border border-border bg-surface p-5 sm:flex-row sm:items-center">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-secondary">
          <Phone aria-hidden="true" className="size-5 text-primary" />
        </span>
        <div className="flex-1">
          <p className="text-body font-semibold text-foreground">Reach landlords by phone</p>
          <p className="mt-0.5 text-body-sm text-muted-foreground">
            Every listing shows the landlord’s number. That call works today.
          </p>
        </div>
        <Button asChild variant="outline" className="shrink-0">
          <Link to="/tenant/search">
            <MessageSquare />
            Browse listings
          </Link>
        </Button>
      </div>
    </>
  );
}
