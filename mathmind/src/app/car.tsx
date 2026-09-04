import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Rect } from 'react-native-svg';

import { BigButton } from '@/components/big-button';
import { PaperBg, SketchSurface, StickyTag } from '@/components/sketch';
import { ThemedText } from '@/components/themed-text';
import { Brand, HandFonts, MaxContentWidth, Spacing, Wobbly, offsetShadow } from '@/constants/theme';
import { useStore } from '@/lib/store';
import type { Difficulty } from '@/lib/types';

// Highway Racer: a 4-lane math race. A question sits at the bottom; four answer tiles
// slide down, one per lane. Steer your car into the correct lane before the gate
// arrives — right answer floors it (big distance), wrong answer bogs you down. You race
// friends' (translucent) cars up the road; first to the finish line wins. Correct
// answers also feed a mastery signal.

const LANES = 4;
const FINISH = 120; // race distance
const MAX_ROUNDS = 12;
const BOOST = 16; // distance gained on a correct answer
const SLOW = 5; // distance crawl on a wrong answer
const GATE_MS = 2900; // time for the answer gate to reach you

// Dummy classmates (bots) you race. Skill = chance they pick the right lane.
const FRIENDS_POOL = [
  { name: 'Aarav', color: '#e8955a', skill: 0.72 },
  { name: 'Diya', color: '#7a5db0', skill: 0.64 },
  { name: 'Kabir', color: '#3f9d6b', skill: 0.78 },
  { name: 'Ananya', color: '#c65d7b', skill: 0.68 },
  { name: 'Ishaan', color: '#2f8fb0', skill: 0.7 },
  { name: 'Priya', color: '#d9a441', skill: 0.6 },
  { name: 'Rohan', color: '#b0693f', skill: 0.66 },
  { name: 'Saanvi', color: '#8a7de0', skill: 0.74 },
];

const rnd = (n: number) => Math.floor(Math.random() * n);

interface Round {
  prompt: string;
  answer: number;
  options: number[]; // 4, one per lane
  correctLane: number;
}

function makeRound(diff: Difficulty): Round {
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
  const set = new Set<number>([answer]);
  while (set.size < LANES) {
    const delta = rnd(9) + 1;
    const cand = answer + (Math.random() < 0.5 ? -delta : delta);
    if (cand >= 0) set.add(cand);
  }
  const options = [...set].sort(() => Math.random() - 0.5);
  return { prompt: `${a} ${op} ${b}`, answer, options, correctLane: options.indexOf(answer) };
}

/** Top-down car sprite. Translucent for friends, solid for you. */
function CarSprite({ color, w, ghost = false }: { color: string; w: number; ghost?: boolean }) {
  const h = w * 1.7;
  return (
    <Svg width={w} height={h} viewBox="0 0 40 68" opacity={ghost ? 0.5 : 1}>
      <Rect x={5} y={4} width={30} height={60} rx={11} fill={color} stroke={Brand.ink} strokeWidth={2.5} />
      <Rect x={10} y={12} width={20} height={13} rx={5} fill="rgba(255,255,255,0.78)" stroke={Brand.ink} strokeWidth={1.5} />
      <Rect x={10} y={41} width={20} height={11} rx={5} fill="rgba(255,255,255,0.6)" stroke={Brand.ink} strokeWidth={1.5} />
      <Circle cx={11} cy={9} r={2.4} fill="#fff6cf" stroke={Brand.ink} strokeWidth={1} />
      <Circle cx={29} cy={9} r={2.4} fill="#fff6cf" stroke={Brand.ink} strokeWidth={1} />
    </Svg>
  );
}

