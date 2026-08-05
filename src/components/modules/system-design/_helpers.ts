// ===== System Design module - structured content =====
// All the architecture content (HLD, LLD, NFRs, capacity, tradeoffs) lives here
// as data so the UI stays a thin renderer. This is the "blueprint of the system".

// ---------- High-Level Design (Blueprint) ----------
// Layered architecture. Each layer is a row in the blueprint diagram.
export interface HldNode {
  id: string;
  label: string;
  sub?: string;
  role: string; // what it does in one line
}

export interface HldLayer {
  id: string;
  label: string;
  nodes: HldNode[];
  flow: string; // how data flows through this layer
}

export const HLD_LAYERS: HldLayer[] = [
  {
    id: "clients",
    label: "Clients",
    flow: "Operators on desktop, drivers on mobile field app, customers via portal.",
    nodes: [
      { id: "web-desktop", label: "Web Desktop", sub: "Operators / Admin", role: "22-module ops console" },
      { id: "web-mobile", label: "Web Mobile", sub: "Responsive", role: "Same app, drawer nav, touch targets" },
      { id: "driver-app", label: "Driver Field App", sub: "PWA", role: "Photo capture + GPS tracking" },
      { id: "customer-portal", label: "Customer Portal", sub: "Read-only", role: "Track shipment + POD" },
    ],
  },
  {
    id: "edge",
    label: "Edge / CDN",
    flow: "CDN terminates static assets + immutable object URLs close to users; LB routes API.",
    nodes: [
      { id: "cdn", label: "CDN", sub: "CloudFront / R2", role: "Cache static + immutable photos (1yr)" },
      { id: "lb", label: "Load Balancer", sub: "ALB / Caddy", role: "TLS, health-check, round-robin to N app servers" },
      { id: "waf", label: "WAF + Rate Limit", sub: "Edge", role: "Block abuse, per-IP throttling" },
    ],
  },
  {
    id: "app",
    label: "App Servers",
    flow: "Stateless Next.js app servers, horizontally scalable. Gateway fans out to mini-services.",
    nodes: [
      { id: "app-server", label: "App Server (Next.js)", sub: "N replicas", role: "Render React + API routes + Rean AI" },
      { id: "gateway", label: "Gateway", sub: "Caddy", role: "XTransformPort routing to mini-services" },
      { id: "ws-service", label: "WebSocket Service", sub: ":3003", role: "Real-time fleet map + chat" },
    ],
  },
  {
    id: "async",
    label: "Async Layer",
    flow: "Queue decouples slow work (photo processing, reports, notifications) from the request path.",
    nodes: [
      { id: "queue", label: "Job Queue", sub: "SQLite / Redis", role: "Durable, retryable, priority jobs" },
      { id: "workers", label: "Workers", sub: "In-process", role: "photo.process, location.batch, audit.log" },
      { id: "scheduler", label: "Scheduler", sub: "Cron", role: "Report generation, reminder firing" },
    ],
  },
  {
    id: "data",
    label: "Data Layer",
    flow: "Primary for writes; replica for read scaling; cache for hot reads; S3 for blobs.",
    nodes: [
      { id: "db-primary", label: "DB Primary", sub: "SQLite → Postgres", role: "All writes, read-after-write" },
      { id: "db-replica", label: "DB Replica", sub: "Read-only", role: "Horizontal read scaling, ~1s lag" },
      { id: "cache", label: "Cache", sub: "LRU → Redis", role: "Fresh-data TTL + tag invalidation + SWR" },
      { id: "s3", label: "Object Storage", sub: "Local → S3/R2", role: "Photos, documents, exports, signatures" },
    ],
  },
  {
    id: "obs",
    label: "Observability",
    flow: "Metrics, health, audit log, error tracking.",
    nodes: [
      { id: "metrics", label: "Metrics", sub: "/api/metrics", role: "Cache/queue/storage/replica stats" },
      { id: "health", label: "Health", sub: "/api/health", role: "DB + replica + worker readiness" },
      { id: "audit", label: "Audit Log", sub: "Append-only", role: "Every write traced to actor" },
    ],
  },
];

// ---------- Low-Level Design (Feature flow) ----------
export interface LldStep {
  n: number;
  actor: string;
  action: string;
  component: string;
  data: string;
  latency: string;
  note?: string;
}

