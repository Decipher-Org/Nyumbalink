/** Header and footer navigation. Anchors point at landing-page sections. */

export type NavLink = {
  label: string;
  href: string;
};

export const HEADER_LINKS: NavLink[] = [
  { label: "How it works", href: "#how-it-works" },
  { label: "For landlords", href: "#for-landlords" },
  { label: "Pricing", href: "#pricing" },
];

export const FOOTER_COLUMNS: { heading: string; links: NavLink[] }[] = [
  {
    heading: "Explore",
    links: [
      { label: "How it works", href: "#how-it-works" },
      { label: "For landlords", href: "#for-landlords" },
      { label: "Pricing", href: "#pricing" },
      { label: "Browse properties", href: "/browse" },
      { label: "Towns & areas", href: "/browse" },
    ],
  },
  {
    heading: "Company",
    links: [
      { label: "About us", href: "/about" },
      { label: "Blog", href: "/blog" },
      { label: "Careers", href: "/careers" },
      { label: "Contact us", href: "/contact" },
    ],
  },
  {
    heading: "Support",
    links: [
      { label: "Help center", href: "/help" },
      { label: "Safety tips", href: "/safety" },
      { label: "Terms of service", href: "/terms" },
      { label: "Privacy policy", href: "/privacy" },
    ],
  },
];

export const CONTACT_DETAILS = {
  phone: "0758 704 814",
  email: "hello@nyumbalink.co.ke",
  location: "Coastal Kenya",
};

export const BRAND_BLURB =
  "NyumbaLink connects tenants and landlords across Kenya's coastal counties with trusted listings and simple subscriptions.";

export const SOCIAL_LINKS: {
  label: string;
  href: string;
  icon: "facebook" | "instagram" | "twitter" | "youtube";
}[] = [
  { label: "Facebook", href: "https://facebook.com", icon: "facebook" },
  { label: "Instagram", href: "https://instagram.com", icon: "instagram" },
  { label: "Twitter", href: "https://twitter.com", icon: "twitter" },
  { label: "YouTube", href: "https://youtube.com", icon: "youtube" },
];
