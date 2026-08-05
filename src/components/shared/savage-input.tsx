"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  pick,
  placeholdersFor,
  type SavageCategory,
} from "@/lib/content/savage-placeholders";

/* ============================================================
   SavageInput / SavageTextarea
   Thin wrappers around the shadcn <Input> / <Textarea> that
   rotate a random savage placeholder from the chosen category
   on mount, and optionally re-roll on focus.

   Usage:
     <SavageInput category="gst" />            // random witty GST placeholder
     <SavageTextarea category="remarks" />     // random remarks placeholder
     <SavageInput category="search" rerollOnFocus />  // header search bar

   Strict monochrome - defers all styling to the underlying
   shadcn primitives (which use only CSS vars / hairline borders
   / ≤6px radius). No hues introduced.
   ============================================================ */

export interface SavageInputProps
  extends Omit<React.ComponentProps<"input">, "placeholder"> {
  /** Placeholder category. Determines which witty pool we sample from. */
  category: SavageCategory;
  /** When true, the placeholder is re-rolled every time the field gains focus. */
  rerollOnFocus?: boolean;
  /** Optional fixed placeholder; when provided, overrides the savage rotation. */
  placeholder?: string;
}

export interface SavageTextareaProps
  extends Omit<React.ComponentProps<"textarea">, "placeholder"> {
  category: SavageCategory;
  rerollOnFocus?: boolean;
  placeholder?: string;
}

/**
 * Hook that returns a random placeholder from the chosen category.
 * SSR-safe: initial value is the first item in the category array
 * (deterministic across server and client hydration), and a random
 * item is picked via useEffect after mount. Re-rolls on focus when
 * `rerollOnFocus` is set.
 */
function useSavagePlaceholder(
  category: SavageCategory,
  rerollOnFocus: boolean,
  fixed?: string,
): { placeholder: string; handleFocus: () => void } {
  const pool = placeholdersFor(category);

  // SSR + first client render share the same deterministic value (the first
  // item in the pool, or the fixed override) so React doesn't warn about a
  // hydration mismatch. We then randomise after mount.
  const initial = fixed ?? pool[0];
  const [placeholder, setPlaceholder] = React.useState<string>(initial);

  // After mount, swap the deterministic value for a random one. Runs once
  // per category/fixed change. exhaustive-deps is project-disabled so we
  // intentionally read `pool` and `pick` without listing them.
  React.useEffect(() => {
    if (fixed) {
      if (placeholder !== fixed) setPlaceholder(fixed);
      return;
    }
    setPlaceholder(pick(pool));
  }, [category, fixed]);

  const handleFocus = React.useCallback(() => {
    if (!rerollOnFocus || fixed) return;
    setPlaceholder(pick(pool));
  }, [rerollOnFocus, fixed, pool]);

  return { placeholder, handleFocus };
}

export function SavageInput({
  category,
  rerollOnFocus = false,
  placeholder,
  className,
  onFocus,
  ...props
}: SavageInputProps) {
  const { placeholder: savagePh, handleFocus } = useSavagePlaceholder(
    category,
    rerollOnFocus,
    placeholder,
  );
  return (
    <Input
      className={cn(className)}
      placeholder={savagePh}
      onFocus={(e) => {
        handleFocus();
        onFocus?.(e);
      }}
      {...props}
    />
  );
}

export function SavageTextarea({
  category,
  rerollOnFocus = false,
  placeholder,
  className,
  onFocus,
  ...props
}: SavageTextareaProps) {
  const { placeholder: savagePh, handleFocus } = useSavagePlaceholder(
    category,
    rerollOnFocus,
    placeholder,
  );
  return (
    <Textarea
      className={cn(className)}
      placeholder={savagePh}
      onFocus={(e) => {
        handleFocus();
        onFocus?.(e);
      }}
      {...props}
    />
  );
}
