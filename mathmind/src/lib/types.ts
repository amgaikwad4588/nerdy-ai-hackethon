// Shared domain types for MathMind.

export type Domain =
  | 'base-ten'
  | 'operations'
  | 'fractions';

export type Difficulty = 1 | 2 | 3;

export interface Skill {
  id: string;
  code: string; // Common Core-style code, e.g. "3.NBT.A.1"
  title: string;
  domain: Domain;
  grade: 3 | 4 | 5;
  prereqIds: string[];
}

/**
 * A known misconception for a skill. This bank is the educational-rigor core:
 * `detect` recognizes the misconception from a wrong answer so the tutor can
 * name it and scaffold, and `remediation` seeds the nudge back on track.
 */
export interface Misconception {
  tag: string;
  skillId: string;
  description: string; // teacher-facing, what the child believes
  detect: (task: Task, answer: string) => boolean;
  remediation: string; // the scaffolding idea (not the answer)
}

export type TaskKind = 'choice' | 'input';

export interface Task {
  id: string;
  skillId: string;
  difficulty: Difficulty;
  prompt: string; // the question, kid-readable
  answer: string; // canonical correct answer, normalized lowercase/no spaces
  choices?: string[]; // present when kind === 'choice'
  kind: TaskKind;
  // Extra structured context some skills need (e.g. the two fractions compared).
  meta?: Record<string, number | string>;
}

/** What the tutor returns for a single student turn. Deterministic app logic. */
export interface TutorResult {
  isCorrect: boolean;
  isOnTrack: boolean; // reasoning heading the right way even if not done
  misconceptionTag: string | null;
  message: string; // the tutor's spoken reply (Socratic, age 8-11)
  hint: string; // concrete next nudge
  difficultyDelta: -1 | 0 | 1;
  masterySignal: number; // 0..1 contribution toward mastery this turn
}

export interface TurnRecord {
  id: string;
  at: number;
  skillId: string;
  taskId: string;
  studentAnswer: string;
  studentThinking?: string;
  result: TutorResult;
}

export interface MisconceptionEvent {
  id: string;
  at: number;
  skillId: string;
  tag: string;
  resolved: boolean;
}