export interface LldFeature {
  id: string;
  title: string;
  trigger: string;
  outcome: string;
  steps: LldStep[];
  components: { name: string; role: string }[];
  failureModes: { mode: string; mitigation: string }[];
}

export const LLD_FEATURES: LldFeature[] = [
  {
    id: "pod-capture",
    title: "Driver captures POD photo",
    trigger: "Driver taps Capture → POD in the field app",
    outcome: "Photo durable in object storage, activity row in DB, cache invalidated, audit logged, dispatch notified",
    steps: [
      { n: 1, actor: "Driver", action: "Tap POD card → camera input", component: "driver-capture.tsx", data: "<input capture=environment>", latency: "0ms", note: "Native camera, no JS camera API" },
      { n: 2, actor: "Client", action: "Downsample photo to 1024px JPEG", component: "lib/photo.ts", data: "Canvas → base64 (≤2MB)", latency: "30-80ms" },
      { n: 3, actor: "Client", action: "Capture GPS fix (captureFixNow)", component: "hooks/use-geolocation", data: "{lat,lng,accuracy}", latency: "0-2000ms", note: "Cached last fix if unavailable" },
      { n: 4, actor: "Client", action: "POST /api/driver/activity", component: "driver-store.addActivity", data: "{type:POD, photoDataUrl, lat,lng, tripId}", latency: "network RTT" },
      { n: 5, actor: "API", action: "Rate limit + sanitize input", component: "lib/security", data: "120/min per IP", latency: "<1ms" },
      { n: 6, actor: "API", action: "INSERT into DriverActivity (primary DB)", component: "lib/db (primary)", data: "row with inline photo", latency: "5-15ms" },
      { n: 7, actor: "API", action: "Invalidate cache tags [activities, driver:{id}]", component: "lib/cache", data: "write-through purge", latency: "<1ms", note: "Guarantees next read is fresh" },
      { n: 8, actor: "API", action: "Enqueue photo.process job", component: "lib/queue", data: "{activityId, dataUrl}", latency: "1-3ms", note: "Off the request path" },
      { n: 9, actor: "API", action: "Enqueue audit.log job", component: "lib/queue", data: "{entity, action, actorId}", latency: "1-3ms" },
      { n: 10, actor: "API", action: "Return 201 {activity, queued:true}", component: "route.ts", data: "JSON", latency: "-" },
      { n: 11, actor: "Worker", action: "Claim photo.process job", component: "lib/queue worker", data: "poll every 500ms", latency: "async" },
      { n: 12, actor: "Worker", action: "Upload photo to object storage", component: "lib/storage", data: "storage://photos/yyyy/mm/hash.jpg", latency: "5-20ms", note: "Content-addressed, deduped, immutable" },
      { n: 13, actor: "Worker", action: "UPDATE row: photoDataUrl = storage://key", component: "lib/db (primary)", data: "DB now stores 40-byte key, not 200KB blob", latency: "3-8ms" },
      { n: 14, actor: "Worker", action: "Invalidate cache [activities, driver:{id}]", component: "lib/cache", data: "fresh read shows storage:// URL", latency: "<1ms" },
      { n: 15, actor: "Client", action: "Records list re-renders with photo thumb", component: "driver-records.tsx", data: "GET /api/storage/photos/...", latency: "CDN-cached" },
    ],
    components: [
      { name: "driver-capture.tsx", role: "Photo + form UI, client-side downsampling" },
      { name: "lib/photo.ts", role: "Canvas downsample to JPEG + thumbnail" },
      { name: "hooks/use-geolocation", role: "GPS watch + on-demand fix capture" },
      { name: "driver-store (Zustand)", role: "Optimistic local state, offline queue" },
      { name: "/api/driver/activity", role: "Validation, rate limit, DB write, cache invalidation, job enqueue" },
      { name: "lib/cache", role: "Fresh-data TTL + tag invalidation + SWR" },
      { name: "lib/queue", role: "Durable SQLite-backed job queue with retry+backoff" },
      { name: "lib/storage", role: "S3-style object storage (local → S3/R2)" },
      { name: "/api/storage/[...key]", role: "Serves objects with immutable CDN cache headers" },
    ],
    failureModes: [
      { mode: "GPS unavailable (indoor/tunnel)", mitigation: "Capture still succeeds; lat/lng null. Driver can add note." },
      { mode: "Network down (offline)", mitigation: "Zustand persists activity locally; syncToBackend retries on reconnect." },
      { mode: "Photo > 2MB", mitigation: "Client downsamples; API rejects 413 if still over; driver retakes." },
      { mode: "DB write fails", mitigation: "API returns 500; client keeps activity in local store; retries on next sync." },
      { mode: "Worker crashes mid-job", mitigation: "Job stays 'running' until lock timeout; re-queued. Photo may be re-uploaded (idempotent via content hash)." },
      { mode: "Object storage full", mitigation: "Job retries with backoff; alerts on storage > 80%." },
      { mode: "Cache invalidation misses a tag", mitigation: "TTL hard-expiry (10-30s) is the safety net - worst-case staleness is bounded." },
    ],
  },
  {
    id: "gps-tracking",
    title: "Continuous GPS tracking (live fleet)",
    trigger: "Driver enables GPS in field app",
    outcome: "Position pings flow to DB; fleet map updates live via WebSocket; cache stays fresh",
    steps: [
      { n: 1, actor: "Driver", action: "Toggle GPS ON", component: "driver-field/index.tsx", data: "trackingEnabled=true", latency: "0ms" },
      { n: 2, actor: "Client", action: "navigator.geolocation.watchPosition", component: "hooks/use-geolocation", data: "high accuracy, maxAge 5s", latency: "-" },
      { n: 3, actor: "Client", action: "On each fix → store.addPing()", component: "driver-store", data: "{lat,lng,speed,heading}", latency: "0ms", note: "Capped at 200 in memory" },
      { n: 4, actor: "Client", action: "POST /api/driver/location", component: "driver-store.addPing", data: "single ping", latency: "network RTT", note: "Mirrored every fix" },
      { n: 5, actor: "API", action: "Rate limit 300/min + validate coords", component: "lib/security", data: "bounds check lat/lng", latency: "<1ms" },
      { n: 6, actor: "API", action: "INSERT into DriverLocationPing", component: "lib/db (primary)", data: "indexed [driverId, createdAt]", latency: "3-8ms" },
      { n: 7, actor: "API", action: "Invalidate cache [locations, fleet-map]", component: "lib/cache", data: "5s TTL livePositions preset", latency: "<1ms" },
      { n: 8, actor: "Ops", action: "Fleet map subscribes to WebSocket", component: "mini-services/ws :3003", data: "socket.io room per fleet", latency: "~100ms push", note: "CDN/gateway forwards via XTransformPort" },
      { n: 9, actor: "Worker", action: "Batch location.batch job every 30s", component: "lib/queue", data: "coalesce high-freq pings", latency: "async" },
    ],
    components: [
      { name: "hooks/use-geolocation", role: "watchPosition with permission query" },
      { name: "driver-store.addPing", role: "Local cap + backend mirror" },
      { name: "/api/driver/location", role: "Write + validate + cache invalidate" },
      { name: "ws-service :3003", role: "Real-time push to fleet map subscribers" },
      { name: "lib/cache (livePositions)", role: "5s TTL keeps map fresh without DB hammering" },
    ],
    failureModes: [
      { mode: "GPS permission denied", mitigation: "UI shows OFF state; driver can still capture photos without geo." },
      { mode: "High ping frequency drains battery", mitigation: "watchPosition with maxAge 5s; client-side throttle; batch job coalesces." },
      { mode: "WebSocket disconnect", mitigation: "socket.io auto-reconnect; client falls back to polling /api/driver/location." },
      { mode: "Replica lag on fleet map read", mitigation: "Live positions use primary-read within session; cache TTL 5s bounds staleness." },
    ],
  },
];

