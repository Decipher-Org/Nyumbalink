import { FAQS } from "@/lib/content/faq";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { SectionHeading } from "./SectionHeading";
import { CONTACT_DETAILS } from "@/lib/content/nav";

/** Split into two balanced columns on desktop; a single stack on mobile. */
const MIDPOINT = Math.ceil(FAQS.length / 2);
const COLUMNS = [FAQS.slice(0, MIDPOINT), FAQS.slice(MIDPOINT)];

export function Faq() {
  return (
    <section id="faq" className="bg-background py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="FAQ"
          title="Questions, answered"
          subtitle="Everything tenants and landlords ask before getting started."
        />

        <div className="mt-12 grid gap-x-10 gap-y-2 sm:mt-16 lg:grid-cols-2">
          {COLUMNS.map((column, columnIndex) => (
            <Accordion
              key={columnIndex}
              type="single"
              collapsible
              className="w-full"
            >
              {column.map((entry) => (
                <AccordionItem key={entry.question} value={entry.question}>
                  <AccordionTrigger className="text-left text-base font-medium">
                    {entry.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
                    {entry.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          ))}
        </div>

        <p className="mt-10 text-center text-sm text-muted-foreground">
          Still stuck?{" "}
          <a
            href={`mailto:${CONTACT_DETAILS.email}`}
            className="font-medium text-primary underline underline-offset-4 hover:text-accent"
          >
            Talk to our support team
          </a>
          .
        </p>
      </div>
    </section>
  );
}
