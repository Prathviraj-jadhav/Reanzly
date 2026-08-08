"use client";

import { REAL_STATS } from "./real-data";

/**
 * MarketingStats - a tight 6-stat strip derived from real platform
 * counts: working modules, user roles, directory partners, cities
 * covered, sellable products, verified reviews. Numbers come from
 * REAL_STATS which is computed from REAL_MODULES, ROLE_ARCHETYPES and
 * DIRECTORY_LISTINGS - no fabricated figures.
 *
 * Renders as a 2/3/6 responsive grid so it stays balanced on every
 * breakpoint.
 *
 * Each stat's numeric value is exposed via `data-value` / `data-suffix`
 * so the GSAP orchestrator in landing-site.tsx can count it up from 0
 * when the row scrolls into view.
 */

/** Parse a stat string like "12" or "1.5K" into a numeric target + suffix. */
function parseStatValue(value: string): {
  num: number;
  suffix: string;
  isInteger: boolean;
} {
  const match = value.match(/^([\d.]+)(.*)$/);
  if (!match) return { num: 0, suffix: "", isInteger: true };
  const num = parseFloat(match[1]);
  return {
    num,
    suffix: match[2] || "",
    isInteger: Number.isInteger(num),
  };
}

export function MarketingStats() {
  return (
    <section className="border-b border-border bg-background py-16">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:grid-cols-6">
          {REAL_STATS.map((s) => {
            const parsed = parseStatValue(s.value);
            return (
              <div key={s.label} className="text-center">
                <p
                  className="stat-number text-3xl font-medium tracking-tight tabular text-foreground sm:text-4xl"
                  data-value={parsed.num}
                  data-suffix={parsed.suffix}
                >
                  {s.value}
                </p>
                <p className="mt-2 text-xs text-muted-foreground sm:text-sm">
                  {s.label}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
