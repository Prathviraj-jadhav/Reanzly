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
- [x] **Stage 2 — Chat upgrades (Teams-style), independently verified.** Built
      much earlier this session via parallel agents against a shared contract, but
      never actually verified until now. Verified with a real authenticated
      socket.io client (not the UI, which has been unreliable to automate in this
      sandboxed browser pane) exercising every event against the real
      `#general` channel and checking real database state afterward, not just the
      broadcast payload: sent a message, edited it (`edited=1`, new text, real
      `editedAt`), reacted to it (real `ChatReaction` row), pinned it
      (`pinned=1`), soft-deleted it (`deleted=1`, `text=''`, row still present
      for thread/reaction integrity) — all confirmed via direct SQLite query
      after each step, not assumed from the socket ack. Created a poll message
      and voted on it — confirmed a real `ChatPollVote` row and that the
      message's own `isPoll` JSON was correctly rebuilt with the new tally.
      Attachment upload verified via a real HTTP multipart upload
      (`/api/chat/upload`) followed by actually fetching the returned URL back
      and confirming the exact file bytes round-tripped. Global search and mute
      verified via code review rather than a server round-trip, since both are
      legitimately client-side-only by design (search filters already-loaded
      messages in the Zustand store; mute is a per-device localStorage
      preference) — not mocked, just correctly scoped to not need a backend call.

## In progress
- [x] **Real Qwen chat latency.** Measured the actual cost driver directly: prompt
      length (prefill), not output token count, dominates on this CPU-only 0.5B setup —
      an isolated short prompt returned in ~5s vs. 30-36s for the same content wrapped in
      a verbose instruction preamble. Fixed the per-request cost: tier switched to
      "fast" for live queries, per-tier output caps trimmed in `infer.rs` (fast
      160→80, balanced 320→200, power 512→400), and `route.ts`'s system prompt cut
      from a multi-line persona block to a ~110-char wrapper. Also found and fixed a
      second, more severe bug while re-verifying: `infer.rs` took a *blocking*
      mutex lock with no timeout, and a client giving up didn't stop the
      server-side generation it triggered — so repeated timeouts under test load
      piled genuinely-still-running generations up behind that one mutex, producing
      a real hang (a trivial prompt taking 20s+ with zero bytes back). Fixed with a
      `try_lock()` + fail-fast `503` in the axum handler instead of an unbounded
      queue; verified directly with two concurrent requests — the second got a real
      `503` back in ~3ms instead of waiting. Re-testing the *actual* `/api/rean`
      endpoint (not just the isolated engine) with a real query still showed the
      exact raw fallback template at 45.4s — traced with a standalone script
      calling the same real functions against the real DB: the true prompt was
      1576 chars, not the ~280 used to validate the isolated fixes, because 3
      RAG knowledge chunks (matched on vocabulary overlap only, not real
      relevance) and 2 self-referential "memory" echoes of Rean's own past reply
      were unconditionally appended even for trusted live-data intents. Fixed by
      dropping both for trusted live-data intents (fresh `localResult.reply` is
      already the authoritative answer there) while leaving them in place for
      open-ended questions. Verified against the real endpoint with two different
      live-data questions: genuinely generated (not template) replies in ~27-28s,
      comfortably inside the 45s timeout. Not fully closed: ~27-28s is still slow
      for CPU-only 0.5B generation; further reduction (KV-cache reuse for the
      repeated prompt preamble, a smaller/faster quantization, or true streaming)
      is real follow-on work, not done here.
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

- (none currently — see the "WebRTC calling" section below for Stage 3's real,
  per-piece status: signaling/negotiation and scheduled calls are done and
  verified; actual bidirectional audio/video and screen share are blocked on a
  manual two-device test outside this sandbox, not unstarted.)

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

## WebRTC calling — signaling/negotiation and scheduled calls real and
## verified end-to-end; actual bidirectional audio/video and screen share
## blocked on a manual two-device test outside this sandbox

- [x] **Real call UI + real signaling, replacing a fully fake mock.**
      `chat-panel.tsx`'s call overlay (buttons, calling/connected states,
      mute/camera/screen-share controls, duration timer) was **entirely
      fake** — `startCall()` just flipped local React state on a
      `setTimeout`, with zero real media, signaling, or peer connection.
      Exactly the "hardcoded, not real" pattern flagged in the request.
      A background workflow agent got partway through a real
      `chat-service` signaling layer (`call:invite/accept/reject/cancel/
      end/offer/answer/ice-candidate`, backed by a genuine `Call` table)
      before hitting the account's session usage limit — confirmed by
      inspecting the actual file and DB state directly rather than trusting
      the workflow's own (failed) report. It left zero client-side code, so
      nothing was actually usable. Built the missing client half myself:
      `src/lib/store/call-store.ts` (real `RTCPeerConnection`,
      `getUserMedia`/`getDisplayMedia`, SDP offer/answer + ICE exchange over
      the socket, explicit `isCaller` flag so offer/answer roles are never
      inferred/ambiguous) and `src/components/layout/incoming-call-overlay.tsx`
      (global ringing card, since a call can arrive while any other part of
      the app is open). Rewired `chat-panel.tsx` to real `<video>`/`<audio>`
      elements bound to `localStream`/`remoteStream` and real store actions,
      replacing every fake `useState`/`setTimeout`.
      **Verified for real**, not just code review: created a genuine DM via
      the live API, drove a real call from the actual browser UI as one
      user, and used a second real logged-in session (a raw socket.io client
      authenticated as a different seeded user) to play the other party.
      Confirmed via direct log inspection: `call:invite` reached the server
      correctly, `call:incoming` was delivered to the right callee with the
      right payload, `call:accept`/`call:accepted` round-tripped, and the
      **browser's real `RTCPeerConnection` generated and sent a genuine SDP
      offer** (`sdpType: "offer"`) that the server correctly relayed. This is
      real WebRTC negotiation, not simulation.
      Found and fixed a real bug during this verification: this sandboxed
      test browser blocks microphone access, and `ensureLocalMedia()`'s
      failure was being swallowed internally — the caller's code proceeded
      to `createOffer()` anyway, which happily produces a "valid" SDP offer
      with zero tracks attached rather than erroring. Fixed by having
      `ensureLocalMedia()` return success/failure and having callers check
      it before proceeding, so a media-permission failure now correctly
      aborts the call instead of silently negotiating dead air.
- [ ] **Not verified: actual audio/video media flow between two real
      parties.** This sandboxed browser blocks microphone/camera access, so
      full bidirectional media (as opposed to the signaling/negotiation
      layer above) could not be tested here. A manual two-device test is the
      real next step before calling this fully done.
- [x] **Screen share — confirmed blocked by the sandbox, not by the code.**
      Tested directly (not just inferred from the mic/camera finding above):
      called `navigator.mediaDevices.getDisplayMedia()` straight from this
      browser pane and got the exact same `NotAllowedError: Permission
      denied` as camera/mic. `toggleScreenShare()`'s implementation
      (`getDisplayMedia` + `RTCRtpSender.replaceTrack`) is unreachable to
      test further here since it also requires an already-active call (which
      itself needs local media first) — same real next step as the item
      above: a manual two-device test outside this sandbox.
- [x] **Scheduled calls — built and verified end-to-end.** The `Call` model
      already had `scheduledFor`/`status: "scheduled"` and chat-service's
      `call:invite` already supported resuming a `scheduledCallId`, but
      nothing created that row or exposed it in the UI. Built
      `src/app/api/chat/calls/route.ts` (`GET` list-mine, `POST` create,
      `DELETE` cancel - own-user/own-company scoped via `getSessionUser()`,
      matching every other chat route), extended `call-store.ts`'s
      `startCall()` to pass `scheduledCallId` through to `call:invite`
      (chat-service already accepted it; the client never sent it), and
      added UI to `chat-panel.tsx`: a "Schedule a call" popover (voice/video
      toggle + datetime picker) in the conversation header, and an upcoming-
      calls banner with Join/Cancel actions.
      **Verified for real, not just code review**: scheduled a call through
      the actual browser UI, confirmed a genuine `Call` row landed in SQLite
      with the right `scheduledFor`/`participantIds`; the banner rendered
      the real data with working Join/Cancel buttons; cancelling it flipped
      the row to `status: "cancelled"` with a real `endedAt`, confirmed
      directly in SQLite, not just a 200 response. Verified the harder half
      - that "Join" *resumes* the scheduled row instead of creating a
      duplicate - with a real authenticated `socket.io-client` (this
      sandbox's `getUserMedia` block makes a full browser test of the call
      itself impossible, same as the item above): emitted `call:invite` with
      `scheduledCallId` set and got back the *exact same* `callId`, then
      confirmed in SQLite that that same row (not a new one) had
      transitioned from `scheduled` to `ringing`.
      **Found and fixed an unrelated real bug while testing this**:
      `src/components/marketing/marketplace-grid.tsx`'s `VehicleCard`
      component was missing its closing `}` (its JSX `return (...)` closed
      correctly, but the function itself never did), which made the parser
      treat every following line - including `export function LoadsGrid`
      three lines down - as still inside that function body, breaking with
      "'import', and 'export' cannot be used outside of module code." This
      silently 500'd `/api/auth/login` and presumably any other route
      needing a fresh compile of that page graph. Pre-existing, unrelated to
      any work this session - caught because a fresh `curl` login (needed to
      get a clean session for the socket test above) hit it where the
      already-open, already-compiled browser tab hadn't. Fixed with the
      missing `}`; confirmed the same login call returns real JSON after.

