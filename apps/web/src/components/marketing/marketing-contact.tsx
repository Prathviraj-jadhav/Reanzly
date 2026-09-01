"use client";

import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { COMPANY } from "./_data";
import { Mail, Phone, MapPin, ArrowRight } from "lucide-react";

/**
 * MarketingContact - "Let's talk about your logistics business."
 *
 * Section id="contact". Two-column layout: left column is the pitch + contact
 * details (email, phone, address from COMPANY); right column is a contact
 * form card. On submit the form shows a success toast (no real backend - this
 * is a marketing page) and clears itself. Designed to feel like a premium B2B
 * services contact section, not a SaaS lead-gen form.
 */

export function MarketingContact() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    message: "",
  });

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    toast.success("Message sent. We'll reach out within 24 hours.");
    setForm({ name: "", email: "", phone: "", company: "", message: "" });
  }

  const inputClass =
    "focus-ring h-10 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground";

  return (
    <section
      id="contact"
      className="border-b border-border bg-muted/30 py-24 sm:py-32"
    >
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:gap-16">
          {/* Left column - pitch + contact details */}
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              Contact
            </p>
            <h2 className="mt-3 text-3xl font-medium tracking-tight text-foreground sm:text-4xl">
              Let&apos;s talk about your logistics business.
            </h2>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-muted-foreground">
              If you&apos;re serious about fixing how your logistics business
              shows up and gets selected, this is where it starts. Not for
              time-pass enquiries. Only for teams ready to improve how they win
              work.
            </p>

            <div className="mt-8 flex flex-col gap-4">
              <a
                href={`mailto:${COMPANY.email}`}
                className="flex items-center gap-3 text-sm text-foreground transition-colors hover:text-foreground/80"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[6px] border border-border bg-background text-foreground">
                  <Mail className="h-4 w-4" />
                </span>
                {COMPANY.email}
              </a>
              <a
                href={`tel:${COMPANY.phone.replace(/\s/g, "")}`}
                className="flex items-center gap-3 text-sm text-foreground transition-colors hover:text-foreground/80"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[6px] border border-border bg-background text-foreground">
                  <Phone className="h-4 w-4" />
                </span>
                {COMPANY.phone}
              </a>
              <div className="flex items-center gap-3 text-sm text-foreground">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[6px] border border-border bg-background text-foreground">
                  <MapPin className="h-4 w-4" />
                </span>
                {COMPANY.address}
              </div>
            </div>
          </div>

          {/* Right column - contact form card */}
          <div className="rounded-lg border border-border bg-background p-6 sm:p-8">
            <form onSubmit={onSubmit} className="flex flex-col gap-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-medium text-muted-foreground">
                    Name
                  </span>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => update("name", e.target.value)}
                    placeholder="Your name"
                    className={inputClass}
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-medium text-muted-foreground">
                    Work email
                  </span>
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => update("email", e.target.value)}
                    placeholder="you@company.in"
                    className={inputClass}
                  />
                </label>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-medium text-muted-foreground">
                    Phone
                  </span>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => update("phone", e.target.value)}
                    placeholder="+91 98765 43210"
                    className={inputClass}
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-medium text-muted-foreground">
                    Company
                  </span>
                  <input
                    type="text"
                    value={form.company}
                    onChange={(e) => update("company", e.target.value)}
                    placeholder="Company name"
                    className={inputClass}
                  />
                </label>
              </div>
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-muted-foreground">
                  Message
                </span>
                <textarea
                  required
                  rows={4}
                  value={form.message}
                  onChange={(e) => update("message", e.target.value)}
                  placeholder="What are you trying to fix?"
                  className="focus-ring w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
                />
              </label>
              <button
                type="submit"
                className="tap mt-2 flex h-11 w-full items-center justify-center gap-1.5 rounded-md bg-foreground px-5 text-sm font-medium uppercase tracking-wider text-background transition-colors hover:bg-foreground/90"
              >
                Send message
                <ArrowRight className="h-4 w-4" />
              </button>
              <p className="text-center text-xs text-muted-foreground">
                We reply within 24 hours · No spam, ever.
              </p>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
