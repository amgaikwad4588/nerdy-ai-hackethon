import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, G, Line, LinearGradient, Path, Polygon, Rect, Stop } from 'react-native-svg';

import { BigButton } from '@/components/big-button';
import { PaperBg, SketchSurface, StickyTag } from '@/components/sketch';
import { ThemedText } from '@/components/themed-text';
import { Brand, HandFonts, MaxContentWidth, Spacing, Wobbly, offsetShadow } from '@/constants/theme';
import { useStore } from '@/lib/store';
import type { Difficulty } from '@/lib/types';

// Highway Racer — a pseudo-3D (Out Run style) math race. Third-person camera behind your
// car; the road converges to a horizon with trees/cacti rushing past and the scenery
// biome shifting (grass -> desert -> forest). The answer gate approaches from far up the
// road, growing as it nears — steer into the correct lane before it reaches you. Right
// answer floors it, wrong answer bogs you down. You race friends' translucent cars up
// the road; first to the finish wins. Correct answers feed a mastery signal.

const LANES = 4;
const FINISH = 120;
const MAX_ROUNDS = 12;
const BOOST = 16;
const SLOW = 5;

const FAR = 6; // gate/scenery spawn depth
const GATE_SPEED = 0.9; // steady approach for the answer gate (decoupled from road speed → more decision time)
const EVAL_DIST = 0.28; // gate reaches the car
const REVEAL_DIST = 3.2; // friends show their lane choice
const BIOME_SECS = 9;
const TICK_MS = 33;

type TreeKind = 'pine' | 'round' | 'bush' | 'jungle' | 'palm' | 'cactus' | 'rock';

const BIOMES: { name: string; ground: string; hill: string; treeline: boolean; kinds: TreeKind[] }[] = [
  { name: 'grass', ground: '#8fc07a', hill: '#79ad64', treeline: true, kinds: ['round', 'pine', 'bush', 'round', 'bush'] },
  { name: 'desert', ground: '#e7cf9c', hill: '#d8bd82', treeline: false, kinds: ['cactus', 'rock', 'cactus', 'bush'] },
  { name: 'jungle', ground: '#4f9a4a', hill: '#3f7f3c', treeline: true, kinds: ['jungle', 'palm', 'jungle', 'round', 'bush'] },
];

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
  options: number[];
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

interface Scenery {
  side: -1 | 1;
  spread: number;
  dist: number;
  scale: number;
  tree: TreeKind;
}

/** Rear-view car (drawn from behind), base sits at (0,0). */
function RearCar({ x, y, scale, color, ghost = false }: { x: number; y: number; scale: number; color: string; ghost?: boolean }) {
  const ink = Brand.ink;
  return (
    <G transform={`translate(${x}, ${y}) scale(${scale})`} opacity={ghost ? 0.5 : 1}>
      <Path d="M-26 0 L-26 -34 Q-26 -48 -12 -50 L12 -50 Q26 -48 26 -34 L26 0 Z" fill={color} stroke={ink} strokeWidth={2.5} strokeLinejoin="round" />
      <Path d="M-15 -30 L15 -30 L11 -46 L-11 -46 Z" fill="rgba(255,255,255,0.62)" stroke={ink} strokeWidth={1.5} strokeLinejoin="round" />
      <Rect x={-28} y={-7} width={56} height={9} rx={3} fill="rgba(0,0,0,0.25)" stroke={ink} strokeWidth={2} />
      <Rect x={-23} y={-18} width={11} height={8} rx={2} fill={Brand.accent} stroke={ink} strokeWidth={1} />
      <Rect x={12} y={-18} width={11} height={8} rx={2} fill={Brand.accent} stroke={ink} strokeWidth={1} />
      <Rect x={-31} y={-32} width={6} height={18} rx={2} fill={ink} />
      <Rect x={25} y={-32} width={6} height={18} rx={2} fill={ink} />
    </G>
  );
}

const GREEN_DARK = '#2f6d38';
const GREEN_MID = '#3f8c46';
const GREEN_LT = '#57a651';
const TRUNK = '#7a5236';

