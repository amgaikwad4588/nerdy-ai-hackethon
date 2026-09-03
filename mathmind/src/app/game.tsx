import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BigButton } from '@/components/big-button';
import { PaperBg, SketchSurface, StickyTag } from '@/components/sketch';
import { ThemedText } from '@/components/themed-text';
import { Brand, HandFonts, MaxContentWidth, Spacing, Wobbly, offsetShadow } from '@/constants/theme';
import { useStore } from '@/lib/store';
import type { Difficulty } from '@/lib/types';

// Math Sprint: a fast, competitive arithmetic race. Answer as many as you can before
// the timer runs out; a combo multiplier rewards streaks. You race a class leaderboard
// live, and see your rank at the end. Every correct answer feeds a mastery signal.

const SPRINT_SECONDS = 30;
const ROUND_MS = { hit: 160, miss: 420 };

// The rest of the class you're racing. Their scores get a little jitter each round.
const CLASSMATES = [
  { name: 'Maya', base: 280 },
  { name: 'Zara', base: 240 },
  { name: 'Leo', base: 200 },
  { name: 'Ada', base: 170 },
  { name: 'Kai', base: 140 },
];

interface Problem {
  prompt: string;
  answer: number;
  choices: number[];
}

const rnd = (n: number) => Math.floor(Math.random() * n);

function makeChoices(answer: number): number[] {
  const set = new Set<number>([answer]);
  while (set.size < 4) {
    const delta = rnd(9) + 1;
    const cand = answer + (Math.random() < 0.5 ? -delta : delta);
    if (cand >= 0) set.add(cand);
  }
  return [...set].sort(() => Math.random() - 0.5);
}

function makeProblem(diff: Difficulty): Problem {
  const ops = diff >= 2 ? (['+', '-', '×'] as const) : (['+', '×'] as const);
  const op = ops[rnd(ops.length)];
  let a: number, b: number, answer: number;
  if (op === '×') {
    const hi = [6, 9, 12][diff - 1];
    a = 2 + rnd(hi - 1);
    b = 2 + rnd(hi - 1);
    answer = a * b;
  } else if (op === '+') {
    const cap = [20, 50, 100][diff - 1];
    a = 1 + rnd(cap);
    b = 1 + rnd(cap);
    answer = a + b;
  } else {
    const cap = [20, 50, 100][diff - 1];
    a = 1 + rnd(cap);
    b = 1 + rnd(a); // keep it non-negative
    answer = a - b;
  }
  return { prompt: `${a} ${op} ${b}`, answer, choices: makeChoices(answer) };
}

