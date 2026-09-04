// Dependency-free tests for the misconception bank — the core pedagogical IP.
// Run: npm test   (uses Node 22 native TypeScript type-stripping, no jest needed)
//
// Proves each misconception's detect() fires on the exact wrong answer it models, that
// correct answers trigger no misconception, and that generated tasks are internally
// consistent. This is what guards against silent drift in tagging logic.

import { detectMisconception, generateTask, isCorrect, MISCONCEPTIONS } from '../src/lib/curriculum.ts';
import type { Difficulty } from '../src/lib/types.ts';

let passed = 0;
let failed = 0;
const fail = (msg: string) => {
  failed++;
  console.error(`  FAIL: ${msg}`);
};
const ok = (msg: string) => {
  passed++;
  console.log(`  ok:   ${msg}`);
};

type Meta = Record<string, number>;
// For each misconception: the skill/difficulty to sample, and the wrong answer a child
// with that misconception produces (derived from the task's meta).
const CASES: { tag: string; skill: string; diff: Difficulty; wrong: (m: Meta) => string }[] = [
  { tag: 'bigger-denominator-bigger', skill: 'frac-compare', diff: 1, wrong: (m) => (m.d1 > m.d2 ? `${m.n1}/${m.d1}` : `${m.n2}/${m.d2}`) },
  { tag: 'add-instead-of-multiply', skill: 'mult-facts', diff: 2, wrong: (m) => String(m.a + m.b) },
  { tag: 'skip-count-short', skill: 'mult-facts', diff: 2, wrong: (m) => String(m.a * (m.b - 1)) },
  { tag: 'no-regrouping', skill: 'multi-add', diff: 1, wrong: (m) => {
      const as = String(m.a).padStart(String(m.b).length, '0');
      const bs = String(m.b).padStart(String(m.a).length, '0');
      let d = '';
      for (let i = 0; i < as.length; i++) d += String(Number(as[i]) + Number(bs[i]));
      return d;
    } },
  { tag: 'perimeter-not-area', skill: 'mult-arrays', diff: 2, wrong: (m) => String(2 * (m.rows + m.cols) - 4) },
  { tag: 'added-rows-and-columns', skill: 'mult-arrays', diff: 2, wrong: (m) => String(m.rows + m.cols) },
  { tag: 'ignored-place-zero', skill: 'place-value', diff: 2, wrong: (m) => String(m.digit) },
  { tag: 'add-same-to-both', skill: 'frac-equiv', diff: 2, wrong: (m) => String(m.n + (m.targetDen - m.d)) },
  { tag: 'scaled-denominator-only', skill: 'frac-equiv', diff: 2, wrong: (m) => String(m.n) },
];

console.log('Misconception bank — detector tests');

// 1) Every catalogued misconception must have a live test case.
for (const mc of MISCONCEPTIONS) {
  if (!CASES.some((c) => c.tag === mc.tag)) fail(`no test case for catalogued misconception "${mc.tag}"`);
}

// 2) Each detector fires on its wrong answer within a reasonable search, and the wrong
//    answer is genuinely wrong.
for (const c of CASES) {
  let hit = false;
  for (let seed = 1; seed < 4000 && !hit; seed++) {
    const task = generateTask(c.skill, c.diff, seed);
    const meta = (task.meta ?? {}) as Meta;
    const wrong = c.wrong(meta);
    if (isCorrect(task, wrong)) continue; // need a genuinely wrong answer
    const detected = detectMisconception(task, wrong);
    if (detected?.tag === c.tag) {
      hit = true;
      ok(`${c.tag} caught on "${task.prompt}" -> answer "${wrong}"`);
    }
  }
  if (!hit) fail(`${c.tag} never fired across 4000 seeds`);
}

// 3) Correct answers must never be flagged as a misconception.
for (const skill of ['place-value', 'multi-add', 'mult-facts', 'mult-arrays', 'frac-compare', 'frac-equiv']) {
  let clean = true;
  for (let seed = 1; seed < 300; seed++) {
    const task = generateTask(skill, 2, seed);
    // Reconstruct the correct answer from task.answer (already normalized).
    if (!isCorrect(task, task.answer)) { clean = false; break; }
    if (detectMisconception(task, task.answer)) { clean = false; break; }
  }
  clean ? ok(`${skill}: correct answers never mis-flagged`) : fail(`${skill}: a correct answer was flagged or mis-scored`);
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
