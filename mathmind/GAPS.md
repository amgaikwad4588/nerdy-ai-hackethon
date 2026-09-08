# MathMind — Known gaps for a real product

Honest engineering gaps between the hackathon demo and a production K-5 tool. Kept visible
on purpose: knowing these (and having a plan) is itself a signal of product maturity.
Status: ✅ addressed · 🟡 partial · ⬜ open.

## 1. Auth & rostering — 🟡 partial (demo-grade)
**Gap:** How does a teacher create a class, and how does a student land in the right
account?
**Done (local/demo):** `/signin` role picker → **teacher opens a class with a join code**;
**student joins with that code + name** and is added to the roster. The **teacher
dashboard is now multi-student**: a class header with the join code, a tappable roster
(each student's mastery + a "needs reteach" flag), and per-student heatmap + reteach list.
State lives in the store (`classroom`, `roster`, `createClass`, `joinClass`) — structured
so the same actions can be Supabase-backed later.
**Still open (production):** real **Supabase Auth** (email/OTP or district SSO), server
persistence + **RLS** (students see only their rows; a teacher only their class), and
swapping the local store reads/writes for Supabase behind the same action interface. The
schema (`profiles`, `sessions`, `mastery`, `misconception_events`) already exists in
`supabase/migrations`.

## 2. Testing the core tutoring logic — 🟡 partial
**Gap:** Mastery updates + misconception tagging are the core IP and are exactly what
drifts silently with LLM output changes.
**Done:** `npm test` (`scripts/test-tutor.ts`, dependency-free via Node 22 type-stripping)
asserts **every** misconception's `detect()` fires on its exact wrong answer, and that
correct answers are never mis-flagged (15 assertions, all green).
**Still open:** unit tests for the EMA **mastery update** + difficulty deltas in the store,
and golden tests / snapshot checks over live LLM responses (contract tests against the
`TutorResult` schema).

## 3. Structured-output reliability — ✅ addressed (demo-grade)
**Gap:** What if Gemini returns malformed JSON or a misconception tag not in our bank?
**Done:** `src/lib/tutor/gemini.ts` uses a `responseSchema`, a tolerant parse (strips code
fences, extracts the first `{...}`), **validates the tag against our bank** (drops
hallucinated tags), **falls back to our deterministic `detectMisconception()`** if the
model missed it, clamps `difficultyDelta`/`masterySignal`, and **grades correctness
locally**. Any hard failure falls back to the offline mock (session never breaks).
**Next:** one automatic re-ask on parse failure before falling back; log drift metrics.

## 4. Curriculum alignment to Common Core — 🟡 partial
**Gap:** Are the skills/misconceptions real standards or plausible-sounding?
**Done:** Each skill carries an actual Common Core code (e.g. Place Value `3.NBT.A.1`,
Multiplication Facts `3.OA.C.7`, Comparing Fractions `3.NF.A.3d`, Equivalent Fractions
`4.NF.A.1`), shown on the teacher dashboard next to each flagged misconception. The
misconceptions are documented, classic error patterns tied to those standards.
**Next:** widen coverage across the full 3–5 progression and get an educator to review the
misconception bank + remediations.

## 5. Parent-facing view — ⬜ open
**Gap:** Only a teacher dashboard exists; parents are often the actual adopters.
**Plan:** A read-only parent summary (child's mastery, streak, "what we're working on,"
suggested at-home activity) — reuse the student dashboard data with a calmer, guidance
tone. Placeholder route + weekly email digest later.

## 6. Accessibility beyond read-aloud — 🟡 partial
**Gap:** For a K-5, ADHD-focused product, a11y is thin.
**Done:** always-on TTS read-aloud, large handwritten type, single-focus screens, limited
high-contrast palette, tap/choice input (low fine-motor + low reading load).
**Next:** an OpenDyslexic/legible-font toggle, verified color-contrast (WCAG AA), proper
screen-reader labels/roles on interactive elements, reduce-motion setting for the animated
games, and captions for Milo (already on the roadmap).
