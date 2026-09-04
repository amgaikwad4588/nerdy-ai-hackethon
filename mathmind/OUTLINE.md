# MathMind — Idea Outline

_Nerdy AI Hackathon · Track 1: K-5 Math Game · Grades 3–5_

## One-line pitch
An AI math tutor that coaches kids on **how they think** — catching misconceptions
mid-thought, rewarding mastery with playful games, and handing teachers the exact data
they're missing.

## The problem (straight from the brief)
Nerdy calls out a numeracy gap: most math tools drill answers, not reasoning, and — the
key line — **they don't feed usable progress data back to teachers**, so real mastery
learning is hard to sustain. Kids also disengage: long, text-heavy tasks lose attention
(especially for ADHD learners).

## Our answer — 4 pillars
1. **Talk-it-through tutoring.** The AI asks "talk me through it," listens to the child's
   reasoning, and when a wrong answer reveals a *known misconception* it **names it and
   scaffolds with a question** instead of just correcting.
2. **Mastery-based + adaptive.** Every turn updates a per-skill mastery score and nudges
   difficulty up/down. Mastering a skill **unlocks a game**.
3. **Play that is secretly practice.** Competitive, playful games (each feeds the same
   mastery signal) keep kids coming back.
4. **Data back to teachers.** A live teacher dashboard shows per-skill mastery and the
   **exact misconceptions to reteach** — closing the gap the judges named.

## Designed for the learner
- **ADHD-friendly micro-tasks** (~90s), one focus per screen, frequent visible wins.
- **Always-on read-aloud** and a friendly guide, **Milo the fox**, who speaks and reacts —
  low reading load, high warmth.
- **No emojis**, hand-drawn "notebook" aesthetic so it feels like a kid's own workbook.

## What's built
- **Socratic tutor loop** with a curated **misconception bank** (e.g. "more pieces = smaller
  pieces" for fractions) that detects the exact wrong answer a misconception produces.
- **Live AI brain via Gemini (free key)** with structured JSON output; correctness graded
  locally so logic stays deterministic. Falls back to an offline mock (fully demoable with
  no key). Claude-via-Supabase path also supported.
- **Milo the fox** buddy: animated, blinks, mouth moves while speaking; gives
  AI-personalized coaching lines after games.
- **Four games** (each a competitive, mastery-feeding reward):
  - **Math Sprint** — timed rapid-fire with live class leaderboard + rank.
  - **Highway Racer** — pseudo-3D racer; steer into the correct-answer lane; race
    translucent friend cars (own questions, dummy Indian names); biomes + roadside animals.
  - **Bird Shooter** — birds rise from tall grass; a gun turret shoots the bird holding the
    correct answer; adaptive speed.
  - (Number-line style ideas parked in GAMES.md.)
- **Teacher dashboard** — mastery heatmap, "today's focus," reteach list with remediation.
- **Student dashboard** — level/stars/streak, per-skill status, badges, weekly practice,
  recent games, next challenge.
- **Focus Guard (opt-in)** — on-device face check (enroll one photo, random spot-checks)
  so the enrolled student is the one studying; nothing uploaded.
- **One Expo codebase** → iOS, Android, and Web.

## How it's built (architecture)
- **App:** Expo Router (React Native) — student + teacher surfaces in one project.
- **State:** zustand + AsyncStorage (persists the demo); EMA mastery model, adaptive
  difficulty, misconception-event log.
- **Pedagogy core:** a 6-skill grades 3–5 graph (place value, multi-digit add,
  multiplication facts/arrays, fraction compare/equivalence) + the misconception bank.
- **AI layer:** `tutorTurn()` dispatches **Gemini → Claude(Edge Function) → local mock**;
  structured tool-use / JSON schema so each turn returns
  `{ isCorrect, misconceptionTag, message, hint, difficultyDelta, masterySignal }`.
- **Live path (optional):** Supabase (Postgres + RLS + Realtime) for a networked teacher
  feed; Claude via a Deno Edge Function (key stays server-side).

## The demo story (2–3 min)
1. Kid gets a fraction task → AI asks "talk me through it."
2. Kid reveals a misconception (1/8 > 1/4) → **AI catches it live and scaffolds.** ← wow
3. Mastery rises → difficulty adapts → skill mastered → **game reward.**
4. Cut to **teacher dashboard**: "Aanya is stuck on fraction comparison — here's the
   misconception to reteach." ← closes the loop.

## Maps to the judging criteria
- **Educational rigor + engagement:** misconception bank + mastery model, wrapped in games.
- **Real problem-solving:** the teacher-data gap, answered directly.
- **Execution + demo-ability:** one polished cross-platform app, live end-to-end loop.
- **AI product engineering:** structured-output tutoring, provider fallback, on-device face
  recognition.

## Next steps
- Verify the live Gemini tutor on a real key; tighten the misconception-catch prompt.
- Record the demo video; write the submission description; deploy a live web link.
- Real logging behind the student dashboard; subtitles + natural voice; camera-gated
  leaderboard; real networked multiplayer.
