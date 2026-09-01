/**
 * Social proof for the landing page.
 *
 * Placeholder figures and testimonials pending real platform data — the shapes
 * match what a future metrics endpoint would return.
 */

export type Stat = {
  value: string;
  label: string;
  icon: "home" | "pin" | "users" | "shield";
};

export const TRUST_STATS: Stat[] = [
  { value: "1,200+", label: "Active listings", icon: "home" },
  { value: "55+", label: "Coastal towns covered", icon: "pin" },
  { value: "5,000+", label: "Happy tenants", icon: "users" },
  { value: "100%", label: "Verified landlords", icon: "shield" },
];

export type Testimonial = {
  quote: string;
  name: string;
  role: string;
  /** Initials stand in for a photo until real avatars exist. */
  initials: string;
};

export const TESTIMONIALS: Testimonial[] = [
  {
    quote:
      "I found a neat 2 bedroom in Mtwapa within two days. The landlord was responsive and everything was smooth.",
    name: "Grace Wanjiku",
    role: "Tenant, Mtwapa",
    initials: "GW",
  },
  {
    quote:
      "NyumbaLink helps me keep my apartments occupied. Updating rent and vacancy is quick and easy.",
    name: "John Mwangi",
    role: "Landlord, Kilifi Town",
    initials: "JM",
  },
];
