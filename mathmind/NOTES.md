# MathMind — Decisions & tuning notes

A running log of the small design decisions and tuning knobs that aren't obvious from
the code alone. Newest at the top. (Games backlog: [GAMES.md](./GAMES.md); feature
roadmap: [ROADMAP.md](./ROADMAP.md).)

---

## 2026-09-04

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
