"use client";

import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { useAppStore } from "@/lib/store/app-store";
import { COMPANY, FOOTER_LINKS } from "./_data";

/**
 * MarketingFooter - sticky footer (gets mt-auto from the parent flex-col).
 *
 * Four-column grid: brand column (Reanzly wordmark + tagline + Made in India +
 * contact) + Products + Services + Network (directory / brokers / pricing) +
 * Company link columns. Below: a hairline divider then a "Logistics Partner
 * Directory" sub-footer line that deep-links to #directory, then a newsletter
 * row, another hairline divider, and the bottom bar with copyright + Privacy
 * / Terms on the left and the "Design and developed by Nexgen Elit" credit on
 * the right.
 *
 * The Nexgen Elit credit is a real external link - everything else is a
 * `#` no-op anchor with hover affordance (except the Network column, which
 * links to real in-page section ids).
 */

function noopLink(e: React.MouseEvent) {
  e.preventDefault();
}

export function MarketingFooter() {
  const setMarketingView = useAppStore((s) => s.setMarketingView);
  const [email, setEmail] = useState("");

  function onSubscribe(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!email.trim()) return;
    toast.success("Subscribed. Watch your inbox for the next issue.");
    setEmail("");
  }

  function onNetworkClick(href: string, e: React.MouseEvent) {
    // The Marketplace is rendered via app-store state, not a real Next.js
    // route, so its anchor link is intercepted to switch marketingView.
    if (href === "#marketplace") {
      e.preventDefault();
      setMarketingView("marketplace");
      if (typeof window !== "undefined") window.scrollTo(0, 0);
    }
  }

  return (
    <footer className="mt-auto border-t border-border bg-background py-16">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        {/* Top grid */}
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-5">
          {/* Brand column */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-[4px] bg-foreground text-[11px] font-bold text-background">
                RZ
              </span>
              <span className="text-[15px] font-semibold tracking-tight text-foreground">
                {COMPANY.name}
              </span>
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {COMPANY.tagline}
            </p>
            <p className="text-xs text-muted-foreground">Made in India 🇮🇳</p>
            <div className="mt-3 flex flex-col gap-1 text-xs text-muted-foreground">
              <a
                href={`mailto:${COMPANY.email}`}
                className="transition-colors hover:text-foreground"
              >
                {COMPANY.email}
              </a>
              <a
                href={`tel:${COMPANY.phone.replace(/\s/g, "")}`}
                className="transition-colors hover:text-foreground"
              >
                {COMPANY.phone}
              </a>
            </div>
          </div>

          {/* Products column */}
          <FooterLinkColumn
            heading="Products"
            links={FOOTER_LINKS.products}
          />

          {/* Services column */}
          <FooterLinkColumn
            heading="Services"
            links={FOOTER_LINKS.services}
          />

          {/* Network column - real in-page anchors */}
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              Network
            </p>
            <ul className="mt-4 flex flex-col gap-2.5">
              {FOOTER_LINKS.network.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    onClick={(e) => onNetworkClick(link.href, e)}
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Company column */}
          <FooterLinkColumn
            heading="Company"
            links={FOOTER_LINKS.company}
          />
        </div>

        {/* Sub-footer - Logistics Partner Directory shortcut */}
        <div className="mt-10 h-px w-full bg-border" />
        <div className="mt-5 flex flex-col items-start justify-between gap-2 text-xs text-muted-foreground sm:flex-row sm:items-center">
          <p>
            Looking for a verified logistics partner?{" "}
            <a
              href="#directory"
              className="font-medium text-foreground underline underline-offset-4 transition-colors hover:text-foreground/80"
            >
              Browse the Logistics Partner Directory
            </a>
            {" "}- SEO-ranked, searchable, one-click booking.
          </p>
        </div>

        {/* Middle divider + newsletter */}
        <div className="mt-6 h-px w-full bg-border" />
        <div className="mt-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-medium text-foreground">
              Stay Updated
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Logistics technology insights, delivered monthly.
            </p>
          </div>
          <form
            onSubmit={onSubscribe}
            className="flex w-full max-w-sm items-center gap-2"
          >
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.in"
              aria-label="Email address"
              className="focus-ring h-9 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground"
            />
            <button
              type="submit"
              className="tap flex h-9 shrink-0 items-center justify-center rounded-md bg-foreground px-4 text-xs font-medium uppercase tracking-wider text-background transition-colors hover:bg-foreground/90"
            >
              Subscribe
            </button>
          </form>
        </div>

        {/* Bottom divider + bar */}
        <div className="mt-8 h-px w-full bg-border" />
        <div className="mt-6 flex flex-col items-start justify-between gap-3 text-xs text-muted-foreground sm:flex-row sm:items-center">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span>© 2025 {COMPANY.name}. All Rights Reserved.</span>
            <a
              href="#"
              onClick={noopLink}
              className="uppercase tracking-wider transition-colors hover:text-foreground"
            >
              Privacy
            </a>
            <a
              href="#"
              onClick={noopLink}
              className="uppercase tracking-wider transition-colors hover:text-foreground"
            >
              Terms
            </a>
          </div>

        </div>
      </div>
    </footer>
  );
}

function FooterLinkColumn({
  heading,
  links,
}: {
  heading: string;
  links: string[];
}) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wider text-muted-foreground">
        {heading}
      </p>
      <ul className="mt-4 flex flex-col gap-2.5">
        {links.map((label) => (
          <li key={label}>
            <a
              href="#"
              onClick={noopLink}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
