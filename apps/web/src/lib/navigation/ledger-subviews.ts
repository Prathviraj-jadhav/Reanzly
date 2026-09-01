/** Ledger sub-view IDs (match `LedgerModule` SUB_NAV). */
export const LEDGER_SUBVIEW_IDS = [
  "dashboard",
  "coa",
  "journal",
  "treasury-ops",
  "bank-reconciliation",
  "inventory-vouchers",
  "cost-centers",
  "gst-returns",
  "ledger-book",
  "statements",
] as const;

export type LedgerSubView = (typeof LEDGER_SUBVIEW_IDS)[number];

/** URL slug per ledger sub-view (`dashboard` omits segment). */
const TAB_TO_SLUG: Record<LedgerSubView, string | undefined> = {
  dashboard: undefined,
  coa: "coa",
  journal: "journal",
  "treasury-ops": "treasury",
  "bank-reconciliation": "bank-reconciliation",
  "inventory-vouchers": "inventory-vouchers",
  "cost-centers": "cost-centers",
  "gst-returns": "gst-returns",
  "ledger-book": "ledger-book",
  statements: "statements",
};

const SLUG_TO_TAB: Record<string, LedgerSubView> = Object.fromEntries(
  Object.entries(TAB_TO_SLUG)
    .filter(([, slug]) => slug !== undefined)
    .map(([tab, slug]) => [slug as string, tab as LedgerSubView]),
) as Record<string, LedgerSubView>;

export const LEDGER_URL_SLUGS = Object.values(TAB_TO_SLUG).filter(
  (s): s is string => s !== undefined,
);

export function ledgerTabToSlug(tab: string | undefined): string | undefined {
  if (!tab || tab === "dashboard") return undefined;
  if (tab === "treasury") return "treasury";
  const asSubView = tab as LedgerSubView;
  return TAB_TO_SLUG[asSubView] ?? tab;
}

export function ledgerSlugToTab(slug: string): LedgerSubView {
  return SLUG_TO_TAB[slug] ?? (slug as LedgerSubView);
}

export function isValidLedgerSlug(slug: string): boolean {
  return slug in SLUG_TO_TAB;
}

export function resolveLedgerSubView(tab: string | undefined): LedgerSubView {
  if (!tab || tab === "dashboard") return "dashboard";
  if (tab === "treasury" || tab === "treasury-ops") return "treasury-ops";
  if (LEDGER_SUBVIEW_IDS.includes(tab as LedgerSubView)) return tab as LedgerSubView;
  return "dashboard";
}
