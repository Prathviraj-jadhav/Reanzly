"use client";

import { toast } from "sonner";
import { Check, AlertTriangle, AlertOctagon, Info, Loader2 } from "lucide-react";
import type { ReactNode } from "react";

/**
 * toast-helpers
 * -------------
 * Standardized toast patterns for the Reanzly monochrome Swiss design
 * system. Wraps Sonner's `toast()` with consistent icons, durations, and
 * monochrome styling so every module gets the same feedback chrome without
 * re-implementing it.
 *
 * Usage:
 *   import { toastSuccess, toastError, toastInfo, toastPromise } from "@/lib/toast";
 *
 *   toastSuccess("Trip created", "RZ-TRP-0042 dispatched to Anil");
 *   toastError("Could not save invoice", "Customer field is required");
 *   toastInfo("Synced 12 records", undefined);
 *   toastPromise(apiCall, { loading: "Saving...", success: "Saved", error: "Failed" });
 *
 * Design notes:
 *   - Monochrome: uses foreground/background tokens, never hue.
 *   - Icons: check (success), alert-triangle (warning), alert-octagon
 *     (error), info (info), loader (loading).
 *   - Duration: 4s default (success/info), 6s (warning/error).
 *   - Position: bottom-right (set in layout.tsx via SonnerToaster).
 */

const ICONS = {
  success: Check,
  warning: AlertTriangle,
  error: AlertOctagon,
  info: Info,
  loading: Loader2,
} as const;

const DURATIONS = {
  success: 4000,
  warning: 6000,
  error: 6000,
  info: 4000,
} as const;

function withIcon(
  severity: keyof typeof ICONS,
  title: string,
  description?: string,
) {
  const Icon = ICONS[severity];
  const duration = DURATIONS[severity];
  return toast(title, {
    description,
    duration,
    icon: <Icon className={`h-4 w-4 ${severity === "loading" ? "animate-spin" : ""}`} />,
  });
}

/** Success toast - 4s, check icon. Use for completed saves, creates, sends. */
export function toastSuccess(title: string, description?: string) {
  return withIcon("success", title, description);
}

/** Warning toast - 6s, alert-triangle icon. Use for non-blocking warnings
 *  (e.g. "field auto-filled", "rate card is 30 days old"). */
export function toastWarning(title: string, description?: string) {
  return withIcon("warning", title, description);
}

/** Error toast - 6s, alert-octagon icon. Use for failed saves, network
 *  errors, validation rejections that the user must fix. */
export function toastError(title: string, description?: string) {
  return withIcon("error", title, description);
}

/** Info toast - 4s, info icon. Use for neutral status updates ("Synced 12
 *  records", "Exported to CSV"). */
export function toastInfo(title: string, description?: string) {
  return withIcon("info", title, description);
}

/** Promise-based toast - shows loading -> success/error transitions
 *  automatically. Use for async operations (API calls, file uploads). */
export function toastPromise<T>(
  promise: Promise<T> | (() => Promise<T>),
  opts: {
    loading: string;
    success: string | ((data: T) => string);
    error: string | ((err: unknown) => string);
    description?: ReactNode;
  },
) {
  return toast.promise(promise, {
    loading: opts.loading,
    success: (data) =>
      typeof opts.success === "function" ? opts.success(data) : opts.success,
    error: (err) =>
      typeof opts.error === "function" ? opts.error(err) : opts.error,
    description: opts.description,
  });
}

/** Dismissible toast with an action button - use when the user can undo
 *  or take a follow-up action (e.g. "Trip deleted - Undo"). */
export function toastAction(
  title: string,
  actionLabel: string,
  onAction: () => void,
  description?: string,
) {
  return toast(title, {
    description,
    duration: 8000,
    action: {
      label: actionLabel,
      onClick: onAction,
    },
  });
}

// Re-export the raw `toast` for advanced use cases (custom positions, etc).
export { toast } from "sonner";