// ---------- Non-Functional Requirements ----------
export interface Nfr {
  category: string;
  requirement: string;
  target: string;
  current: string;
  how: string;
}

export const NFRS: Nfr[] = [
  { category: "Performance", requirement: "API p50 latency", target: "< 50ms", current: "8-30ms", how: "Cache-aside reads (TTL 10-30s) + SWR + indexed queries" },
  { category: "Performance", requirement: "API p99 latency", target: "< 200ms", current: "30-120ms", how: "Async offload of photo/audit to queue; rate limit prevents thundering herd" },
  { category: "Performance", requirement: "Page TTI (desktop)", target: "< 1.5s", current: "~1.2s", how: "Code-split per module, prefetch on nav hover, CDN for static" },
  { category: "Performance", requirement: "Page TTI (mobile 3G)", target: "< 3s", current: "~2.5s", how: "Responsive images, drawer nav, lazy charts" },
  { category: "Performance", requirement: "Driver photo capture → 201", target: "< 400ms", current: "~150ms", how: "Photo processing is async (queue); DB write is the only sync cost" },
  { category: "Availability", requirement: "Uptime (SLO)", target: "99.9%", current: "single-node", how: "LB + N app servers + DB primary/replica + health checks" },
  { category: "Availability", requirement: "MTTR", target: "< 15min", current: "manual", how: "Health endpoint + worker auto-start + graceful degradation" },
  { category: "Availability", requirement: "Graceful degradation", target: "Read-only on DB outage", current: "503", how: "Cache serves stale-within-SWR; writes return 503 with retry hint" },
  { category: "Durability", requirement: "Activity log (POD/expense)", target: "100% (never lose)", current: "SQLite + object storage", how: "Append-only DB + durable queue + object storage dedup" },
  { category: "Durability", requirement: "Photos", target: "99.999999999% (11 nines)", current: "local file", how: "S3/R2 in prod with versioning + cross-region replication" },
  { category: "Durability", requirement: "GPS pings", target: "at-least-once", current: "SQLite", how: "Queue retry + backoff; idempotent inserts" },
  { category: "Durability", requirement: "Audit log", target: "append-only, immutable", current: "SQLite", how: "Append-only model + async queue + WORM storage in prod" },
  { category: "Scalability", requirement: "Read QPS", target: "10k/s", current: "~1k/s", how: "Cache hit rate ~90% + N read replicas + CDN for static" },
  { category: "Scalability", requirement: "Write QPS (GPS pings)", target: "5k/s", current: "~200/s", how: "Batch queue + replica offload reads + sharded DriverLocationPing by driverId" },
  { category: "Scalability", requirement: "Concurrent drivers", target: "50k", current: "single-node", how: "Stateless app servers + LB; GPS service candidate to split as microservice" },
  { category: "Scalability", requirement: "Storage growth", target: "linear, deduped", current: "linear", how: "Content-addressed photos dedupe identical uploads; DB stores keys not blobs" },
  { category: "Security", requirement: "Per-IP rate limit", target: "120/min API, 10/min auth", current: "enforced", how: "In-memory token bucket → Redis in prod" },
  { category: "Security", requirement: "Input sanitization", target: "100% inputs", current: "enforced", how: "sanitize() strips <>, caps length; parameterized Prisma queries" },
  { category: "Security", requirement: "Tenant isolation", target: "RLS-style", current: "companyId filter", how: "Every query scoped by companyId; prod adds Postgres RLS policies" },
  { category: "Security", requirement: "PII masking", target: "logs + display", current: "helpers exist", how: "maskPII/maskGSTIN for logs; audit log stores actorId not raw PII" },
  { category: "Cost", requirement: "Infra $/month @ 1k users", target: "< $400", current: "single-node", how: "Monolith on 1 vCPU + SQLite (free) + 1 replica + S3 (~$0.023/GB)" },
  { category: "Cost", requirement: "Cache memory", target: "< 64MB", current: "capped", how: "LRU eviction at 10k entries / 64MB; TTL bounds lifetime" },
  { category: "Cost", requirement: "Photo storage", target: "$0.023/GB/mo", current: "local", how: "Downsample to 1024px (~150KB) before storage; dedupe by content hash" },
];

