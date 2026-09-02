// Calls the Supabase Edge Function (which calls Claude) for a tutor turn.
// Used when EXPO_PUBLIC_SUPABASE_URL is configured; otherwise the app falls back
// to the local mock engine (see ./index.ts). Keys never live in the client — the
// Edge Function holds the Anthropic key and returns the structured TutorResult.

import { MISCONCEPTIONS_BY_SKILL, SKILL_BY_ID } from '../curriculum';
import type { Task, TutorResult } from '../types';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const remoteTutorConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

export async function remoteTutorTurn(
  task: Task,
  answer: string,
  thinking?: string,
): Promise<TutorResult> {
  const skill = SKILL_BY_ID[task.skillId];
  const misconceptions = MISCONCEPTIONS_BY_SKILL[task.skillId].map((m) => ({
    tag: m.tag,
    description: m.description,
    remediation: m.remediation,
  }));

  const res = await fetch(`${SUPABASE_URL}/functions/v1/tutor-turn`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({
      skill: { title: skill.title, code: skill.code, grade: skill.grade },
      task: { prompt: task.prompt, correctAnswer: task.answer, difficulty: task.difficulty },
      studentAnswer: answer,
      studentThinking: thinking ?? '',
      misconceptions,
    }),
  });

  if (!res.ok) {
    throw new Error(`tutor-turn failed: ${res.status} ${await res.text()}`);
  }
  return (await res.json()) as TutorResult;
}
