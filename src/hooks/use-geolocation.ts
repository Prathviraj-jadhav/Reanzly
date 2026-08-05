"use client";

import { useEffect, useRef, useState, useCallback } from "react";

// ===== Driver Geolocation Hook =====
// Uses navigator.geolocation.watchPosition for continuous tracking when
// `enabled` is true. Falls back gracefully on permission denial / unsupported.

export interface GeoFix {
  lat: number;
  lng: number;
  accuracy: number;
  speed: number | null;
  heading: number | null;
  altitude: number | null;
  timestamp: number;
}

export type GeoPermission = "granted" | "denied" | "prompt" | "unknown";

export interface DriverGeolocationState {
  fix: GeoFix | null;
  permission: GeoPermission;
  error: string | null;
  watching: boolean;
}

const GEO_SUPPORTED =
  typeof navigator !== "undefined" && !!navigator.geolocation;

export function useDriverGeolocation(enabled: boolean) {
  const [fix, setFix] = useState<GeoFix | null>(null);
  const [permission, setPermission] = useState<GeoPermission>("unknown");
  const [error, setError] = useState<string | null>(
    GEO_SUPPORTED ? null : "Geolocation not supported on this device."
  );
  const watchId = useRef<number | null>(null);
  const watching = enabled && GEO_SUPPORTED;

  // Query permission state up-front (best-effort, not all browsers support this)
  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.permissions) return;
    let active = true;
    let cleanup: (() => void) | undefined;
    navigator.permissions
      .query({ name: "geolocation" as PermissionName })
      .then((p) => {
        if (!active) return;
        setPermission(p.state as GeoPermission);
        p.onchange = () => {
          if (active) setPermission(p.state as GeoPermission);
        };
        cleanup = () => {
          p.onchange = null;
        };
      })
      .catch(() => {
        /* permission API not supported - ignore */
      });
    return () => {
      active = false;
      cleanup?.();
    };
  }, []);

  useEffect(() => {
    if (!GEO_SUPPORTED) return;

    if (!enabled) {
      if (watchId.current !== null) {
        navigator.geolocation.clearWatch(watchId.current);
        watchId.current = null;
      }
      return;
    }

    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        setFix({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          speed: pos.coords.speed,
          heading: pos.coords.heading,
          altitude: pos.coords.altitude,
          timestamp: pos.timestamp,
        });
        setPermission("granted");
        setError(null);
      },
      (err) => {
        const msg =
          err.code === err.PERMISSION_DENIED
            ? "Location permission denied. Enable it in browser settings to track trips."
            : err.code === err.POSITION_UNAVAILABLE
            ? "Position unavailable. Check GPS / network."
            : err.code === err.TIMEOUT
            ? "Location request timed out."
            : err.message || "Unknown geolocation error.";
        setError(msg);
        if (err.code === err.PERMISSION_DENIED) setPermission("denied");
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 }
    );

    return () => {
      if (watchId.current !== null) {
        navigator.geolocation.clearWatch(watchId.current);
        watchId.current = null;
      }
    };
  }, [enabled]);

  // On-demand single fix (for photo geotagging before a watch has started)
  const captureFixNow = useCallback((): Promise<GeoFix | null> => {
    return new Promise((resolve) => {
      if (!GEO_SUPPORTED) {
        resolve(null);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) =>
          resolve({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            speed: pos.coords.speed,
            heading: pos.coords.heading,
            altitude: pos.coords.altitude,
            timestamp: pos.timestamp,
          }),
        () => resolve(null),
        { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 }
      );
    });
  }, []);

  return { fix, permission, error, watching, captureFixNow };
}