// ---------- Capacity Planning ----------
export interface CapacityAnswer {
  question: string;
  answer: string;
  rationale: string;
}

export const CAPACITY: CapacityAnswer[] = [
  {
    question: "How many users?",
    answer: "~1,000 active operators + 5,000 drivers + 20,000 customers (read-only portal)",
    rationale: "Mid-market Indian logistics SME. 22 modules serve ops/finance/fleet; driver app serves field; customer portal is shipment tracking.",
  },
  {
    question: "Growing how fast?",
    answer: "~15% MoM for first 18 months, then ~5% MoM",
    rationale: "Product-led growth within existing customers (more drivers per company). Horizontal scaling target: 10x in 2 years.",
  },
  {
    question: "Read-heavy or write-heavy?",
    answer: "Read-heavy (~95:5 read:write ratio)",
    rationale: "Operators browse dashboards/lists/maps constantly. Only drivers write (photos, GPS, status). GPS pings are high-frequency but tiny rows. → Cache + read replicas are the lever, not write sharding.",
  },
  {
    question: "What can you never lose?",
    answer: "POD photos, expense records, invoices, audit log. GPS pings are best-effort (can lose a few).",
    rationale: "POD = proof of delivery = legal/financial. Expense = reimbursement. Invoice = accounting. Audit = compliance. GPS is operational telemetry - losing 1 of 100 pings is invisible. → POD/expense/invoice get durable queue + object storage; GPS gets fire-and-forget with batch coalescing.",
  },
  {
    question: "How much latency can you afford?",
    answer: "API p99 < 200ms, page TTI < 1.5s, driver capture→ack < 400ms, fleet map push < 1s",
    rationale: "Operators expect instant UI (subconscious comparison to Excel). Drivers on 3G need < 400ms ack or they retry. Fleet map push > 1s feels broken. → Cache + async offload + WebSocket.",
  },
  {
    question: "What does it cost?",
    answer: "~$380/mo at 1k users, scaling ~linearly to ~$2.4k/mo at 10k users",
    rationale: "Monolith (1× 2vCPU $40) + replica ($40) + S3 ($23 for 1TB) + CDN ($20) + LB ($15) + monitoring ($20) + AI tokens ($200) + DB storage ($20). Microservice split adds ~30% overhead at 10k users but enables independent GPS scaling.",
  },
];