export default function CarGame() {
  const router = useRouter();
  const studentName = useStore((s) => s.studentName);
  const diff = (useStore((s) => s.difficulty['mult-facts']) ?? 1) as Difficulty;
  const recordTurn = useStore((s) => s.recordTurn);

  const [size, setSize] = useState({ w: 0, h: 0 });
  const [phase, setPhase] = useState<'ready' | 'playing' | 'over'>('ready');
  const [round, setRound] = useState<Round>(() => makeRound(diff));
  const [roundNo, setRoundNo] = useState(0);
  const [carLane, setCarLane] = useState(1);
  const [dist, setDist] = useState(0);
  const [combo, setCombo] = useState(0);
  const [flash, setFlash] = useState<{ correctLane: number; youLane: number } | null>(null);

  // Friends for this race (pick 3), with live distance + current lane.
  const [friends, setFriends] = useState(
    () =>
      [...FRIENDS_POOL]
        .sort(() => Math.random() - 0.5)
        .slice(0, 3)
        .map((f) => ({ ...f, dist: 0, lane: rnd(LANES) })),
  );

  const carX = useRef(new Animated.Value(0)).current;
  const gateY = useRef(new Animated.Value(0)).current;
  const stripe = useRef(new Animated.Value(0)).current;
  const resolvedRef = useRef(false);
  const carLaneRef = useRef(carLane);
  carLaneRef.current = carLane;
  const friendTargets = useRef<number[]>([]);

  const laneW = size.w > 0 ? size.w / LANES : 0;
  const carW = laneW * 0.56;
  const decisionY = size.h * 0.66;
  const laneX = useCallback((lane: number) => lane * laneW + (laneW - carW) / 2, [laneW, carW]);

  // Slide the car to its lane whenever it changes.
  useEffect(() => {
    if (laneW === 0) return;
    Animated.timing(carX, { toValue: laneX(carLane), duration: 160, useNativeDriver: false }).start();
  }, [carLane, laneW, laneX, carX]);

  // Endless road stripes for a sense of speed.
  useEffect(() => {
    if (size.h === 0) return;
    const loop = Animated.loop(
      Animated.timing(stripe, { toValue: 1, duration: 620, useNativeDriver: false }),
    );
    loop.start();
    return () => loop.stop();
  }, [size.h, stripe]);

  const resolve = useCallback(() => {
    if (resolvedRef.current) return;
    resolvedRef.current = true;
    const r = round;
    const youLane = carLaneRef.current;
    const youOk = youLane === r.correctLane;
    setFlash({ correctLane: r.correctLane, youLane });

    if (youOk) {
      setDist((d) => Math.min(FINISH, d + BOOST + combo));
      setCombo((c) => c + 1);
      recordTurn({
        id: `racer-${Date.now()}`,
        at: Date.now(),
        skillId: 'mult-facts',
        taskId: 'racer',
        studentAnswer: String(r.options[youLane]),
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
      setDist((d) => Math.min(FINISH, d + SLOW));
    }

    // Friends score by whether their chosen lane was right.
    setFriends((prev) =>
      prev.map((f, i) => {
        const ok = friendTargets.current[i] === r.correctLane;
        return { ...f, dist: Math.min(FINISH, f.dist + (ok ? BOOST : SLOW) + rnd(3)) };
      }),
    );
  }, [round, combo, recordTurn]);

  // Kick off a round: new gate slides down; friends "decide" a lane partway.
  const beginRound = useCallback(
    (r: Round) => {
      resolvedRef.current = false;
      setFlash(null);
      setRound(r);
      // Friends choose a target lane (right with prob = skill); keep it hidden for now.
      setFriends((prev) => {
        friendTargets.current = prev.map((f) => (Math.random() < f.skill ? r.correctLane : rnd(LANES)));
        return prev;
      });
      // Reveal friend lane choices ~40% into the descent.
      setTimeout(() => {
        setFriends((prev) => prev.map((f, i) => ({ ...f, lane: friendTargets.current[i] })));
      }, GATE_MS * 0.4);

      gateY.setValue(0);
      Animated.timing(gateY, { toValue: 1, duration: GATE_MS, useNativeDriver: false }).start(({ finished }) => {
        if (finished) resolve();
      });
    },
    [gateY, resolve],
  );

  // After a resolve, pause on the flash, then next round or finish.
  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => {
      const someoneDone = dist >= FINISH || friends.some((f) => f.dist >= FINISH);
      if (someoneDone || roundNo + 1 >= MAX_ROUNDS) {
        setPhase('over');
        return;
      }
      setRoundNo((n) => n + 1);
      beginRound(makeRound(diff));
    }, 900);
    return () => clearTimeout(t);
  }, [flash]); // eslint-disable-line react-hooks/exhaustive-deps

  const start = useCallback(() => {
    setDist(0);
    setCombo(0);
    setRoundNo(0);
    setCarLane(1);
    setFriends((prev) => prev.map((f) => ({ ...f, dist: 0, lane: rnd(LANES) })));
    setPhase('playing');
    beginRound(makeRound(diff));
  }, [beginRound, diff]);

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize({ w: width, h: height });
  };

  // Standings (for the finish screen + live position pill).
  const standings = useMemo(() => {
    const all = [
      { name: `${studentName} (you)`, dist, you: true },
      ...friends.map((f) => ({ name: f.name, dist: f.dist, you: false })),
    ];
    return all.sort((a, b) => b.dist - a.dist);
  }, [dist, friends, studentName]);
  const myPos = standings.findIndex((s) => s.you) + 1;

  // ---- READY ----------------------------------------------------------------
  if (phase === 'ready') {
    return (
      <SafeAreaView style={styles.safe}>
        <PaperBg />
        <View style={styles.menu}>
          <StickyTag label="HIGHWAY RACER" rotate={-3} style={{ alignSelf: 'center' }} />
          <ThemedText type="title" style={styles.bigTitle}>
            Race your friends!
          </ThemedText>
          <ThemedText type="small" style={styles.center}>
            Steer into the lane with the correct answer. Right answer speeds you up, wrong
            answer slows you down. First car to the finish line wins.
          </ThemedText>
          <SketchSurface radius="md" shadow={5} rotate={-0.5} style={{ marginTop: Spacing.two }}>
            <ThemedText type="smallBold" style={{ marginBottom: Spacing.two }}>
              ON THE GRID WITH YOU
            </ThemedText>
            {friends.map((f) => (
              <View key={f.name} style={styles.gridRow}>
                <View style={[styles.dot, { backgroundColor: f.color }]} />
                <ThemedText style={{ flex: 1 }}>{f.name}</ThemedText>
                <ThemedText type="small" color={Brand.muted}>car</ThemedText>
              </View>
            ))}
          </SketchSurface>
          <BigButton label="Start race" variant="primary" onPress={start} style={{ marginTop: Spacing.two }} />
          <BigButton label="Back home" variant="ghost" tint={Brand.ink} onPress={() => router.replace('/')} />
        </View>
      </SafeAreaView>
    );
  }

  // ---- OVER -----------------------------------------------------------------
  if (phase === 'over') {
    const medal = myPos === 1 ? 'first' : myPos === 2 ? 'second' : myPos === 3 ? 'third' : '';
    return (
      <SafeAreaView style={styles.safe}>
        <PaperBg />
        <View style={styles.menu}>
          <SketchSurface decoration="tack" rotate={-1} shadow={6} radius="lg" style={{ gap: Spacing.two }}>
            <ThemedText type="smallBold" color={Brand.muted} style={styles.center}>
              CHEQUERED FLAG
            </ThemedText>
            <View style={styles.rankBadge}>
              <ThemedText type="smallBold" color="#fff" style={{ fontSize: 18 }}>
                You finished #{myPos} of {standings.length}
                {medal ? ` — ${medal} place` : ''}
              </ThemedText>
            </View>
            <View style={{ marginTop: Spacing.two }}>
              {standings.map((s, i) => (
                <View key={s.name} style={[styles.gridRow, s.you && styles.youRow]}>
                  <ThemedText type="smallBold" color={s.you ? Brand.accent : Brand.muted}>#{i + 1}</ThemedText>
                  <ThemedText style={{ flex: 1 }} color={s.you ? Brand.accent : Brand.ink}>{s.name}</ThemedText>
                  <ThemedText type="smallBold" color={s.you ? Brand.accent : Brand.ink}>{Math.round(s.dist)}</ThemedText>
                </View>
              ))}
            </View>
            <BigButton label="Race again" variant="primary" onPress={start} style={{ marginTop: Spacing.two }} />
            <BigButton label="Back home" variant="ghost" tint={Brand.ink} onPress={() => router.replace('/')} />
          </SketchSurface>
        </View>
      </SafeAreaView>
    );
  }

  // ---- PLAYING --------------------------------------------------------------
  const stripeTop = stripe.interpolate({ inputRange: [0, 1], outputRange: [-40, 0] });
  const gateTop = gateY.interpolate({ inputRange: [0, 1], outputRange: [-70, decisionY] });

  return (
    <SafeAreaView style={styles.safe}>
      <PaperBg />
      <View style={styles.playWrap}>
        {/* HUD */}
        <View style={styles.hud}>
          <View style={[styles.rankPill, { transform: [{ rotate: '-2deg' }] }]}>
            <ThemedText type="smallBold" color="#fff">Position #{myPos}</ThemedText>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${(dist / FINISH) * 100}%` }]} />
          </View>
          {combo >= 2 && (
            <View style={styles.comboTag}>
              <ThemedText type="smallBold" color={Brand.ink}>x{combo}</ThemedText>
            </View>
          )}
        </View>

        {/* The road */}
        <View style={styles.road} onLayout={onLayout}>
          {size.w > 0 && (
            <>
              {/* Lane divider dashes, scrolling for motion */}
              {[1, 2, 3].map((l) => (
                <Animated.View
                  key={l}
                  pointerEvents="none"
                  style={[styles.divider, { left: l * laneW - 2, transform: [{ translateY: stripeTop }] }]}
                >
                  {Array.from({ length: Math.ceil(size.h / 40) + 2 }).map((_, k) => (
                    <View key={k} style={styles.dash} />
                  ))}
                </Animated.View>
              ))}

              {/* Tap targets: tap a lane to steer there */}
              {[0, 1, 2, 3].map((l) => (
                <Pressable
                  key={l}
                  onPress={() => setCarLane(l)}
                  style={[styles.laneTap, { left: l * laneW, width: laneW }]}
                />
              ))}

              {/* Answer gate sliding down */}
              <Animated.View pointerEvents="none" style={[styles.gate, { transform: [{ translateY: gateTop }] }]}>
                {round.options.map((opt, l) => {
                  const isCorrect = flash && l === flash.correctLane;
                  const isYouWrong = flash && l === flash.youLane && flash.youLane !== flash.correctLane;
                  const bg = isCorrect ? Brand.blue : isYouWrong ? Brand.accent : Brand.card;
                  const fg = isCorrect || isYouWrong ? '#fff' : Brand.ink;
                  return (
                    <View
                      key={l}
                      style={[
                        styles.tile,
                        Wobbly.sm,
                        { left: l * laneW + laneW * 0.1, width: laneW * 0.8, backgroundColor: bg },
                      ]}
                    >
                      <ThemedText style={[styles.tileText, { color: fg }]}>{opt}</ThemedText>
                    </View>
                  );
                })}
              </Animated.View>

              {/* Friend (ghost) cars, placed by their race distance */}
              {friends.map((f) => {
                const top = Math.min(
                  decisionY,
                  Math.max(size.h * 0.05, decisionY - (f.dist - dist) * (size.h * 0.5) / FINISH),
                );
                return (
                  <View
                    key={f.name}
                    pointerEvents="none"
                    style={[styles.carSlot, { top, left: laneX(f.lane), width: carW }]}
                  >
                    <View style={[styles.nameTag, { borderColor: f.color }]}>
                      <ThemedText type="small" style={styles.nameTagText}>{f.name}</ThemedText>
                    </View>
                    <CarSprite color={f.color} w={carW} ghost />
                  </View>
                );
              })}

              {/* Your car */}
              <Animated.View
                pointerEvents="none"
                style={[styles.carSlot, { top: decisionY, width: carW, transform: [{ translateX: carX }] }]}
              >
                <CarSprite color={Brand.blue} w={carW} />
              </Animated.View>
            </>
          )}
        </View>

        {/* Question + steering buttons */}
        <SketchSurface decoration="tape" rotate={-0.5} shadow={5} radius="md" style={styles.qCard}>
          <ThemedText type="smallBold" color={Brand.muted}>DRIVE INTO THE ANSWER</ThemedText>
          <ThemedText style={styles.qText}>{round.prompt} = ?</ThemedText>
          <View style={styles.steerRow}>
            <Pressable onPress={() => setCarLane((l) => Math.max(0, l - 1))} style={styles.steerBtn}>
              <ThemedText style={styles.steerLabel}>◄</ThemedText>
            </Pressable>
            <Pressable onPress={() => setCarLane((l) => Math.min(LANES - 1, l + 1))} style={styles.steerBtn}>
              <ThemedText style={styles.steerLabel}>►</ThemedText>
            </Pressable>
          </View>
        </SketchSurface>
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
  gridRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, paddingVertical: 6 },
  dot: { width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: Brand.ink },
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
  },

  playWrap: {
    flex: 1,
    padding: Spacing.three,
    gap: Spacing.two,
    maxWidth: MaxContentWidth,
    width: '100%',
    alignSelf: 'center',
  },
  hud: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  rankPill: { backgroundColor: Brand.ink, paddingHorizontal: Spacing.two, paddingVertical: 5, ...Wobbly.pill },
  progressTrack: {
    flex: 1,
    height: 14,
    borderRadius: 8,
    backgroundColor: Brand.card,
    borderWidth: 2,
    borderColor: Brand.ink,
    overflow: 'hidden',
    padding: 2,
  },
  progressFill: { height: '100%', borderRadius: 5, backgroundColor: Brand.blue },
  comboTag: {
    backgroundColor: Brand.postit,
    borderWidth: 2,
    borderColor: Brand.ink,
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
    ...Wobbly.sm,
  },

  road: {
    flex: 1,
    backgroundColor: '#efeae0',
    borderWidth: 3,
    borderColor: Brand.ink,
    ...Wobbly.md,
    overflow: 'hidden',
    position: 'relative',
  },
  divider: { position: 'absolute', top: 0, width: 4, alignItems: 'center' },
  dash: { width: 4, height: 22, marginTop: 18, backgroundColor: '#c9c1b2', borderRadius: 2 },
  laneTap: { position: 'absolute', top: 0, bottom: 0 },
  gate: { position: 'absolute', top: 0, left: 0, right: 0, height: 56 },
  tile: {
    position: 'absolute',
    top: 0,
    height: 52,
    borderWidth: 3,
    borderColor: Brand.ink,
    alignItems: 'center',
    justifyContent: 'center',
    ...offsetShadow(3, Brand.ink),
  },
  tileText: { fontFamily: HandFonts.heading, fontSize: 24 },
  carSlot: { position: 'absolute', left: 0, alignItems: 'center' },
  nameTag: {
    backgroundColor: Brand.card,
    borderWidth: 2,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
    marginBottom: 2,
  },
  nameTagText: { fontSize: 12, lineHeight: 16, color: Brand.ink },

  qCard: { alignItems: 'center', gap: 2 },
  qText: { fontFamily: HandFonts.heading, fontSize: 34, lineHeight: 40, color: Brand.ink },
  steerRow: { flexDirection: 'row', gap: Spacing.three, marginTop: Spacing.two },
  steerBtn: {
    width: 76,
    height: 48,
    backgroundColor: Brand.card,
    borderWidth: 3,
    borderColor: Brand.ink,
    ...Wobbly.pill,
    ...offsetShadow(3, Brand.ink),
    alignItems: 'center',
    justifyContent: 'center',
  },
  steerLabel: { fontFamily: HandFonts.heading, fontSize: 24, color: Brand.ink },
});
