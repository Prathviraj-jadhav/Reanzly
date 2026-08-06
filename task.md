# Reanzly — Task Status

Snapshot as of this session. "Done" means independently verified (ran it, tested it),
not "an agent said it's done." Where that verification hasn't happened yet, it's
marked explicitly.

## Completed & verified

- [x] Local dev environment (env vars, DB path, dependencies, Prisma client, dev
      server) — working, browser-verified.
- [x] Core module build-out (App Store, Partner Programme, Financial Services,
      Warehouse-crew field mode) — see `Reanzly.md` §19.
- [x] **Chat connectivity bug** — dev-mode socket was addressing a production-only
      gateway path. Fixed in `src/lib/chat/socket-client.ts`. Verified live.
- [x] **Stage 1 — Offline, data-grounded SLM engine** (`src/lib/slm/local-engine.ts`) —
      12 intents over real mock data, zero external API calls, word-boundary keyword
      matching, several real bugs found and fixed through functional testing. Wired
      into `/api/rean` and `/api/slm/chat`. Verified via curl + browser chat.
- [x] **Dev server "Turbopack unexpected error"** — caused by stale/racing `next dev`
      processes fighting over port 3000 (leftover process churn, not a code bug).
      Killed the process tree, restarted through a tracked launch config. Verified in
      browser: full page render, every chunk `200 OK`, HMR connected, zero errors on
      a fresh load.
- [x] **Rust `slm-engine` real GGUF inference** (Qwen2.5-0.5B-Instruct via candle) —
      compiles and runs for real. Two genuine bugs found and fixed getting here (see
      `worklog.md` Task 5 for detail): an `ort`/`ort-sys` pre-release version
      mismatch (pinned `ort-sys = "=2.0.0-rc.4"` to match what `ort` was actually
      built against), and a startup crash in the embedding loader (made non-fatal,
      matching the existing graceful-degradation pattern for the Qwen model). Verified
      live: `/health` → `OK`, `/infer` → real generated text ("2+2 equals 4.",
      "A good trucking company must have proof-of-delivery systems in place that
      ensure timely delivery and safe operation of the vehicles." — genuine model
      output, not templated), confirmed via `/api/rean` returning real Qwen-generated
      prose rather than the local fallback template.
- [x] **`inferSLM()` 5-second timeout** — was shorter than the engine's real
      generation latency (measured ~3.5s for a 160-token "fast" reply, ~7.6s for a
      320-token "balanced" reply on this CPU), so every real request was silently
      timing out and falling back to `answerLocally()` — and worse, the fallback path
      re-ran the *entire long system prompt* through the local keyword matcher
      instead of the original short user message, producing nonsense answers (e.g.
      "hello" → an overdue-invoices dump). Fixed by raising the timeout to 30s in
      `src/lib/slm/client.ts`. Verified: `/api/rean` now returns genuine Qwen prose
      end-to-end.
- [x] **"Not getting answers back from Rean in the chat"** — three real, separate
      bugs, all fixed and verified:
      1. **chat-service (port 3003) was down.** Collateral damage from an earlier
         `Stop-Process -Name node -Force` used to fix the Turbopack issue — it killed
         chat-service along with the stray Next.js processes and was never restarted.
         Restarted; confirmed a live client reconnect in its logs.
      2. **Intermittent IPv4/IPv6 connection race.** `client.ts` called
         `http://localhost:3004` for the Rust engine; Node's fetch resolving
         "localhost" can race to the IPv6 `::1` candidate first and fail before
         falling back to IPv4, even though the engine is healthy and listening on
         IPv4. This was silent and intermittent - worked when called directly by curl,
         failed unpredictably when called from within the Next.js server process.
         Fixed by using the literal `http://127.0.0.1:3004`. Verified with 3
         consecutive successful calls (previously non-deterministic).
      3. **Wrong fallback input.** Same root issue as the timeout fix above, still
         reachable via this new failure mode: on any fallback, `answerLocally()` was
         called with the long wrapped prompt instead of the user's real message,
         producing irrelevant answers. Fixed via the `fallbackQuery` option added to
         `inferSLM()` (also applied to `/api/slm/chat` and `self-learning.ts`'s
         `superpositionReason`, which had the identical bug).
      Verified end-to-end via direct DB query against `db/custom.db`: sent "good
      morning" through the actual chat UI, confirmed Rean's real reply
      ("Good morning, my fellow operator. How can I assist you today?") landed in
      `ChatMessage` ~16s later - the same latency profile as direct engine calls, not
      the instant fallback path.
