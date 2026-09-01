/**
 * Landing-page FAQ.
 *
 * The prices are interpolated from `lib/content/pricing.ts` rather than typed out.
 * That is the whole reason this file imports anything: it previously said "KES 20"
 * in prose while the pricing card said something else, and a number written twice is
 * a number that will disagree with itself. There is now one literal per price in the
 * codebase, and it lives next to the note explaining which backend env var it mirrors.
 */

import { LANDLORD_PRICING, TENANT_PASS, formatKes } from "./pricing";

export type FaqEntry = {
  question: string;
  answer: string;
};

export const FAQS: FaqEntry[] = [
  {
    question: "How does payment work?",
    answer: `Everything is paid through M-Pesa. Tenants buy a day pass to browse listings; landlords pay KSh ${formatKes(LANDLORD_PRICING.unitPrice)} per rentable unit for a ${LANDLORD_PRICING.termDays}-day term on each property. You always see the exact amount on screen before the M-Pesa prompt reaches your phone, and nothing is ever charged automatically.`,
  },
  {
    question: "How does the daily access work for tenants?",
    answer: `One payment of KSh ${formatKes(TENANT_PASS.price)} opens every listing on NyumbaLink for 24 hours — search freely, see landlords' phone numbers and message them directly. If you buy another pass while one is still running, the time is added to what you have left rather than replacing it. Otherwise it simply lapses; there is nothing to cancel.`,
  },
  {
    question: "How do I update rent or vacancy status?",
    answer:
      "From your landlord dashboard, open the property and edit the unit. Rent and vacancy are updated in a single step, and the change is reflected on your live listing immediately.",
  },
  {
    question: "Is NyumbaLink safe and trustworthy?",
    answer:
      "Every landlord is manually reviewed and approved before their listings go live, so you are always dealing with a verified account. Listings and contact details are only shown to tenants with active access, which keeps landlords free from spam calls.",
  },
  {
    question: "How do I sign up as a landlord?",
    answer:
      "Choose “I have property to rent out” when you create your account, then complete your landlord profile with your ID and M-Pesa number. Our team reviews it, and once approved you can publish listings.",
  },
  {
    question: "Can I cancel my subscription anytime?",
    answer:
      "There is nothing to cancel, because nothing renews on its own. A landlord term covers one property for 30 days and then simply stops. When it does, that listing is hidden from tenants rather than deleted — everything you entered stays exactly as it was, and renewing puts it straight back in front of tenants. Tenant passes lapse by themselves after 24 hours.",
  },
  {
    question: "Which towns and counties are covered?",
    answer:
      "NyumbaLink covers the six coastal counties: Kilifi, Mombasa, Kwale, Lamu, Tana River and Taita-Taveta, including their major towns and surrounding areas.",
  },
  {
    question: "What if I need help?",
    answer:
      "Our support team is reachable by phone and email during business hours, and the help centre covers the most common questions.",
  },
];
