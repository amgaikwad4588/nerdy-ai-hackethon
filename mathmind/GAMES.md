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

## 2. Highway Racer — DONE
File: `src/app/car.tsx`. Route `/car`. Skill: `mult-facts`.
- 4-lane highway, question at the bottom. Four answer tiles slide down (one per lane);
  steer your car (tap a lane, or ◄ ► buttons) into the **correct** lane before the gate
  arrives. **Correct = speed up (big distance), wrong = slow down.**
- **Fake multiplayer:** 3 friend bots with dummy Indian names (Aarav, Diya, Kabir, …),
  **translucent** cars, race you up the road; their car height = their race distance.
  Each round they pick a lane (accuracy = their skill). First car to the finish wins;
  end screen ranks everyone.
- Later: real networked multiplayer; drag-to-steer; operator tiles (`+2 -7 x7`) as an
  alt mode; crash/lives variant.

## 3. Bird Shooter — DONE
File: `src/app/birds.tsx`. Route `/birds`. Skill: `mult-facts`.
- Birds fly across the sky (from both sides, varying height/speed), each carrying a
  number. Question up top; **tap the bird holding the correct answer**. Right = score +
  combo and a fresh flock; wrong bird flies off and breaks the streak. 45s round, end
  screen with hits + accuracy.
- Later: "shoot all multiples of N" mode; ammo limit; power-ups.

---

## Later ideas (unassigned)
_(add here as they come up)_
