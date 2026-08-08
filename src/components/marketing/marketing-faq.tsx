"use client";

import { REAL_FAQS } from "./real-data";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";

/**
 * MarketingFAQ - "Questions you're probably already thinking."
 *
 * Eight FAQs in a single-collapsible Accordion. Hairline borders between
 * items. Constrained to max-w-3xl and centred. Closes with a "Still have
 * questions? Talk to us →" link to #contact.
 *
 * FAQs sourced from REAL_FAQS so the answers reflect the actual platform
 * (live demo, 7-day trial, business-type packs, SaaS / Commission /
 * Master, broker program, public directory, compliance, mobile).
 */

export function MarketingFAQ() {
  return (
    <section className="border-b border-border bg-background py-24 sm:py-32">
      <div className="mx-auto max-w-3xl px-6 lg:px-8">
        {/* Header */}
        <div className="text-center">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            FAQ
          </p>
          <h2 className="mt-3 text-3xl font-medium tracking-tight text-foreground sm:text-4xl">
            Questions you&apos;re probably already thinking.
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            And the answers you&apos;d ask on a call anyway.
          </p>
        </div>

        {/* Accordion */}
        <Accordion type="single" collapsible className="mt-10 w-full">
          {REAL_FAQS.map((faq, i) => (
            <AccordionItem
              key={faq.q}
              value={`item-${i}`}
              className="border-border"
            >
              <AccordionTrigger className="text-sm font-medium text-foreground hover:no-underline">
                {faq.q}
              </AccordionTrigger>
              <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
                {faq.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        {/* Footer link */}
        <div className="mt-8 text-center">
          <a
            href="#contact"
            className="text-sm font-medium text-foreground underline underline-offset-4 hover:text-foreground/80"
          >
            Still have questions? Talk to us →
          </a>
        </div>
      </div>
    </section>
  );
}
