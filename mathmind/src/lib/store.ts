// App-wide state: student profile, per-skill mastery + difficulty, session log,
// and the misconception events that feed the teacher dashboard.
//
// Persisted to AsyncStorage so a demo survives reloads. In production these same
// reads/writes would go through Supabase (see lib/supabase.ts); for a single-device
// demo the teacher view reads this shared store directly so it updates live.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { SKILLS } from './curriculum';
import type { Difficulty, MisconceptionEvent, TurnRecord } from './types';

export const MASTERY_THRESHOLD = 0.8; // level at which a skill is "mastered" + game unlocks

export type Role = 'student' | 'teacher';

interface AppState {
  role: Role | null;
  studentName: string;

  mastery: Record<string, number>; // skillId -> 0..1
  difficulty: Record<string, Difficulty>; // skillId -> 1..3
  turns: TurnRecord[];
  events: MisconceptionEvent[];
  xp: number;
  streak: number;

  // actions
  setRole: (role: Role) => void;
  setStudentName: (name: string) => void;
  recordTurn: (turn: TurnRecord) => void;
  resolveOpenEvents: (skillId: string) => void;
  resetProgress: () => void;
  loadDemoData: () => void;
}

const initialDifficulty = (): Record<string, Difficulty> =>
  Object.fromEntries(SKILLS.map((s) => [s.id, 1 as Difficulty]));

const initialMastery = (): Record<string, number> =>
  Object.fromEntries(SKILLS.map((s) => [s.id, 0]));

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
const clampDiff = (n: number): Difficulty => Math.max(1, Math.min(3, n)) as Difficulty;

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      role: null,
      studentName: 'Aanya',
      mastery: initialMastery(),
      difficulty: initialDifficulty(),
      turns: [],
      events: [],
      xp: 0,
      streak: 0,

      setRole: (role) => set({ role }),
      setStudentName: (studentName) => set({ studentName }),

      recordTurn: (turn) =>
        set((state) => {
          const { skillId, result } = turn;
          const prev = state.mastery[skillId] ?? 0;
          // Exponential move toward the turn's mastery signal; correct answers
          // pull up, misconceptions pull down.
          const target = result.masterySignal;
          const rate = result.isCorrect ? 0.34 : 0.22;
          const nextMastery = clamp01(prev + (target - prev) * rate);

          const nextDiff = clampDiff(
            (state.difficulty[skillId] ?? 1) + result.difficultyDelta,
          );

          const events = [...state.events];
          if (result.misconceptionTag) {
            events.unshift({
              id: `${turn.id}-mc`,
              at: turn.at,
              skillId,
              tag: result.misconceptionTag,
              resolved: false,
            });
          }

          return {
            turns: [turn, ...state.turns].slice(0, 200),
            mastery: { ...state.mastery, [skillId]: nextMastery },
            difficulty: { ...state.difficulty, [skillId]: nextDiff },
            events,
            xp: state.xp + (result.isCorrect ? 10 : 2),
            streak: result.isCorrect ? state.streak + 1 : 0,
          };
        }),

      // When the child later answers this skill correctly, close open misconceptions.
      resolveOpenEvents: (skillId) =>
        set((state) => ({
          events: state.events.map((e) =>
            e.skillId === skillId && !e.resolved ? { ...e, resolved: true } : e,
          ),
        })),

      resetProgress: () =>
        set({
          mastery: initialMastery(),
          difficulty: initialDifficulty(),
          turns: [],
          events: [],
          xp: 0,
          streak: 0,
        }),

      // Seeds a believable "story" for the teacher-dashboard demo.
      loadDemoData: () =>
        set(() => {
          const now = Date.now();
          return {
            studentName: 'Aanya',
            mastery: {
              'place-value': 0.92,
              'multi-add': 0.86,
              'mult-facts': 0.7,
              'mult-arrays': 0.45,
              'frac-compare': 0.38,
              'frac-equiv': 0.1,
            },
            difficulty: {
              'place-value': 3,
              'multi-add': 3,
              'mult-facts': 2,
              'mult-arrays': 2,
              'frac-compare': 1,
              'frac-equiv': 1,
            },
            events: [
              {
                id: 'seed-1',
                at: now - 1000 * 60 * 4,
                skillId: 'frac-compare',
                tag: 'bigger-denominator-bigger',
                resolved: false,
              },
              {
                id: 'seed-2',
                at: now - 1000 * 60 * 26,
                skillId: 'mult-arrays',
                tag: 'perimeter-not-area',
                resolved: false,
              },
              {
                id: 'seed-3',
                at: now - 1000 * 60 * 90,
                skillId: 'multi-add',
                tag: 'no-regrouping',
                resolved: true,
              },
            ],
            xp: 340,
            streak: 4,
          };
        }),
    }),
    {
      name: 'mathmind-store-v1',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({
        studentName: s.studentName,
        mastery: s.mastery,
        difficulty: s.difficulty,
        turns: s.turns,
        events: s.events,
        xp: s.xp,
        streak: s.streak,
      }),
    },
  ),
);
