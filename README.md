# nerdy-ai-hackethon

**MathMind** — a Socratic, mastery-based math tutor for grades 3–5, built for the
[Nerdy AI Hackathon](https://hackathon.nerdy.com/) (K-5 math track).

Most numeracy tools check *answers* and never hand usable progress data back to
teachers. MathMind instead chats with a child about their **thinking** — "talk me
through it" — catches misconceptions mid-thought, and nudges them back on track. Work
arrives as short, **ADHD-friendly micro-tasks** (60–90s). Mastering a skill unlocks
adaptive games, and a **teacher dashboard** surfaces per-student mastery and flagged
misconceptions in real time.

## Why it's different

- **Reasoning, not just right/wrong.** A curated misconception bank lets the tutor name
  *why* a child went wrong (e.g. "1/8 > 1/4 because 8 > 4") and scaffold the fix.
- **Closes the teacher data gap.** Mastery + misconception events feed a live dashboard.
- **Built for focus.** Single-task screens, read-aloud, instant wins — designed for ADHD.

## Stack

- **App:** Expo Router (React Native) — one codebase for iOS, Android, and web (`mathmind/`)
- **AI:** Claude via a Supabase Edge Function (model-tiered: Haiku for routine turns,
  Sonnet for misconception analysis), with structured tool-use output. Runs against a
  local mock tutor when no keys are configured, so the app is demoable offline.
- **Backend:** Supabase (Postgres + Auth + Realtime)

## Run it

```bash
cd mathmind
npm install
npm run web      # or: npm run android / npm run ios
```

See [`mathmind/README.md`](mathmind/README.md) for environment setup (Supabase +
Anthropic keys) and the mock-vs-live tutor modes.

## Project docs

- [`Details.MD`](Details.MD) — hackathon rules, timeline, prizes, judging criteria
