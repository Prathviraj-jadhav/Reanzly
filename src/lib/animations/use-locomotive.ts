"use client";

import { useEffect, useRef } from "react";
import LocomotiveScroll from "locomotive-scroll";

/**
 * Hook to initialize Locomotive Scroll on a container ref.
 * Returns a ref to attach to the scrollable container.
 * Automatically cleans up on unmount.
 *
 * NOTE: locomotive-scroll v5 wraps Lenis. The constructor accepts
 * `lenisOptions` (passed to the underlying Lenis instance) rather than
 * the v4 `el` / `smooth` / `multiplier` top-level keys. This hook maps
 * the simple `{ smooth, multiplier, lerp }` interface to the v5 API.
 *
 * Usage:
 *   const containerRef = useLocomotive();
 *   return <div ref={containerRef} data-scroll-container>...</div>
 *
 * IMPORTANT: Do NOT use this on the app shell — the app uses
 * `overflow-y-auto` containers which conflict with Lenis's transform-based
 * smooth scroll. Only use on standalone marketing pages if needed.
 */
export function useLocomotive(options?: {
  smooth?: boolean;
  multiplier?: number;
  lerp?: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<LocomotiveScroll | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Only init on desktop (locomotive can be janky on mobile touch)
    const isMobile = window.matchMedia("(max-width: 1023px)").matches;
    if (isMobile) return;

    try {
      scrollRef.current = new LocomotiveScroll({
        lenisOptions: {
          wrapper: containerRef.current,
          lerp: options?.lerp ?? 0.1,
          smoothWheel: options?.smooth ?? true,
          wheelMultiplier: options?.multiplier ?? 1,
        },
      });
    } catch (e) {
      console.warn("Locomotive Scroll init failed:", e);
    }

    return () => {
      scrollRef.current?.destroy();
      scrollRef.current = null;
    };
  }, [options?.smooth, options?.multiplier, options?.lerp]);

  return containerRef;
}
