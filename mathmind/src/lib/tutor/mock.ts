// Local, deterministic tutor engine. Uses the misconception bank to produce
// believable Socratic feedback with zero network/keys — so the app is fully
// demoable offline. The remote engine (Edge Function → Claude) returns the same
// TutorResult shape; see ./remote.ts.

import { detectMisconception, isCorrect, SKILL_BY_ID } from '../curriculum';
import type { Task, TutorResult } from '../types';

const praise = [
  'Yes! Walk me through how you knew that.',
  'Nice thinking — that’s exactly right.',
  'You got it. What was the key step for you?',
  'Correct! Tell me the trick you used.',
];

const onTrackNudges = [
  'You’re close. What happens if you try the next step?',
  'Good start — say more about your thinking.',
  'I like where you’re headed. Keep going.',
];

function pickBy(seed: string, arr: string[]): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return arr[Math.abs(h) % arr.length];
}

/**
 * Evaluate a single student turn locally.
 * `thinking` is the child's optional explanation of their reasoning.
 */
export function mockTutorTurn(
  task: Task,
  answer: string,
  thinking?: string,
): TutorResult {
  const correct = isCorrect(task, answer);
  const skill = SKILL_BY_ID[task.skillId];

  if (correct) {
    return {
      isCorrect: true,
      isOnTrack: true,
      misconceptionTag: null,
      message: pickBy(task.id + answer, praise),
      hint: '',
      difficultyDelta: 1,
      masterySignal: 1,
    };
  }

  // Wrong answer — is it a known misconception we can name and scaffold?
  const mc = detectMisconception(task, answer);
  if (mc) {
    return {
      isCorrect: false,
      isOnTrack: false,
      misconceptionTag: mc.tag,
      message: `I see how you got ${answer}. Here’s a way to think about it: ${mc.remediation} Want to try again?`,
      hint: mc.remediation,
      difficultyDelta: -1,
      masterySignal: 0.15,
    };
  }

  // Wrong but not a catalogued misconception — treat as a slip, stay encouraging.
  // If the child explained their thinking, acknowledge it to keep the dialogue going.
  const opener = thinking
    ? 'Thanks for explaining your thinking. '
    : 'Not quite yet. ';
  return {
    isCorrect: false,
    isOnTrack: true,
    misconceptionTag: null,
    message: `${opener}${pickBy(task.id, onTrackNudges)}`,
    hint: `Re-read the ${skill?.title.toLowerCase() ?? 'problem'} slowly and check each number.`,
    difficultyDelta: 0,
    masterySignal: 0.35,
  };
}
