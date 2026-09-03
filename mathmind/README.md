# MathMind — Socratic, mastery-based math tutor (grades 3–5)

Built for the [Nerdy AI Hackathon](https://hackathon.nerdy.com/) K-5 math track.

MathMind coaches a child through their **thinking** ("talk me through it"), catches
misconceptions mid-thought and nudges instead of correcting, delivers work as short
**ADHD-friendly micro-tasks** (~90s), unlocks an adaptive game on progress, and feeds a
**teacher dashboard** with per-skill mastery and the exact misconceptions to reteach —
closing the "data back to teachers" gap the hackathon brief calls out.

One Expo codebase → **iOS, Android, and web**.

## Quick start (offline demo — no keys needed)

```bash
npm install
npm run web        # or: npm run android / npm run ios
```

With no environment configured, the app runs on a **local mock tutor** (rule-based, driven
by the misconception bank) and a local persisted store — fully demoable offline. The
landing screen shows `Tutor mode: Offline demo`.

## Demo flow (the 2–3 min video)

1. **Home** → "Start a 90-second practice." The lowest-mastery skill is chosen first, so
   you land on fractions (the juicy misconceptions).
2. In **Practice**, answer a fraction-compare question *wrong the way a real kid does* —
   e.g. pick `1/8` as bigger than `1/4`. The tutor **names the misconception**
   ("more pieces = smaller pieces") and scaffolds instead of giving the answer. ← wow moment
2. Answer correctly → mastery ring rises, difficulty adapts, finish the set → **game unlocks**.
3. **Number Line Dash** — tap where a number sits; it's a reward that's secretly place-value
   practice and feeds mastery.
4. Back home → **Open class dashboard** → mastery heatmap + "stuck on fraction comparison —
   here's the misconception to reteach." ← closes the loop

Everything is read aloud for low-reading-load, ADHD-friendly focus.

## Going live (Claude + Supabase)

```bash
cp .env.example .env         # fill EXPO_PUBLIC_SUPABASE_URL + ANON_KEY

# Database
supabase db push             # applies supabase/migrations (schema, RLS, seed)

# Tutor brain (Claude) — key stays server-side, never in the client
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
supabase functions deploy tutor-turn
```

With env set, the landing screen shows `Tutor mode: Live (Claude)` and each student turn
is judged by Claude via the Edge Function.

## Architecture

- **App** — Expo Router (`src/app/`): `index` (home/role picker), `learn` (tutor loop),
  `game`, `teacher` (web-friendly dashboard). State in `src/lib/store.ts` (zustand + AsyncStorage).
- **Pedagogy core** — `src/lib/curriculum.ts`: a 6-skill grades 3–5 graph, deterministic
  task generators, and the **misconception bank** whose `detect()` predicates recognize the
  exact wrong answer a given misconception produces.
- **Tutor** — `src/lib/tutor/`: `tutorTurn()` dispatches to the live Edge Function when
  configured, else the local mock; identical `TutorResult` either way.
- **Edge Function** — `supabase/functions/tutor-turn/`: calls the Claude Messages API with
  **forced tool-use** (`tool_choice` + `strict: true`) so every turn returns a structured
  judgment (`isCorrect`, `misconceptionTag`, `hint`, `difficultyDelta`, `masterySignal`) —
  deterministic app logic, not prose parsing. **Model-tiered**: `claude-haiku-4-5` for correct
  turns, escalating to `claude-sonnet-4-6` for misconception analysis on wrong answers.
- **Data** — `supabase/migrations/`: profiles, skill graph, misconception bank, sessions,
  turns, per-skill mastery, and `misconception_events` (published to Realtime for a live
  teacher feed). RLS scopes students to their own rows and teachers to their class.

## Notes

- Child speech-to-text is unreliable, so input is tap/choice + short typed answers with
  always-on read-aloud; voice input is a future add.
- Mastery uses an exponential-moving-average threshold; the schema leaves room to swap in
  Bayesian Knowledge Tracing later.
