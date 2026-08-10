"use client";

/**
 * LandingSite - public marketing site orchestrator.
 *
 * Rebuilt as a company website (nexgenelit.com style) rather than a SaaS
 * pricing sheet. Composes 16 sections in the order a B2B logistics buyer
 * expects: nav, hero, capability matrix, transport specialties, services,
 * sellable software products, public logistics partner directory, broker
 * onboarding CTA, pricing (SaaS / commission / master), before/after
 * transformations, process, stats, case studies, insights, FAQ, contact,
 * footer.
 *
 * Root wrapper is `min-h-screen flex flex-col` so the footer sticks to the
 * bottom of the viewport on short content and gets pushed naturally on long
 * content. Auth routing lives in AppShell - this component only renders when
 * `marketingView === "landing"`.
 *
 * GSAP entrance animations are orchestrated here via a useEffect that
 * lazy-loads gsap + ScrollTrigger (dynamic import) so the first compile
 * of `/` doesn't have to bundle the entire GSAP library - that static
 * import was OOM-killing the dev server on the 3.9 GB / 0-swap box.
 * Animations run inside a gsap.context scoped to the root container;
 * ScrollTrigger handles below-the-fold reveals. Locomotive Scroll is
 * deliberately NOT used here - it can conflict with Next.js routing
 * and the app's own scroll containers.
 */

import { useEffect, useRef } from "react";
import { MarketingNav } from "./marketing-nav";
import { MarketingHero } from "./marketing-hero";
import { MarketingConsole } from "./marketing-console";
import { MarketingDirectory } from "./marketing-directory";
import { MarketingPricing } from "./marketing-pricing";
import { MarketingFAQ } from "./marketing-faq";
import { MarketingContact } from "./marketing-contact";
import { MarketingFooter } from "./marketing-footer";

/**
 * Reduced-motion guard - inlined here so this module doesn't drag the entire GSAP library
 * into the landing page's compile graph.
 */
const prefersReducedMotion =
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function LandingSite() {
  const containerRef = useRef<HTMLDivElement>(null);

  // GSAP scroll reveals for hero and console components
  useEffect(() => {
    if (prefersReducedMotion) return;
    let cancelled = false;
    let ctx: { revert: () => void } | undefined;
    void (async () => {
      const [{ gsap }, { ScrollTrigger }] = await Promise.all([
        import("gsap"),
        import("gsap/ScrollTrigger"),
      ]);
      if (cancelled) return;
      gsap.registerPlugin(ScrollTrigger);
      ctx = gsap.context(() => {
        // ── Hero entrance ────────────────────────────────────────
        gsap.from(".hero-eyebrow", {
          y: 10,
          opacity: 0,
          duration: 0.4,
          ease: "power3.out",
        });
        gsap.from(".hero-title", {
          y: 24,
          opacity: 0,
          duration: 0.5,
          ease: "power3.out",
        });
        gsap.from(".hero-subtitle", {
          y: 16,
          opacity: 0,
          duration: 0.4,
          delay: 0.1,
          ease: "power3.out",
        });
        gsap.from(".hero-cta", {
          y: 12,
          opacity: 0,
          duration: 0.35,
          delay: 0.2,
          ease: "power3.out",
        });
        gsap.from(".hero-visual", {
          y: 20,
          opacity: 0,
          scale: 0.98,
          duration: 0.45,
          delay: 0.25,
          ease: "power3.out",
        });
      }, containerRef);
    })();
    return () => {
      cancelled = true;
      ctx?.revert();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="flex min-h-screen flex-col bg-background text-foreground"
    >
      <MarketingNav />
      <main className="flex-1">
        <MarketingHero />
        <MarketingConsole />
        <MarketingDirectory />
        <MarketingPricing />
        <MarketingFAQ />
        <MarketingContact />
      </main>
      <MarketingFooter />
    </div>
  );
}
