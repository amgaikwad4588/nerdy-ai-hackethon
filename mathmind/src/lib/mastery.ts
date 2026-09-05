// Pure mastery math, extracted from the store so it can be unit-tested without zustand /
// AsyncStorage. This is core IP: how a turn moves a skill's mastery and difficulty.

import type { Difficulty } from './types';

// Exponential-moving-average pull rates: correct answers pull toward the signal faster
// than wrong answers pull down (forgiving, but misconceptions still register).
export const MASTERY_RATE_UP = 0.34;
export const MASTERY_RATE_DOWN = 0.22;

export const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
export const clampDifficulty = (n: number): Difficulty => Math.max(1, Math.min(3, n)) as Difficulty;

/** Next mastery (0..1) after a turn: EMA toward `signal`, faster when correct. */
export function nextMastery(prev: number, signal: number, isCorrect: boolean): number {
  const rate = isCorrect ? MASTERY_RATE_UP : MASTERY_RATE_DOWN;
  return clamp01(prev + (signal - prev) * rate);
}

/** Next difficulty (1..3) after applying the turn's delta, clamped. */
export function nextDifficulty(current: number, delta: number): Difficulty {
  return clampDifficulty(current + delta);
}