// ---------- Tradeoffs ----------
export interface Tradeoff {
  decision: string;
  options: { name: string; pros: string[]; cons: string[]; chosen?: boolean }[];
  rationale: string;
}

export const TRADEOFFS: Tradeoff[] = [
  {
    decision: "Monolith vs Microservices",
    options: [
      {
        name: "Pure Monolith",
        pros: ["1 deploy", "simplest ops", "no network hops", "fastest to build"],
        cons: ["can't scale GPS independently", "one bug kills everything", "team coupling"],
      },
      {
        name: "Pure Microservices",
        pros: ["independent scaling", "fault isolation", "team autonomy"],
        cons: ["network latency", "ops complexity ×10", "distributed transactions", "overkill at 1k users"],
      },
      {
        name: "Hybrid: Monolith core + microservices for what needs to scale",
        pros: ["simple where it can be", "scale only the bottlenecks", "pay complexity only where it pays"],
        cons: ["need a gateway (already have Caddy)", "2 deploy targets instead of 1"],
        chosen: true,
      },
    ],
    rationale: "Start monolith (this Next.js app). Split GPS-ingestion into a microservice when ping QPS > 1k/s (it's the only write-hot path). Split photo-processing into a microservice when CPU on app servers > 70%. Everything else stays in the monolith - the 22 modules don't need independent scaling.",
  },
  {
    decision: "Vertical vs Horizontal Scaling",
    options: [
      {
        name: "Vertical (bigger box)",
        pros: ["zero code change", "no state to share", "cheaper at small scale"],
        cons: ["hard ceiling", "redeploy to resize", "single point of failure"],
      },
      {
        name: "Horizontal (more boxes)",
        pros: ["no ceiling", "fault tolerant", "commodity hardware"],
        cons: ["state must be external (cache/DB/queue)", "need LB", "session stickiness"],
        chosen: true,
      },
    ],
    rationale: "App servers are stateless → horizontal. DB: vertical until ~500GB / 1k QPS, then read replicas (horizontal reads) + sharding (horizontal writes) by companyId. Cache: in-process LRU now → Redis (shared, horizontal) when N > 1 app server.",
  },
  {
    decision: "Why this app needs a cache + what it costs",
    options: [
      { name: "No cache", pros: ["always fresh"], cons: ["DB saturated at ~1k QPS", "p99 > 500ms on hot dashboards"] },
      { name: "Cache (TTL + tag invalidation + SWR)", pros: ["~90% DB load reduction", "p99 < 200ms"], cons: ["~64MB RAM", "staleness risk"], chosen: true },
    ],
    rationale: "Read-heavy (95:5) + hot dashboards (operators refresh trips/fleet/KPIs every few seconds) = cache is the highest-ROI infra. Cost: 64MB RAM (negligible). Risk: staleness - mitigated by (a) write-through tag invalidation on every write, (b) short TTLs (10-30s) as hard safety net, (c) SWR serves stale only within a 5-15s window then hard-miss forces fresh read. Net: worst-case staleness = SWR window; best-case = always fresh (cache hit within TTL).",
  },
  {
    decision: "Cache invalidation strategy",
    options: [
      { name: "TTL only", pros: ["simplest"], cons: ["up to TTL of staleness after a write"] },
      { name: "Tag-based (write-through)", pros: ["fresh immediately after write"], cons: ["must tag every cached read", "must invalidate on every write"], chosen: true },
      { name: "Explicit flush", pros: ["precise"], cons: ["error-prone, easy to forget"] },
    ],
    rationale: "Tag-based write-through invalidation guarantees: the instant a write lands, all cached reads for that entity are purged. Combined with SWR (serve stale briefly + bg refresh) and hard TTL expiry (never serve truly old data), this is the 'fresh data not old data' guarantee. Cost: every write path must call cacheInvalidate(tags) - enforced by convention + code review.",
  },
  {
    decision: "Where to store photos (base64-in-DB vs object storage)",
    options: [
      { name: "base64 in SQLite", pros: ["1 table, no joins"], cons: ["DB bloats 200KB/row", "backups explode", "can't CDN-cache"] },
      { name: "Object storage (S3-style)", pros: ["DB stays lean (40-byte key)", "immutable URLs CDN-cache 1yr", "deduped by content hash"], cons: ["1 extra component", "need a serving route"], chosen: true },
    ],
    rationale: "A driver captures ~10 photos/day. 5k drivers = 50k photos/day = ~7.5GB/day. In SQLite that kills the DB within a month. Object storage keeps the DB at ~MB scale, dedupes identical uploads, and lets the CDN serve photos from edge with 1-year immutable cache headers.",
  },
];

