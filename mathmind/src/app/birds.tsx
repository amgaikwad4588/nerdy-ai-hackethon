import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Ellipse, Path, Polygon } from 'react-native-svg';

import { BigButton } from '@/components/big-button';
import { PaperBg, SketchSurface, StickyTag } from '@/components/sketch';
import { ThemedText } from '@/components/themed-text';
import { Brand, HandFonts, MaxContentWidth, Spacing, Wobbly, offsetShadow } from '@/constants/theme';
import { useStore } from '@/lib/store';
import type { Difficulty } from '@/lib/types';

// Bird Shooter: birds fly across the sky, each carrying a number. A question shows up
// top — tap (shoot) the bird holding the correct answer. Right bird = score + combo and
// a fresh flock; wrong bird flies off and breaks your streak. Correct hits feed a
// mastery signal. 45-second round.

const ROUND_SECONDS = 45;
const TICK_MS = 33;
const rnd = (n: number) => Math.floor(Math.random() * n);

interface Bird {
  id: number;
  value: number;
  correct: boolean;
  x: number; // 0..1 across the sky
  y: number; // px within the sky
  dir: 1 | -1;
  speed: number; // fraction of width per second
}

interface Problem {
  prompt: string;
  answer: number;
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
    b = 1 + rnd(a);
    answer = a + 0 - b;
  }
  return { prompt: `${a} ${op} ${b}`, answer };
}

function distractors(answer: number, n: number): number[] {
  const set = new Set<number>();
  while (set.size < n) {
    const delta = rnd(9) + 1;
    const cand = answer + (Math.random() < 0.5 ? -delta : delta);
    if (cand >= 0 && cand !== answer) set.add(cand);
  }
  return [...set];
}

