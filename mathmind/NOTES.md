# MathMind — Decisions & tuning notes

A running log of the small design decisions and tuning knobs that aren't obvious from
the code alone. Newest at the top. (Games backlog: [GAMES.md](./GAMES.md); feature
roadmap: [ROADMAP.md](./ROADMAP.md).)

---

## 2026-09-04

### Roadmap module 5 — reading-friendly font + high contrast (a11y part 2)
- Two new settings (`readableFont`, `highContrast`), wired through `ThemedText` so they
  apply app-wide: reading-friendly swaps the handwriting for a plain legible font stack
  (Verdana/Segoe/Tahoma on web) + letter-spacing; high contrast forces near-black text
  (and bold in readable mode). No new font dependency (system stack) — a real Lexend/
  OpenDyslexic asset is a future upgrade.

### Roadmap module 4 — parent view
- Read-only `/parent`: plain-language "how they're doing", "what we're working on" with a
  per-skill at-home activity, and a skills overview. Home "For parents" entry. Seeds demo
  data if empty. Closes GAPS #5.

### Roadmap module 3 — Milo cheers + natural voice (ElevenLabs)
- **Natural voice:** `speak()` now prefers **ElevenLabs** on web when
  `EXPO_PUBLIC_ELEVENLABS_API_KEY` is set (voice/model overridable), synthesizing mp3 and
  playing it via the browser `Audio` API; **falls back to device TTS** on any error or when
  no key/native. Captions + Milo's mouth still sync either way. Caveats: client-side key is
  demo-grade (move server-side later); browser CORS to the ElevenLabs endpoint is
  unverified — fallback covers it. Not yet tested with a real key.
- **Milo cheers:** the session-done screen (game-unlock moment) now shows a cheering Milo
  and auto-speaks the unlock line. Game-over screens already cheer via `MiloCoach`.

