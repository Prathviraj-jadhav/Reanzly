"use client";

import { REAL_TESTIMONIALS } from "./real-data";
import { Star, BadgeCheck } from "lucide-react";
import { useAppStore } from "@/lib/store/app-store";
import { toast } from "sonner";

/**
 * MarketingTestimonials — "From real partners on the directory."
 *
 * Section id="case-studies". 2-col grid of six quote cards. Each card
 * attributes the quote to a REAL logistics partner from the public
 * Logistics Partner Directory (Shree Balaji Transport, Patel Freight
 * Movers, Sundaram Cold Chain, etc.) — no more anonymous "mid-size
 * logistics firm" attributions.
 *
 * Each card shows: large quote mark, the quote body, a hairline
 * divider, and an author row with the partner's logo-initials tile +
 * name + category + rating. Clicking the partner name scrolls to the
 * #directory section so the visitor can view the full profile.
 */

function scrollToId(id: string) {
  if (typeof document === "undefined") return;
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
}

export function MarketingTestimonials() {
  const setAuthMode = useAppStore((s) => s.setAuthMode);
  const setMarketingView = useAppStore((s) => s.setMarketingView);

  function startTrial() {
    setAuthMode("signup");
    setMarketingView("auth");
  }

  return (
    <section
      id="case-studies"
      className="border-b border-border bg-background py-24 sm:py-32"
    >
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        {/* Header */}
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            Case Studies · Real partners
          </p>
          <h2 className="mt-3 text-3xl font-medium tracking-tight text-foreground sm:text-4xl">
            From real partners on the directory.
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            Six logistics companies listed on the Reanzly directory — each
            with a real profile you can view, real lanes they run, and the
            shifts they saw after going live.
          </p>
        </div>

        {/* Grid */}
        <div className="stagger mt-12 grid grid-cols-1 gap-4 lg:grid-cols-2">
          {REAL_TESTIMONIALS.map((t) => (
            <figure
              key={t.partnerSlug}
              className="flex flex-col rounded-lg border border-border bg-card p-6"
            >
              <span
                className="text-5xl font-medium leading-none text-muted-foreground/30"
                aria-hidden
              >
                &ldquo;
              </span>
              <blockquote className="mt-2 text-base leading-relaxed text-foreground">
                {t.quote}
              </blockquote>
              <div className="mt-4 h-px w-full bg-border" />
              <figcaption className="mt-4 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => scrollToId("directory")}
                  className="tap flex min-w-0 items-center gap-3 text-left"
                  aria-label={`View ${t.partnerName} in the directory`}
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[6px] border border-border bg-muted text-xs font-bold tabular text-foreground">
                    {t.partnerInitials}
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="truncate text-sm font-medium text-foreground">
                        {t.partnerName}
                      </p>
                      <BadgeCheck
                        className="h-3.5 w-3.5 shrink-0 text-foreground"
                        aria-label="Verified partner"
                      />
                    </div>
                    <p className="truncate text-xs text-muted-foreground">
                      {t.category} · Directory partner
                    </p>
                  </div>
                </button>
                <div className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
                  <Star
                    className="h-3.5 w-3.5 fill-foreground text-foreground"
                    aria-hidden
                  />
                  <span className="font-medium tabular text-foreground">
                    {t.rating.toFixed(1)}
                  </span>
                </div>
              </figcaption>
            </figure>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-10 flex justify-center">
          <button
            type="button"
            onClick={startTrial}
            className="tap inline-flex h-10 items-center justify-center rounded-md bg-foreground px-4 text-sm font-medium text-background transition-colors hover:bg-foreground/90"
          >
            Join the directory
          </button>
        </div>
      </div>
    </section>
  );
}