/** Roadside plant, base at (0,0). Several kinds so the roadside reads as a real forest. */
function Tree({ x, y, scale, kind }: { x: number; y: number; scale: number; kind: TreeKind }) {
  const ink = Brand.ink;
  const t = `translate(${x}, ${y}) scale(${scale})`;
  switch (kind) {
    case 'cactus':
      return (
        <G transform={t}>
          <Path d="M-4 0 L-4 -34 Q-4 -40 4 -40 L4 0 Z" fill="#4c8b52" stroke={ink} strokeWidth={2} />
          <Path d="M-4 -20 Q-16 -20 -16 -30 L-16 -22" fill="none" stroke="#4c8b52" strokeWidth={7} strokeLinecap="round" />
          <Path d="M4 -26 Q16 -26 16 -36 L16 -28" fill="none" stroke="#4c8b52" strokeWidth={7} strokeLinecap="round" />
        </G>
      );
    case 'rock':
      return (
        <G transform={t}>
          <Path d="M-16 0 Q-20 -14 -8 -18 Q0 -24 10 -18 Q20 -14 16 0 Z" fill="#b3a892" stroke={ink} strokeWidth={2} strokeLinejoin="round" />
          <Path d="M-4 -6 Q0 -14 8 -12" fill="none" stroke="#8f8574" strokeWidth={2} />
        </G>
      );
    case 'bush':
      return (
        <G transform={t}>
          <Circle cx={-9} cy={-7} r={10} fill={GREEN_MID} stroke={ink} strokeWidth={2} />
          <Circle cx={9} cy={-7} r={10} fill={GREEN_MID} stroke={ink} strokeWidth={2} />
          <Circle cx={0} cy={-14} r={12} fill={GREEN_LT} stroke={ink} strokeWidth={2} />
        </G>
      );
    case 'round':
      return (
        <G transform={t}>
          <Rect x={-3} y={-16} width={6} height={18} fill={TRUNK} stroke={ink} strokeWidth={1.5} />
          <Circle cx={0} cy={-28} r={17} fill={GREEN_MID} stroke={ink} strokeWidth={2} />
          <Circle cx={-10} cy={-19} r={11} fill={GREEN_LT} stroke={ink} strokeWidth={2} />
          <Circle cx={10} cy={-19} r={11} fill={GREEN_LT} stroke={ink} strokeWidth={2} />
        </G>
      );
    case 'palm':
      return (
        <G transform={t}>
          <Path d="M-3 0 Q2 -26 -3 -52" fill="none" stroke={TRUNK} strokeWidth={7} strokeLinecap="round" />
          <Path d="M-3 -52 Q-22 -58 -34 -48" fill="none" stroke={GREEN_DARK} strokeWidth={6} strokeLinecap="round" />
          <Path d="M-3 -52 Q16 -60 30 -52" fill="none" stroke={GREEN_MID} strokeWidth={6} strokeLinecap="round" />
          <Path d="M-3 -52 Q-16 -70 -22 -80" fill="none" stroke={GREEN_MID} strokeWidth={6} strokeLinecap="round" />
          <Path d="M-3 -52 Q14 -72 22 -80" fill="none" stroke={GREEN_DARK} strokeWidth={6} strokeLinecap="round" />
          <Path d="M-3 -52 Q0 -72 0 -84" fill="none" stroke={GREEN_LT} strokeWidth={6} strokeLinecap="round" />
        </G>
      );
    case 'jungle':
      return (
        <G transform={t}>
          <Rect x={-4} y={-34} width={9} height={36} fill={TRUNK} stroke={ink} strokeWidth={2} />
          <Circle cx={0} cy={-52} r={22} fill={GREEN_DARK} stroke={ink} strokeWidth={2} />
          <Circle cx={-16} cy={-40} r={15} fill={GREEN_MID} stroke={ink} strokeWidth={2} />
          <Circle cx={16} cy={-40} r={15} fill={GREEN_MID} stroke={ink} strokeWidth={2} />
          <Circle cx={0} cy={-38} r={16} fill={GREEN_LT} stroke={ink} strokeWidth={2} />
        </G>
      );
    default: // pine
      return (
        <G transform={t}>
          <Rect x={-3} y={-12} width={6} height={14} fill={TRUNK} stroke={ink} strokeWidth={1.5} />
          <Polygon points="0,-54 14,-32 -14,-32" fill={GREEN_MID} stroke={ink} strokeWidth={2} strokeLinejoin="round" />
          <Polygon points="0,-42 13,-22 -13,-22" fill={GREEN_LT} stroke={ink} strokeWidth={2} strokeLinejoin="round" />
          <Polygon points="0,-30 12,-10 -12,-10" fill={GREEN_MID} stroke={ink} strokeWidth={2} strokeLinejoin="round" />
        </G>
      );
  }
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
  const [biomeIdx, setBiomeIdx] = useState(0);
  const [, setFrame] = useState(0);

  const [friends, setFriends] = useState(
    () =>
      [...FRIENDS_POOL]
        .sort(() => Math.random() - 0.5)
        .slice(0, 3)
        .map((f) => ({ ...f, dist: 0, lane: rnd(LANES) })),
  );

  // Live scene state kept in refs (mutated each frame; render reads them).
  const gateDist = useRef(FAR);
  const scenery = useRef<Scenery[]>([]);
  const dashPhase = useRef(0);
  const carPos = useRef(1); // smoothed float lane
  const speed = useRef(1.5);
  const boostT = useRef(0);
  const biomeT = useRef(0);
  const paused = useRef(true);
  const resolved = useRef(false);
  const revealed = useRef(false);
  const carLaneRef = useRef(carLane);
  carLaneRef.current = carLane;
  const roundRef = useRef(round);
  roundRef.current = round;
  const comboRef = useRef(combo);
  comboRef.current = combo;
  const distRef = useRef(dist);
  distRef.current = dist;
  const biomeRef = useRef(0);
  const friendTargets = useRef<number[]>([]);

  // ---- geometry / projection ------------------------------------------------
  const w = size.w;
  const h = size.h;
  const horizonY = h * 0.3;
  const nearY = h * 0.99;
  const halfW = w * 0.42;
  const cx = w / 2;
  const proj = useCallback(
    (d: number) => {
      const k = 1 / (1 + d * 1.5);
      return { k, y: horizonY + k * (nearY - horizonY) };
    },
    [horizonY, nearY],
  );
  const laneWorld = (lane: number) => -1 + (2 * lane + 1) / LANES;
  const screenX = useCallback((laneFrac: number, k: number) => cx + laneWorld(laneFrac) * halfW * k, [cx, halfW]);

  const resolve = useCallback(() => {
    if (resolved.current) return;
    resolved.current = true;
    paused.current = true;
    const r = roundRef.current;
    const youLane = carLaneRef.current;
    const youOk = youLane === r.correctLane;
    setFlash({ correctLane: r.correctLane, youLane });
    if (youOk) {
      boostT.current = 0.7;
      speed.current = 2.7;
      setDist((d) => Math.min(FINISH, d + BOOST + comboRef.current));
      setCombo((c) => c + 1);
      recordTurn({
        id: `racer-${Date.now()}`,
        at: Date.now(),
        skillId: 'mult-facts',
        taskId: 'racer',
        studentAnswer: String(r.options[youLane]),
        result: { isCorrect: true, isOnTrack: true, misconceptionTag: null, message: '', hint: '', difficultyDelta: 0, masterySignal: 0.8 },
      });
    } else {
      speed.current = 0.7;
      setCombo(0);
      setDist((d) => Math.min(FINISH, d + SLOW));
    }
    setFriends((prev) => prev.map((f, i) => ({ ...f, dist: Math.min(FINISH, f.dist + (friendTargets.current[i] === r.correctLane ? BOOST : SLOW) + rnd(3)) })));
  }, [recordTurn]);

  const beginRound = useCallback((r: Round) => {
    resolved.current = false;
    revealed.current = false;
    setFlash(null);
    setRound(r);
    setFriends((prev) => {
      friendTargets.current = prev.map((f) => (Math.random() < f.skill ? r.correctLane : rnd(LANES)));
      return prev;
    });
    gateDist.current = FAR;
    paused.current = false;
  }, []);

  const pickKind = useCallback((): TreeKind => {
    const k = BIOMES[biomeRef.current].kinds;
    return k[rnd(k.length)];
  }, []);

  const COUNT = 26;
  const seedScenery = useCallback(() => {
    scenery.current = Array.from({ length: COUNT }).map((_, i) => ({
      side: i % 2 === 0 ? -1 : (1 as -1 | 1),
      spread: 1.1 + Math.random() * 1.6, // some hug the road, some sit deep in the trees
      dist: 0.4 + (i / COUNT) * FAR + Math.random() * 0.4,
      scale: 0.8 + Math.random() * 0.7,
      tree: pickKind(),
    }));
  }, [pickKind]);

  // ---- game loop ------------------------------------------------------------
  useEffect(() => {
    if (phase !== 'playing') return;
    const id = setInterval(() => {
      const dt = TICK_MS / 1000;
      // speed easing back to cruise
      if (boostT.current > 0) boostT.current -= dt;
      else speed.current += (1.5 - speed.current) * 0.05;
      const sp = speed.current;

      dashPhase.current = (dashPhase.current + sp * dt * 60) % 40;

      // scenery scroll
      for (const s of scenery.current) {
        s.dist -= sp * dt;
        if (s.dist < 0.25) {
          s.dist += FAR + Math.random() * 1.5;
          s.side = Math.random() < 0.5 ? -1 : 1;
          s.spread = 1.1 + Math.random() * 1.6;
          s.scale = 0.8 + Math.random() * 0.7;
          s.tree = BIOMES[biomeRef.current].kinds[rnd(BIOMES[biomeRef.current].kinds.length)];
        }
      }

      // biome cycle
      biomeT.current += dt;
      if (biomeT.current > BIOME_SECS) {
        biomeT.current = 0;
        biomeRef.current = (biomeRef.current + 1) % BIOMES.length;
        setBiomeIdx(biomeRef.current);
      }

      // steering smoothing
      carPos.current += (carLaneRef.current - carPos.current) * 0.28;

      // gate approach (steady, not tied to boost — keeps decision time consistent)
      if (!paused.current) {
        gateDist.current -= GATE_SPEED * dt;
        if (!revealed.current && gateDist.current <= REVEAL_DIST) {
          revealed.current = true;
          setFriends((prev) => prev.map((f, i) => ({ ...f, lane: friendTargets.current[i] })));
        }
        if (gateDist.current <= EVAL_DIST) resolve();
      }

      setFrame((f) => (f + 1) % 1000000);
    }, TICK_MS);
    return () => clearInterval(id);
  }, [phase, resolve]);

  // round transitions after the flash
  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => {
      const done = distRef.current >= FINISH || friends.some((f) => f.dist >= FINISH);
      if (done || roundNo + 1 >= MAX_ROUNDS) {
        setPhase('over');
        return;
      }
      setRoundNo((n) => n + 1);
      beginRound(makeRound(diff));
    }, 950);
    return () => clearTimeout(t);
  }, [flash]); // eslint-disable-line react-hooks/exhaustive-deps

  const start = useCallback(() => {
    setDist(0);
    setCombo(0);
    setRoundNo(0);
    setCarLane(1);
    carPos.current = 1;
    speed.current = 1.5;
    boostT.current = 0;
    biomeT.current = 0;
    biomeRef.current = 0;
    setBiomeIdx(0);
    setFriends((prev) => prev.map((f) => ({ ...f, dist: 0, lane: rnd(LANES) })));
    seedScenery();
    setPhase('playing');
    beginRound(makeRound(diff));
  }, [beginRound, diff, seedScenery]);

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize({ w: width, h: height });
  };

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
          <ThemedText type="title" style={styles.bigTitle}>Race your friends!</ThemedText>
          <ThemedText type="small" style={styles.center}>
            The answer speeds toward you up the road — steer into the correct lane before it
            arrives. Right answer floors it, wrong answer slows you down. First car to the
            finish wins.
          </ThemedText>
          <SketchSurface radius="md" shadow={5} rotate={-0.5} style={{ marginTop: Spacing.two }}>
            <ThemedText type="smallBold" style={{ marginBottom: Spacing.two }}>ON THE GRID WITH YOU</ThemedText>
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
            <ThemedText type="smallBold" color={Brand.muted} style={styles.center}>CHEQUERED FLAG</ThemedText>
            <View style={styles.rankBadge}>
              <ThemedText type="smallBold" color="#fff" style={{ fontSize: 18 }}>
                You finished #{myPos} of {standings.length}{medal ? ` — ${medal} place` : ''}
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

  // ---- PLAYING (pseudo-3D scene) --------------------------------------------
  const biome = BIOMES[biomeIdx];
  const roadNear = proj(0.02);
  const roadFar = proj(FAR);
  const carProjD = 0.16;
  const carP = proj(carProjD);
  const carX = screenX(carPos.current, carP.k);

  // road polygon (near wide -> far narrow)
  const roadPts =
    w > 0
      ? `${cx - halfW * roadNear.k},${roadNear.y} ${cx + halfW * roadNear.k},${roadNear.y} ${cx + halfW * roadFar.k},${roadFar.y} ${cx - halfW * roadFar.k},${roadFar.y}`
      : '';

  // scalloped tree-canopy silhouette along the horizon (dense-forest backdrop)
  let treelinePath = '';
  if (w > 0) {
    const bump = 32;
    treelinePath = `M0 ${horizonY + 4}`;
    for (let x = 0; x <= w; x += bump) {
      const top = horizonY - 16 - ((x / bump) % 2 === 0 ? 10 : 0);
      treelinePath += ` Q ${x + bump / 2} ${top} ${x + bump} ${horizonY + 2}`;
    }
    treelinePath += ` L ${w} ${horizonY + 10} L 0 ${horizonY + 10} Z`;
  }

  return (
    <SafeAreaView style={styles.safe}>
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

        {/* Scene */}
        <View style={styles.scene} onLayout={onLayout}>
          {w > 0 && (
            <>
              <Svg width={w} height={h} style={StyleSheet.absoluteFill}>
                <Defs>
                  <LinearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0" stopColor="#bfe3f5" />
                    <Stop offset="1" stopColor="#eaf6ff" />
                  </LinearGradient>
                </Defs>

                {/* sky + ground */}
                <Rect x={0} y={0} width={w} height={horizonY} fill="url(#sky)" />
                <Rect x={0} y={horizonY} width={w} height={h - horizonY} fill={biome.ground} />
                {/* distant hills */}
                <Path d={`M0 ${horizonY} Q ${w * 0.25} ${horizonY - 34} ${w * 0.5} ${horizonY} T ${w} ${horizonY} L ${w} ${horizonY + 6} L 0 ${horizonY + 6} Z`} fill={biome.hill} />

                {/* road */}
                <Polygon points={roadPts} fill="#4a4a4a" stroke={Brand.ink} strokeWidth={2} />
                {/* shoulders */}
                <Line x1={cx - halfW * roadNear.k} y1={roadNear.y} x2={cx - halfW * roadFar.k} y2={roadFar.y} stroke="#f3ede0" strokeWidth={4} />
                <Line x1={cx + halfW * roadNear.k} y1={roadNear.y} x2={cx + halfW * roadFar.k} y2={roadFar.y} stroke="#f3ede0" strokeWidth={4} />
                {/* lane dividers (dashed, scrolling) */}
                {[-0.5, 0, 0.5].map((off) => (
                  <Line
                    key={off}
                    x1={cx + off * halfW * roadNear.k}
                    y1={roadNear.y}
                    x2={cx + off * halfW * roadFar.k}
                    y2={roadFar.y}
                    stroke="#f7d24b"
                    strokeWidth={3}
                    strokeDasharray="22 20"
                    strokeDashoffset={dashPhase.current}
                  />
                ))}

                {/* dense tree-line silhouette hugging the horizon (leafy biomes) */}
                {biome.treeline && (
                  <Path d={treelinePath} fill={biome.hill} opacity={0.9} />
                )}

                {/* scenery (far first, so nearer trees overlap the far ones) */}
                {[...scenery.current]
                  .sort((a, b) => b.dist - a.dist)
                  .map((s, i) => {
                    const p = proj(s.dist);
                    const x = cx + s.side * (1 + s.spread) * halfW * p.k;
                    return <Tree key={`${i}-${s.side}`} x={x} y={p.y} scale={p.k * s.scale * 1.15} kind={s.tree} />;
                  })}

                {/* friends (ghost) — farther cars drawn first */}
                {friends
                  .map((f) => {
                    const sd = Math.min(5, Math.max(0.3, 0.7 + (f.dist - dist) * 0.05));
                    return { f, sd };
                  })
                  .sort((a, b) => b.sd - a.sd)
                  .map(({ f, sd }) => {
                    const p = proj(sd);
                    return <RearCar key={f.name} x={screenX(f.lane, p.k)} y={p.y} scale={p.k} color={f.color} ghost />;
                  })}

                {/* your car */}
                <RearCar x={carX} y={carP.y} scale={carP.k} color={Brand.blue} />
              </Svg>

              {/* answer gate tiles — kept legible even far away: spacing + size are
                  clamped so they read as a floating banner near the horizon, then grow
                  and converge as they arrive. */}
              {round.options.map((opt, l) => {
                const p = proj(gateDist.current);
                const kx = Math.max(0.42, p.k); // don't let lanes fully converge (readability)
                const tScale = Math.max(0.55, p.k); // don't shrink text into a dot
                const tileW = Math.max(90, ((2 * halfW) / LANES) * 0.72);
                const x = cx + laneWorld(l) * halfW * kx;
                const isCorrect = flash && l === flash.correctLane;
                const isYouWrong = flash && l === flash.youLane && flash.youLane !== flash.correctLane;
                const bg = isCorrect ? Brand.blue : isYouWrong ? Brand.accent : Brand.card;
                const fg = isCorrect || isYouWrong ? '#fff' : Brand.ink;
                return (
                  <View
                    key={l}
                    pointerEvents="none"
                    style={[
                      styles.tile,
                      Wobbly.sm,
                      {
                        left: x - tileW / 2,
                        top: p.y - 52 * tScale,
                        width: tileW,
                        backgroundColor: bg,
                        opacity: 0.82 + p.k * 0.18,
                        transform: [{ scale: tScale }],
                      },
                    ]}
                  >
                    <ThemedText style={[styles.tileText, { color: fg }]}>{opt}</ThemedText>
                  </View>
                );
              })}

              {/* friend name tags */}
              {friends.map((f) => {
                const sd = Math.min(5, Math.max(0.3, 0.7 + (f.dist - dist) * 0.05));
                const p = proj(sd);
                if (p.k < 0.22) return null;
                return (
                  <View key={f.name} pointerEvents="none" style={[styles.nameTag, { left: screenX(f.lane, p.k) - 34, top: p.y - 62 * p.k, borderColor: f.color, opacity: 0.5 + p.k * 0.5 }]}>
                    <ThemedText type="small" style={styles.nameTagText}>{f.name}</ThemedText>
                  </View>
                );
              })}

              {/* lane tap targets */}
              {[0, 1, 2, 3].map((l) => (
                <Pressable key={l} onPress={() => setCarLane(l)} style={[styles.laneTap, { left: (l * w) / LANES, width: w / LANES }]} />
              ))}
            </>
          )}
        </View>

        {/* Question + steering */}
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
  youRow: { backgroundColor: Brand.postit, borderWidth: 2, borderColor: Brand.accent, ...Wobbly.sm, paddingHorizontal: Spacing.two, marginVertical: 2 },
  rankBadge: { alignSelf: 'center', backgroundColor: Brand.accent, borderWidth: 2, borderColor: Brand.ink, paddingHorizontal: Spacing.three, paddingVertical: 6, ...Wobbly.pill },

  playWrap: { flex: 1, padding: Spacing.three, gap: Spacing.two, maxWidth: MaxContentWidth, width: '100%', alignSelf: 'center' },
  hud: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  rankPill: { backgroundColor: Brand.ink, paddingHorizontal: Spacing.two, paddingVertical: 5, ...Wobbly.pill },
  progressTrack: { flex: 1, height: 14, borderRadius: 8, backgroundColor: Brand.card, borderWidth: 2, borderColor: Brand.ink, overflow: 'hidden', padding: 2 },
  progressFill: { height: '100%', borderRadius: 5, backgroundColor: Brand.blue },
  comboTag: { backgroundColor: Brand.postit, borderWidth: 2, borderColor: Brand.ink, paddingHorizontal: Spacing.two, paddingVertical: 2, ...Wobbly.sm },

  scene: { flex: 1, borderWidth: 3, borderColor: Brand.ink, ...Wobbly.md, overflow: 'hidden', position: 'relative' },
  tile: { position: 'absolute', height: 46, borderWidth: 3, borderColor: Brand.ink, alignItems: 'center', justifyContent: 'center', ...offsetShadow(3, Brand.ink) },
  tileText: { fontFamily: HandFonts.heading, fontSize: 24 },
  nameTag: { position: 'absolute', width: 68, alignItems: 'center', backgroundColor: Brand.card, borderWidth: 2, paddingVertical: 1, borderRadius: 8 },
  nameTagText: { fontSize: 12, lineHeight: 16, color: Brand.ink },
  laneTap: { position: 'absolute', top: 0, bottom: 0 },

  qCard: { alignItems: 'center', gap: 2 },
  qText: { fontFamily: HandFonts.heading, fontSize: 34, lineHeight: 40, color: Brand.ink },
  steerRow: { flexDirection: 'row', gap: Spacing.three, marginTop: Spacing.two },
  steerBtn: { width: 76, height: 48, backgroundColor: Brand.card, borderWidth: 3, borderColor: Brand.ink, ...Wobbly.pill, ...offsetShadow(3, Brand.ink), alignItems: 'center', justifyContent: 'center' },
  steerLabel: { fontFamily: HandFonts.heading, fontSize: 24, color: Brand.ink },
});
