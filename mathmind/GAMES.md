# MathMind — Games backlog

Games are the **reward at the end of a practice session** and are themselves more
practice (each one emits a `masterySignal` back into the store, like Math Sprint does).
We build them **one at a time**. Status: `idea` → `building` → `done`.

Shared rules for every game:
- Hand-drawn look (notebook paper, wobbly borders, offset shadows, Kalam/Patrick Hand).
- No emojis. Read-aloud friendly. ~60–90s rounds (ADHD short-tasking).
- Milo the fox buddy can cheer / react.
- On finish, feed mastery via `useStore().recordTurn(...)` for the relevant skill.

---

## 1. Math Sprint — DONE
Rapid-fire multiple-choice with a combo multiplier, live rank vs. classmates, and an
end leaderboard. File: `src/app/game.tsx`. Skill: `mult-facts`.

## 2. Highway Car Game — idea
- Endless **highway**; the car drives straight and the student **steers between lanes**
  (tap left / right, or drag) to **avoid obstacles**.
- A **question is shown at the bottom of the screen**.
- Obstacles are **numbers / operations** floating in the lanes: some are operators like
  `+2`, `-7`, `x7`; others are candidate **answers to the question**.
- The student must drive the car **into the correct answer** (or apply the right operator
  to reach a target) and **dodge the wrong ones** — a wrong hit = crash / lose a life.
- Speeds up gradually. Combo for a clean streak. Feeds mastery for the practiced skill.
- Open Qs: is it "hit the correct answer tile" or "chain operators to reach a target"?
  Steering = tap-lanes vs. drag. Lives vs. timer.

## 3. Bird Shooter (Gun Game) — idea
- **Birds fly across the screen**, each **carrying a number**.
- A **question** is shown; the student **taps (shoots) the bird holding the correct
  answer**. Tapping a wrong bird = miss / penalty.
- Birds enter from the sides at varying heights/speeds; shooting the right one scores +
  combo, then a new question loads.
- Feeds mastery for the practiced skill.
- Open Qs: single correct bird per question vs. "shoot all birds that are multiples of N"
  style; ammo/time limit; do wrong birds fly off or cost a life?

---

## Later ideas (unassigned)
_(add here as they come up)_
