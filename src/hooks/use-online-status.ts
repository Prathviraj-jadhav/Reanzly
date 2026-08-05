"use client";

import { useEffect } from "react";
import { useSyncStore } from "@/lib/store/sync-store";

/**
 * useOnlineStatus - keeps the sync store's `online` flag in sync with the
 * browser's connectivity (navigator.onLine + online/offline events) and
 * triggers a queue flush when connectivity returns.
 *
 * Mount this once near the app root (AppShell) so the whole app reacts to
 * the browser going offline/online.
 */
export function useOnlineStatus() {
  const setOnline = useSyncStore((s) => s.setOnline);
  const flush = useSyncStore((s) => s.flush);

  useEffect(() => {
    const update = () => {
      const online = navigator.onLine;
      setOnline(online);
      if (online) {
        // Connectivity just returned - drain the offline queue.
        void flush();
      }
    };
    update(); // initialise
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, [setOnline, flush]);

  // Also poll-flush every 15s while online, so mutations enqueued by other
  // tabs/stores land even if no event fired.
  useEffect(() => {
    const id = window.setInterval(() => {
      if (navigator.onLine) void flush();
    }, 15000);
    return () => window.clearInterval(id);
  }, [flush]);
}