### Roadmap module 2 — camera opt-in → scoreboard gating
- Store `scoreEligible` (session-only, **not persisted** — camera isn't on after reload),
  set true when Focus Guard reaches "watching", false on off/error/unmount.
- Focus Guard off-state now shows the **opt-in warning**: camera on = points count on the
  class scoreboard; off = still study & play, just not ranked.
- **Sprint + Racer** rank the player only when `scoreEligible`; otherwise the player is left
  off the board and shown a "practice run — not on the scoreboard" badge + how to join.
  Bird Shooter has no leaderboard, so it's not gated.

### Roadmap module 1 — accessibility & settings
- Settings store slice (`readAloud`/`captions`/`reduceMotion`, persisted) + `/settings`
  screen (gear in Home top-right). Global `CaptionBar` subtitles wired to the shared speak
  layer; read-aloud toggle gates TTS (captions still show); reduce-motion calms Milo.

### Misconception bank — expanded + live-demo cheat-sheet + tests
The bank is a real pattern-matcher (each `detect()` fires on the *exact* wrong answer), now
**9 misconceptions across all 6 skills** — several skills catch multiple distinct errors,
so a judge poking it sees generalization, not one scripted case. `npm test` proves all fire.

**To trigger any of them live** (numbers vary per generated task — apply the rule):

| Skill (screen) | Task shape | Type this wrong answer | Misconception caught |
|---|---|---|---|
| Comparing Fractions | "Which is bigger: 1/4 or 1/8?" (choice) | pick the one with the **bigger bottom number** | bigger-denominator-bigger |
| Multiplication Facts | "a × b?" | type **a + b** (e.g. 7×2 → 9) | add-instead-of-multiply |
| Multiplication Facts | "a × b?" | type **a × (b−1)** (one group short, e.g. 7×2 → 7) | skip-count-short |
| Arrays & Area | "r rows, c dots each — how many?" | type **r + c** | added-rows-and-columns |
| Arrays & Area | "r rows, c dots each" | type **2×(r+c)−4** (border only) | perimeter-not-area |
| Multi-digit Addition | "a + b?" | add each column **without carrying** (concat column sums, e.g. 34+26 → 510) | no-regrouping |
| Equivalent Fractions | "n/d = _/(d·k)" | type **n** (leave top unchanged) | scaled-denominator-only |
| Equivalent Fractions | "n/d = _/(d·k)" | type **n + (d·k − d)** (added, not multiplied) | add-same-to-both |
| Place Value | "value of the … digit in N?" | type just the **digit** (e.g. 3, not 300) | ignored-place-zero |

Note: the offline **mock** uses `detect()` directly, so these fire deterministically even
without an API key — the most reliable way to demo the matcher. See [GAPS.md](./GAPS.md)
for the structured-output validation that also whitelists tags on the live Gemini path.

### Student progress dashboard (`/progress`)
- New student-facing dashboard: overall mastery ring, level/stars/streak, per-skill status
  (Mastered / Getting there / Keep practicing), badges, a "this week" bar chart, recent
  games, and a "next challenge" CTA. Entry from Home ("See my progress").
- **Dummy data:** real fields (mastery/xp/streak) come from the store, and it **auto-seeds
  `loadDemoData()` only if the store is empty** (won't wipe real play). The weekly bars
  (`WEEK`) and recent-games list (`RECENT_GAMES`) are clearly-dummy consts in
  `src/app/progress.tsx` — the store doesn't track minutes/game-history yet. Replace with
  real logging for production.

### Live tutor via Gemini (free key) + Milo game coaching
- **Decision:** Added a **Google Gemini** live-tutor brain (free tier) as the preferred
  live path, since a free key is cheaper than Claude for the hackathon. Dispatch order in
  `src/lib/tutor/index.ts`: **Gemini → Supabase/Claude Edge Function → local mock**. Any
  live error falls back to mock, so a session never breaks.
- **Setup:** put a free key in `.env` as `EXPO_PUBLIC_GEMINI_API_KEY` (get it at
  aistudio.google.com/app/apikey). Optional `EXPO_PUBLIC_GEMINI_MODEL` (default
  `gemini-2.0-flash`). With no key set, home still runs the offline mock.
- **How:** `src/lib/tutor/gemini.ts` calls the Generative Language REST API with
  `responseMimeType:'application/json'` + a `responseSchema` matching `TutorResult`. We
  **grade correctness locally** (we know the answer) and let the model supply only the
  *coaching* — keeps app logic deterministic.
- **Milo game coaching:** `geminiCoachLine(summary)` → one personalized sentence; shown via
  `MiloCoach` on all three game-over screens (instant local fallback line, upgraded by
  Gemini when configured). Attacks the weakest judging criterion (visible AI).
- **Caveats / TODO:** client-side key is fine for a demo but insecure for production (move
  behind an edge function later). Browser **CORS** to the Gemini endpoint is unverified —
  if it blocks on web, either run the tutor on native or proxy via the edge function; the
  mock fallback covers it meanwhile. Not yet tested with a real key.

### DEMO: all games shortened (RESTORE before production)
Games trimmed to ~3–4 quick rounds so the demo video stays tight. **Revert these for a
real build:**
- Math Sprint `SPRINT_SECONDS` 30 → **18** (`src/app/game.tsx`)
- Highway Racer `MAX_ROUNDS` 12 → **4**, `FINISH` 120 → **70** (`src/app/car.tsx`)
- Bird Shooter `ROUND_SECONDS` 45 → **20** (`src/app/birds.tsx`)
Each is tagged with a `// demo: shortened (was …)` comment.

### Racer — friends solve their OWN questions (not the player's)
- **Decision:** In Highway Racer, each friend bot advances based on *their own* problem,
  not the player's. On each round resolve, a friend gains distance with probability =
  their `skill` (independent roll). Their on-road **lane is just cruising** (random weave)
  — it no longer points at the player's correct-answer tile.
- **Why:** Previously friends were scored against the player's single question/gate, so
  they visibly steered to the player's answer and "everyone had the same question." Real
  racers work their own problems.
- **Where:** `src/app/car.tsx` → `resolve()` (skill roll) and `beginRound()` (random lane).
- **Note / future:** friends still advance *once per player round* (lockstep timing). If we
  want them fully time-independent, move their progress into the game loop (per-second
  rate by skill) instead of at resolve.

### Racer — answer gate readability + decision time
- The four option tiles are kept **legible even far away**: their size (`tScale`) and
  horizontal spacing (`kx`) are clamped so they read as a floating banner near the horizon,
  then grow/converge as they arrive (don't shrink to dots).
- The gate approaches at a **steady, decoupled pace** (`GATE_SPEED`, ~0.9) — not tied to
  road/boost speed — so decision time is consistent (~6s) and a boost doesn't rush the
  answer at you.

### Racer — scenery (no empty patches) + animals
- Biomes cycle **grass → desert → jungle** (`BIOMES`, switch every `BIOME_SECS` = 9s):
  ground colour, horizon `treeline` silhouette, and plant palette all change.
- Plant/animal kinds per biome: trees (pine/round/bush/jungle/palm), desert (cactus/rock),
  and **roadside animals** deer / camel / elephant drawn in `Tree()`.
- Density `COUNT` = 44, distributed evenly in depth on both sides so the roadside never has
  a gap. Each object has random `spread` (distance from road) and `scale`.

### Bird Shooter — layout + adaptive difficulty
- **Layout:** tall **grass** strip along the bottom; birds **burst up out of the grass and
  fly off the top** (not side-to-side); a **gun turret in the middle** swings to aim at the
  tapped bird and fires a dashed tracer (blue = hit, red = miss).
- **Adaptive speed:** `speedMult` starts at **0.7 (slow)**; **+0.12 on a correct hit**,
  **-0.10 on a wrong tap**, **-0.15 when the correct bird escapes off the top**. Clamped to
  `[SPEED_FLOOR 0.55, SPEED_CAP 1.8]`. Resets to 0.7 each round. → self-tuning challenge.

---

## Standing facts / conventions
- **Fake multiplayer** everywhere = local bots, not networked. Real multiplayer would need
  a server (Supabase Realtime or similar). Friends use dummy **Indian names**.
- **All games feed mastery** via `useStore().recordTurn({... skillId: 'mult-facts',
  masterySignal: 0.8 ...})` on a correct answer, so games double as practice.
- **Tuning knobs live as top-of-file consts** in each game (e.g. `GATE_SPEED`, `FAR`,
  `BOOST`/`SLOW`, `BIOME_SECS`, `COUNT` in car.tsx; `ROUND_SECONDS`, `speedMult` bounds in
  birds.tsx) — change those first when the feel is off.
- **No emojis** anywhere user-facing. Hand-drawn aesthetic (notebook paper, wobbly borders,
  offset shadows, Kalam/Patrick Hand fonts).
- **Verification limit:** these games can't be playtested headlessly — we confirm
  typecheck + bundle + route 200, but motion/feel needs a real browser.

## Open (not yet built)
- Milo subtitles + natural voice (ElevenLabs) — see ROADMAP.
- Camera opt-in → scoreboard-eligibility gating — see ROADMAP.
- Real networked multiplayer for the racer.
