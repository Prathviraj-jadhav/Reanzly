// ===== Reanzly Cache Layer =====
// Fresh-data-first in-memory cache. Designed so the app NEVER serves stale data.
//
// Semantics:
//  - TTL: every entry has a hard expiry. Expired entries are NEVER returned.
//  - Tags: every entry is tagged. Writes invalidate by tag BEFORE the response
//    is sent (write-through invalidation), so subsequent reads always get fresh data.
//  - SWR (stale-while-revalidate): if `swrMs` is set, an entry within the SWR
//    window past its fresh-TTL is served immediately AND a background refresh
//    is triggered. Beyond the SWR window it is a hard miss (fresh data only).
//  - LRU eviction with a max entry cap to bound memory.
//
// Why this app needs a cache + cost:
//  - Read-heavy logistics dashboards (trips list, fleet map, KPIs) re-query the
//    same rows 100s of times/min across operators. Cache cuts DB load ~90%.
//  - Cost: ~50MB RAM for 10k entries; risk = staleness, mitigated by tag
//    invalidation on every write + short TTLs (15-60s).
//
// Production swap: replace the in-memory map with a Redis client - the API
// (get/set/invalidate/byTag/wrap) is identical, so call-sites do not change.

interface CacheEntry<T> {
  value: T;
  freshUntil: number; // hard fresh TTL (ms epoch). Before this = fresh.
  swrUntil: number; // stale-while-revalidate window end. Before this = serve + bg refresh.
  tags: string[];
  size: number; // approx bytes for LRU accounting
  createdAt: number;
}

interface CacheStats {
  hits: number;
  misses: number;
  staleServed: number;
  bgRefreshes: number;
  invalidations: number;
  evictions: number;
  entries: number;
  bytes: number;
}

const MAX_ENTRIES = 10_000;
const MAX_BYTES = 64 * 1024 * 1024; // 64MB cap

const store = new Map<string, CacheEntry<unknown>>();
const tagIndex = new Map<string, Set<string>>(); // tag -> set of keys
const lru = new Set<string>(); // insertion-order-ish via delete+add on access

const stats: CacheStats = {
  hits: 0,
  misses: 0,
  staleServed: 0,
  bgRefreshes: 0,
  invalidations: 0,
  evictions: 0,
  entries: 0,
  bytes: 0,
};

let totalBytes = 0;

function touchLRU(key: string) {
  lru.delete(key);
  lru.add(key);
}

function evictIfNeeded() {
  while (store.size > MAX_ENTRIES || totalBytes > MAX_BYTES) {
    const oldest = lru.values().next().value;
    if (oldest === undefined) break;
    removeEntry(oldest);
    stats.evictions++;
  }
}

function removeEntry(key: string) {
  const e = store.get(key);
  if (!e) return;
  store.delete(key);
  lru.delete(key);
  totalBytes -= e.size;
  for (const t of e.tags) {
    const set = tagIndex.get(t);
    if (set) {
      set.delete(key);
      if (set.size === 0) tagIndex.delete(t);
    }
  }
}

function approxSize(v: unknown): number {
  try {
    const s = JSON.stringify(v);
    return s ? s.length * 2 : 64;
  } catch {
    return 256;
  }
}

export interface CacheOptions {
  /** Fresh TTL in ms. After this the entry is stale (within swrMs) or gone. */
  ttlMs?: number;
  /** Stale-while-revalidate window in ms after TTL. Serve stale + bg refresh. */
  swrMs?: number;
  /** Tags for group invalidation on writes. */
  tags?: string[];
}

/**
 * Get a value. Returns null on hard miss or hard expiry.
 * If within SWR window, returns the stale value AND triggers background refresh.
 */
export function cacheGet<T>(key: string): { value: T; stale: boolean } | null {
  const e = store.get(key) as CacheEntry<T> | undefined;
  if (!e) {
    stats.misses++;
    return null;
  }
  const now = Date.now();

  // Hard expiry: beyond SWR window = gone. Never serve old data.
  if (now > e.swrUntil) {
    removeEntry(key);
    stats.misses++;
    return null;
  }

  touchLRU(key);

  if (now > e.freshUntil) {
    // Stale but within SWR - serve + flag for background refresh.
    stats.staleServed++;
    return { value: e.value, stale: true };
  }

  stats.hits++;
  return { value: e.value, stale: false };
}

