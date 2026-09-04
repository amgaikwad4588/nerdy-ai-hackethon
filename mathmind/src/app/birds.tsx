import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Ellipse, G, Line, Path, Polygon, Rect } from 'react-native-svg';

import { BigButton } from '@/components/big-button';
import { PaperBg, SketchSurface, StickyTag } from '@/components/sketch';
import { ThemedText } from '@/components/themed-text';
import { Brand, HandFonts, MaxContentWidth, Spacing, Wobbly, offsetShadow } from '@/constants/theme';
import { useStore } from '@/lib/store';
import type { Difficulty } from '@/lib/types';

// Bird Shooter: birds burst up out of the tall grass and fly toward the top of the
// screen, each carrying a number. A gun turret sits in the middle of the meadow — read
// the question and tap (shoot) the bird holding the correct answer; the gun swings to aim
// and fires. Right bird = score + combo and a fresh flock; wrong = the shot misses and
// your streak breaks. Correct hits feed a mastery signal. 45-second round.

const ROUND_SECONDS = 20; // demo: shortened (was 45)
const TICK_MS = 33;
const rnd = (n: number) => Math.floor(Math.random() * n);

interface Bird {
  id: number;
  value: number;
  correct: boolean;
  x: number; // 0..1 across the sky
  y: number; // px from top
  vx: number; // fraction of width per second (drift)
  vy: number; // px per second, upward
  dir: 1 | -1;
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
    answer = a - b;
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

/** Side-on bird, wings flapping; the number rides in a tag beside it. */
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
  const [pop, setPop] = useState<{ x: number; y: number; ok: boolean; key: number; big?: boolean } | null>(null);
  const [gunAngle, setGunAngle] = useState(0);
  const [tracer, setTracer] = useState<{ x1: number; y1: number; x2: number; y2: number; ok: boolean; key: number } | null>(null);

  const idRef = useRef(0);
  const sizeRef = useRef(size);
  sizeRef.current = size;
  // Adaptive difficulty: birds start slow and get faster as you hit; misses slow them
  // back down. A gentle, self-tuning challenge.
  const speedMult = useRef(0.7);
  const SPEED_FLOOR = 0.55;
  const SPEED_CAP = 1.8;

  const grassH = size.h ? size.h * 0.16 : 0;
  const gunX = size.w / 2;
  const gunPivotY = size.h - grassH * 0.55;

  // Static grass blades (computed once per size, so they don't flicker each frame).
  const blades = useMemo(() => {
    const out: { x: number; bh: number; tilt: number; dark: boolean }[] = [];
    if (size.w > 0) {
      const gH = size.h * 0.16;
      for (let x = 6; x < size.w; x += 13) {
        out.push({ x, bh: gH * (0.55 + Math.random() * 0.5), tilt: (Math.random() - 0.5) * 10, dark: Math.random() < 0.5 });
      }
    }
    return out;
  }, [size.w, size.h]);

