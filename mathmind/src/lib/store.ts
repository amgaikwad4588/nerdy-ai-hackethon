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
import { nextDifficulty, nextMastery } from './mastery';
import type { Difficulty, MisconceptionEvent, TurnRecord } from './types';

export const MASTERY_THRESHOLD = 0.8; // level at which a skill is "mastered" + game unlocks

export type Role = 'student' | 'teacher';

/** A student as seen on the teacher's roster (a snapshot; Supabase would back this). */
export interface ClassStudent {
  id: string;
  name: string;
  grade: 3 | 4 | 5;
  mastery: Record<string, number>;
  events: MisconceptionEvent[];
}

export interface Classroom {
  name: string;
  code: string; // join code students enter
  teacherName: string;
}

export interface AppSettings {
  readAloud: boolean; // Milo speaks aloud (TTS)
  captions: boolean; // show on-screen subtitles of what's spoken
  reduceMotion: boolean; // calm the animations (buddy bob, game flourishes)
  readableFont: boolean; // swap handwriting for a plain, legible font (dyslexia-friendlier)
  highContrast: boolean; // darker, bolder text for low-vision
}

interface AppState {
  role: Role | null;
  studentName: string;

  mastery: Record<string, number>; // skillId -> 0..1
  difficulty: Record<string, Difficulty>; // skillId -> 1..3
  turns: TurnRecord[];
  events: MisconceptionEvent[];
  xp: number;
  streak: number;
  settings: AppSettings;
  scoreEligible: boolean; // camera-on during study → eligible for the game scoreboard
  classroom: Classroom | null; // the class this device is signed into
  roster: ClassStudent[]; // students in the class (teacher view)

  // actions
  setRole: (role: Role) => void;
  setStudentName: (name: string) => void;
  setSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
  setScoreEligible: (v: boolean) => void;
  createClass: (className: string, teacherName: string) => void;
  joinClass: (code: string, studentName: string) => void;
  recordTurn: (turn: TurnRecord) => void;
  resolveOpenEvents: (skillId: string) => void;
  resetProgress: () => void;
  loadDemoData: () => void;
}

const genCode = () => Math.random().toString(36).slice(2, 6).toUpperCase();

const initialDifficulty = (): Record<string, Difficulty> =>
  Object.fromEntries(SKILLS.map((s) => [s.id, 1 as Difficulty]));

const initialMastery = (): Record<string, number> =>
  Object.fromEntries(SKILLS.map((s) => [s.id, 0]));

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
      settings: { readAloud: true, captions: true, reduceMotion: false, readableFont: false, highContrast: false },
      scoreEligible: false,
      classroom: null,
      roster: [],

      setRole: (role) => set({ role }),
      setStudentName: (studentName) => set({ studentName }),
      setSetting: (key, value) =>
        set((state) => ({ settings: { ...state.settings, [key]: value } })),
      setScoreEligible: (scoreEligible) => set({ scoreEligible }),

      // Teacher creates a class → a join code students enter. (Supabase would persist this
      // and scope rows via RLS; here it's local for the demo.)
      createClass: (className, teacherName) =>
        set((s) => ({
          role: 'teacher',
          classroom: s.classroom ?? { name: className || 'My Class', code: genCode(), teacherName: teacherName || 'Teacher' },
        })),

      // Student joins with a code + name → added to the roster with their current snapshot.
      joinClass: (code, studentName) =>
        set((s) => {
          const name = studentName || 'Student';
          const already = s.roster.some((r) => r.name.toLowerCase() === name.toLowerCase());
          const me: ClassStudent = { id: `me-${Date.now()}`, name, grade: 3, mastery: { ...s.mastery }, events: [...s.events] };
          return {
            role: 'student',
            studentName: name,
            classroom: s.classroom ?? { name: 'Room 3B', code: (code || genCode()).toUpperCase(), teacherName: 'Ms. Rivera' },
            roster: already ? s.roster : [...s.roster, me],
          };
        }),

      recordTurn: (turn) =>
        set((state) => {
          const { skillId, result } = turn;
          const prev = state.mastery[skillId] ?? 0;
          // EMA toward the turn's mastery signal (correct pulls up, misconceptions down)
          // + a bounded difficulty step — pure functions in ./mastery for testability.
          const nextMasteryVal = nextMastery(prev, result.masterySignal, result.isCorrect);
          const nextDiff = nextDifficulty(state.difficulty[skillId] ?? 1, result.difficultyDelta);

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
            mastery: { ...state.mastery, [skillId]: nextMasteryVal },
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
            classroom: { name: 'Room 3B', code: 'MATH42', teacherName: 'Ms. Rivera' },
            roster: [
              {
                id: 'stu-aanya',
                name: 'Aanya',
                grade: 3,
                mastery: { 'place-value': 0.92, 'multi-add': 0.86, 'mult-facts': 0.7, 'mult-arrays': 0.45, 'frac-compare': 0.38, 'frac-equiv': 0.1 },
                events: [
                  { id: 'r-a1', at: now - 1000 * 60 * 4, skillId: 'frac-compare', tag: 'bigger-denominator-bigger', resolved: false },
                ],
              },
              {
                id: 'stu-veer',
                name: 'Veer',
                grade: 3,
                mastery: { 'place-value': 0.7, 'multi-add': 0.5, 'mult-facts': 0.9, 'mult-arrays': 0.8, 'frac-compare': 0.6, 'frac-equiv': 0.4 },
                events: [
                  { id: 'r-v1', at: now - 1000 * 60 * 12, skillId: 'multi-add', tag: 'no-regrouping', resolved: false },
                ],
              },
              {
                id: 'stu-mei',
                name: 'Mei',
                grade: 3,
                mastery: { 'place-value': 0.95, 'multi-add': 0.9, 'mult-facts': 0.88, 'mult-arrays': 0.82, 'frac-compare': 0.8, 'frac-equiv': 0.72 },
                events: [],
              },
              {
                id: 'stu-diego',
                name: 'Diego',
                grade: 3,
                mastery: { 'place-value': 0.4, 'multi-add': 0.3, 'mult-facts': 0.55, 'mult-arrays': 0.35, 'frac-compare': 0.2, 'frac-equiv': 0.05 },
                events: [
                  { id: 'r-d1', at: now - 1000 * 60 * 8, skillId: 'mult-facts', tag: 'add-instead-of-multiply', resolved: false },
                  { id: 'r-d2', at: now - 1000 * 60 * 30, skillId: 'mult-arrays', tag: 'added-rows-and-columns', resolved: false },
                ],
              },
              {
                id: 'stu-sara',
                name: 'Sara',
                grade: 3,
                mastery: { 'place-value': 0.82, 'multi-add': 0.75, 'mult-facts': 0.6, 'mult-arrays': 0.5, 'frac-compare': 0.9, 'frac-equiv': 0.85 },
                events: [
                  { id: 'r-s1', at: now - 1000 * 60 * 50, skillId: 'mult-facts', tag: 'skip-count-short', resolved: false },
                ],
              },
            ],
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
        settings: s.settings,
        classroom: s.classroom,
        roster: s.roster,
      }),
    },
  ),
);