// ---------- Scaling Strategy (phased) ----------
export interface ScalingPhase {
  phase: string;
  trigger: string;
  changes: { layer: string; action: string }[];
  cost: string;
}

export const SCALING_PHASES: ScalingPhase[] = [
  {
    phase: "Phase 0 - Now (single node)",
    trigger: "0–1k users",
    changes: [
      { layer: "App", action: "1 Next.js process, in-process queue worker" },
      { layer: "DB", action: "SQLite single file, in-process LRU cache" },
      { layer: "Storage", action: "Local file object storage" },
      { layer: "Realtime", action: "1 WebSocket mini-service :3003" },
    ],
    cost: "~$80/mo (1 vCPU box)",
  },
  {
    phase: "Phase 1 - Scale out app + cache",
    trigger: "1k–5k users, p99 > 200ms",
    changes: [
      { layer: "App", action: "N Next.js behind LB, stateless" },
      { layer: "Cache", action: "Redis (shared) replacing in-process LRU" },
      { layer: "DB", action: "Postgres primary + 1 read replica" },
      { layer: "Storage", action: "S3/R2 replacing local file" },
      { layer: "Queue", action: "Redis/BullMQ replacing SQLite queue" },
    ],
    cost: "~$380/mo",
  },
  {
    phase: "Phase 2 - Split write-hot microservice",
    trigger: "GPS ping QPS > 1k/s",
    changes: [
      { layer: "GPS service", action: "Extract to microservice with own DB shard (by driverId hash)" },
      { layer: "Photo service", action: "Extract worker pool to own service (CPU-bound)" },
      { layer: "DB", action: "Shard DriverLocationPing by driverId; keep core DB for financials" },
    ],
    cost: "~$900/mo",
  },
  {
    phase: "Phase 3 - Multi-region + CDN edge",
    trigger: "5k–50k users, geo latency",
    changes: [
      { layer: "CDN", action: "Edge POPs for static + immutable photos" },
      { layer: "DB", action: "Read replicas per region; writes to primary region" },
      { layer: "Cache", action: "Edge cache (Cloudflare Workers) for hot reads" },
    ],
    cost: "~$2.4k/mo",
  },
];