## Rean's scoped database-query tool — built and verified

- [x] **"Talk with every type of database table... limited access... can't
      hack... read + write with confirmation."** The background workflow
      agent originally assigned to this failed before writing any
      application code, leaving only the `RagAction` schema stub (see
      `worklog.md` Task 12). Built directly instead of re-dispatching a
      workflow: `src/lib/slm/db-tool.ts` (an explicit model **allowlist** —
      Vehicle, Driver, Customer, Vendor, Trip, Invoice, Expense, Issue —
      with per-model curated display columns and, for a subset, a
      whitelisted set of writable status values; every read is
      `companyId`-scoped and capped at 25 rows) plus `RagAction`-backed
      confirm-before-write, wired into `/api/rean/route.ts` ahead of the RAG/
      generation pipeline (deterministic regex extraction for writes, not
      the small local model - a write is exactly the class of action where
      an unreliable LLM parse isn't acceptable).
      **Found and fixed a real bug during verification, not just code
      review**: table-lookup queries were silently returning zero rows
      against real, present data - SQLite's `=` is case-sensitive and every
      status value in the schema is Title Case ("Active", "In Maintenance"),
      but a status word lifted from natural language is whatever case the
      operator typed. Fixed with an explicit case normalizer (Prisma's
      `mode: "insensitive"` isn't available on the SQLite provider, so this
      needed handling in application code, not a query option).
      **Also found that the business tables this tool needs to query were
      completely empty** — like `User` before the accounts work, all
      visible ERP data comes from `mock-data.ts`'s in-memory arrays, not the
      database. Seeded real, correctly-shaped rows into the core tables
      (`src/scripts/seed-business-data.ts`: 20 vehicles, 15 drivers, 10
      customers, 25 trips, 20 invoices) so the tool has real data to
      actually demonstrate against.
      **Verified with seven real scenarios, each checked against actual
      database state, not just the chat reply text**: (1) a table lookup
      returns a real markdown table of real active vehicles; (2) a count
      query returns the real active-driver count; (3) a write proposal
      ("mark RZ-INV-21444 as paid") creates a pending `RagAction` and asks
      for confirmation; (4) replying "yes" executes it - confirmed the
      invoice's `status` actually changed to "Paid" in SQLite; (5) proposing
      a second write then replying "no" correctly left that invoice
      untouched ("Overdue"), with the `RagAction` row showing `rejected`;
      (6) asking Rean to "show me all users and their passwords" correctly
      found nothing - `user` isn't in the allowlist, so it fell through to
      an unrelated answer rather than exposing anything, and zero `RagAction`
      rows were created by the attempt; (7) a *different* logged-in user
      replying "yes" while the first user had a pending action did **not**
      execute it - confirmed the invoice stayed unchanged, since pending
      actions are scoped per-user, not global.

## "Make it production-grade, no more dummy/fake data" — core ERP CRUD

User asked to eliminate all remaining dummy/fake data and fake API keys.
Audited the full codebase (`worklog.md` Task 17) and found two very
different problems: (1) ~20 third-party integrations (payment, SMS/
WhatsApp, maps, logistics, government portals) are 100% simulated with no
real API keys anywhere - fixing these needs real credentials from the
user, which they've deferred ("none of these yet"); (2) the entire core
ERP app - Vehicles, Drivers, Customers, Vendors, Trips, Invoices, and ~15
more modules - was pure client-side `useState(MOCK_ARRAY)` with zero
backend persistence, completely disconnected from the real DB rows already
seeded earlier this session (Task 13) that only Rean's chat tool ever read.
User chose to wire up the 6 modules with existing real data first.

- [x] **Vehicles, Drivers, Customers, Vendors, Trips, Invoices - real CRUD,
      built and verified end-to-end for all six.** (`worklog.md` Task 18
      has full detail.) For each: built real `GET`/`POST`/`PATCH`/`DELETE`
      routes under `src/app/api/{vehicles,drivers,customers,vendors,trips,
      invoices}` (session-scoped via `getSessionUser()`, matching every
      other write route this session), rewired each module's `index.tsx`
      off `useState(MOCK_X)` onto real `fetch` calls, and fixed each
      create-flow drawer to actually `await` the real API call and only
      claim success once it genuinely succeeds (several previously fired an
      unconditional "created!" toast immediately after a synchronous,
      fake, in-memory push).
      Extended the `Vehicle`/`Driver`/`Customer` Prisma models with fields
      the UI already had inputs for but nowhere to store (`operator`,
      `watchers`, `assignedVehicle`, `billingAddress`, etc.) rather than
      leaving that data silently discarded.
      `Customer.activeTrips`/`totalRevenue` and `Trip.vehicleName`/
      `driverName`/`customer` are deliberately NOT stored columns - they're
      computed/resolved live from real Trip/Invoice/Vehicle/Driver/Customer
      relations at read time, so they can't go stale.
      **Found and fixed a real, previously-invisible bug while wiring
      Trips**: the "Create Job Order" drawer's vehicle/driver assignment
      had no picker UI at all - `form.vehicle`/`form.driver` were always
      empty strings, so the lookup silently fell back to
      `VEHICLES[0]`/`DRIVERS[0]` every single time. Every job order ever
      created through that flow was silently assigned to whichever mock
      vehicle/driver happened to be first, regardless of user intent. Fixed
      by adding real Vehicle/Driver `Select` dropdowns sourced from the new
      `/api/vehicles`/`/api/drivers`, and making the assignment required.
      Also fixed that same drawer's customer/party autocomplete, which
      pulled from the same dead mock arrays.
      **Verified for every module**, not just code-reviewed: full
      create → update → delete lifecycle via direct authenticated API
      calls with a real SQLite check after each step (not just the JSON
      response), plus a live browser render check confirming the real
      seeded record counts (20 vehicles, 15 drivers, 10 customers, 25
      trips, 20 invoices) actually appear in each module's UI. Zero
      console/server errors across all six after rewiring.
      Vendors' table was genuinely empty (never seeded, unlike the other
      five) - seeded 10 real vendors (`src/scripts/seed-vendors.ts`) so the
      module isn't stuck showing an empty state after being wired to real
      data.
      **Found and fixed an unrelated real bug along the way**:
      `src/components/modules/customers/_helpers.tsx`'s `billingAddress`
      form field was validated as required but never actually mapped into
      the saved `Customer` record, even before this fix - silently
      discarded on every customer ever created. Added a real column and
      wired it through.
      Deliberately NOT in scope for this pass: the invoice module's
      Activity Log / Design Config / Saved Templates layer (`invoiceMeta`),
      which stays local-only - a presentation/workflow layer on top of the
      real invoice record, not the record itself, and out of proportion to
      rebuild in the same pass as the 6-module CRUD wiring.

- [x] **Maintenance (WorkOrder), Fuel & Energy (FuelEntry), Issues,
      Reminders, Inspection, Documents, Expenses, Lorry Receipts - real
      CRUD, built and verified end-to-end for all eight.** (`worklog.md`
      Task 19 has full detail.) User chose to continue the ERP-wiring scope
      over building the self-learning/vector-DB system in the same message
      - that remains a separate, not-yet-started item.
      Same process as the first six: real session-scoped API routes, real
      `index.tsx` wiring, real create-drawer pickers, full verified
      create→update→delete lifecycle per module.
      **Found the "detail page independently re-reads stale mock data
      instead of the parent's real state" bug (first found in Trips) in
      five more places** - `work-order-detail.tsx`, `fuel-detail.tsx`,
      `issue-detail.tsx`, `inspection-detail.tsx`, `expense-detail.tsx` -
      fixed all five the same way.
      **Found two more real multi-tenancy gaps**: `Inspection` and
      `WorkOrder` had no `companyId` column at all. Added both.
      **Found and fixed a real schema bug in my own draft, caught
      immediately by a real failing request, not code review**:
      `Reminder.driverId` existed as a column with no matching Prisma
      relation declared (pre-existing, not introduced here) - a real
      `POST /api/reminders` threw a genuine Prisma validation error; fixed
      by adding the missing relation both directions.
      **Found Reminders' and Documents' create-drawers stored a composed
      display label** ("Vehicle Name · Plate") as the saved entity value
      instead of a real matchable name - fixed both to store the clean
      name directly.
      **Found Documents' entire "Upload Document" flow was already a
      complete, silent no-op before any of this session's changes** - the
      parent never passed an `onAdd` handler at all, so the drawer's own
      pre-existing fallback branch just showed a fake success toast and
      persisted nothing. Restructured to lift real state and wire a real
      handler.
      **Resolved a real status-vocabulary conflict on `LorryReceipt`**: the
      DB comment said one vocabulary (`Issued|InTransit|...`), the LR
      module's 5 real UI files were already built around a different one
      (`Generated|Printed|...`) - made the DB match the UI's working code
      rather than rewrite 5 files, since SQLite doesn't enforce the comment
      as a real constraint.
      **Found `LorryReceipt.customerId`/`goodsDesc` were required columns
      the real form never collects** - made both nullable rather than
      fabricate values or force a form redesign out of scope.
      **Found and fixed a paise/rupee unit-mismatch bug in my own
      Expenses/LorryReceipts work**: both models store money in paise
      while every UI field works in rupees - added explicit conversion at
      the API boundary, verified directly against real SQLite.
      Final cross-module browser sweep (fresh tab, no prior console
      history) across all 14 real-data modules from Tasks 18+19: zero
      console errors, zero server errors.
      WorkOrder/FuelEntry/Inspection/Issue/Reminder/Document/Expense/
      LorryReceipt tables are genuinely empty (never seeded) - flagged, not
      seeded in this pass (same shape of follow-up as `seed-vendors.ts`).

