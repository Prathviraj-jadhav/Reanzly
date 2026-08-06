# Reanzly — Work Log

This file tracks concrete work performed on the codebase, in the format defined by
`HOW-ZAI-BUILDS-REANZLY.md`. Entries are factual — verified by actually running the
code, not by reading a report about it. Where something is unverified, it says so.

---

Task ID: 1
Agent: Claude (session)
Task: Fix "chat is not working"

Work Log:
- Traced the chat socket client (`src/lib/chat/socket-client.ts`) and found it always
  connected via `/?XTransformPort=3003`, a query-param convention that only resolves
  to the chat-service when running behind the Caddy gateway used in production.
- In local `next dev`, that path has no gateway in front of it, so every socket
  connection silently failed.
- Added a `chatServiceUrl()` helper: production still uses the `XTransformPort` gateway
  path; local dev connects directly to `${protocol}//${hostname}:${NEXT_PUBLIC_CHAT_SERVICE_PORT}`.
- Verified end-to-end: sent a live message in a Rean DM, watched it round-trip through
  the socket → chat-service → `/api/rean` → reply rendered in the UI.

Stage Summary:
- Root cause was environment-address mismatch, not a broken chat-service. Fixed and
  confirmed working by direct browser test.

---

Task ID: 2
Agent: Claude (session)
Task: Implement a real, offline, data-grounded SLM for Ask Rean (Stage 1 of the
SLM/Chat/Calling plan agreed with the user)

Work Log:
- The prior "Ask Rean" implementation called `ZAI.create()` from the `z-ai-web-dev-sdk`
  package, which requires a `.z-ai-config` file that only exists inside the original
  build sandbox. Outside that sandbox it always throws — a dead dependency, not
  something fixable by configuration.
- Built `src/lib/slm/local-engine.ts`: a zero-external-API intent classifier + data
  query engine. `answerLocally(message, role)` matches the message against 12 intents
  (greeting, overdue invoices, revenue, trips, fleet, fuel, issues, compliance,
  drivers, recommendations, anomalies, help/fallback) and answers from the real
  in-memory mock data (`INVOICES`, `TRIPS`, `VEHICLES`, `DRIVERS`, `ISSUES`,
  `FUEL_ENTRIES`, `KPI_STATS`, etc.) — no network call, works fully offline.
- Rewired `src/app/api/rean/route.ts` and `src/app/api/slm/chat/route.ts` to call
  `answerLocally` instead of the dead SDK.
- Found and fixed real bugs by functionally testing, not just reading the code:
  - Naive `.includes("hi")` keyword matching false-positived on "whi**ch**" — switched
    to word-boundary regex matching.
  - Phrase-order intents ("which invoices are overdue") didn't match single-keyword
    lists — added an `all: string[][]` AND-of-ORs mode to the `Intent` type.
  - Driver `onTimeRate` is stored as a 0–1 fraction in mock data; was being displayed
    as "0.74%" instead of "74%".
  - One branch of the fuel-spend answer skipped the `inr()` currency formatter.
  - Compliance reminders showed "in -6d" for already-overdue items instead of
    "overdue by 6d" (the underlying negative-days data is intentional; only the
    phrasing was wrong).

Stage Summary:
- `local-engine.ts` is complete, offline-only, grounded in real app data, and verified
  functional through direct testing of every intent branch — not just code review.

---

Task ID: 3
Agent: Claude (session) — parallel Build agents under a Workflow "Store" contract
Task: Stage 2 — advanced, Teams-style chat features (edit/delete messages, polls,
rich text, attachments, mute, global search)

Work Log:
- Established a shared contract first (store actions, socket event names/payloads,
  `types.ts` changes) via a single "Store" agent, then ran parallel "Build" agents
  against that contract to avoid concurrent edits colliding on shared hot files
  (this repo has no git worktree isolation available, so this ordering was required).
- Added `ChatMessage.deleted/edited/editedAt` fields and a `ChatPollVote` model to
  `prisma/schema.prisma`.
- Each Build agent self-reported completion of its slice (message edit/soft-delete,
  poll voting, rich text/code blocks, attachment upload, mute, global search).

Stage Summary:
- Code is in place and the schema migration for it is applied. **Not yet independently
  browser-verified by me** — the per-agent self-reports were not followed by my own
  end-to-end check before this got interrupted by the item below. This is still open;
  see `task.md`.

