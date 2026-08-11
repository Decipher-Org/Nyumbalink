import { Facebook, Heart, Instagram, Mail, MapPin, Phone, Twitter, Youtube } from "lucide-react";
import { Link } from "react-router-dom";

import { Logo } from "@/components/brand/Logo";
import {
  BRAND_BLURB,
  CONTACT_DETAILS,
  FOOTER_COLUMNS,
  SOCIAL_LINKS,
} from "@/lib/content/nav";

const SOCIAL_ICONS = {
  facebook: Facebook,
  instagram: Instagram,
  twitter: Twitter,
  youtube: Youtube,
} as const;

function FooterLink({ href, label }: { href: string; label: string }) {
  const isAnchor = href.startsWith("#");

  return isAnchor ? (
    <a href={href} className="text-sm text-foreground/70 transition-colors hover:text-primary">
      {label}
    </a>
  ) : (
    <Link to={href} className="text-sm text-foreground/70 transition-colors hover:text-primary">
      {label}
    </Link>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-border/60 bg-background">
      <div className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_repeat(4,1fr)]">
          <div className="max-w-sm">
            <Link to="/" aria-label="NyumbaLink home">
              <Logo />
            </Link>
            <p className="mt-4 text-sm leading-relaxed text-foreground/70">{BRAND_BLURB}</p>
            <ul className="mt-6 flex items-center gap-4">
              {SOCIAL_LINKS.map((social) => {
                const Icon = SOCIAL_ICONS[social.icon];
                return (
                  <li key={social.label}>
                    <a
                      href={social.href}
                      target="_blank"
                      rel="noreferrer noopener"
                      aria-label={social.label}
                      className="text-primary/70 transition-colors hover:text-primary"
                    >
                      <Icon className="size-5" />
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>

          {FOOTER_COLUMNS.map((column) => (
            <nav key={column.heading} aria-label={column.heading}>
              <h2 className="text-sm font-semibold text-foreground">{column.heading}</h2>
              <ul className="mt-4 flex flex-col gap-3">
                {column.links.map((link) => (
                  <li key={`${column.heading}-${link.label}`}>
                    <FooterLink href={link.href} label={link.label} />
                  </li>
                ))}
              </ul>
            </nav>
          ))}

          <div>
            <h2 className="text-sm font-semibold text-foreground">Contact</h2>
            <ul className="mt-4 flex flex-col gap-3 text-sm text-foreground/70">
              <li className="flex items-center gap-2.5">
                <Phone className="size-4 shrink-0 text-primary" />
                <a href={`tel:${CONTACT_DETAILS.phone.replace(/\s/g, "")}`} className="hover:text-primary">
                  {CONTACT_DETAILS.phone}
                </a>
              </li>
              <li className="flex items-center gap-2.5">
                <Mail className="size-4 shrink-0 text-primary" />
                <a href={`mailto:${CONTACT_DETAILS.email}`} className="hover:text-primary">
                  {CONTACT_DETAILS.email}
                </a>
              </li>
              <li className="flex items-center gap-2.5">
                <MapPin className="size-4 shrink-0 text-primary" />
                {CONTACT_DETAILS.location}
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-border/60 pt-6 sm:flex-row">
          <p className="text-xs text-foreground/60">
            © {new Date().getFullYear()} NyumbaLink. All rights reserved.
          </p>
          <p className="flex items-center gap-1.5 text-xs text-foreground/60">
            Made with <Heart className="size-3.5 fill-accent text-accent" /> in Kenya
          </p>
        </div>
      </div>
    </footer>
  );
}