/** A little side-on bird carrying nothing — the number rides in a tag beside it. */
function BirdSprite({ w, up, dir }: { w: number; up: boolean; dir: 1 | -1 }) {
  const h = w * 0.75;
  return (
    <Svg width={w} height={h} viewBox="0 0 48 36" style={{ transform: [{ scaleX: dir === 1 ? 1 : -1 }] }}>
      <Polygon points="6,12 6,28 16,20" fill={Brand.primaryDark} />
      <Ellipse cx={22} cy={20} rx={14} ry={9} fill={Brand.blue} stroke={Brand.ink} strokeWidth={2} />
      <Ellipse cx={22} cy={23} rx={9} ry={5} fill={Brand.cream} opacity={0.9} />
      <Circle cx={35} cy={14} r={7} fill={Brand.blue} stroke={Brand.ink} strokeWidth={2} />
      <Polygon points="41,12 49,14 41,18" fill="#e8955a" stroke={Brand.ink} strokeWidth={1} />
      <Circle cx={36} cy={12} r={1.7} fill={Brand.ink} />
      <Path
        d={up ? 'M16 18 L24 4 L30 18 Z' : 'M16 20 L24 32 L30 20 Z'}
        fill={Brand.primaryDark}
        stroke={Brand.ink}
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export default function BirdGame() {
  const router = useRouter();
  const diff = (useStore((s) => s.difficulty['mult-facts']) ?? 1) as Difficulty;
  const recordTurn = useStore((s) => s.recordTurn);

  const [size, setSize] = useState({ w: 0, h: 0 });
  const [phase, setPhase] = useState<'ready' | 'playing' | 'over'>('ready');
  const [problem, setProblem] = useState<Problem>(() => makeProblem(diff));
  const [birds, setBirds] = useState<Bird[]>([]);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [best, setBest] = useState(0);
  const [hits, setHits] = useState(0);
  const [misses, setMisses] = useState(0);
  const [timeLeft, setTimeLeft] = useState(ROUND_SECONDS);
  const [flap, setFlap] = useState(false);
  const [pop, setPop] = useState<{ x: number; y: number; ok: boolean; key: number } | null>(null);

  const idRef = useRef(0);
  const sizeRef = useRef(size);
  sizeRef.current = size;

  // Spawn a fresh flock for a question: one correct bird + distractors, from both sides.
  const spawnFlock = useCallback((p: Problem) => {
    const h = sizeRef.current.h || 300;
    const values = [p.answer, ...distractors(p.answer, 3)].sort(() => Math.random() - 0.5);
    const flock: Bird[] = values.map((value, i) => {
      const dir: 1 | -1 = Math.random() < 0.5 ? 1 : -1;
      const startX = dir === 1 ? -0.15 - i * 0.14 : 1.15 + i * 0.14;
      return {
        id: idRef.current++,
        value,
        correct: value === p.answer,
        x: startX,
        y: 40 + Math.random() * Math.max(60, h - 120),
        dir,
        speed: 0.16 + Math.random() * 0.14 + diff * 0.02,
      };
    });
    setBirds(flock);
  }, [diff]);

  const nextQuestion = useCallback(() => {
    const p = makeProblem(diff);
    setProblem(p);
    spawnFlock(p);
  }, [diff, spawnFlock]);

  // Wing flap.
  useEffect(() => {
    if (phase !== 'playing') return;
    const id = setInterval(() => setFlap((f) => !f), 190);
    return () => clearInterval(id);
  }, [phase]);

  // Movement loop.
  useEffect(() => {
    if (phase !== 'playing') return;
    const id = setInterval(() => {
      setBirds((prev) => {
        let hadCorrect = false;
        const next = prev
          .map((b) => ({ ...b, x: b.x + b.dir * b.speed * (TICK_MS / 1000) }))
          .filter((b) => {
            const alive = b.x > -0.25 && b.x < 1.25;
            if (alive && b.correct) hadCorrect = true;
            return alive;
          });
        // If the correct bird has flown off, that's a miss — send a new flock.
        if (prev.length > 0 && !hadCorrect) {
          setMisses((m) => m + 1);
          setCombo(0);
          setTimeout(nextQuestion, 0);
          return [];
        }
        return next;
      });
    }, TICK_MS);
    return () => clearInterval(id);
  }, [phase, nextQuestion]);

  // Countdown.
  useEffect(() => {
    if (phase !== 'playing') return;
    const id = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(id);
          setScore((s) => {
            setBest((b) => Math.max(b, s));
            return s;
          });
          setPhase('over');
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [phase]);

  const shoot = useCallback(
    (bird: Bird) => {
      if (phase !== 'playing') return;
      const px = bird.x * sizeRef.current.w;
      if (bird.correct) {
        const pts = 10 + combo * 2;
        setScore((s) => s + pts);
        setCombo((c) => c + 1);
        setHits((n) => n + 1);
        setPop({ x: px, y: bird.y, ok: true, key: Date.now() });
        recordTurn({
          id: `birds-${Date.now()}`,
          at: Date.now(),
          skillId: 'mult-facts',
          taskId: 'birds',
          studentAnswer: String(bird.value),
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
        nextQuestion();
      } else {
        setCombo(0);
        setMisses((n) => n + 1);
        setPop({ x: px, y: bird.y, ok: false, key: Date.now() });
        setBirds((prev) => prev.filter((b) => b.id !== bird.id));
      }
    },
    [phase, combo, recordTurn, nextQuestion],
  );

  const start = useCallback(() => {
    setScore(0);
    setCombo(0);
    setHits(0);
    setMisses(0);
    setTimeLeft(ROUND_SECONDS);
    setPop(null);
    setPhase('playing');
    nextQuestion();
  }, [nextQuestion]);

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize({ w: width, h: height });
  };

  // ---- READY ----------------------------------------------------------------
  if (phase === 'ready') {
    return (
      <SafeAreaView style={styles.safe}>
        <PaperBg />
        <View style={styles.menu}>
          <StickyTag label="BIRD SHOOTER" rotate={-3} style={{ alignSelf: 'center' }} />
          <ThemedText type="title" style={styles.bigTitle}>
            Shoot the answer!
          </ThemedText>
          <ThemedText type="small" style={styles.center}>
            Birds fly by carrying numbers. Read the question and tap the bird holding the
            correct answer. Streaks score extra. You have {ROUND_SECONDS} seconds.
          </ThemedText>
          {best > 0 && (
            <ThemedText type="small" style={styles.center}>Your best so far: {best}</ThemedText>
          )}
          <BigButton label="Start round" variant="primary" onPress={start} style={{ marginTop: Spacing.two }} />
          <BigButton label="Back home" variant="ghost" tint={Brand.ink} onPress={() => router.replace('/')} />
        </View>
      </SafeAreaView>
    );
  }

  // ---- OVER -----------------------------------------------------------------
  if (phase === 'over') {
    const total = hits + misses;
    const acc = total > 0 ? Math.round((hits / total) * 100) : 0;
    return (
      <SafeAreaView style={styles.safe}>
        <PaperBg />
        <View style={styles.menu}>
          <SketchSurface decoration="tack" rotate={-1} shadow={6} radius="lg" style={{ gap: Spacing.two }}>
            <ThemedText type="smallBold" color={Brand.muted} style={styles.center}>TIME&apos;S UP</ThemedText>
            <ThemedText type="title" style={[styles.bigTitle, { color: Brand.blue }]}>{score} pts</ThemedText>
            <ThemedText type="small" style={styles.center}>
              {hits} hits · {acc}% accuracy{best > 0 ? ` · best ${Math.max(best, score)}` : ''}
            </ThemedText>
            <BigButton label="Play again" variant="primary" onPress={start} style={{ marginTop: Spacing.two }} />
            <BigButton label="Back home" variant="ghost" tint={Brand.ink} onPress={() => router.replace('/')} />
          </SketchSurface>
        </View>
      </SafeAreaView>
    );
  }

  // ---- PLAYING --------------------------------------------------------------
  const low = timeLeft <= 10;
  const badgeW = 46;
  return (
    <SafeAreaView style={styles.safe}>
      <PaperBg />
      <View style={styles.playWrap}>
        {/* HUD */}
        <View style={styles.hud}>
          <ThemedText type="title" style={{ fontSize: 34 }}>{score}</ThemedText>
          {combo >= 2 && (
            <View style={styles.comboTag}>
              <ThemedText type="smallBold" color={Brand.ink}>Combo x{combo}</ThemedText>
            </View>
          )}
          <ThemedText type="smallBold" color={low ? Brand.accent : Brand.muted}>{timeLeft}s</ThemedText>
        </View>

        {/* Question */}
        <SketchSurface decoration="tape" rotate={-0.5} shadow={4} radius="md" style={styles.qCard}>
          <ThemedText type="smallBold" color={Brand.muted}>SHOOT THE BIRD WITH</ThemedText>
          <ThemedText style={styles.qText}>{problem.prompt} = ?</ThemedText>
        </SketchSurface>

        {/* Sky */}
        <View style={styles.sky} onLayout={onLayout}>
          {size.w > 0 &&
            birds.map((b) => {
              const left = b.x * size.w - badgeW / 2;
              return (
                <Pressable
                  key={b.id}
                  onPress={() => shoot(b)}
                  hitSlop={10}
                  style={[styles.bird, { left, top: b.y }]}
                >
                  <BirdSprite w={54} up={flap} dir={b.dir} />
                  <View style={[styles.badge, Wobbly.sm]}>
                    <ThemedText style={styles.badgeText}>{b.value}</ThemedText>
                  </View>
                </Pressable>
              );
            })}

          {pop && (
            <View
              key={pop.key}
              pointerEvents="none"
              style={[styles.pop, { left: pop.x - 18, top: pop.y - 8, borderColor: pop.ok ? Brand.blue : Brand.accent }]}
            >
              <ThemedText type="smallBold" color={pop.ok ? Brand.blue : Brand.accent}>
                {pop.ok ? 'HIT' : 'MISS'}
              </ThemedText>
            </View>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Brand.paper },
  menu: {
    flex: 1,
    justifyContent: 'center',
    padding: Spacing.four,
    gap: Spacing.two,
    maxWidth: MaxContentWidth,
    width: '100%',
    alignSelf: 'center',
  },
  bigTitle: { textAlign: 'center', fontSize: 40, lineHeight: 46 },
  center: { textAlign: 'center', color: Brand.muted },

  playWrap: {
    flex: 1,
    padding: Spacing.three,
    gap: Spacing.two,
    maxWidth: MaxContentWidth,
    width: '100%',
    alignSelf: 'center',
  },
  hud: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  comboTag: {
    backgroundColor: Brand.postit,
    borderWidth: 2,
    borderColor: Brand.ink,
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
    ...Wobbly.sm,
    transform: [{ rotate: '-3deg' }],
  },
  qCard: { alignItems: 'center', gap: 2 },
  qText: { fontFamily: HandFonts.heading, fontSize: 34, lineHeight: 40, color: Brand.ink },

  sky: {
    flex: 1,
    backgroundColor: '#eaf1f7',
    borderWidth: 3,
    borderColor: Brand.ink,
    ...Wobbly.md,
    overflow: 'hidden',
    position: 'relative',
  },
  bird: { position: 'absolute', alignItems: 'center' },
  badge: {
    marginTop: -6,
    minWidth: 40,
    backgroundColor: Brand.postit,
    borderWidth: 2,
    borderColor: Brand.ink,
    paddingHorizontal: 8,
    paddingVertical: 1,
    alignItems: 'center',
    ...offsetShadow(2, Brand.ink),
  },
  badgeText: { fontFamily: HandFonts.heading, fontSize: 20, color: Brand.ink },
  pop: {
    position: 'absolute',
    backgroundColor: Brand.card,
    borderWidth: 2,
    paddingHorizontal: 8,
    paddingVertical: 2,
    ...Wobbly.sm,
  },
});
