// Live tutor brain backed by Google Gemini (free tier). Used when
// EXPO_PUBLIC_GEMINI_API_KEY is set; the dispatcher (./index.ts) falls back to the local
// mock on any error, so a network/quota/CORS hiccup never breaks a child's session.
//
// Structured output: we ask Gemini for JSON matching TutorResult via responseSchema, then
// enforce correctness locally (we already know the right answer) so app logic stays
// deterministic — the model supplies the *coaching*, not the grading.

import { isCorrect, MISCONCEPTIONS_BY_SKILL, SKILL_BY_ID } from '../curriculum';
import type { Task, TutorResult } from '../types';

const GEMINI_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
const MODEL = process.env.EXPO_PUBLIC_GEMINI_MODEL || 'gemini-2.0-flash';

export const geminiConfigured = Boolean(GEMINI_KEY);

const endpoint = (model: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_KEY}`;

const TUTOR_SYSTEM = `You are Milo, a warm, playful fox math tutor for children aged 8-11 (US grades 3-5).
You coach the child about their THINKING using the Socratic method — never just give the answer.
Rules:
- "message" is what you say aloud: 1-2 short, encouraging sentences. Plain kid English. NO emojis.
- If the child's wrong answer matches one of the listed misconceptions, set "misconceptionTag" to that tag and gently scaffold using its remediation idea (as a question, not the answer).
- If wrong but no listed misconception fits, set misconceptionTag to "none" and nudge them to re-check a step.
- If correct, celebrate briefly and ask what strategy they used.
- "hint" is one concrete next step (empty string if they were correct).
- "difficultyDelta": +1 if correct and confident, -1 if a real misconception, else 0.
- "masterySignal": 0..1, higher when the reasoning is sound.`;

const TUTOR_SCHEMA = {
  type: 'OBJECT',
  properties: {
    isCorrect: { type: 'BOOLEAN' },
    isOnTrack: { type: 'BOOLEAN' },
    misconceptionTag: { type: 'STRING' },
    message: { type: 'STRING' },
    hint: { type: 'STRING' },
    difficultyDelta: { type: 'INTEGER' },
    masterySignal: { type: 'NUMBER' },
  },
  required: ['isCorrect', 'isOnTrack', 'misconceptionTag', 'message', 'hint', 'difficultyDelta', 'masterySignal'],
} as const;

async function generate(body: unknown): Promise<string> {
  const res = await fetch(endpoint(MODEL), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`gemini ${res.status}: ${await res.text()}`);
  const json = await res.json();
  const text: string | undefined = json?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('gemini: empty response');
  return text;
}

export async function geminiTutorTurn(task: Task, answer: string, thinking?: string): Promise<TutorResult> {
  const skill = SKILL_BY_ID[task.skillId];
  const misconceptions = MISCONCEPTIONS_BY_SKILL[task.skillId].map((m) => ({
    tag: m.tag,
    description: m.description,
    remediation: m.remediation,
  }));
  const correct = isCorrect(task, answer);

  const userPrompt = [
    `Skill: ${skill.title} (grade ${skill.grade}, ${skill.code}).`,
    `Problem: ${task.prompt}`,
    `Correct answer: ${task.answer}`,
    `Child's answer: ${answer}  (this is ${correct ? 'CORRECT' : 'WRONG'})`,
    thinking ? `Child explained their thinking: "${thinking}"` : `Child gave no explanation.`,
    `Known misconceptions for this skill (tag — belief — remediation):`,
    ...misconceptions.map((m) => `- ${m.tag} — ${m.description} — ${m.remediation}`),
    `Respond as JSON per the schema.`,
  ].join('\n');

  const text = await generate({
    systemInstruction: { parts: [{ text: TUTOR_SYSTEM }] },
    contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
    generationConfig: { responseMimeType: 'application/json', responseSchema: TUTOR_SCHEMA, temperature: 0.6 },
  });

  const raw = JSON.parse(text) as Partial<TutorResult> & { misconceptionTag?: string };
  const delta = Math.max(-1, Math.min(1, Math.round(Number(raw.difficultyDelta ?? 0)))) as -1 | 0 | 1;
  const tag = raw.misconceptionTag && raw.misconceptionTag !== 'none' ? raw.misconceptionTag : null;

  return {
    // Grade deterministically; the model provides the coaching, not the verdict.
    isCorrect: correct,
    isOnTrack: correct ? true : Boolean(raw.isOnTrack),
    misconceptionTag: correct ? null : tag,
    message: String(raw.message ?? '').trim() || (correct ? 'Nice work — how did you figure it out?' : "Let's take another look."),
    hint: correct ? '' : String(raw.hint ?? '').trim(),
    difficultyDelta: delta,
    masterySignal: Math.max(0, Math.min(1, Number(raw.masterySignal ?? (correct ? 1 : 0.2)))),
  };
}

/** A short, personalized Milo line for a game-over screen. Returns null if unavailable. */
export async function geminiCoachLine(summary: string): Promise<string | null> {
  if (!geminiConfigured) return null;
  try {
    const text = await generate({
      systemInstruction: {
        parts: [
          {
            text: `You are Milo, a friendly fox math coach for kids aged 8-11. Given a short performance summary, reply with ONE upbeat, specific coaching sentence (max 22 words). Plain kid English, no emojis, no quotes.`,
          },
        ],
      },
      contents: [{ role: 'user', parts: [{ text: summary }] }],
      generationConfig: { temperature: 0.9 },
    });
    return text.trim().replace(/^["']|["']$/g, '');
  } catch {
    return null;
  }
}
