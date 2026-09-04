# MathMind — Socratic, mastery-based math tutor (grades 3–5)

Built for the [Nerdy AI Hackathon](https://hackathon.nerdy.com/) — Track 1: K-5 Math Game.

MathMind coaches a child through their **thinking** ("talk me through it"), catches
**misconceptions** mid-thought and nudges instead of correcting, delivers work as short
**ADHD-friendly micro-tasks**, rewards mastery with **playful games**, and feeds a
**teacher dashboard** the exact misconceptions to reteach — closing the "data back to
teachers" gap the brief calls out. A friendly fox, **Milo**, guides and speaks throughout.

One Expo codebase → **iOS, Android, and Web**.

## Docs
- [OUTLINE.md](./OUTLINE.md) — the idea: pitch, problem, pillars, demo story, judging map.
- [GAPS.md](./GAPS.md) — honest production gaps (auth, testing, a11y…) with status + plan.
- [GAMES.md](./GAMES.md) — games backlog + specs.
- [ROADMAP.md](./ROADMAP.md) — feature roadmap (subtitles, natural voice, camera scoreboard).
- [NOTES.md](./NOTES.md) — dated decisions log + **live misconception-trigger cheat-sheet**.

## Quick start (offline demo — no keys needed)

```bash
npm install
npm run web        # http://localhost:8081   (or: npm run android / npm run ios)
```

With nothing configured, the app runs on a local **mock tutor** (rule-based, driven by the
misconception bank) + a local persisted store — fully demoable offline.

## Tests

```bash
npm test           # dependency-free (Node 22 type-stripping)
```

Asserts every misconception `detect()` fires on its exact wrong answer and that correct
answers are never mis-flagged (15/15). This guards the core tagging IP against drift.

## Live tutor (optional)

The tutor upgrades to a live LLM when a key is present; otherwise it stays on the mock.
Dispatch order: **Gemini → Claude (Supabase Edge Function) → local mock**. Any live error
falls back locally so a child's session never breaks.

```bash
cp .env.example .env
# Option A (simplest, free): Google Gemini
#   EXPO_PUBLIC_GEMINI_API_KEY=...   (get one at https://aistudio.google.com/app/apikey)
# Option B: Claude via Supabase Edge Function (key stays server-side)
#   EXPO_PUBLIC_SUPABASE_URL=... , EXPO_PUBLIC_SUPABASE_ANON_KEY=...
#   supabase secrets set ANTHROPIC_API_KEY=sk-ant-... ; supabase functions deploy tutor-turn
```

On the live path we ask for **structured JSON** (schema-constrained), **validate the
misconception tag against our bank** (reject hallucinations), fall back to our
deterministic detector if the model missed it, and **grade correctness locally** — the
model supplies coaching, not the verdict.

## Screens

| Route | Screen |
|-------|--------|
| `/` | Home — student hero, Milo greeter, games, teacher entry |
| `/learn` | Practice — the Socratic tutor loop (Milo speaks feedback) |
| `/progress` | Student dashboard — mastery, level/stars/streak, badges, weekly, next challenge |
| `/game` | **Math Sprint** — timed rapid-fire with live class leaderboard |
| `/car` | **Highway Racer** — pseudo-3D racer; steer into the correct-answer lane vs. friends |
| `/birds` | **Bird Shooter** — shoot the bird holding the correct answer |
| `/teacher` | Class notebook — mastery heatmap + misconceptions to reteach |

## Features

- **Socratic tutor** with a curated **misconception bank** — 9 misconceptions across all 6
  skills, each with a `detect()` predicate that recognizes the exact wrong answer it models
  (e.g. `1/8 > 1/4`, `4×3 = 7`). Multiple per skill, all tested.
- **Milo the fox** — animated buddy (blinks, mouth moves while speaking); gives
  AI-personalized coaching lines after games.
- **Mastery + adaptivity** — EMA per-skill mastery, difficulty deltas, mastery unlocks games.
- **Four playful games**, each feeding the mastery signal (games double as practice).
- **Teacher dashboard** — mastery heatmap, "today's focus," reteach list with remediation.
- **Student dashboard** — a growth mirror the child can see.
- **Focus Guard (opt-in)** — on-device face check (enroll one photo, random spot-checks);
  nothing uploaded.
- **ADHD-friendly** — ~90s micro-tasks, one focus per screen, always-on read-aloud, no
  emojis, hand-drawn notebook aesthetic.

## Architecture

- **App** — Expo Router (`src/app/`): `index`, `learn`, `progress`, `game`, `car`, `birds`,
  `teacher`. State in `src/lib/store.ts` (zustand + AsyncStorage).
- **Pedagogy core** — `src/lib/curriculum.ts`: a 6-skill grades 3–5 graph mapped to Common
  Core codes, deterministic task generators, and the **misconception bank** with
  `detect()` predicates.
- **Tutor** — `src/lib/tutor/`: `tutorTurn()` dispatches Gemini (`gemini.ts`) → Claude
  (`remote.ts` → Supabase Edge Function) → mock (`mock.ts`); identical `TutorResult`.
- **Backend (live path)** — Supabase (Postgres + RLS + Realtime); Claude via a Deno Edge
  Function. See `supabase/`.

## Project structure

```
src/
  app/            # screens (Expo Router file routes)
  components/     # Milo (buddy), sketch primitives, big-button, mastery-ring, focus-guard, milo-coach
  constants/      # theme (hand-drawn tokens)
  lib/
    curriculum.ts # skills + task generators + misconception bank
    store.ts      # zustand mastery/difficulty/events + demo seed
    speak.ts      # shared read-aloud (Milo's mouth syncs to this)
    tutor/        # gemini | remote(claude) | mock  + dispatcher
scripts/test-tutor.ts   # npm test — misconception detector tests
supabase/               # migrations + tutor-turn edge function
```

## Demo flow (2–3 min)

1. Practice a fraction task → Milo asks "talk me through it."
2. Answer it the way a real kid does (`1/8 > 1/4`) → the tutor **names the misconception**
   and scaffolds instead of giving the answer. ← wow moment
3. Mastery rises → difficulty adapts → finish the set → **game unlocks**.
4. Open the **teacher dashboard** → "stuck on fraction comparison — here's the
   misconception to reteach." ← closes the loop

## Notes

- Games are trimmed to short demo lengths (see NOTES.md to restore full length).
- The camera/face features run in a real browser with permission; nothing is uploaded.