- [x] **Real RAG "brain" for Rean** (per explicit user request: "add the RAG and
      create there brain for it"). New `KnowledgeChunk` Prisma model + 54 real,
      embedded knowledge chunks in `src/lib/slm/knowledge-seed.ts` (glossary terms,
      compliance rules, module reference) sourced from `Reanzly.md`'s own
      documentation and the compliance facts already enforced in
      `src/lib/insights/engine.ts` (FMVDR fatigue limit, invoice-risk thresholds,
      document-expiry severity) - nothing invented. `src/lib/slm/rag.ts` embeds and
      retrieves via real cosine similarity over the Rust engine's `/embed` endpoint
      (which required fixing the embedding bug below first). Wired into `/api/rean`:
      a confident, non-live-data-intent knowledge match answers directly from the
      knowledge base (skipping generation - both more reliable and ~15-20s faster for
      that class of question); otherwise it's supplementary context alongside live
      data. Verified via isolated retrieval tests (compliance/glossary queries scored
      0.79-0.90 against their correct chunk) and via `/api/rean`: compliance/glossary
      questions now answer correctly and near-instantly, live-data questions ("how
      many trucks are idle right now?") still correctly route through real inference
      with live data rather than a static knowledge chunk.
- [x] **Embedding model download bug, actually fixed** (previously logged as an open
      item below - closing it out). `fastembed`'s bundled `hf-hub 0.3.2` panicked
      ("Bad URL: RelativeUrlWithoutBase") on Hugging Face's Xet-storage CDN redirects.
      Fixed by bypassing it entirely: `embed.rs` now downloads the model files itself
      via `hf-hub 0.5.0` (already proven working for the Qwen GGUF model) and hands
      the bytes to fastembed's "bring your own model" constructor
      (`try_new_from_user_defined`), with fastembed's own "online"/hf-hub-0.3.2
      feature disabled in `Cargo.toml`. Verified: `/embed` now returns real non-zero
      384-dim vectors.
- [x] **Local-engine "drivers" intent over-firing** — matched on bare "driver",
      including compliance questions like "what happens if a driver exceeds the
      fatigue limit?", returning irrelevant roster stats. Added fatigue/duty-hour
      keywords to the existing `compliance` intent (checked earlier in the intent
      list) so these route correctly. Narrow, targeted fix in `local-engine.ts`.
- [x] **Chat message timestamps displaying wrong/inconsistent times** (user-reported,
      with a screenshot showing "09:42" for messages that should have read ~04:2x, and
      other messages showing raw un-converted UTC digits instead of local time). Root
      cause: Prisma's SQLite `DateTime @default(now())` stores `createdAt` as SQLite's
      `CURRENT_TIMESTAMP` — always UTC, but as a naive `'YYYY-MM-DD HH:MM:SS'` string
      with no timezone marker. `chat-service`'s `rowToMessage()` parsed this via plain
      `new Date(row.createdAt)`, which per the ECMAScript spec treats a
      timezone-less string as *local* time — and Bun on Windows resolves "local" via
      the OS timezone setting (IST here), not the UTC the wrapping shell environment
      reports. That silently shifted every live-socket message's timestamp by the
      local UTC offset before it ever reached the browser, and `.toISOString()` baked
      the wrong moment into an otherwise well-formed string, so it wasn't visible
      until the browser converted it back to local time and landed on the wrong
      clock digits. (Messages loaded via the initial REST hydration path,
      `/api/chat/init`, were unaffected — Prisma's own client always deserializes
      `DateTime` correctly regardless of the storage format, confirmed by direct
      testing.) Fixed with a `parseDbTimestamp()` helper in
      `mini-services/chat-service/index.ts` that explicitly tags naive
      SQLite-timestamp strings as UTC before parsing. Verified via a real socket.io
      client round-trip: a message sent right now returned a timestamp within 0.6
      seconds of actual current time (previously would have been off by the full
      local UTC offset, 5.5 hours here).

## In progress

- [ ] **Stage 2 — Chat upgrades (Teams-style)**: message edit/soft-delete, poll
      voting, rich text/code blocks, attachment upload, mute, global search. Code and
      schema migration are in place (built via parallel agents against a shared
      contract). **Not yet independently browser-verified end-to-end** — this is the
      next concrete verification step before Stage 2 can be marked done.
- [ ] **Real Qwen chat latency.** Genuinely working end-to-end, but slow for
      non-knowledge-base questions: ~16-30s round-trip for a live-data question
      (CPU-only 0.5B generation, "balanced" tier generating toward a 320-token budget
      even for short replies). Compliance/glossary questions are now instant (RAG
      short-circuit), but anything needing live data still pays the full generation
      cost. Needs either a lower token budget for short replies, a smaller tier
      default, or a UI-level "thinking..." indicator with streaming — not yet decided
      or built.
- [ ] **Self-learning / memory layer** (`self-learning.ts`, `client.ts`,
      `SlmFeedback`/`SlmMemory` Prisma models) — appeared mid-session from a second,
      concurrent session (see `worklog.md` Task 4 for the full incident writeup);
      user has since explicitly directed completing it for real. Wired into the API
      routes and does not crash. Its similarity search now runs against **real**
      embeddings (the embedding bug above is fixed), but hasn't had a dedicated
      correctness pass the way the new knowledge-base RAG path has - worth a follow-up
      check.
- [ ] **RAG routing heuristic is a first pass, not perfect.** The rule that decides
      "answer straight from the knowledge base" vs. "go through live-data generation"
      (see `src/app/api/rean/route.ts`) is based on knowledge-match confidence plus a
      hand-picked list of "trusted live-data intents." It got three iterations of
      real tuning this session (see `worklog.md`) and is now correct for every case
      tested, but is a heuristic, not a learned classifier - a genuinely new class of
      ambiguous question (topically matches a knowledge chunk AND needs live data)
      could still misroute. Worth revisiting if that's observed in practice.
- [ ] **Final live browser click-through for the chat fix wasn't cleanly
      re-confirmed** after the RAG/timeout/keyword changes, due to this specific
      testing environment's Browser pane becoming unreliable for this one interaction
      (a slide-in chat panel intermittently rendered outside the viewport bounds
      across several fresh-tab/resize attempts - a rendering/timing artifact, not a
      reproducible layout bug, and inconsistent with the panel's own CSS which has no
      transform/positioning issue at rest). Not re-chased further given strong
      existing evidence: earlier in this same session, before these fixes, the exact
      same chat UI was used successfully end-to-end with DB ground-truth
      confirmation, and every fix made since has been independently verified via
      direct calls to the same `/api/rean` route the UI calls. Recommend a real
      manual click-through as a final sanity check when convenient.

## Not started

- [ ] **Stage 3 — Real WebRTC calling** (audio/video, screen share, scheduled calls).
      Per the agreed staged plan (SLM → Chat → Calling), this starts only after Stage
      2 is verified and the SLM work above is settled.

## Flagged, open, needs a decision

- [ ] **`DEPLOYMENT.md` / `HOW-TO-BUILD-REANZLY.md` accuracy audit.** Both were
      authored by the other/concurrent session, unrequested. `HOW-TO-BUILD-REANZLY.md`
      describes several AI features that do not exist in the repo (anomaly detection,
      rate prediction, a separate embedding-service, a RAG pipeline, a 6-agent system,
      several named `src/lib/slm/*.ts` files) — confirmed via direct directory
      listing. `DEPLOYMENT.md`'s referenced security/CI files (`.github/workflows/ci-cd.yml`,
      `scripts/security-audit.*`, `scripts/backup-encrypt.*`, `security/fail2ban/*`) do
      exist on disk, but their **contents haven't been read/verified** yet — given the
      `infer.rs` precedent (a file that existed but was a hollow fake), existence is
      not proof of correctness. Do not treat `DEPLOYMENT.md` as a trustworthy
      production runbook until this is done. Not yet scheduled — needs explicit user
      go-ahead on priority vs. finishing the SLM/calling work.

## Real user accounts (replacing dummy/mock identity) — new, in progress

User explicitly asked for three things in parallel: real user accounts, a
scoped/permissioned database tool for Rean, and WebRTC calling. Real accounts
is done to a genuinely working state (see `worklog.md` Task 11 for full detail).
The other two are next.

- [x] **Real, password-verified user accounts.** The `User` Prisma model already
      existed (email, passwordHash, salt, role, etc.) but was completely unused -
      every table row referencing "who did this" was actually backed by a static
      TypeScript array (`ROLE_ARCHETYPES`) with no server-side verification
      anywhere. Seeded 17 real `User` rows (`src/scripts/seed-users.ts`, dummy
      `@reanzly.in` emails as requested, one shared demo password hashed with
      `scrypt`), added a `Session` model (opaque DB-backed token, not a JWT - real
      logout revocation), and built `/api/auth/login`, `/api/auth/logout`,
      `/api/auth/me`, plus `src/lib/auth.ts` (`hashPassword`/`verifyPassword`/
      `getSessionUser`). `User.id` deliberately reuses the old archetype id
      strings (`"owner"`, `"hr-manager"`, ...) so every existing row that already
      references them as a foreign key - chat participants, chat messages -
      needed zero data migration. Verified end-to-end through the actual browser
      UI (not just curl): wrong password → real "Invalid email or password."
      error rendered on screen; correct password → real dashboard, session
      survives a full page reload. `login-screen.tsx`'s "quick sign in" tiles
      now go through this same real check too (using the shared seed password),
      not a bypass.
- [x] **Closed a real identity-spoofing vulnerability in chat**, found while
      building the above (this is exactly the "limited access... can't hack"
      concern in the request). Before this: chat-service's socket.io handshake
      accepted *any* client-supplied `userId` string with zero verification -
      `/api/chat/init`, `/api/chat/messages`, and `/api/chat/conversations` all
      trusted a client-supplied `userId`/`senderId` directly from the request.
      Any caller could read another user's conversations or post/create
      conversations as anyone. Fixed by making every one of those routes derive
      identity from `getSessionUser()` (the real session) instead, and by having
      chat-service validate the session cookie itself against the `Session`/`User`
      tables via its own `bun:sqlite` connection (`parseCookie`/
      `validateSessionToken` in `mini-services/chat-service/index.ts`) rather than
      trusting the handshake payload. Verified directly: a socket.io connection
      with no valid session cookie now gets `connect_error: "unauthorized -
      please sign in"`; a REST call to `/api/chat/messages` with a forged
      `senderId` but no session now gets a `401`, not a successful post.

## In progress (background workflow) — the other two of the three parallel workstreams

- [ ] **Rean's scoped database-query tool** ("talk with every type of database
      table... limited access... can't hack... read + write with confirmation").
      Schema foundation laid (new `RagAction` model: every write Rean proposes
      is logged pending → confirmed/rejected → executed/failed, never executed
      immediately). Build delegated to a background workflow agent with a
      detailed brief (curated model allowlist excluding sensitive
      fields/tables, tenant-scoped reads, confirm-before-write flow, markdown
      table formatting for multi-row results). Not yet reviewed/merged into
      this status list as done - awaiting the workflow's completion + its own
      independent verification pass.
- [ ] **Real WebRTC calling** (audio/video, screen share, scheduling). Found
      that `chat-panel.tsx` already has a fully-built call UI shell (buttons,
      calling/connected states, mute/camera/screen-share controls, duration
      timer) that is **entirely fake** - `startCall()` just flips local React
      state with zero real media/signaling/peer connection - exactly the
      "hardcoded, not real" pattern the user flagged. Schema foundation laid
      (new `Call` model tracking status/participants/schedule). Build
      delegated to a background workflow agent (real `getUserMedia`/
      `RTCPeerConnection`/`getDisplayMedia`, signaling added to
      `chat-service`'s existing socket.io server using the now-real session
      identity, incoming-call UI, scheduling). Same status - awaiting
      completion + verification.

## Sequencing reminder

Agreed order with the user: **Stage 1 (SLM) → Stage 2 (Chat) → Stage 3 (Calling)**,
review between each. Currently inside Stage 2/SLM-completion. The user has since
also asked for real user accounts + a Rean database tool + calling, "all three
in parallel" - real accounts is done; DB tool and calling are being picked up next.