export default function Game() {
  const router = useRouter();
  const studentName = useStore((s) => s.studentName);
  const diff = (useStore((s) => s.difficulty['mult-facts']) ?? 1) as Difficulty;
  const recordTurn = useStore((s) => s.recordTurn);

  const [phase, setPhase] = useState<'ready' | 'playing' | 'over'>('ready');
  const [problem, setProblem] = useState<Problem>(() => makeProblem(diff));
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [best, setBest] = useState(0);
  const [timeLeft, setTimeLeft] = useState(SPRINT_SECONDS);
  const [flash, setFlash] = useState<{ index: number; ok: boolean } | null>(null);
  const locked = useRef(false);

  // Fixed classmate scores for this round.
  const rivals = useMemo(
    () => CLASSMATES.map((c) => ({ name: c.name, score: Math.max(0, c.base + rnd(61) - 30) })),
    [phase === 'ready'], // re-roll each time we return to the ready screen
  );

  const rank = 1 + rivals.filter((r) => r.score > score).length;

  // Countdown.
  useEffect(() => {
    if (phase !== 'playing') return;
    const id = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(id);
          setBest((b) => Math.max(b, score));
          setPhase('over');
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [phase, score]);

  const start = useCallback(() => {
    setScore(0);
    setCombo(0);
    setTimeLeft(SPRINT_SECONDS);
    setProblem(makeProblem(diff));
    setFlash(null);
    locked.current = false;
    setPhase('playing');
  }, [diff]);

  function answer(index: number) {
    if (locked.current || phase !== 'playing') return;
    const chosen = problem.choices[index];
    const ok = chosen === problem.answer;
    locked.current = true;
    setFlash({ index, ok });

    if (ok) {
      setScore((s) => s + 10 + combo * 2); // streaks pay off
      setCombo((c) => c + 1);
      recordTurn({
        id: `sprint-${Date.now()}`,
        at: Date.now(),
        skillId: 'mult-facts',
        taskId: 'sprint',
        studentAnswer: String(chosen),
        result: {
          isCorrect: true,
          isOnTrack: true,
          misconceptionTag: null,
          message: '',
          hint: '',
          difficultyDelta: 0,
          masterySignal: 0.8,
        },
      });
    } else {
      setCombo(0);
    }

    setTimeout(() => {
      setFlash(null);
      setProblem(makeProblem(diff));
      locked.current = false;
    }, ok ? ROUND_MS.hit : ROUND_MS.miss);
  }

  // ---- READY ----------------------------------------------------------------
  if (phase === 'ready') {
    const board = [...rivals].sort((a, b) => b.score - a.score);
    return (
      <SafeAreaView style={styles.safe}>
        <PaperBg />
        <View style={styles.container}>
          <StickyTag label="MATH SPRINT" rotate={-3} style={{ alignSelf: 'center' }} />
          <ThemedText type="title" style={styles.bigTitle}>
            Beat the class!
          </ThemedText>
          <ThemedText type="small" style={styles.center}>
            Answer as many as you can in {SPRINT_SECONDS} seconds. Streaks score extra.
          </ThemedText>

          <SketchSurface radius="md" shadow={5} rotate={-0.5} style={{ marginTop: Spacing.two }}>
            <ThemedText type="smallBold" style={{ marginBottom: Spacing.two }}>
              TODAY&apos;S CLASS SCORES
            </ThemedText>
            {board.map((r, i) => (
              <View key={r.name} style={styles.boardRow}>
                <ThemedText type="smallBold" color={Brand.muted}>#{i + 1}</ThemedText>
                <ThemedText style={{ flex: 1 }}>{r.name}</ThemedText>
                <ThemedText type="smallBold">{r.score}</ThemedText>
              </View>
            ))}
          </SketchSurface>

          {best > 0 && (
            <ThemedText type="small" style={styles.center}>
              Your best so far: {best}
            </ThemedText>
          )}
          <BigButton label="Start sprint" variant="primary" onPress={start} style={{ marginTop: Spacing.two }} />
          <BigButton label="Back home" variant="ghost" tint={Brand.ink} onPress={() => router.replace('/')} />
        </View>
      </SafeAreaView>
    );
  }

  // ---- OVER -----------------------------------------------------------------
  if (phase === 'over') {
    const board = [...rivals, { name: `${studentName} (you)`, score, you: true }].sort(
      (a, b) => b.score - a.score,
    );
    const myRank = board.findIndex((r) => (r as { you?: boolean }).you) + 1;
    const medal = myRank === 1 ? 'first' : myRank === 2 ? 'second' : myRank === 3 ? 'third' : '';
    return (
      <SafeAreaView style={styles.safe}>
        <PaperBg />
        <View style={styles.centered}>
          <SketchSurface decoration="tack" rotate={-1} shadow={6} radius="lg" style={{ gap: Spacing.two }}>
            <ThemedText type="smallBold" color={Brand.muted} style={styles.center}>
              TIME&apos;S UP
            </ThemedText>
            <ThemedText type="title" style={[styles.bigTitle, { color: Brand.blue }]}>
              {score} pts
            </ThemedText>
            <View style={styles.rankBadge}>
              <ThemedText type="smallBold" color="#fff" style={{ fontSize: 18 }}>
                You ranked #{myRank} of {board.length}
                {medal ? ` — ${medal} place` : ''}
              </ThemedText>
            </View>

            <View style={{ marginTop: Spacing.two }}>
              {board.map((r, i) => {
                const you = (r as { you?: boolean }).you;
                return (
                  <View
                    key={r.name}
                    style={[
                      styles.boardRow,
                      you && styles.youRow,
                    ]}
                  >
                    <ThemedText type="smallBold" color={you ? Brand.accent : Brand.muted}>
                      #{i + 1}
                    </ThemedText>
                    <ThemedText style={{ flex: 1 }} color={you ? Brand.accent : Brand.ink}>
                      {r.name}
                    </ThemedText>
                    <ThemedText type="smallBold" color={you ? Brand.accent : Brand.ink}>
                      {r.score}
                    </ThemedText>
                  </View>
                );
              })}
            </View>

            <BigButton label="Race again" variant="primary" onPress={start} style={{ marginTop: Spacing.two }} />
            <BigButton label="Back home" variant="ghost" tint={Brand.ink} onPress={() => router.replace('/')} />
          </SketchSurface>
        </View>
      </SafeAreaView>
    );
  }

  // ---- PLAYING --------------------------------------------------------------
  const timePct = timeLeft / SPRINT_SECONDS;
  const low = timeLeft <= 10;
  return (
    <SafeAreaView style={styles.safe}>
      <PaperBg />
      <View style={styles.container}>
        {/* Timer + live rank */}
        <View style={styles.topRow}>
          <View style={styles.timerTrack}>
            <View
              style={[
                styles.timerFill,
                { width: `${Math.max(2, timePct * 100)}%`, backgroundColor: low ? Brand.accent : Brand.blue },
              ]}
            />
          </View>
          <View style={[styles.rankPill, { transform: [{ rotate: '2deg' }] }]}>
            <ThemedText type="smallBold" color="#fff">Rank #{rank}</ThemedText>
          </View>
        </View>

        <View style={styles.scoreRow}>
          <ThemedText type="title" style={{ fontSize: 40 }}>{score}</ThemedText>
          {combo >= 2 && (
            <View style={styles.comboTag}>
              <ThemedText type="smallBold" color={Brand.ink}>Combo x{combo}</ThemedText>
            </View>
          )}
          <ThemedText type="smallBold" color={low ? Brand.accent : Brand.muted}>{timeLeft}s</ThemedText>
        </View>

        {/* The problem */}
        <SketchSurface decoration="tape" rotate={-1} shadow={6} radius="lg" style={styles.problemCard}>
          <ThemedText style={styles.problem}>{problem.prompt} = ?</ThemedText>
        </SketchSurface>

        {/* Answer bubbles (2x2) */}
        <View style={styles.grid}>
          {problem.choices.map((c, i) => {
            const isFlash = flash?.index === i;
            const bg = isFlash ? (flash!.ok ? Brand.blue : Brand.accent) : Brand.card;
            const fg = isFlash ? '#fff' : Brand.ink;
            return (
              <Pressable
                key={`${problem.prompt}-${c}`}
                onPress={() => answer(i)}
                style={[styles.bubble, Wobbly.md, offsetShadow(4, Brand.ink), { backgroundColor: bg }]}
              >
                <ThemedText style={[styles.bubbleText, { color: fg }]}>{c}</ThemedText>
              </Pressable>
            );
          })}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Brand.paper },
  container: {
    flex: 1,
    padding: Spacing.four,
    gap: Spacing.three,
    maxWidth: MaxContentWidth,
    width: '100%',
    alignSelf: 'center',
  },
  centered: { flex: 1, justifyContent: 'center', padding: Spacing.four, maxWidth: MaxContentWidth, width: '100%', alignSelf: 'center' },
  bigTitle: { textAlign: 'center', fontSize: 42, lineHeight: 48 },
  center: { textAlign: 'center', color: Brand.muted },
  boardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: 6,
  },
  youRow: {
    backgroundColor: Brand.postit,
    borderWidth: 2,
    borderColor: Brand.accent,
    ...Wobbly.sm,
    paddingHorizontal: Spacing.two,
    marginVertical: 2,
  },
  rankBadge: {
    alignSelf: 'center',
    backgroundColor: Brand.accent,
    borderWidth: 2,
    borderColor: Brand.ink,
    paddingHorizontal: Spacing.three,
    paddingVertical: 6,
    ...Wobbly.pill,
    transform: [{ rotate: '-1deg' }],
  },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, marginTop: Spacing.two },
  timerTrack: {
    flex: 1,
    height: 16,
    borderRadius: 9,
    backgroundColor: Brand.card,
    borderWidth: 2,
    borderColor: Brand.ink,
    overflow: 'hidden',
    padding: 2,
  },
  timerFill: { height: '100%', borderRadius: 6 },
  rankPill: {
    backgroundColor: Brand.ink,
    paddingHorizontal: Spacing.three,
    paddingVertical: 5,
    ...Wobbly.pill,
  },
  scoreRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  comboTag: {
    backgroundColor: Brand.postit,
    borderWidth: 2,
    borderColor: Brand.ink,
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
    ...Wobbly.sm,
    transform: [{ rotate: '-3deg' }],
  },
  problemCard: { minHeight: 130, justifyContent: 'center' },
  problem: {
    fontFamily: HandFonts.heading,
    color: Brand.ink,
    textAlign: 'center',
    fontSize: 44,
    lineHeight: 52,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  bubble: {
    width: '47%',
    minHeight: 74,
    borderWidth: 3,
    borderColor: Brand.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bubbleText: { fontFamily: HandFonts.heading, fontSize: 30 },
});
