"use client";

/**
 * Marketing icon resolver.
 *
 * The content tables in `_data.ts` store icon names as strings so the data
 * file has no JSX. This helper maps those names to lucide-react components and
 * exposes a stable `<ModuleIcon name="..." />` component — using the wrapper
 * (rather than `const Icon = resolve(name)`) keeps the
 * `react-hooks/static-components` lint rule happy because the lookup happens
 * at module scope, not inside a render body.
 */

import {
  LayoutDashboard,
  Route,
  Truck,
  MapPin,
  ReceiptText,
  Wallet,
  Banknote,
  Fuel,
  ShieldCheck,
  Users,
  BookOpen,
  Workflow,
  Map,
  Sparkles,
  PackageSearch,
  FileCheck,
  Building2,
  Filter,
  BarChart3,
  Warehouse,
  ClipboardList,
  Webhook,
  Globe,
  Smartphone,
  Code2,
  TrendingUp,
  Plane,
  Ship,
  TrainFront,
  type LucideIcon,
  type LucideProps,
} from "lucide-react";

const ICON_MAP: Record<string, LucideIcon> = {
  LayoutDashboard,
  Route,
  Truck,
  MapPin,
  ReceiptText,
  Wallet,
  Banknote,
  Fuel,
  ShieldCheck,
  Users,
  BookOpen,
  Workflow,
  Map,
  Sparkles,
  PackageSearch,
  FileCheck,
  Building2,
  Filter,
  BarChart3,
  Warehouse,
  ClipboardList,
  Webhook,
  Globe,
  Smartphone,
  Code2,
  TrendingUp,
  Plane,
  Ship,
  TrainFront,
};

export function resolveModuleIcon(name: string): LucideIcon {
  return ICON_MAP[name] ?? LayoutDashboard;
}

/**
 * Render a marketing icon by name. Use this in component bodies where the
 * `react-hooks/static-components` rule would otherwise flag a
 * `const Icon = resolveModuleIcon(...)` pattern.
 */
export function ModuleIcon({ name, ...props }: { name: string } & LucideProps) {
  const Icon = ICON_MAP[name] ?? LayoutDashboard;
  return <Icon {...props} />;
}