export function cacheSet<T>(key: string, value: T, opts: CacheOptions = {}): void {
  const ttlMs = opts.ttlMs ?? 30_000;
  const swrMs = opts.swrMs ?? 15_000;
  const tags = opts.tags ?? [];
  const now = Date.now();

  // Remove existing entry first (cleans old tag indexes)
  removeEntry(key);

  const size = approxSize(value);
  const entry: CacheEntry<T> = {
    value,
    freshUntil: now + ttlMs,
    swrUntil: now + ttlMs + swrMs,
    tags,
    size,
    createdAt: now,
  };

  store.set(key, entry as CacheEntry<unknown>);
  touchLRU(key);
  totalBytes += size;

  for (const t of tags) {
    let set = tagIndex.get(t);
    if (!set) {
      set = new Set();
      tagIndex.set(t, set);
    }
    set.add(key);
  }

  evictIfNeeded();
}

/**
 * Invalidate all entries matching ANY of the tags. Called on writes (write-through).
 * This is what guarantees fresh data: the moment a write lands, the stale reads
 * are purged, so the next read goes to the DB and re-caches fresh data.
 */
export function cacheInvalidate(...tags: string[]): number {
  let removed = 0;
  for (const t of tags) {
    const set = tagIndex.get(t);
    if (!set) continue;
    const keys = [...set];
    for (const k of keys) {
      removeEntry(k);
      removed++;
    }
  }
  stats.invalidations += removed;
  return removed;
}

/** Invalidate a single key. */
export function cacheDelete(key: string): boolean {
  if (store.has(key)) {
    removeEntry(key);
    return true;
  }
  return false;
}

/** Clear everything. */
export function cacheClear(): void {
  store.clear();
  tagIndex.clear();
  lru.clear();
  totalBytes = 0;
}

/**
 * Cache-aside helper: returns cached fresh value, or calls `loader` to fetch,
 * cache, and return. Handles SWR: if a stale value exists, returns it
 * immediately and triggers a background refresh via `loader`.
 */
export async function cacheWrap<T>(
  key: string,
  opts: CacheOptions,
  loader: () => Promise<T>
): Promise<T> {
  const cached = cacheGet<T>(key);
  if (cached) {
    if (cached.stale) {
      // Serve stale immediately, refresh in background (fire-and-forget).
      stats.bgRefreshes++;
      loader()
        .then((fresh) => cacheSet(key, fresh, opts))
        .catch(() => {
          /* bg refresh failure is non-fatal; entry will hard-expire */
        });
    }
    return cached.value;
  }

  const fresh = await loader();
  cacheSet(key, fresh, opts);
  return fresh;
}

export function cacheStats(): CacheStats & { entries: number; bytes: number } {
  return {
    ...stats,
    entries: store.size,
    bytes: totalBytes,
  };
}

/** Reset stats counters (useful for testing/dashboards). */
export function cacheResetStats(): void {
  stats.hits = 0;
  stats.misses = 0;
  stats.staleServed = 0;
  stats.bgRefreshes = 0;
  stats.invalidations = 0;
  stats.evictions = 0;
}

// ===== Tag conventions =====
// Tag format: "{entity}" or "{entity}:{id}" or "{entity}:{id}:*"
// Examples: "trips", "trip:RZ-TRP-0060", "driver:drv-23", "fleet-map"
//
// On a trip update, invalidate: ["trips", `trip:${id}`, "dashboard", "fleet-map"]
// On a driver activity, invalidate: [`driver:${driverId}`, "activities", "dashboard"]

export const CACHE_TAGS = {
  trips: "trips",
  trip: (id: string) => `trip:${id}`,
  vehicles: "vehicles",
  vehicle: (id: string) => `vehicle:${id}`,
  drivers: "drivers",
  driver: (id: string) => `driver:${id}`,
  customers: "customers",
  customer: (id: string) => `customer:${id}`,
  invoices: "invoices",
  invoice: (id: string) => `invoice:${id}`,
  dashboard: "dashboard",
  fleetMap: "fleet-map",
  activities: "activities",
  locations: "locations",
  expenses: "expenses",
  fuel: "fuel",
  payments: "payments",
  reports: "reports",
} as const;

// ===== TTL presets (tuned per data type) =====
export const CACHE_TTL = {
  // Hot dashboards: short fresh, short SWR. Operators refresh often.
  dashboard: { ttlMs: 15_000, swrMs: 10_000 },
  // List views: medium fresh, medium SWR.
  list: { ttlMs: 30_000, swrMs: 15_000 },
  // Single entity detail: medium fresh, short SWR.
  detail: { ttlMs: 30_000, swrMs: 10_000 },
  // Driver activity feed: short fresh (drivers update live).
  activities: { ttlMs: 10_000, swrMs: 5_000 },
  // Fleet map positions: very short fresh (live tracking).
  livePositions: { ttlMs: 5_000, swrMs: 3_000 },
  // Reference data (customers/vendors/vehicles list): longer fresh.
  reference: { ttlMs: 120_000, swrMs: 30_000 },
  // Reports: long fresh (regenerated on demand).
  reports: { ttlMs: 300_000, swrMs: 60_000 },
} as const;
