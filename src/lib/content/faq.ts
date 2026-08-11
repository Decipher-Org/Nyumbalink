export type FaqEntry = {
  question: string;
  answer: string;
};

/**
 * Answers describe the product as designed. Where a flow is not yet live on the
 * backend (payments, subscriptions), the copy stays about intent rather than
 * promising a working checkout.
 */
export const FAQS: FaqEntry[] = [
  {
    question: "How does payment work?",
    answer:
      "Payments are made through M-Pesa. Tenants pay a small daily fee to unlock landlord contact details, and landlords pay a monthly subscription to keep their listings live. You will get an M-Pesa prompt on your phone and confirmation once the payment goes through.",
  },
  {
    question: "How does the daily access work for tenants?",
    answer:
      "One payment of KES 20 gives you 24 hours of access. During that window you can unlock as many landlord contacts as you like and call them directly. Access simply lapses at the end of the day — there is nothing to cancel.",
  },
  {
    question: "How do I update rent or vacancy status?",
    answer:
      "From your landlord dashboard, open the property and edit the unit. Rent and vacancy are updated in a single step, and the change is reflected on your live listing immediately.",
  },
  {
    question: "Is NyumbaLink safe and trustworthy?",
    answer:
      "Every landlord is manually reviewed and approved before their listings go live, so you are always dealing with a verified account. Contact details are only shared with tenants who have active access, which keeps landlords free from spam.",
  },
  {
    question: "How do I sign up as a landlord?",
    answer:
      "Choose “I have property to rent out” when you create your account, then complete your landlord profile with your ID and M-Pesa number. Our team reviews it, and once approved you can publish listings.",
  },
  {
    question: "Can I cancel my subscription anytime?",
    answer:
      "Yes. Landlord subscriptions run month to month and can be stopped whenever you like — your listings stay visible until the period you have paid for ends. Tenant access is daily, so it lapses on its own.",
  },
  {
    question: "Which towns and counties are covered?",
    answer:
      "NyumbaLink covers more than 40 towns across Kenya, with the deepest coverage in Nairobi, Nakuru, Naivasha, Mombasa, Kisumu and Kilifi. New areas are added as landlords join.",
  },
  {
    question: "What if I need help?",
    answer:
      "Our support team is reachable by phone and email during business hours, and the help centre covers the most common questions. Landlords on a subscription also get dedicated support.",
  },
];
