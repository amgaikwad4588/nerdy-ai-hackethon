// Tutor dispatcher: route a student turn to a live brain when configured, else to the
// local mock engine. Same TutorResult either way, so the rest of the app is agnostic to
// which brain answered. Preference: Gemini (free key) → Supabase/Claude Edge Function →
// local mock. Any live error falls back locally so a child's session never breaks.

import type { Task, TutorResult } from '../types';
import { geminiConfigured, geminiTutorTurn } from './gemini';
import { mockTutorTurn } from './mock';
import { remoteTutorConfigured, remoteTutorTurn } from './remote';

export const tutorMode: 'live' | 'mock' = geminiConfigured || remoteTutorConfigured ? 'live' : 'mock';

export async function tutorTurn(
  task: Task,
  answer: string,
  thinking?: string,
): Promise<TutorResult> {
  if (geminiConfigured) {
    try {
      return await geminiTutorTurn(task, answer, thinking);
    } catch (err) {
      console.warn('Gemini tutor failed, trying next brain:', err);
    }
  }
  if (remoteTutorConfigured) {
    try {
      return await remoteTutorTurn(task, answer, thinking);
    } catch (err) {
      // Never break the child's session on a network hiccup — fall back locally.
      console.warn('Live tutor failed, using local engine:', err);
    }
  }
  return mockTutorTurn(task, answer, thinking);
}