  const spawnFlock = useCallback((p: Problem) => {
    const s = sizeRef.current;
    const values = [p.answer, ...distractors(p.answer, 3)].sort(() => Math.random() - 0.5);
    const gH = (s.h || 300) * 0.16;
    const flock: Bird[] = values.map((value, i) => {
      const dir: 1 | -1 = Math.random() < 0.5 ? 1 : -1;
      return {
        id: idRef.current++,
        value,
        correct: value === p.answer,
        x: 0.15 + (i + Math.random() * 0.6) * (0.7 / 4),
        y: (s.h || 300) - gH * 0.3 + Math.random() * 30, // burst out of the grass
        vx: (Math.random() - 0.5) * 0.12,
        vy: (30 + Math.random() * 22 + diff * 4) * speedMult.current, // rise speed scales with adaptive difficulty
        dir,
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
    const id = setInterval(() => setFlap((f) => !f), 170);
    return () => clearInterval(id);
  }, [phase]);

  // Movement loop — birds rise and drift; off the top edge = gone.
  useEffect(() => {
    if (phase !== 'playing') return;
    const id = setInterval(() => {
      const s = sizeRef.current;
      setBirds((prev) => {
        let hadCorrect = false;
        const next = prev
          .map((b) => ({ ...b, y: b.y - b.vy * (TICK_MS / 1000), x: b.x + b.vx * (TICK_MS / 1000) }))
          .filter((b) => {
            const alive = b.y > -40 && b.x > -0.15 && b.x < 1.15;
            if (alive && b.correct) hadCorrect = true;
            return alive;
          });
        if (prev.length > 0 && !hadCorrect) {
          setMisses((m) => m + 1);
          setCombo(0);
          speedMult.current = Math.max(SPEED_FLOOR, speedMult.current - 0.15); // missed it entirely → ease off
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
          setScore((sc) => {
            setBest((b) => Math.max(b, sc));
            return sc;
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
      const s = sizeRef.current;
      const bx = bird.x * s.w;
      const by = bird.y;
      // aim the gun at the bird
      const angle = (Math.atan2(bx - s.w / 2, gunPivotY - by) * 180) / Math.PI;
      setGunAngle(Math.max(-70, Math.min(70, angle)));
      setTracer({ x1: s.w / 2, y1: gunPivotY, x2: bx, y2: by, ok: bird.correct, key: Date.now() });
      setTimeout(() => setTracer(null), 150);

      if (bird.correct) {
        const pts = 10 + combo * 2;
        speedMult.current = Math.min(SPEED_CAP, speedMult.current + 0.12); // nailed it → speed up
        setScore((sc) => sc + pts);
        setCombo((c) => c + 1);
        setHits((n) => n + 1);
        setPop({ x: bx, y: by, ok: true, key: Date.now() });
        recordTurn({
          id: `birds-${Date.now()}`,
          at: Date.now(),
          skillId: 'mult-facts',
          taskId: 'birds',
          studentAnswer: String(bird.value),
          result: { isCorrect: true, isOnTrack: true, misconceptionTag: null, message: '', hint: '', difficultyDelta: 0, masterySignal: 0.8 },
        });
        nextQuestion();
      } else {
        setCombo(0);
        setMisses((n) => n + 1);
        speedMult.current = Math.max(SPEED_FLOOR, speedMult.current - 0.1); // wrong bird → ease off a touch
        const key = Date.now();
        setPop({ x: s.w / 2, y: s.h * 0.34, ok: false, key, big: true });
        setTimeout(() => setPop((p) => (p && p.key === key ? null : p)), 850);
        nextQuestion(); // no second chance — send the next wave
      }
    },
    [phase, combo, recordTurn, nextQuestion, gunPivotY],
  );

  const start = useCallback(() => {
    setScore(0);
    setCombo(0);
    setHits(0);
    setMisses(0);
    setTimeLeft(ROUND_SECONDS);
    setPop(null);
    setTracer(null);
    setGunAngle(0);
    speedMult.current = 0.7; // start slow every round
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
          <ThemedText type="title" style={styles.bigTitle}>Shoot the answer!</ThemedText>
          <ThemedText type="small" style={styles.center}>
            Birds burst out of the grass and fly up carrying numbers. Read the question and
            tap the bird with the correct answer — the gun aims and fires. Streaks score
            extra. You have {ROUND_SECONDS} seconds.
          </ThemedText>
          {best > 0 && <ThemedText type="small" style={styles.center}>Your best so far: {best}</ThemedText>}
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
  const w = size.w;
  const h = size.h;

  return (
    <SafeAreaView style={styles.safe}>
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

        {/* Meadow */}
        <View style={styles.sky} onLayout={onLayout}>
          {w > 0 && (
            <>
              {/* sky backdrop: tracer, tall grass, gun turret (behind the birds) */}
              <Svg width={w} height={h} style={StyleSheet.absoluteFill} pointerEvents="none">
                {tracer && (
                  <Line x1={tracer.x1} y1={tracer.y1} x2={tracer.x2} y2={tracer.y2} stroke={tracer.ok ? Brand.blue : Brand.accent} strokeWidth={3} strokeDasharray="6 6" strokeLinecap="round" />
                )}

                {/* tall grass strip */}
                <Rect x={0} y={h - grassH} width={w} height={grassH} fill="#77b262" />
                {blades.map((bl, i) => (
                  <Path
                    key={i}
                    d={`M${bl.x} ${h} Q ${bl.x + bl.tilt} ${h - bl.bh * 0.6} ${bl.x + bl.tilt * 1.6} ${h - bl.bh}`}
                    stroke={bl.dark ? '#3f7f3c' : '#5aa14e'}
                    strokeWidth={3}
                    strokeLinecap="round"
                    fill="none"
                  />
                ))}

                {/* gun turret in the middle of the meadow */}
                <G transform={`translate(${gunX}, ${gunPivotY}) rotate(${gunAngle})`}>
                  <Rect x={-6} y={-52} width={12} height={52} rx={5} fill="#5b6570" stroke={Brand.ink} strokeWidth={2.5} />
                  <Circle cx={0} cy={-52} r={5} fill={Brand.accent} stroke={Brand.ink} strokeWidth={2} />
                </G>
                <Ellipse cx={gunX} cy={gunPivotY + 6} rx={26} ry={16} fill="#8a949e" stroke={Brand.ink} strokeWidth={2.5} />
                <Circle cx={gunX} cy={gunPivotY} r={13} fill="#6b7580" stroke={Brand.ink} strokeWidth={2.5} />
              </Svg>

              {/* birds (tappable, above the grass) */}
              {birds.map((b) => (
                <Pressable key={b.id} onPress={() => shoot(b)} hitSlop={10} style={[styles.bird, { left: b.x * w - 27, top: b.y }]}>
                  <BirdSprite w={54} up={flap} dir={b.dir} />
                  <View style={[styles.badge, Wobbly.sm]}>
                    <ThemedText style={styles.badgeText}>{b.value}</ThemedText>
                  </View>
                </Pressable>
              ))}

              {pop && pop.big && (
                <View key={pop.key} pointerEvents="none" style={styles.bigWrongWrap}>
                  <View style={styles.bigWrong}>
                    <ThemedText type="title" style={styles.bigWrongText}>WRONG!</ThemedText>
                  </View>
                </View>
              )}
              {pop && !pop.big && (
                <View key={pop.key} pointerEvents="none" style={[styles.popTag, { left: pop.x - 18, top: pop.y - 8, borderColor: pop.ok ? Brand.blue : Brand.accent }]}>
                  <ThemedText type="smallBold" color={pop.ok ? Brand.blue : Brand.accent}>{pop.ok ? 'HIT' : 'MISS'}</ThemedText>
                </View>
              )}
            </>
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

  playWrap: { flex: 1, padding: Spacing.three, gap: Spacing.two, maxWidth: MaxContentWidth, width: '100%', alignSelf: 'center' },
  hud: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  comboTag: { backgroundColor: Brand.postit, borderWidth: 2, borderColor: Brand.ink, paddingHorizontal: Spacing.two, paddingVertical: 2, ...Wobbly.sm, transform: [{ rotate: '-3deg' }] },
  qCard: { alignItems: 'center', gap: 2 },
  qText: { fontFamily: HandFonts.heading, fontSize: 34, lineHeight: 40, color: Brand.ink },

  sky: { flex: 1, backgroundColor: '#dceff9', borderWidth: 3, borderColor: Brand.ink, ...Wobbly.md, overflow: 'hidden', position: 'relative' },
  bird: { position: 'absolute', alignItems: 'center', zIndex: 2 },
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
  popTag: { position: 'absolute', zIndex: 3, backgroundColor: Brand.card, borderWidth: 2, paddingHorizontal: 8, paddingVertical: 2, ...Wobbly.sm },
  bigWrongWrap: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', zIndex: 5 },
  bigWrong: {
    backgroundColor: Brand.card,
    borderWidth: 4,
    borderColor: Brand.accent,
    paddingHorizontal: Spacing.five,
    paddingVertical: Spacing.three,
    transform: [{ rotate: '-4deg' }],
    ...Wobbly.md,
    ...offsetShadow(6, Brand.accent),
  },
  bigWrongText: { color: Brand.accent, fontSize: 52, lineHeight: 58, letterSpacing: 1 },
});
