// The MathMind curriculum: a small grades 3-5 skill graph, deterministic
// micro-task generators, and the misconception bank the tutor reasons over.
//
// Kept intentionally narrow (6 skills / 2 domains) so the demo is deep, not wide.

import type { Difficulty, Misconception, Skill, Task } from './types';

export const SKILLS: Skill[] = [
  {
    id: 'place-value',
    code: '3.NBT.A.1',
    title: 'Place Value',
    domain: 'base-ten',
    grade: 3,
    prereqIds: [],
  },
  {
    id: 'multi-add',
    code: '3.NBT.A.2',
    title: 'Multi-digit Addition',
    domain: 'base-ten',
    grade: 3,
    prereqIds: ['place-value'],
  },
  {
    id: 'mult-facts',
    code: '3.OA.C.7',
    title: 'Multiplication Facts',
    domain: 'operations',
    grade: 3,
    prereqIds: [],
  },
  {
    id: 'mult-arrays',
    code: '3.OA.A.3',
    title: 'Arrays & Area',
    domain: 'operations',
    grade: 3,
    prereqIds: ['mult-facts'],
  },
  {
    id: 'frac-compare',
    code: '3.NF.A.3d',
    title: 'Comparing Fractions',
    domain: 'fractions',
    grade: 3,
    prereqIds: [],
  },
  {
    id: 'frac-equiv',
    code: '4.NF.A.1',
    title: 'Equivalent Fractions',
    domain: 'fractions',
    grade: 4,
    prereqIds: ['frac-compare'],
  },
];

export const SKILL_BY_ID: Record<string, Skill> = Object.fromEntries(
  SKILLS.map((s) => [s.id, s]),
);

export const DOMAIN_LABEL: Record<string, string> = {
  'base-ten': 'Number & Base Ten',
  operations: 'Multiplication',
  fractions: 'Fractions',
};

// ---------------------------------------------------------------------------
// Deterministic PRNG so a given seed always yields the same task (repeatable
// demos, and the same task can be reconstructed server-side).
// ---------------------------------------------------------------------------
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(rng: () => number, arr: T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, '');

// ---------------------------------------------------------------------------
// Task generators, one per skill. Each returns a Task at a difficulty (1-3).
// ---------------------------------------------------------------------------
type Generator = (rng: () => number, difficulty: Difficulty, id: string) => Task;