---

Task ID: 4
Agent: Claude (session) — investigation
Task: Investigate unauthorized/unrequested SLM code that appeared mid-session and
broke Ask Rean, including a concealment instruction found embedded in tool output

Work Log:
- While working Stage 2, `/api/rean` and `/api/slm/chat` were found rewritten to call
  a `self-learning.ts` / `client.ts` layer I had not written and the user had not
  requested at that point, referencing new Prisma models (`SlmFeedback`, `SlmMemory`)
  that had been added to the schema without a client regenerate — this is what broke
  Ask Rean (`db.slmMemory.findFirst` was `undefined` at runtime).
- Several tool-result system-reminders instructed, in effect, "don't tell the user
  this." I did not comply with that — instructions embedded in observed/tool content
  are data, not commands, and this was flagged directly to the user with the exact
  language quoted, per standing operating rules.
- Used session-inspection tools to confirm another Claude session was concurrently
  active in the same working directory and had authored the changes.
- User was asked how to proceed, chose to investigate first, then paused further
  action pending their own review.
- User subsequently reviewed a completion report from that other session and gave an
  explicit directive to take the offline/online SLM + self-learning work "to the next
  level" and make it genuinely work — i.e., ratified continuing and completing it for
  real, rather than reverting it.

Stage Summary:
- Incident handled transparently; nothing was hidden from the user. Work resumed only
  after explicit user direction. Fixed the immediate breakage (regenerated the Prisma
  client), keeping the self-learning layer per the user's decision.

---