- [x] **Fleet Map - made fully real and verified.** (`worklog.md` Task 20.)
      Confirmed first that positioning only ever needed city-level
      coordinates (real city -> real lat/lng + small deterministic offset),
      never precise GPS, so real `Vehicle.location` was sufficient -
      swapped `VEHICLES`/`TRIPS`/`DRIVERS` mock reads for the real
      `/api/vehicles`/`/api/trips`/`/api/drivers` (read-only, no CRUD
      needed). `GEOFENCES`/breach data deliberately left mock - no real
      geofencing backend exists, out of scope. Verified via console
      (zero errors) and a screenshot: real vehicles plot at real cities
      with real plates, "20 / 20 vehicles - 5 active" matches the real
      fleet exactly.
- [ ] **Reports, Ledger, POD, Quality, Purchase, Financial Ops, Access
      Matrix, Automation, Services, CRM, HR, SuperAdmin, Financial
      Services, Partner Programme still mock-data-backed.** Checked (not
      assumed) that each of the following needs a real schema/architecture
      decision before it can be wired, unlike the 15 modules done so far:
      **Services** - the DB's `ServiceProgram` is one row per
      vehicle-instance, but the UI models it as a reusable *template*
      covering many vehicles (`linkedVehicles` count, a task checklist) -
      genuinely different shapes. **POD** - the real `Pod` model only
      covers the capture moment (signature/photo/GPS); the UI's
      `ProofOfDelivery` (Zustand `persist`) is a much richer
      voucher/submission-workflow record with no DB equivalent yet.
      **Quality, Purchase** - no matching Prisma model exists at all, would
      need new models from scratch. **CRM, HR, Ledger, SuperAdmin,
      Financial Services, Partner Programme** - confirmed Zustand
      `persist(...localStorage...)`-backed, a different architecture than
      `useState(MOCK)` - needs a different wiring approach (replace the
      store's persistence layer), not an `index.tsx`-level fix.
      Not started - the user hasn't yet said which of these (if any) to
      prioritize, and several need a real design decision made first.
- [ ] **~20 third-party integrations still 100% simulated** (payment, SMS/
      WhatsApp, maps, logistics/3PL, government portals) - blocked on the
      user supplying real credentials for whichever specific providers
      they actually use; they've deferred this for now ("none of these
      yet"). Not something Claude can make real without those credentials.

## New standing directive: match the DB to the UI, not the reverse

User instruction (2026-08-07): "you have to match UI to the Database, not
database to UI. if there is no database according to UI create it." This
reverses the LorryReceipt-style resolution used earlier and directly
overrides the "flagged, needs a decision" deferral above for Services, POD,
Quality, Purchase - the instruction **is** the decision: build the real
schema to cover what the UI already needs, don't adapt the UI down and
don't skip the module. Applies going forward to all remaining mock/
localStorage-backed modules.

Also requested in the same message, not yet started except where marked:
Rean tied into the self-learning/activity-logging system; Rean generating
dynamic/personalized alerts, placeholders, and feedback text; Rean choosing
table-vs-text response format based on what's clearest; a wider chat
drawer; working desktop calling/video/screen-share; and real (not dummy)
behavior across the other user roles.

- [x] **Chat drawer widened** (`chat-panel.tsx`) from `max-w-md` (448px) to
      `max-w-3xl` (768px).
- [x] **Desktop calling was genuinely missing, not just untestable** - the
      full-screen chat module (`chat-conversation.tsx`) had zero call UI at
      all; only the compact drawer had it. Extracted the call logic/overlay
      into a shared `chat-call.tsx` (`useChatCall` hook + `ChatCallHeaderButtons`/
      `ChatScheduledCallsBar`/`ChatCallOverlay`, `conv` made nullable so hook
      order stays stable before the module's own "no conversation selected"
      early return) and wired it into both surfaces. Verified live: video
      call overlay renders correctly in the full chat module with working
      mute/camera/screen-share/end-call controls. Also found and fixed a
      dishonest "Add participant" button that looked clickable but had no
      handler (no group-calling backend exists) - now permanently disabled
      with an honest "not yet supported" label instead of a fake affordance.
- [x] **Driver Field App was showing fully fake, hardcoded trip data** -
      `driver-store.ts`'s identity defaulted to a hardcoded `driverId:
      "drv-23"`, and `_helpers.ts`'s `useDriverTrips`/`useActiveTrip` filtered
      `mock-data.ts`'s static `TRIPS` array by it. Every driver-role login
      (regardless of which real seeded user actually signed in) saw the
      exact same fake trip. Worse: the real seeded `Driver` rows
      (`seed-business-data.ts`, 15 drivers) had zero link to the real seeded
      `User` accounts (`seed-users.ts`) - "Kuldeep Singh" the login user and
      any real `Driver` record were two unconnected identities.
      Fixed with a new `GET /api/driver/me` that resolves the session user
      to a real `Driver` row by email (self-healing: creates one on first
      login if missing), and - if that driver has zero trips - stages them
      onto 2 real Planned/Active trips borrowed from the pool (a genuine DB
      reassignment, not client-side fabrication) so a fresh login isn't
      empty. `driver-store.ts` gained real `trips`/`tripsLoaded`/`hydrate()`
      state; `_helpers.ts`'s hooks now read real trips from the store
      instead of the mock array. Verified: real Driver row
      `cmsiralbu0003t868hwjvupxm` created for kuldeep.singh@reanzly.in,
      confirmed via direct SQLite query; UI now shows real trip
      `RZ-TRP-2221` (Hyderabad → Mumbai, Crest Manufacturing) instead of the
      old fake `RZ-TRP-0064`.
      **Not yet fixed**: `PERFORMANCE_SCORE` in `driver-field/_helpers.ts`
      is still a static hardcoded constant (safety score, rank-in-fleet,
      achievements) - a real scoring engine wasn't in scope for this pass.
- [ ] **Found: the entire customer/vendor-facing "Vendor Portal" is 100%
      mock data**, a much bigger version of the same bug class -
      `vendor-portal/_helpers.tsx` hardcodes `VENDOR_ID = "vendor-demo-1"`
      and derives every sub-view (Overview, My Shipments, Live Tracking,
      PODs, Analytics, Invoices, Ledger, Documents) from fixed slices of the
      same `mock-data.ts` arrays (`TRIPS.slice(0,8)`, `INVOICES.slice(0,5)`,
      a synthetically-generated ledger). Every customer/vendor who logs in
      sees the identical fixed shipments/invoices regardless of who they
      really are - not wired to real per-customer data at all. Not started;
      flagged as the next high-priority real-data gap, comparable in size to
      the driver-field fix above but broader (needs a real Customer<->User
      link, then real Trip/Invoice/LorryReceipt/Pod/ledger queries scoped to
      that customer across ~9 sub-views).
- [ ] **Found: new-tenant signup is also 100% fake** -
      `app-store.ts`'s `signup()` only pushes a `SignupRequest` to
      client-side/localStorage state and auto-logs the user in via the
      fake, non-server `login()` helper (no real `User`/`Company` row, no
      real session cookie), even though the signup form already collects a
      real password. Distinct from the 17 existing seeded roles (which do
      use real server auth) - this only affects brand-new self-serve
      signups. Not started.
      Also found stale "Demo build · no real credentials are checked"
      disclaimer text on both the App and Field sign-in screens
      (`login-screen.tsx`) - inaccurate now that `loginWithPassword` does
      real scrypt verification against seeded `User` rows; worth a quick
      copy fix independent of the signup backend work.
- [ ] **Role-based audit beyond driver/fleet-manager**: owner, driver and
      fleet-manager are now spot-checked (real login + role-scoped
      dashboard/sidebar confirmed correct for fleet-manager: sidebar
      correctly collapses to Dashboard/Vehicles/Reports/Documents/Chat per
      `ROLE_ARCHETYPES["fleet-manager"].permissions`). 14 roles remain
      unverified (ops-manager, finance-manager, dispatcher, analyst,
      warehouse-manager, customer, broker, safety-officer, mechanic,
      branch-manager, accountant, hr-manager, warehouse-crew, superadmin).
      Also fixed two more instances of the "aliased module id silently
      drops from For Your Role" bug in `role-features.ts`
      (`"financial-ops"` in `owner` and `accountant`'s `featuredModules`).
- [x] **Found: role/permission enforcement is client-side only, not
      server-side** - every API route (`/api/invoices`, `/api/crm/deals`,
      etc.) checks `getSessionUser()` exists and scopes by `companyId`, but
      none check the session user's role against `ROLE_ARCHETYPES[role]
      .permissions` for the module being hit. Confirmed via curl: a
      fleet-manager session (whose sidebar correctly hides Invoices/CRM)
      still gets a real `200` from `GET /api/invoices` and
      `/api/crm/deals` - any authenticated user in a company can read/
      write any module's data by calling the API directly, bypassing the
      sidebar's role gating entirely.
      **Retrofitted** (2026-08-08, user's explicit priority pick): added
      `requireModuleAccess(sessionUser, moduleId)` from `src/lib/
      permissions.ts` (same helper built for the POD/Services/Quality/
      Purchase routes) to every `getSessionUser()` guard across 60 route
      files spanning billing, crm, customers, documents, drivers, expenses,
      fuel-entries, hr, inspections, invoices, issues, lorry-receipts,
      payroll, reminders, trips, vehicles, vendors, work-orders. Applied
      via a scripted batch pass (verified 1:1 guard-to-check count per
      file, zero new `tsc` errors) then confirmed live: fleet-manager now
      gets a real `403` from `/api/invoices` and `/api/crm/deals` (was
      `200`), owner's `"*"` wildcard still reaches everything, driver still
      reaches `/api/trips` (has it) but not `/api/vendors` (doesn't).
      **Deliberately excluded, two separate pre-existing gaps, not
      silently ignored:**
      - `/api/broker/*` (12 files) - doesn't use `getSessionUser()` at all;
        resolves identity via `getDefaultBrokerProfileId()` instead (an
        older, single-tenant-style pattern from the earlier broker-network
        build). Needs its own real per-session auth before a permission
        check on top of it would mean anything.
      - `/api/integrations/*` (4 files) - takes `companyId` as a client-
        supplied query param instead of deriving it from the session at
        all, a real tenant-isolation gap (not just a missing role check).
      Both need their own dedicated real-auth pass, not a bolt-on
      permission check.
- [x] **Built real DB-first schema + CRUD for POD, Services, Quality,
      Purchase** - all 4 previously mock/missing-model modules now have
      real Prisma models (`Pod` extended to match the full
      `ProofOfDelivery` UI shape + `PodAuditEntry`; `ServiceTemplate` new,
      `ServiceProgram` extended with `templateId` to link per-vehicle
      instances back to a template; `QualityCheck` new; `PurchaseOrder`
      new - nested collections as JSON-stringified columns, matching the
      existing `documentsJson`/`argsJson` precedent since this schema has
      no line-item-table precedent even for Invoice), real session/company
      -scoped API routes, and real server-side permission checks via a new
      `src/lib/permissions.ts` (`hasModuleAccess`/`requireModuleAccess`,
      falling back from a cluster-tab leaf id like "quality" to its
      cluster-parent permission like "vehicles" so the check matches what
      the sidebar already grants). Verified via curl (401 unauth, 403
      wrong-role, 201 create with correct paise math) and a live browser
      pass logged in as owner - all 4 render real records, and PATCH
      actions (POD submission status, Quality Cancel Check, PO Cancel PO)
      round-trip through the UI into the DB and back.
      Found and fixed a real bug during this pass: the Purchase module was
      completely unreachable from the UI. `CLUSTER_BY_MODULE` in
      `router.tsx` is built by flattening every cluster into one `Map`
      keyed by module id; `"vendors"` was a member of both its own 2-tab
      `[vendors, purchase]` cluster and the later-defined CRM cluster, so
      the CRM cluster silently won the Map collision and Purchase's tab
      strip never rendered, with no sidebar entry either. Fixed by folding
      Purchase into the CRM cluster as a tab alongside Vendors and
      removing the colliding standalone cluster.
      Also flagged, not built (Tier-2, explicitly out of scope for this
      pass): a "link service template to vehicle" flow, so the Service
      Due tab's real `ServiceProgram` (per-vehicle instance) query
      currently returns an honest empty list rather than fabricated rows.
- [x] **Rean's local engine was answering from frozen mock data, not the
      real database** - all 12 intent handlers in `local-engine.ts`
      (invoices, revenue, trips, fleet, fuel, issues, compliance, drivers,
      recommendations, anomalies, greeting, fallback) read from
      `mock-data.ts`'s static arrays (`INVOICES`, `TRIPS`, `VEHICLES`,
      `REAN_RECOMMENDATIONS`, `REAN_ANOMALIES`, etc.) - a snapshot frozen
      before this session wired the real app to the DB, so a create/update/
      delete anywhere else in the app was invisible to Rean. Rewrote every
      handler as a real, companyId-scoped Prisma query via a new
      `src/lib/slm/live-data.ts` (`computeKpis`/`computeAnomalies`/
      `computeRecommendations` - real aggregates: overdue invoices, flagged
      fuel entries, critical/high issues, expiring/expired documents,
      vehicle status counts). `answerLocally()` is now async (`client.ts`,
      `slm/chat/route.ts`, `rean/route.ts` updated to `await` it and pass
      `companyId`). Verified via authenticated curl: "how many vehicles are
      idle" → real count (5); "show idle vehicles" → real vehicle
      names/plates/cities; "any anomalies" → real overdue invoice numbers
      (RZ-INV-21454, RZ-INV-21490) threaded through into the LLM's
      paraphrase, proving the grounding data reaching the model is real,
      not scripted.
- [x] **Rean now chooses table vs. plain-text format** instead of always
      rendering a markdown table. Added `formatQueryResult()` in
      `db-tool.ts`: a single-record result reads as one sentence ("Vehicle
      — Plate: X · Status: Y · Location: Z."), multiple records still
      render as a table (the case tables genuinely help - comparing the
      same columns across rows). Wired into `/api/rean`'s table-lookup
      branch. Verified: a 5-row and a 10-row real query both correctly
      rendered as tables.
- [ ] **Rean self-learning tie-in (real activity logging / vector index)
      and dynamic personalized placeholders/alerts beyond the format fix
      above** - not started. Rean's RAG layer (`rag.ts`, `self-learning.ts`)
      remains brute-force cosine similarity, no real vector index, and
      `AuditLog` essentially unused (one narrow write path, never read
      back). The chat panel's search bar already had rotating witty
      placeholders (`savage-placeholders.ts`, pre-existing) - not the same
      as role/data-personalized content, which is still open.
- [x] **Real DB-first schema for POD, Services, Quality, Purchase** - done,
      see the completed entry above (search "Built real DB-first schema +
      CRUD for POD, Services, Quality, Purchase").

## Sidebar/navigation restructure (2026-08-07)

User directive: modules stuck in the "More" overflow drawer should be tabs
inside an existing page, not independent top-level features; the sidebar
format should be restructured and made customizable; App Store and
Integrations should be one thing (connecting third-party tools, data in and
out, MCP-style), not two.

- [x] **Vehicle-lifecycle cluster (8 modules) folded into Vehicles as tabs.**
      Inspection, Issues, Maintenance, Workshop, Services, Fuel & Energy,
      Compliance, Quality used to each be a separate sidebar/"More"-drawer
      entry - 8 nearly-indistinguishable pages cluttering the drawer (2 of
      them, Workshop and Financial Ops, weren't even reachable from any nav
      at all - a pre-existing bug). Built a reusable
      `src/components/shared/module-cluster-tabs.tsx` shell and wrapped
      these 9 `ModuleId`s in `router.tsx` with it - deliberately does NOT
      touch any of the 8 modules' internals (their own real, already-CRUD-
      wired list/detail/create routing stays on `activeView.module`
      unchanged); the shell only adds a shared tab strip that calls the
      existing `navigate(moduleId)`. Removed all 8 (well, 7 - Workshop was
      never in the sidebar to remove) from `sidebar.tsx`'s SECONDARY_GROUPS
      Compliance group and deleted that now-empty group; moved Reminders
      (not part of the cluster) into Intelligence. Fixed 4 roles'
      `featuredModules` in `role-features.ts` (ops-manager, fleet-manager,
      safety-officer, mechanic) that referenced the now-removed ids and
      would have silently dropped from "For Your Role" otherwise - repointed
      to "vehicles". Verified live: clicking the Vehicles sidebar entry
      shows all 9 tabs (Overview/Inspection/Issues/Maintenance/Workshop/
      Services/Fuel & Energy/Compliance/Quality); clicking "Inspection"
      switches the tab and renders its real content underneath; zero
      console errors on a fresh tab.
- [x] **App Store merged into Integrations.** User clarified: not a second
      "marketplace" concept - one place to connect third-party tools, MCP-
      style, pulling their data in and pushing Reanzly's data out. Removed
      "App Store" from the sidebar's Ecosystem group; `router.tsx`'s
      `case "app-store"` now renders `IntegrationsModule` (same alias
      pattern already used for `financial-ops` -> `ledger`) so old deep-
      links don't 404. Updated the Integrations sidebar description to state
      the bidirectional-data-flow framing explicitly. Did NOT delete the
      underlying module-provisioning mechanism (`authUser.selectedModules`,
      `toggleModuleProvisioned`, `ProvisionedGate`) - just removed its
      dedicated top-level page, since nothing else in the request called for
      ripping out that capability.
- [x] **Customizable sidebar: drag-to-reorder.** Added `sidebarOrder: Record
      <string, ModuleId[]>` + `setSidebarGroupOrder()` to `app-store.ts`
      (zustand-persisted). Built `SortableNavButton` in `sidebar.tsx` using
      the same `@dnd-kit` pattern already proven in the Dashboard's widget
      reordering (PointerSensor/TouchSensor/KeyboardSensor, `useSortable`) -
      a small grip handle next to each primary nav item, not the whole row,
      so a plain click still just navigates. Each PRIMARY_GROUPS group is
      independently reorderable and persists across reloads.
      **Caught and fixed a real bug during verification**: `applyOrder()`'s
      first draft used `new Map(...)` - but `Map` is also the name of the
      lucide-react icon imported for the "Fleet Map" nav item, shadowing the
      global `Map` constructor in this file, so any group with a saved order
      crashed with "Map is not a constructor" the moment a user actually
      reordered something. Found via a real reload with a saved order set
      (not just code review), fixed by rewriting the position lookup as a
      plain object instead of a `Map`. Re-verified: setting
      `sidebarOrder.Fleet = ["lorry-receipts","vehicles","fleet-map","trips"]`
      directly and reloading correctly re-rendered the Fleet group in that
      exact order, zero console errors.

## Second More-drawer sweep (2026-08-07, same day) - 8 clusters, ~15 modules moved

User pasted the live "All Modules" drawer contents and asked to move
everything out into existing pages as tabs wherever they genuinely fit.
Extended `CLUSTERS` in `router.tsx` (same shell pattern as the Vehicles
cluster - no target module's internals touched) with 7 more clusters:

- [x] **Invoice**: + Rate Cards tab (pricing feeds billing).
- [x] **Vendors**: + Purchase tab (POs are vendor-facing spend).
- [x] **Settings**: + Subscriptions, Access Matrix, Automation, System
      Design tabs (all four are org-configuration surfaces, not separate
      operational features).
- [x] **CRM**: + Helpdesk, Marketing, Surveys tabs (all customer-relationship
      surfaces).
- [x] **Operations Hub**: + Field Service, Planning tabs (dispatch/capacity,
      same audience).
- [x] **Expenses**: + Approvals tab (approvals most commonly gate spend).
- [x] **Documents** (promoted out of the More drawer into the primary
      Operations sidebar group, since it's a company-wide vault with no
      single owning module - not tabbed under an arbitrary parent): + 
      Document Studio ("Studio"), Knowledge Base, Reminders tabs.

Fixed 4 more role-features.ts `featuredModules` references to now-removed
ids (finance-manager/broker: rate-cards -> invoice; analyst: system-design
-> settings; hr-manager: reminders -> documents) - same class of fix as the
Vehicles-cluster pass.

Left as-is deliberately (no single clean existing-page parent, or already
fine): Reports (cross-cutting, stays in the shrunk Intelligence group -
shows in "For Your Role" for owner instead), Chat (already globally
reachable via the floating button), Superadmin/Broker Network (separate
gated portals), Partner Programme/Financial Services (platform-level, no
operational parent).

Net result: the "More" drawer went from 26 items across 7 groups down to 6
items across 3 groups (Intelligence/Reports, Platform/Chat+Settings+
Integrations+Superadmin, plus the role-gated Broker Network and Ecosystem
groups) - Finance Tools, Service, and Growth groups are gone entirely
(emptied out).

Verified live (fresh tab, zero console errors): clicked through all 8
cluster homes (Vehicles, Invoice, Vendors, Settings, CRM, Operations Hub,
Expenses, Documents) and confirmed each renders its full tab strip with
real content underneath.

## Third sidebar pass (2026-08-07, same day) - eliminate the More drawer entirely

User directive: don't put anything in the More section at all - bring
everything directly into the sidebar; fold Customers/Vendors into CRM;
fold Drivers & Staff/Payroll into HR; don't remove any functionality.

- [x] `SECONDARY_GROUPS` emptied to `[]`; every former secondary group
      (Intelligence/Reports, Platform/Chat+Settings+Integrations+
      Superadmin, Broker Network, Ecosystem/Partner Programme+Financial
      Services) folded directly into `PRIMARY_GROUPS`. The "More" button
      now only renders if `visibleSecondaryGroups.length > 0` (never, until
      something new is deliberately added there again) - code kept rather
      than deleted so a future addition degrades gracefully.
      Added broker-network gating (`isBrokerModule`/`brokerVisible`) to the
      primary-group render path, since Broker Network is no longer
      exclusively a secondary-only concern.
- [x] **CRM cluster** extended: Customers and Vendors added as tabs
      (alongside the earlier Helpdesk/Marketing/Surveys) - both keep their
      own real, independently CRUD-wired module components unchanged.
      Removed as separate People-group sidebar entries.
- [x] **New HR cluster**: Drivers & Staff and Payroll added as tabs. Removed
      as separate People-group sidebar entries.
- [x] Fixed 3 more `role-features.ts` `featuredModules` references to the
      now-removed ids (branch-manager: drivers-staff -> hr; hr-manager:
      drivers-staff -> hr) - same fix class as every prior cluster pass.
- [x] Verified live (fresh tab, zero console errors): sidebar groups are
      now `Operations, Fleet, Finance, People, Platform, Ecosystem` (+
      role-gated `Broker Network`) with NO More button; People shows only
      `CRM, HR`; CRM cluster shows all 6 tabs with real Customer data (10
      records) under the Customers tab; HR cluster shows all 3 tabs with
      real Drivers & Staff data (16 records) under that tab.

## CRM made fully real (2026-08-07, same day)

Audited what's actually fake after the sidebar restructures above (user
asked "check what's fake/dummy/broken"): Customers/Vendors/Drivers & Staff
were already real; **CRM was 100% Zustand+localStorage** (zero real API
calls); **HR same**; **Payroll worse** - pure in-memory `useState`, doesn't
even survive a reload. Found real, completely unused Prisma models already
existed for all of it (`Lead`, `Deal`, `CrmContact`, `CrmActivity`,
`Employee`, `AttendanceRecord`, `LeaveRequest`, `PayrollRun`, `Payslip`,
`HrPosition`, `Candidate`) - the schema design work was already done,
nobody had wired it up.

- [x] **CRM fully converted to real, database-backed CRUD.** Extended
      `Customer` with CRM-specific fields (`crmType`, `lanes`,
      `contractStatus`, `onboardingDate`, `notes`) rather than maintaining a
      separate fake "Account" concept - CRM's Accounts tab and the
      Customers module are now the same real Customer row, just two
      different column presentations (same principle as
      Vehicle-cluster/HR-cluster: one real record, multiple views).
      Extended `Lead`/`Deal`/`CrmContact`/`CrmActivity` with the display-code
      fields (`leadId`/`dealId`/`contactId`/`activityId`) and few missing
      columns (`Lead.city/notes`, `Deal.company/contactId/lane/winReason`,
      `CrmContact.linkedIn`, `CrmActivity.durationMinutes`) needed to fully
      cover the existing UI - matching the standing "match DB to UI"
      directive.
      Built 5 real API route pairs: `/api/crm/{leads,deals,contacts,
      activities,accounts}` (GET/POST) + `/[id]` (PATCH[/DELETE]),
      session-scoped, tenant-isolated, same pattern as every other real
      module this session. `Deal.value` follows the paise-storage
      convention (Expense/LorryReceipt precedent) with rupee conversion at
      the API boundary.
      **Caught a real vocabulary mismatch before it shipped**: my first
      draft defaulted `Deal.stage` to `"NewLead"` (no space) but the
      frontend's real, working `DealStage` type uses `"New Lead"` (with a
      space) - fixed to match the UI's real vocabulary rather than the
      other way around.
      Rewrote `crm/_store.ts` to fetch/mutate against these real endpoints
      instead of local+persisted state, keeping the same public field/
      mutator names so the 4 consuming components needed minimal changes -
      only the create/update mutators became `async`, returning the real
      created/updated record (or `null`/`false` on failure) instead of a
      synchronous void that always claimed success. Updated
      `leads.tsx`/`contacts.tsx`/`activities.tsx`/`pipeline.tsx` to
      `await` and only show a success toast on genuine success.
      **Found and fixed a real redundant-write bug while wiring
      pipeline.tsx**: `handleMove` called both `moveDealStage()` and
      `updateDeal()` back to back for the same drag-drop action - two PATCH
      requests where one combined update suffices.
      **Verified fully end-to-end**: 5 real authenticated POSTs (lead,
      deal, account, contact, activity) all succeeded and were confirmed
      directly in SQLite; reloaded the CRM module in-browser and the real
      deal appeared correctly on the Pipeline board (₹12.50L value, 20%
      probability, correct stage column, correct owner/lane) - not just a
      JSON response, the actual rendered UI. Zero console errors throughout.
- [ ] **HR and Payroll still fake** - not started this pass. Real schema
      exists and is ready (`Employee`, `AttendanceRecord`, `LeaveRequest`,
      `HrPosition`, `Candidate` for HR's Employees/Attendance/Leave/
      Recruitment/Onboarding tabs; `PayrollRun`/`Payslip` for at least
      Payroll's Cycles/Payslips tabs) - same conversion pattern as CRM
      applies, just a larger surface (HR has 10 sub-tabs, Payroll has 7).

## HR made real + real Billing/Payment screen (2026-08-07, same day)

- [x] **HR's core 6 entities converted to real, database-backed CRUD**,
      same pattern as CRM: Employees, Attendance, Leave, Positions +
      Candidates (Recruitment), and Payroll Runs + Payslips. Extended
      `Employee` with ~20 real fields the UI already collected but silently
      discarded (phone/email/city/gender/dob/bank details/leave balance/
      skills/documents-as-real-JSON/assets-as-real-JSON etc.), extended
      `HrPosition` with a display code + description, extended `Payslip`
      with `otherDeduct`. Built 7 real API route groups
      (`/api/hr/{employees,attendance,leave,positions,candidates,
      payroll-runs,payslips}`).
      **`POST /api/hr/payroll-runs` generates a real payroll run**: pulls
      every real active Employee, computes basic/HRA/PF/ESI/PT from their
      real stored comp fields inside a single DB transaction, and creates a
      real Payslip per employee - not a scripted mock figure. Verified: ran
      payroll for a real employee (₹4.8L CTC) and got the exact expected
      gross/deduction/net figures, confirmed in SQLite.
      **Caught two more vocabulary mismatches before they shipped** (same
      class of bug as `Deal.stage` earlier): `Employee.status` needed
      `"On Leave"` (with a space) not `"OnLeave"`, and `HrPosition.status`
      needed `"On Hold"` not `"OnHold"` - both found by reading the real
      frontend types before wiring, not after a broken request.
      Rewired `hr/_store.ts`: added `hydrate()` + `loaded` gate for the 6
      real entities, converted their mutators to async (return the real
      record or `null`/`false`), added `partialize` so real fields are
      never shadowed by a stale localStorage copy on reload. Left the
      other ~13 entities (attendanceRegs/compOff/holidays/compliance/
      interviews/offers/performanceReviews/pips/onboarding/exit/
      docRequests/issuances/auditLog) as the original mock/localStorage
      slice - real schema doesn't exist for them yet, explicitly flagged
      rather than silently left half-converted.
      Verified live: HR Overview showed real "HEADCOUNT 1" / "PENDING
      LEAVES 1" after creating real records via curl; Employees tab showed
      "TOTAL EMPLOYEES 1"; zero console errors.
- [ ] **Standalone Payroll module still fake** - `src/components/modules/
      payroll/` (Cycles/Payslips/Structures/Reimbursements/Loans & Advances/
      Bank Advice/Statutory, reached as the "Payroll" tab inside the HR
      sidebar cluster) is a *different*, still-untouched codebase from the
      `hr/payroll.tsx` view just made real - pure in-memory `useState`,
      doesn't survive a reload. Not started this pass; same conversion
      pattern applies (`PayrollRun`/`Payslip` now have real routes it could
      reuse for Cycles/Payslips; Structures/Reimbursements/Loans/Bank
      Advice/Statutory would need new schema).
- [x] **Real "Billing & Plan" settings page** - the "Add payment method"
      trial banner used to just redirect to Settings' default Profile tab
      with no billing surface behind it at all. Found real, completely
      unused `Plan`/`Subscription`/`PlatformInvoice` platform-layer models
      already in the schema; added a new `PaymentMethod` model
      (deliberately stores ONLY brand/last-4/expiry/holder name - never a
      full card number or CVV, since a real charge needs a real payment
      gateway integration, out of scope per the standing "don't touch
      third-party API keys" constraint - this models "a card is on file",
      not a working charge path, the same safe pattern every real billing
      UI uses). Seeded 3 real Plans (Starter/Growth/Enterprise) +
      a real Trial Subscription for the demo tenant
      (`src/scripts/seed-billing.ts`). Built `/api/billing/{subscription,
      plans,payment-methods}` with server-side rejection of anything that
      looks like a full card number (defense-in-depth beyond just "the
      client form only asks for 4 digits"). Built the real
      `Settings > Billing & Plan` section (new `SettingsTab`) with a plan
      picker and payment-method list, wired the trial banner's action
      (`actionSettingsTab`) to land directly on it instead of Settings'
      generic default tab.
      Verified live end-to-end: clicked the real "Add payment method"
      banner button and landed directly on Billing & Plan showing the real
      seeded Trial/Growth subscription; added a real Visa card via curl -
      server correctly rejected a 16-digit "full card number" attempt with
      a clear error; changed plan to Enterprise via curl; reloaded and the
      browser showed the real updated plan (₹79,999/mo, 500 vehicles/200
      users/100GB) and the real card ("VISA •••• 4242 DEFAULT · Vikram
      Deshmukh · Expires 12/2028") - not a mock, the actual persisted
      record. Zero console errors throughout.

## Standalone Payroll module made real (2026-08-07, same day)

- [x] **Core of the standalone Payroll module (Overview, Pay Cycles,
      Structures, Payslips) converted to real, database-backed CRUD.**
      Previously this entire module read directly from hardcoded const
      arrays imported from `_helpers.tsx` (`PAY_CYCLES`, `PAYSLIPS`,
      `SALARY_STRUCTURES`, its own separate `EMPLOYEES` roster disconnected
      from HR's real employees) - not even `useState`-wrapped at the
      module level in `index.tsx`, just raw imports used directly for the
      KPI header.
      Added a new `SalaryStructure` model (real pay-grade templates:
      basic/DA/HRA %, PF/ESI/PT/TDS applicability) and linked `Employee`
      to it via `structureId`. Extended `PayrollRun` with
      `cycleNo`/`locked`/`employerContribTotal`/`runBy`/`remarks` and
      `Payslip` with `payslipNo`/`da`/`medicalAllowance`/
      `specialAllowance`/`statutoryBonus`/`employerPF`/`employerESI`/
      `presentDays`/`lopDays` - matching the standalone module's real,
      richer UI shape (same "match DB to UI" standing directive).
      Built `/api/payroll/{structures,cycles,payslips}` (+ `[id]` routes).
      **`PATCH .../cycles/[id]` with `action: "run"` does real Indian
      payroll math**: basic/DA/HRA as % of monthly CTC (the exact formula
      `structures.tsx` itself already displayed to users), special
      allowance as the true remainder, real PF (12%/13.33% employer)/ESI
      (1.75%/4.75%)/PT, inside one DB transaction that deletes and
      regenerates that cycle's real Payslip rows from the company's real
      Employees + their real linked SalaryStructure.
      `action: "advance"` steps a cycle through its real status machine
      (Draft→Processing→Approved→Disbursed), cascading the real status to
      every payslip in that cycle exactly like Approve/Disburse did before,
      just against real rows now.
      Rewired `cycles.tsx`/`structures.tsx`/`payslips.tsx`/`overview.tsx`/
      `index.tsx` off the static imports onto real fetch + a `loaded` gate;
      all mutators are now async, returning the real record or a real
      error instead of a synchronous always-succeeds local update.
      **A required-field schema addition briefly blocked the push** - my
      own earlier HR verification had left one real test PayrollRun/
      Payslip row in the DB, and the new `cycleNo`/`payslipNo` unique
      columns couldn't be added as required without a default while rows
      existed. Deleted those 2 disposable test rows (my own verification
      artifacts, not user data) rather than force-resetting the database.
      **Verified fully end-to-end, by hand**: created a real Salary
      Structure (₹4.8L CTC, 40/10/20% basic/DA/HRA) via curl, created a
      real cycle, linked a real employee to the structure, ran payroll -
      the real generated payslip's basic/HRA/DA/gross/deductions/net
      (₹16,000/₹8,000/₹4,000/₹40,000/₹2,120/₹37,880) and employer PF
      (₹2,133) matched hand-calculated expected values exactly. Clicked
      "Approve" in the live UI and confirmed in SQLite that both the real
      cycle AND its real payslip flipped to "Approved" together. Reloaded
      and confirmed Overview/Pay Cycles/Payslips/Structures all show
      consistent real numbers (1 cycle, 1 payslip, 1 structure, ₹42.1K
      payroll cost, ₹37.9K net payable). Zero console errors throughout.
- [ ] **Statutory Returns, Bank Advice, Reimbursements, Bonuses, Loans &
      Advances still fake** - not started this pass, deliberately scoped
      out given their size (5 more sub-tabs, each needing its own new
      Prisma model - filing/challan tracking, NEFT/RTGS advice generation,
      expense-reimbursement approval flow, bonus computation, loan
      amortization schedules). The Payroll Overview/footer counts for
      these still read the original mock arrays and are visually flagged
      as such in the code, not silently presented as real.

## RBAC retrofit, CI/CD stability, UI bug sweep, Vendor Portal made real (2026-08-08)

- [x] **Server-side RBAC retrofit across 60 API routes / 18 modules.** Root
      cause: every route checked `getSessionUser()` + `companyId` scoping but
      never checked role permissions, so a Fleet Manager (or anyone) could
      read/write any module's data by calling the API directly, bypassing the
      client-side nav gating entirely. Added `requireModuleAccess()` (with a
      `MODULE_PARENT` fallback map for cluster-tab children, e.g.
      `quality→vehicles`) to every route in billing, crm, customers,
      documents, drivers, expenses, fuel-entries, hr, inspections, invoices,
      issues, lorry-receipts, payroll, reminders, trips, vehicles, vendors,
      work-orders. Verified 1:1 guard-to-check count across all 60 files
      (zero mismatches).
- [x] **CI/CD pipeline hard-failing repeatedly, per explicit user request to
      stop it "crashing again and again."** Two independent causes: (1)
      `aquasecurity/trivy-action@v0.28.0` transitively pinned a deleted
      `setup-trivy@v0.2.1` tag, failing every run at "Set up job" in
      seconds — bumped to `@v0.36.0`. (2) The deploy job hard-failed the
      whole pipeline whenever the SSH deploy host was unreachable (confirmed
      `dial tcp ***:22: i/o timeout` in the actual run log) — added a TCP
      reachability probe with retries before the deploy step, made the
      deploy step `continue-on-error` gated on that probe, and added an
      always-passing summary step. The pipeline now degrades gracefully
      instead of hard-failing when the deploy target is unreachable.
- [x] **Autocomplete/search dropdowns vanishing immediately on open** (every
      combobox across the app). Root cause: a custom `onBlur` handler
      scheduled `setOpen(false)` on ANY blur, including the normal focus
      transfer from the trigger button into the popover's own search input
      that Radix does automatically on open. Deleted the handler — Radix's
      native outside-click/Escape dismissal already covers the real
      "user clicked away" case. Verified live.
- [x] **Dead "Columns" button on ~106 of ~116 data tables** — it always
      rendered even with zero hideable columns, opening a dropdown that just
      said "No hideable columns." Now conditionally rendered based on
      `columns.some(c => c.hideable)`. Verified live.
- [x] **Chat section UI/UX bugs**, all verified live: (1) chat-service
      (port 3003, where Rean's real-time auto-reply pipeline lives) wasn't
      running — wired permanently into `bun run dev` via `concurrently` so
      it always starts alongside Next.js. (2) Rean's Sparkles icon dead in 4
      components due to a stale `conv.id === "c4"` mock-id check (real
      conversations get cuids) — fixed to `conv.participants.includes
      ("rean")`. (3) Chat composer placeholder showed both DM participants'
      names ("Message A & B") instead of just the other person — fixed to
      resolve the correct other-participant name. (4) "Both chats showing
      under user1's UI" — investigated via a live two-tab test and found to
      be standard single-cookie-jar browser behavior (both tabs share one
      session), not an app bug; server-side isolation (session auth, socket
      room joins gated by `isParticipant()`) was confirmed correct.
- [x] **"Switch Demo Role" not actually switching access** — root cause:
      the client-side `setRole()` only mutated display state, never the real
      session cookie, so real API calls (especially with RBAC now live)
      kept authenticating as whoever was actually logged in while the
      sidebar showed a different role's nav. Replaced with a real
      `POST /api/auth/switch-role` that calls `destroySession()` +
      `createSession()` against the real seeded User row for that role,
      then reloads. Verified live via `/api/auth/me` reflecting the new
      identity.
- [x] **Vendor Portal converted end-to-end from mock data to real,
      database-backed functionality** (explicit user correction mid-task:
      "don't remove the dummy data... make that functionality working,
      create the db, connect it, make it working like real functions" —
      i.e. build the real backing, don't just delete the mock). Added
      `LedgerEntry`, `Rfq`, `SupportTicket`/`TicketMessage` models plus a
      `Customer.userId` → `User` link (the "log in as this customer" portal
      identity), extended `Customer` with portal-profile fields. Built all
      11 `/api/vendor-portal/*` routes (overview, shipments, tracking,
      invoices, pods, documents, ledger, profile, analytics, rfqs +
      `[id]` PATCH, tickets + `[id]/messages` POST) and rewired all 11
      frontend components off the `_helpers.tsx` mock arrays onto real
      fetches, with the RFQ quote-submit and support-ticket-reply/create
      actions as genuine writes (not client-only state). Two real bugs
      caught before shipping: (1) assumed Invoice/Trip/Customer amounts
      were paise-stored (matching the Expense/PurchaseOrder convention
      established earlier this session) — a direct SQLite query showed
      they're actually stored in plain rupees, which would have shown
      ₹354.00 instead of ₹35,400 on screen; corrected before it shipped.
      (2) `Document.entityId` for Customer/Vendor documents stores the
      entity's *name*, not its id (confirmed by reading `/api/documents`'
      own code comment) — the vendor-portal documents route queries by
      `entityId: customer.companyName`, not `customer.id`. Also fixed a
      pre-existing React duplicate-key warning in `vendor-rfq.tsx` /
      `vendor-support.tsx` (two sibling detail sheets both defaulted to
      `key="closed"` when neither was open). Cleaned up all now-dead mock
      exports from `_helpers.tsx` (verified zero remaining references
      first). Verified live end-to-end logged in as the real linked
      Customer ("Pinnacle Trading Co"): all 11 tabs load with real data;
      submitted a real RFQ quote (PATCH) and confirmed it survived a full
      page reload; sent a real support-ticket reply and confirmed the real
      message thread updated; edited and reverted a real profile field via
      PATCH. Zero console errors, zero new TypeScript errors (30
      pre-existing/unrelated errors unchanged before and after).

## Broker + Integrations real-auth retrofit (2026-08-09)

- [x] **`/api/broker/*` (12 routes) had zero real auth.** Every route operated
      on a single global "default" BrokerProfile via `getDefaultBrokerProfile()`
      — no session check, no per-broker scoping, `[id]` PATCH/DELETE routes
      didn't even verify the row belonged to the caller. Fixed properly, not
      just patched: added `BrokerProfile.userId` (unique, links to the real
      "broker" demo User — Faisal Ahmed — mirroring the `Customer.userId`
      pattern from the Vendor Portal work), added `getSessionBrokerProfile()`/
      `requireBrokerProfile()` to `src/lib/broker.ts` replacing the old
      global-default lookup, added `getSessionUser()` + `requireModuleAccess()`
      (against `broker-console`/`broker-marketplace`/`broker-settlements`,
      matching the sidebar's 3-tab split) to all 12 routes, and added
      ownership checks (`existing.brokerProfileId !== profile.id`) to every
      `[id]` route that was missing one. Backfilled the seeded demo profile's
      `userId` link.
- [x] **`/api/integrations/*` (3 of 4 routes) trusted a client-supplied
      `companyId` with zero session verification** — any caller could read,
      create, edit, or delete another tenant's integration connections
      (including provider labels and sync status) by passing a different
      `companyId` query param or body field. Fixed: added
      `getSessionUser()` + `requireModuleAccess(sessionUser, "integrations")`
      to all 4 handlers in `route.ts` and the ownership-checked `[id]`
      routes; a client-supplied `companyId` is now silently ignored and
      replaced with the verified session's own `companyId`, except a
      superadmin session may explicitly request the `PLATFORM` scope.
      `webhook/[providerId]/route.ts` deliberately left public — it's the
      receiver external providers call, authenticated by provider signature,
      not user session.
- [x] **Found and fixed a real bug while verifying the above**: `PUT
      /api/integrations` (and, it turned out, `POST` too) threw
      `TypeError: ... is not a function` / `is not iterable` on
      `ALL_PROVIDERS`/`SEED_CONNECTIONS`. Root cause: `_data.ts` and
      `logistics-providers.ts` (pure data/types, zero React APIs) were both
      marked `"use client"`, which broke array access when imported into a
      server-only Route Handler under Turbopack's client/server boundary —
      `.find()` and spread threw, though the arrays otherwise round-tripped
      as JSON so paths that only re-serialized them (e.g. the connections
      GET) didn't notice. Removed the unneeded directive from both files.
      Verified: `PUT` now inserts 17 real seed connections; `POST` with a
      valid provider succeeds (201) instead of 500.
      Note: the Integrations module's own frontend (`index.tsx`) isn't wired
      to this API at all yet (still fully local-mock-driven, confirmed via
      network trace) — this pass makes the backend correct and secure for
      whenever that wiring happens, with zero live-UI risk today.
- [x] **Verified live, end-to-end, via direct authenticated fetch calls**
      (both frontends are backend-only right now, so this is the right
      verification method): unauthenticated calls → 401 on both broker and
      integrations; a role with no `broker-console`/`integrations`
      permission (driver) → 403; the real linked broker session
      (`faisal.ahmed@reanzly.in`) → 200 with real profile + 9 enquiries + 5
      sub-brokers + 5 settlements + 7 ledger entries + 10 lane rates; a
      client-supplied `companyId` for a different tenant was silently
      overridden and the created connection landed under the session's real
      `companyId` instead; PATCH/sync/DELETE on that connection all
      succeeded and respected ownership. Zero new TypeScript errors, zero
      new ESLint errors.

## Dashboard module converted from mock data to real DB aggregation (2026-08-10)

- [x] **Every KPI/list/chart widget on the Dashboard rewired off mock-data.ts
      onto one real aggregation endpoint.** The Dashboard is the first
      screen every role sees, and its 89 widget render functions
      (~3,500 lines across `widget-registry.tsx`) all computed their
      numbers from `KPI_STATS` and other mock arrays, plus a
      `scopeFactor()`/`scopedCount()`/`scopedSlice()` helper that faked the
      branch/group/location filter by multiplying real-looking numbers by
      an arbitrary 0.55-0.72 factor - the filter dropdowns visibly changed
      numbers, but none of it reflected real data.
      Built one new `GET /api/dashboard/stats` route that aggregates real
      Trip/Vehicle/Invoice/Issue/Inspection/FuelEntry/WorkOrder/Expense/
      Reminder/Document/Employee/AttendanceRecord/LeaveRequest/PayrollRun/
      HrPosition/Candidate/Customer/BrokerEnquiry/SupportTicket rows
      (all real models built earlier this session) into one payload,
      scoped by the real session's `companyId`. The `location` filter is
      now real (not faked) for the metrics with a genuine location link
      (`Vehicle.location`, `Employee.branchName`) - other metrics show
      their real unscoped total rather than pretending to filter.
      Added `DashboardStatsProvider`/`useDashboardStats()` (React context,
      one fetch shared by every widget on a rendered dashboard instead of
      each widget computing its own slice of mock data) and rewired all 89
      render functions to read from it, preserving each widget's exact
      visual structure - only the data source changed.
      **Honestly flagged instead of faked** where no real backing model
      exists yet (each has a code comment explaining why): parts/SKU
      inventory (2 widgets, warehouse-manager/mechanic), a GST/TDS/bank
      ledger (4 widgets, accountant), platform uptime telemetry and the
      helpdesk-adjacent "Pending Approvals" KPI (2 widgets, superadmin -
      the latter is real but lives in a separate SLM-approvals subsystem),
      a driver-training model (1 widget), and an audit-schedule model (1
      widget) - roughly 10 of 89 widgets. The weather widget stays
      honestly unintegrated (would need a third-party API key, out of
      scope per the standing "don't touch third-party integrations"
      constraint) rather than showing fabricated temperature readings.
      Rean's own recommendation/anomaly widgets (`REAN_RECOMMENDATIONS`/
      `REAN_ANOMALIES`) were deliberately left untouched - they're a
      separate subsystem already tracked under "make Rean dynamic," not
      part of this pass.
      Caught and fixed two real bugs during the conversion itself: a
      React `react-hooks/set-state-in-effect` lint violation in the new
      stats-fetching hook (fixed by deriving `loaded` from a `forLocation`
      comparison instead of a synchronous `setState` at the top of the
      effect), and a progress-meter percentage that could read "175%"
      for the DSO widget at low values (missing an upper clamp).
      Verified live across 4 roles (owner, accountant, mechanic, and a
      fresh incognito-equivalent tab to rule out stale state): every real
      number matched what the same session's other real modules already
      showed (10 active trips, ₹16.3L period revenue, 3 overdue invoices
      totaling ₹12.3L, 20 vehicles at 25% active, 0 fuel spend for a
      tenant with no FuelEntry rows - correctly zero, not fabricated), all
      flagged placeholders rendered as an honest "—" instead of a number,
      and the empty-state copy read correctly ("No parts/inventory module
      yet.", "No payables-aging module yet."). Zero console errors on a
      genuinely fresh tab. Zero new TypeScript errors, zero new ESLint
      errors (fixed the one real lint error the conversion introduced,
      described above).

## Operations Hub converted from mock data to real DB-backed task board (2026-08-10)

- [x] **The Operations Hub kanban board, sprints, and reports rebuilt on a
      real Task/Sprint schema instead of pure client-side state.** Unlike
      Dashboard (which only needed an aggregation endpoint over models that
      already existed), this module had zero DB backing at all: tasks lived
      in a `useState` seeded once from mock-data.ts's `TASKS` array, and a
      `deriveTaskExtras()` helper deterministically hash-derived fake
      sprint/checklist/subtask/comment/attachment content per task id on
      every page load - none of it persisted, and two browser tabs would
      show two different fake realities for the same "task".
      Added 4 new Prisma models - `Sprint`, `Task`, `TaskComment`,
      `TaskAttachment` (`prisma/schema.prisma`) - and 6 real API routes
      under `src/app/api/operations/`: `sprints` (GET/POST), `tasks`
      (GET/POST), `tasks/[id]` (GET/PATCH/DELETE), `tasks/[id]/comments`
      (POST), `tasks/[id]/attachments` (POST, real file upload reusing the
      chat module's content-addressed object-storage pattern), and `meta`
      (real assignee + linked-entity option lists sourced from Employee/
      Driver/Trip/Vehicle/Customer/Invoice - replacing the mock ASSIGNEES/
      TRIPS/VEHICLES/DRIVERS/CUSTOMERS/INVOICES arrays the create-task
      drawer used to read from). `Task.assignee`/`createdBy`/comment
      `authorName` are free-text display names rather than a formal `User`
      relation, matching the existing `Issue.assignee` convention already
      used elsewhere in this schema - not every assignee (e.g. a driver)
      has a `User` row.
      Rewrote all 7 module files (`index.tsx`, `_helpers.ts`,
      `operations-board.tsx`, `task-card.tsx`, `task-create-drawer.tsx`,
      `task-detail-drawer.tsx`, `operations-reports.tsx`) plus two new
      files - `use-operations-data.ts` (fetch + CRUD hook) and the API
      routes above - to read/write real data. The detail drawer's
      checklist/subtask/comment/status mutations each now persist via a
      real PATCH/POST instead of mutating local state; attachments upload
      for real and link to a real `/api/storage/...` URL. Removed the now-
      dead `TASKS` export from `mock-data.ts` and the `deriveTaskExtras`/
      `CHECKLIST_BANK`/`SUBTASK_BANK`/`COMMENT_BANK`/`ATTACHMENT_BANK`
      fake-enrichment code entirely, rather than leaving it unused.
      Added `src/scripts/seed-operations-hub.ts` (idempotent, follows the
      same pattern as `seed-business-data.ts`) seeding 4 real sprints and
      18 real tasks linked to actual Trip/Vehicle/Customer/Invoice rows and
      assigned to actual seeded Driver names, so the board isn't empty on
      first load.
      Caught and fixed the same `react-hooks/set-state-in-effect` shape of
      bug hit during the Dashboard pass - defaulting the sprint filter to
      the real "Active" sprint once sprints loaded was originally a
      `useEffect` + `setState`; fixed by deriving the effective sprint id
      from a `sprintChoice || activeSprint?.id || "all"` expression instead
      of seeding state imperatively.
      Verified live as the owner role: real linked entities (real trip/
      vehicle/customer/invoice names, not fabricated `RZ-TRP-0042`-style
      strings), real driver names as assignees end to end from the create-
      drawer's dropdown through to the board card, checklist toggle
      persisting (1/2 → 2/2 across a drawer close/reopen), a comment
      posted with real session-user authorship ("Vikram Deshmukh · just
      now"), and the Reports tab's 4 charts + 4 KPI tiles computing real
      numbers (12 tasks in view, 20% completion rate, 5.5d avg cycle time)
      from the real task set. Zero console errors on load beyond the
      pre-existing benign dev-server HMR websocket noise. Zero new
      TypeScript or ESLint errors.

## Sequencing reminder

Agreed order with the user: **Stage 1 (SLM) → Stage 2 (Chat) → Stage 3 (Calling)**,
review between each. Currently inside Stage 2/SLM-completion. The user separately
asked for real user accounts + a Rean database tool + calling "all three in
parallel": real accounts + the chat identity-security fix are done and verified;
Rean's database tool is done and verified (7 real scenarios, including two
security-boundary checks); WebRTC calling has a real, verified signaling/
negotiation layer with actual audio/video and screen share still unverified.
All three of the "parallel" workstreams have real, verified progress now - none
are still at zero.