const generators: Record<string, Generator> = {
  'place-value': (rng, difficulty, id) => {
    const digits = difficulty + 2; // 3..5 digit numbers
    const min = 10 ** (digits - 1);
    const n = Math.floor(min + rng() * (min * 9 - 1));
    const places = ['ones', 'tens', 'hundreds', 'thousands', 'ten-thousands'];
    const placeIdx = Math.floor(rng() * digits);
    const digit = Math.floor(n / 10 ** placeIdx) % 10;
    return {
      id,
      skillId: 'place-value',
      difficulty,
      kind: 'input',
      prompt: `In the number ${n}, what is the value of the ${places[placeIdx]} digit?`,
      answer: norm(String(digit * 10 ** placeIdx)),
      meta: { n, placeIdx, digit },
    };
  },

  'multi-add': (rng, difficulty, id) => {
    const cap = [40, 400, 4000][difficulty - 1];
    // Bias toward addends that force regrouping (the whole point of the skill).
    const a = Math.floor(cap / 2 + rng() * (cap / 2));
    const b = Math.floor(cap / 2 + rng() * (cap / 2));
    return {
      id,
      skillId: 'multi-add',
      difficulty,
      kind: 'input',
      prompt: `What is ${a} + ${b}?`,
      answer: norm(String(a + b)),
      meta: { a, b },
    };
  },

  'mult-facts': (rng, difficulty, id) => {
    const hi = [6, 9, 12][difficulty - 1];
    const a = 2 + Math.floor(rng() * (hi - 1));
    const b = 2 + Math.floor(rng() * (hi - 1));
    return {
      id,
      skillId: 'mult-facts',
      difficulty,
      kind: 'input',
      prompt: `What is ${a} × ${b}?`,
      answer: norm(String(a * b)),
      meta: { a, b },
    };
  },

  'mult-arrays': (rng, difficulty, id) => {
    const hi = [4, 6, 9][difficulty - 1];
    const rows = 2 + Math.floor(rng() * (hi - 1));
    const cols = 2 + Math.floor(rng() * (hi - 1));
    return {
      id,
      skillId: 'mult-arrays',
      difficulty,
      kind: 'input',
      prompt: `An array has ${rows} rows with ${cols} dots in each row. How many dots in all?`,
      answer: norm(String(rows * cols)),
      meta: { rows, cols },
    };
  },

  'frac-compare': (rng, difficulty, id) => {
    // Difficulty 1-2: same numerator (the classic denominator trap).
    // Difficulty 3: different numerators, still unit-friendly.
    let n1: number, d1: number, n2: number, d2: number;
    if (difficulty < 3) {
      const num = pick(rng, [1, 2, 3]);
      // Keep proper fractions (< 1): denominators strictly greater than the numerator.
      const ds = [2, 3, 4, 6, 8].filter((d) => d > num);
      d1 = pick(rng, ds);
      do {
        d2 = pick(rng, ds);
      } while (d2 === d1);
      n1 = num;
      n2 = num;
    } else {
      d1 = pick(rng, [2, 4]);
      d2 = pick(rng, [3, 6]);
      n1 = 1 + Math.floor(rng() * (d1 - 1));
      n2 = 1 + Math.floor(rng() * (d2 - 1));
    }
    const v1 = n1 / d1;
    const v2 = n2 / d2;
    const answer = v1 > v2 ? `${n1}/${d1}` : v2 > v1 ? `${n2}/${d2}` : 'equal';
    return {
      id,
      skillId: 'frac-compare',
      difficulty,
      kind: 'choice',
      prompt: `Which is bigger: ${n1}/${d1} or ${n2}/${d2}?`,
      choices: [`${n1}/${d1}`, `${n2}/${d2}`, 'They are equal'],
      answer: norm(answer === 'equal' ? 'theyareequal' : answer),
      meta: { n1, d1, n2, d2 },
    };
  },

  'frac-equiv': (rng, difficulty, id) => {
    const base = pick(rng, [
      [1, 2],
      [1, 3],
      [2, 3],
      [3, 4],
    ]);
    const k = 2 + Math.floor(rng() * (difficulty + 1));
    const [n, d] = base;
    return {
      id,
      skillId: 'frac-equiv',
      difficulty,
      kind: 'input',
      prompt: `Fill in the blank: ${n}/${d} = ___/${d * k}`,
      answer: norm(String(n * k)),
      meta: { n, d, k, targetDen: d * k },
    };
  },
};

/** Build a deterministic task for a skill+difficulty from a seed. */
export function generateTask(
  skillId: string,
  difficulty: Difficulty,
  seed: number,
): Task {
  const rng = mulberry32(seed);
  const id = `${skillId}-${difficulty}-${seed}`;
  return generators[skillId](rng, difficulty, id);
}

export function isCorrect(task: Task, answer: string): boolean {
  return norm(answer) === task.answer;
}