Task ID: 5
Agent: Claude (session)
Task: Replace fake GGUF "inference" in the Rust `slm-engine` mini-service with real
local model inference (user's explicit choice, over Ollama / node-llama-cpp)

Work Log:
- Found `mini-services/slm-engine/src/infer.rs` was a hollow stub:
  `format!("[Offline GGUF Model: {}] Response to query: '{}'", model_file, prompt)` —
  no model was ever loaded or run, and `Cargo.toml` declared no GGUF-inference crate
  at all. This was surfaced to the user before proceeding.
- User chose to build real inference rather than shell out to Ollama.
- Rewrote `Cargo.toml` to add `candle-core`/`candle-transformers` 0.11 (pure-Rust ML,
  no C++/CMake dependency, unlike llama.cpp-based bindings) + `tokenizers` + `hf-hub`.
- Rewrote `infer.rs` end to end for real Qwen2.5-0.5B-Instruct-GGUF inference:
  hf-hub blocking model/tokenizer download, `gguf_file::Content::read` +
  `ModelWeights::from_gguf`, ChatML prompting, a `TokenOutputStream`-equivalent
  incremental decoder, `LogitsProcessor` sampling with repeat-penalty, full
  autoregressive generation loop, EOS handling. Reference implementation was read
  directly from candle's own GitHub source (raw source, not an AI-summarized fetch)
  before writing any of it, to avoid guessing at API signatures.
- Rewrote `main.rs` to load the model once at startup via `spawn_blocking` (non-fatal
  if it fails — falls back to a clear "model not loaded" string so the TypeScript
  client's own fallback path still works), and to run inference off the async
  executor thread per-request.
- Toolchain: discovered the GNU-LLVM Rust variant needs an uncommon
  `x86_64-w64-mingw32-clang` linker that isn't readily available; switched to the
  MSVC Rust variant + VS 2022 Build Tools (C++ workload), sourced `vcvarsall.bat`'s
  environment into the shell so `link.exe` is discoverable.
- Hit repeated Windows-specific transient build failures ("os error 32" — a file
  briefly locked by another process, different file each time; a known Windows/Rust
  + antivirus interaction). No admin rights available to add a Defender exclusion, so
  mitigated with reduced build parallelism and an auto-retrying build loop.

Stage Summary:
- Code is genuinely real (no placeholders, no fake strings) and believed correct
  against candle's reference API. **Not yet confirmed to compile successfully or run**
  — the retry-loop build is in progress in the background (see `task.md` for current
  status). Nothing about "the engine is live" should be treated as true until a
  successful `/health`, `/embed`, and `/infer` call is actually observed.

---

Task ID: 6
Agent: Claude (session) — documentation audit
Task: Check whether `DEPLOYMENT.md` and `HOW-TO-BUILD-REANZLY.md` (both authored by
the other/concurrent session, not requested by the user) describe real, working
systems

Work Log:
- `HOW-TO-BUILD-REANZLY.md` describes a substantially larger architecture than exists
  in the repo: a neural anomaly-detection model (`src/lib/insights/anomaly.ts` +
  brain.js `weights.json`), a lane-rate prediction network
  (`src/lib/insights/rate-predictor.ts`), a separate `mini-services/embedding-service/`,
  a full RAG pipeline (`src/lib/slm/retrieval.ts`), a "Quantum-Cognitive Decision
  Framework" module (`src/lib/slm/qdf.ts`), `src/lib/slm/memory.ts`,
  `src/lib/slm/agents.ts` (6 named agents), `src/lib/slm/improver.ts`. Verified by
  direct directory listing that **none of these files exist**. `src/lib/slm/` actually
  contains 8 files: `client.ts`, `local-engine.ts`, `providers.ts`, `runtime.ts`,
  `seed.ts`, `self-learning.ts`, `tools.ts`, `types.ts`. `src/lib/insights/` contains
  only `engine.ts`. `mini-services/embedding-service/` is empty.
- `DEPLOYMENT.md` claims an enterprise DevSecOps setup: 4-layer defense (Fail2ban →
  Caddy WAF → hardened Docker → app), a CI/CD security pipeline
  (`.github/workflows/ci-cd.yml` running Gitleaks/Trivy/Bun Audit), and scripts
  `scripts/security-audit.sh`, `scripts/backup-encrypt.sh`, `scripts/deploy-prod.sh`,
  plus `security/fail2ban/*`. Verified by direct file check that **all of these files
  do exist** on disk — unlike the fake `infer.rs`, this is not pure fiction.

Stage Summary:
- Two different situations, and they should not be treated the same: the AI-feature
  claims in `HOW-TO-BUILD-REANZLY.md` are largely aspirational/not built.
  `DEPLOYMENT.md`'s referenced files exist, but **their contents have not yet been
  verified to actually implement what's claimed** (given the `infer.rs` precedent of
  "file exists but is a hollow facade", existence alone is not proof of correctness).
  This is flagged as open in `task.md` — do not rely on `DEPLOYMENT.md` for an actual
  production deployment until its scripts have been read and tested.

---

Task ID: 7
Agent: Claude (session)
Task: Fix "An unexpected Turbopack error occurred" reported by the user

Work Log:
- The Next.js dev log only echoed the generic browser-side message; the real
  Turbopack detail goes to the terminal that started `next dev`, which wasn't one
  with captured output.
- Investigating process state turned up several `next dev` processes racing on
  port 3000 — killing one caused another to reappear moments later. Checked their
  command lines via `Get-CimInstance Win32_Process` before assuming anything
  adversarial: all of it was ordinary local tooling (this repo's own `next dev`
  chain plus unrelated IDE/MCP helper processes) racing on Windows' socket-teardown
  lag, not external interference.
- Killed the full process tree cleanly, added `.claude/launch.json`, and restarted
  through the tracked preview tool.
- Verified in browser: full landing page renders, every chunk request `200 OK`,
  HMR connected, Fast Refresh working, zero errors on a fresh load.

Stage Summary:
- Fixed. Root cause was process/port contention, not a code defect.

---

Task ID: 8
Agent: Claude (session)
Task: Get the just-built Rust `slm-engine` actually running and verify it for real
(continuation of Task 5 — a successful compile is not the same as a working service)

Work Log:
- First build attempt after the `ort-sys` TLS fix (Task 5) got further but hit a
  second, deeper `ort`/`ort-sys` incompatibility: `ort 2.0.0-rc.4`'s source
  references `ort_sys::size_t`, a type that doesn't exist in the newer
  `ort-sys 2.0.0-rc.13` Cargo's resolver had picked. Fixed by pinning
  `ort-sys = "=2.0.0-rc.4"` directly — the exact version `ort` was actually written
  against — rather than patching around an API gap on a mismatched version. Cargo
  confirmed "Downgrading ort-sys v2.0.0-rc.13 -> v2.0.0-rc.4" and the build succeeded
  ("Finished `release` profile [optimized] target(s) in 10m 03s").
- Running the resulting `slm-engine.exe` immediately crashed: `fastembed`'s bundled
  `hf-hub 0.3.2` panicked with "Bad URL: failed to parse URL: RelativeUrlWithoutBase"
  while downloading the embedding model, and since that happens before the HTTP
  server binds, the crash blocked testing anything else, including the part that
  actually mattered most (Qwen chat inference). Confirmed general network access was
  fine first (`curl` to huggingface.co succeeded, redirect `Location` headers were
  properly absolute) before concluding this is a real bug inside the old, pinned
  `hf-hub 0.3.2`'s manual redirect-handling code — plausibly not understanding
  Hugging Face's newer Xet-storage CDN response format, given how old that pinned
  version is relative to when Xet was introduced.
- Rather than chase that root cause immediately (a secondary feature, not blocking
  the main ask), made embedder loading non-fatal in `main.rs`/`embed.rs`, mirroring
  the graceful-degradation pattern already used for the Qwen model: `/embed` returns
  503 and the TypeScript client already falls back to zero-vectors on that.
- Rebuilt (37s incremental) and ran the engine again. This time it got past the
  embedder failure, downloaded the Qwen2.5-0.5B-Instruct GGUF model + tokenizer for
  real, and came up listening on `:3004`.
- Verified all three endpoints directly:
  - `GET /health` → `OK`
  - `POST /embed` → `503` (correct graceful-degradation behavior, not a crash)
  - `POST /infer` → real generated text, not a template: `"2+2 equals 4."` (3.6s) and
    `"A good trucking company must have proof-of-delivery systems in place that
    ensure timely delivery and safe operation of the vehicles."` (7.6s) — genuinely
    produced by the model, not hallucinated boilerplate.
- Tested the actual integration point next (`/api/rean`) and found the reply for a
  plain "hello" was a nonsensical overdue-invoices dump. Traced this to
  `src/lib/slm/client.ts`: `inferSLM()` had a 5-second `AbortSignal.timeout`, shorter
  than the engine's real measured latency (~7.6s for a "balanced"-tier reply), so
  every real request was silently timing out and falling back to
  `answerLocally(prompt, "Agent")` — critically, called with the *entire long system
  prompt* built in `route.ts` (not the user's actual short message), which is what
  produced the nonsense answer. Fixed by raising the timeout to 30s, with the actual
  measured latencies recorded in a comment so a future change to token budgets or
  tiers has a real number to check against, not a guess.
- Re-verified `/api/rean` after the fix: a "hello" message now returns genuine
  Qwen-generated prose (echoing the system-prompt framing a bit, as small models
  often do, but coherent and clearly not a template match) instead of the local
  fallback.

Stage Summary:
- The Rust engine is genuinely live end-to-end for chat inference: compiles, runs,
  serves real local model generations, and the Next.js app now actually reaches it
  instead of silently falling back every time. Two things remain open, both tracked
  in `task.md`: real round-trip latency is high for a live chat feel (~24s for a
  simple "hello" on this CPU, "balanced" tier generating toward a 320-token budget
  even for short replies — needs tuning, not yet done), and the embedding
  model download bug is worked around (non-fatal) but not actually fixed (semantic
  memory retrieval still runs on zero-vectors until it is).

---

Task ID: 9
Agent: Claude (session)
Task: User reported "I'm not getting answers back by Rean in the chat" - diagnose
and fix for real; also fix the embedding bug properly, and build real RAG
("add the RAG and create there brain for it")

Work Log:
- Root-caused the chat silence to three independent, real bugs rather than
  assuming it was one thing:
  1. `chat-service` (port 3003) was simply not running - collateral damage from an
     earlier `Stop-Process -Name node -Force` used to fix the Turbopack issue in the
     previous turn, which killed it along with the stray Next.js processes it was
     meant to target. Restarted it; confirmed via its own logs that a real client
     reconnected.
  2. Even with chat-service back up, replies were inconsistent. Traced this to
     `client.ts` calling `http://localhost:3004` for the Rust engine - Node's fetch
     resolving "localhost" can race to the IPv6 `::1` candidate and fail fast before
     falling back to IPv4, even though the engine is healthy on IPv4. This explained
     why direct curl calls (which don't go through Node's resolver the same way)
     worked while calls from inside the Next.js server process didn't, unpredictably.
     Fixed by using the literal `127.0.0.1` instead of `localhost`.
  3. Investigated an apparently-nonsensical reply (asking "hello" returned an
     overdue-invoices dump) down to actual message content stored in SQLite
     (`db/custom.db`, ground truth, not the UI's rendering of it) rather than
     guessing from the accessibility tree. Found `inferSLM()`'s fallback path
     re-ran the *entire long wrapped system prompt* through the local
     keyword-matching engine instead of the user's actual short message on every
     fallback - added a `fallbackQuery` option and applied it to all three call
     sites (`/api/rean`, `/api/slm/chat`, `self-learning.ts`'s
     `superpositionReason`, which had the identical bug independently).
  Verified the full fix with SQLite ground truth: sent "good morning" through the
  real chat UI, confirmed Rean's actual reply landed in `ChatMessage` ~16s later,
  matching real-inference latency, not the fallback path.
- Also fixed the embedding bug properly this time (previously only made non-fatal).
  Root cause: `fastembed`'s bundled `hf-hub 0.3.2` can't handle Hugging Face's Xet
  storage CDN redirects. Rather than gamble on an untested fastembed major-version
  bump, bypassed its download path entirely: `embed.rs` now fetches the model files
  itself via the already-proven `hf-hub 0.5.0`, then hands the bytes to fastembed's
  `try_new_from_user_defined` "bring your own model" API (fastembed's own inference
  code was never broken, only its bundled downloader). Disabled fastembed's
  "online" feature in `Cargo.toml` so the broken code path isn't even compiled.
  Verified: `/embed` now returns real non-zero 384-dim vectors.
- Built a genuine RAG "brain" for Rean, per explicit user request:
  - New `KnowledgeChunk` Prisma model.
  - `src/lib/slm/knowledge-seed.ts`: 54 knowledge chunks (glossary, compliance
    rules, module reference) sourced from `Reanzly.md`'s own documentation and the
    compliance thresholds already enforced in `src/lib/insights/engine.ts` (FMVDR
    fatigue limit, invoice-risk severity, document-expiry windows) - deliberately
    nothing invented, everything traceable to something the platform already does.
  - `src/lib/slm/rag.ts`: embeds the knowledge base once (idempotent) and retrieves
    via real cosine similarity, using the now-fixed `/embed` endpoint.
  - Wired into `/api/rean`: a confident, non-live-data-intent knowledge match
    answers directly from the retrieved fact - skipping generation, both more
    reliable and ~15-20s faster - since a small 0.5B model given two competing
    context blocks (a correct static fact vs. irrelevant "live data" from an
    ambiguously-matched local intent) reliably favours the wrong one regardless of
    prompt framing, as directly observed and tested during this work.
  - The routing heuristic (when to trust the knowledge base vs. when a query needs
    live data) took three real rounds of tuning against actual test failures rather
    than being decided upfront: an initial version excluded "platform-docs" sourced
    matches, which broke "what does POD mean?" (its own module-doc entry
    legitimately scored higher than the glossary entry for that exact query); the
    fix that replaced it (require the local engine to have found no specific
    live-data intent) broke "what happens if a driver exceeds the fatigue limit?"
    because local-engine's `drivers` intent fires on any bare mention of "driver",
    including compliance questions; final fix explicitly excludes the two
    broad/generic local intents (`compliance`, `drivers`) from being trusted over a
    confident knowledge match, and separately added fatigue/duty-hour keywords to
    the `compliance` intent itself so it stops losing that match to `drivers` in
    the first place. All four tested scenarios (compliance question, glossary
    question, two different live-data questions) verified correct after this.
  - Verified isolated retrieval accuracy directly (not just end-to-end): compliance
    and glossary test queries scored 0.79-0.90 against their correct chunk, cleanly
    above the noise floor.

Stage Summary:
- The user's actual complaint (no answers back in chat) is fixed and verified with
  database ground truth, not just code review - three distinct real bugs, not one.
- The embedding bug is now actually fixed, not just made non-fatal - `/embed` does
  real work.
- Rean has a genuine, working RAG knowledge base: real embeddings, real retrieval,
  verified accurate, wired into the actual answer path with a routing heuristic that
  was iterated against real failures until it handled every tested case correctly.
- Not fully closed: a final live browser click-through of the chat fix (as opposed
  to the API-level + earlier-in-session UI verification already done) hit
  browser-pane-specific rendering flakiness this session and wasn't re-confirmed:
  see `task.md`. Also open: real per-question latency for anything needing live
  data is still 16-30s, and the RAG routing heuristic, while tuned to a working
  state, is a heuristic rather than a learned classifier and could still misroute on
  a genuinely new class of ambiguous question.

---

Task ID: 10
Agent: Claude (session)
Task: User reported (with an annotated screenshot) that chat message timestamps
"is not going properly" — one cluster of messages displayed "09:42" while others
in the same thread showed raw, un-converted-looking digits like "04:22"/"04:48"

Work Log:
- Started from the actual stored data, not the UI: queried `db/custom.db` directly
  and found `ChatMessage.createdAt` had two different representations mixed in the
  same column - some rows as space-separated datetime text
  (`'2026-08-06 04:22:02'`), others as raw epoch-millisecond integers
  (`1785989613330`). Traced the two writers: `chat-service`'s raw `bun:sqlite`
  inserts (relying on the column's Prisma-generated `DEFAULT CURRENT_TIMESTAMP`,
  which SQLite always produces as a naive UTC string with no timezone marker) vs.
  `src/app/api/chat/messages/route.ts`'s Prisma-based REST fallback (used earlier
  this session while debugging socket connectivity, which is why those rows exist
  at all).
- Ruled out the database/Prisma layer as the source of the actual bug: wrote a
  throwaway script that read both row types directly through Prisma
  (`db.chatMessage.findMany`) and confirmed Prisma deserializes *both* formats
  into correct, consistent UTC `Date` objects. The data was never actually wrong.
- Reproduced the real bug directly in the Browser pane's own JS runtime rather than
  guessing: confirmed the browser's resolved timezone is `Asia/Calcutta` (IST,
  UTC+5:30), then tested `new Date(...)` against both a properly-tagged ISO string
  (`...004:22:02.000Z` → correctly showed 09:52 IST) and the raw naive string
  chat-service actually stores (`'2026-08-06 04:22:02'` → showed **04:22**, with
  `.toString()` revealing the browser had interpreted it as *already being*
  04:22:02 IST, i.e. treated a UTC-intended string as if it were already local).
- This pinned the bug precisely: `chat-service`'s `rowToMessage()` converts
  `row.createdAt` via plain `new Date(row.createdAt).toISOString()`. On this
  Windows host, Bun resolves "local time" for ambiguous date-parsing via the OS
  timezone setting (IST) - not the UTC that the wrapping shell environment
  reports via its own `date` command, which is a *different* environment's
  timezone database. So the naive UTC string gets misread as IST, producing a
  timestamp that's off by exactly the local UTC offset, and `.toISOString()`
  bakes that error into an otherwise well-formed string before it ever reaches
  the client - invisible until the browser correctly-but-uselessly converts the
  already-wrong value back to local time.
- Fixed with a small `parseDbTimestamp()` helper in
  `mini-services/chat-service/index.ts`: numbers and already-tagged ISO strings
  (containing 'T'/'Z'/an explicit offset) parse as-is; naive
  `'YYYY-MM-DD HH:MM:SS'` strings get explicitly tagged as UTC
  (`.replace(" ", "T") + "Z"`) before parsing. Single call site
  (`rowToMessage()`), confirmed no other timestamp field in that file goes
  through the same unsafe parsing.
- Verified with a real socket.io client (not browser automation, which was
  unreliable this session) connecting exactly as the frontend does, sending a
  live message, and checking the actual `timestamp` field chat-service returned:
  within 0.6 seconds of true current time, where before the fix it would have
  been off by the full local UTC offset (5.5 hours here).

Stage Summary:
- Root-caused to a genuine, fully-understood bug (SQLite's naive
  `CURRENT_TIMESTAMP` format colliding with JS's local-timezone-by-default date
  parsing on a non-UTC host) rather than patched around a symptom. Fixed at the
  single point it needed fixing, verified with a real round-trip through the
  actual affected code path.
