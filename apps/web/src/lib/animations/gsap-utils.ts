"use client";

import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";

// Register GSAP plugins
gsap.registerPlugin(useGSAP);

// ─── Reduced-motion guard ─────────────────────────────────────────────
// Respect prefers-reduced-motion: when the user has requested reduced
// motion, we set the global GSAP default duration to 0 so tweens complete
// instantly (elements jump straight to their end state). This avoids the
// bug where `gsap.globalTimeline.timeScale(0)` would freeze tweens and
// leave `gsap.from()` targets stuck at opacity:0 (invisible).
//
// We also export the flag so callers can skip DOM mutations (like setting
// textContent to "0" for count-ups) that would otherwise cause a flash
// when the animation is skipped.
const prefersReducedMotion =
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

if (prefersReducedMotion) {
  gsap.config({ nullTargetWarn: false });
  // duration:0  → tweens complete in the same frame they start
  // stagger:0   → all items in a stagger animate simultaneously (instantly)
  gsap.defaults({ duration: 0, stagger: 0 });
}

export { gsap, useGSAP, prefersReducedMotion };

// === Reusable animation presets ===
// All durations stay within the 0.2–0.5s snappy band per the industrial
// minimalist aesthetic. These are thin wrappers around gsap.from/fromTo
// that can be called inside a useGSAP scope.

/** Fade + slide up entrance for cards/sections */
export const fadeUp = (target: string, delay = 0) => {
  return gsap.from(target, {
    y: 16,
    opacity: 0,
    duration: 0.4,
    delay,
    ease: "power2.out",
  });
};

/** Stagger entrance for list items / table rows */
export const staggerIn = (target: string, stagger = 0.05) => {
  return gsap.from(target, {
    y: 12,
    opacity: 0,
    duration: 0.3,
    stagger,
    ease: "power2.out",
  });
};

/** Scale-in for modals/drawers */
export const scaleIn = (target: string) => {
  return gsap.fromTo(
    target,
    { scale: 0.96, opacity: 0 },
    { scale: 1, opacity: 1, duration: 0.25, ease: "power3.out" },
  );
};

/** Slide-in from right (for drawers/panels) */
export const slideInRight = (target: string) => {
  return gsap.fromTo(
    target,
    { x: "100%", opacity: 0 },
    { x: "0%", opacity: 1, duration: 0.35, ease: "power3.out" },
  );
};

/** Count-up animation for KPI numbers */
export const countUp = (target: string, endValue: number, duration = 0.5) => {
  const obj = { val: 0 };
  return gsap.to(obj, {
    val: endValue,
    duration,
    ease: "power2.out",
    onUpdate: () => {
      const el = document.querySelector(target);
      if (el) {
        el.textContent = Math.round(obj.val).toLocaleString("en-IN");
      }
    },
  });
};