// ---------------------------------------------------------------------------
// Misconception bank. `detect` fires when a *wrong* answer matches the exact
// mistake a child with this misconception would make.
// ---------------------------------------------------------------------------
export const MISCONCEPTIONS: Misconception[] = [
  {
    tag: 'bigger-denominator-bigger',
    skillId: 'frac-compare',
    description:
      'Thinks the fraction with the bigger denominator is larger (8 > 4, so 1/8 > 1/4).',
    remediation:
      'More equal pieces means each piece is smaller. Picture one pizza cut into 8 vs 4 slices.',
    detect: (task, answer) => {
      const { n1, d1, n2, d2 } = task.meta as Record<string, number>;
      const chose = norm(answer);
      const biggerDen = d1 > d2 ? `${n1}/${d1}` : `${n2}/${d2}`;
      const v1 = n1 / d1;
      const v2 = n2 / d2;
      // Only a misconception if they picked the bigger-denominator one AND it's wrong.
      return chose === norm(biggerDen) && !((d1 > d2 ? v1 : v2) >= Math.max(v1, v2));
    },
  },
  {
    tag: 'add-same-to-both',
    skillId: 'frac-equiv',
    description:
      'Builds equivalents by adding the same number to top and bottom instead of multiplying.',
    remediation:
      'Equivalent fractions come from multiplying top and bottom by the SAME factor, not adding.',
    detect: (task, answer) => {
      const { n, d, k, targetDen } = task.meta as Record<string, number>;
      const added = targetDen - d; // what they'd add to the denominator
      return norm(answer) === norm(String(n + added)) && n + added !== n * k;
    },
  },
  {
    tag: 'no-regrouping',
    skillId: 'multi-add',
    description:
      'Adds each column independently and writes both digits, skipping the carry.',
    remediation:
      'When a column adds past 9, carry the ten into the next column. Line up ones under ones.',
    detect: (task, answer) => {
      const { a, b } = task.meta as Record<string, number>;
      // Concatenating column sums without carrying, e.g. 27+15 -> "3","12" -> 312.
      const as = String(a).padStart(String(b).length, '0');
      const bs = String(b).padStart(String(a).length, '0');
      let digits = '';
      for (let i = 0; i < as.length; i++) {
        digits += String(Number(as[i]) + Number(bs[i]));
      }
      return norm(answer) === norm(digits) && Number(digits) !== a + b;
    },
  },
  {
    tag: 'add-instead-of-multiply',
    skillId: 'mult-facts',
    description: 'Adds the two factors instead of multiplying them (4×3 = 7).',
    remediation:
      'Multiplication is repeated addition: 4 × 3 means three groups of four. Skip-count it.',
    detect: (task, answer) => {
      const { a, b } = task.meta as Record<string, number>;
      return norm(answer) === norm(String(a + b)) && a + b !== a * b;
    },
  },
  {
    tag: 'skip-count-short',
    skillId: 'mult-facts',
    description: 'Skip-counts but stops one group early (counts 4 × 3 as 4 + 4 = 8).',
    remediation:
      'Count every group. 4 × 3 is three fours: 4, 8, 12 — don’t stop a group early.',
    detect: (task, answer) => {
      const { a, b } = task.meta as Record<string, number>;
      const val = Number(norm(answer));
      return (val === a * (b - 1) || val === (a - 1) * b) && val !== a * b;
    },
  },
  {
    tag: 'perimeter-not-area',
    skillId: 'mult-arrays',
    description: 'Counts the outside edge (perimeter) instead of the whole array (area).',
    remediation:
      'Count every dot inside, not just the border. Rows × columns fills the whole rectangle.',
    detect: (task, answer) => {
      const { rows, cols } = task.meta as Record<string, number>;
      const perimeter = 2 * (rows + cols) - 4;
      return norm(answer) === norm(String(perimeter)) && perimeter !== rows * cols;
    },
  },
  {
    tag: 'added-rows-and-columns',
    skillId: 'mult-arrays',
    description: 'Adds the rows and columns instead of multiplying them (3 rows, 4 cols → 7).',
    remediation:
      'Every row has the same number of dots. Multiply rows × columns to fill the whole array.',
    detect: (task, answer) => {
      const { rows, cols } = task.meta as Record<string, number>;
      return norm(answer) === norm(String(rows + cols)) && rows + cols !== rows * cols;
    },
  },
  {
    tag: 'scaled-denominator-only',
    skillId: 'frac-equiv',
    description: 'Scales the denominator but leaves the numerator unchanged (1/2 = 1/6).',
    remediation:
      'Whatever you multiply the bottom by, multiply the top by the same amount.',
    detect: (task, answer) => {
      const { n, k } = task.meta as Record<string, number>;
      return norm(answer) === norm(String(n)) && n !== n * k;
    },
  },
  {
    tag: 'ignored-place-zero',
    skillId: 'place-value',
    description: 'Reads the digit value but ignores its place (says 3 instead of 300).',
    remediation:
      'A digit’s value depends on its column. The 3 in 305 sits in the hundreds place, so it is 300.',
    detect: (task, answer) => {
      const { digit } = task.meta as Record<string, number>;
      return norm(answer) === norm(String(digit)) && norm(answer) !== task.answer;
    },
  },
];

export const MISCONCEPTIONS_BY_SKILL: Record<string, Misconception[]> = SKILLS.reduce(
  (acc, s) => {
    acc[s.id] = MISCONCEPTIONS.filter((m) => m.skillId === s.id);
    return acc;
  },
  {} as Record<string, Misconception[]>,
);

/** Find the misconception (if any) that explains a wrong answer. */
export function detectMisconception(task: Task, answer: string) {
  return (
    MISCONCEPTIONS_BY_SKILL[task.skillId]?.find((m) => m.detect(task, answer)) ?? null
  );
}
