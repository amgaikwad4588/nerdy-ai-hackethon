// Tutor dispatcher: route a student turn to the live Claude-backed Edge Function
// when configured, otherwise to the local mock engine. Same TutorResult either way,
// so the rest of the app is agnostic to which brain answered.

import type { Task, TutorResult } from '../types';
import { mockTutorTurn } from './mock';
import { remoteTutorConfigured, remoteTutorTurn } from './remote';

export const tutorMode: 'live' | 'mock' = remoteTutorConfigured ? 'live' : 'mock';

export async function tutorTurn(
  task: Task,
  answer: string,
  thinking?: string,
): Promise<TutorResult> {
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
