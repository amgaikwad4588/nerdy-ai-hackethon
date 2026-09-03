import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { LayoutChangeEvent, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BigButton } from '@/components/big-button';
import { PaperBg, SketchSurface, StickyTag } from '@/components/sketch';
import { ThemedText } from '@/components/themed-text';
import { Brand, MaxContentWidth, Spacing } from '@/constants/theme';
import { useStore } from '@/lib/store';

// Number Line Dash: an adaptive magnitude/place-value game. Tap where the target
// number sits on the line. A correct-enough tap advances the runner. It's a reward
// that is *also* practice — every round emits a mastery signal for place value.

const ROUNDS = 6;
const MAX = 100;

export default function Game() {
  const router = useRouter();
  const recordTurn = useStore((s) => s.recordTurn);

  const targets = useMemo(
    () => Array.from({ length: ROUNDS }, () => 5 + Math.floor(Math.random() * (MAX - 10))),
    [],
  );

  const [round, setRound] = useState(0);
  const [score, setScore] = useState(0);
  const [lineWidth, setLineWidth] = useState(0);
  const [marker, setMarker] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<'hit' | 'miss' | null>(null);

  const target = targets[round];
  const tolerance = MAX * 0.07; // generous for young learners

  const onLine = useCallback(
    (e: { nativeEvent: { locationX: number } }) => {
      if (feedback || lineWidth === 0) return;
      const x = Math.max(0, Math.min(lineWidth, e.nativeEvent.locationX));
      const value = (x / lineWidth) * MAX;
      const hit = Math.abs(value - target) <= tolerance;
      setMarker(value);
      setFeedback(hit ? 'hit' : 'miss');
      if (hit) setScore((s) => s + 1);

      recordTurn({
        id: `game-${round}-${Date.now()}`,
        at: Date.now(),
        skillId: 'place-value',
        taskId: `dash-${round}`,
        studentAnswer: String(Math.round(value)),
        result: {
          isCorrect: hit,
          isOnTrack: hit,
          misconceptionTag: null,
          message: '',
          hint: '',
          difficultyDelta: 0,
          masterySignal: hit ? 0.9 : 0.3,
        },
      });
    },
    [feedback, lineWidth, target, tolerance, round, recordTurn],
  );

  function next() {
    setMarker(null);
    setFeedback(null);
    if (round + 1 >= ROUNDS) setRound(ROUNDS);
    else setRound((r) => r + 1);
  }

  const onLayout = (e: LayoutChangeEvent) => setLineWidth(e.nativeEvent.layout.width);

  if (round >= ROUNDS) {
    return (
      <SafeAreaView style={styles.safe}>
        <PaperBg />
        <View style={styles.centered}>
          <SketchSurface decoration="tack" rotate={-1} shadow={6} radius="lg" style={{ gap: Spacing.two }}>
            <ThemedText type="title" style={{ color: Brand.accent, textAlign: 'center' }}>
              {score}/{ROUNDS} 🏁
            </ThemedText>
            <ThemedText style={{ color: Brand.muted, textAlign: 'center', marginBottom: Spacing.two }}>
              {score >= 5 ? 'Number line master!' : 'Nice dashing — your aim is getting sharper.'}
            </ThemedText>
            <BigButton label="Back home" variant="primary" onPress={() => router.replace('/')} />
          </SketchSurface>
        </View>
      </SafeAreaView>
    );
  }

  const targetPct = (target / MAX) * 100;
  const markerPct = marker != null ? (marker / MAX) * 100 : null;

  return (
    <SafeAreaView style={styles.safe}>
      <PaperBg />
      <View style={styles.container}>
        <StickyTag label={`ROUND ${round + 1} / ${ROUNDS} · SCORE ${score}`} rotate={-2} style={{ alignSelf: 'center' }} />
        <ThemedText type="title" style={styles.target}>
          Tap {target}
        </ThemedText>
        <ThemedText type="small" style={{ color: Brand.muted, textAlign: 'center' }}>
          on the line from 0 to {MAX}
        </ThemedText>

        <SketchSurface radius="md" shadow={5} rotate={-0.5} style={styles.pad}>
          <Pressable onPress={onLine} onLayout={onLayout} style={styles.line}>
            <View style={styles.lineBar} />
            <ThemedText style={[styles.endLabel, { left: 0 }]}>0</ThemedText>
            <ThemedText style={[styles.endLabel, { right: 0 }]}>{MAX}</ThemedText>
            {markerPct != null && (
              <View
                style={[
                  styles.marker,
                  {
                    left: `${markerPct}%`,
                    backgroundColor: feedback === 'hit' ? Brand.blue : Brand.accent,
                  },
                ]}
              />
            )}
            {feedback && <View style={[styles.trueMark, { left: `${targetPct}%` }]} />}
          </Pressable>
        </SketchSurface>

        {feedback && (
          <View style={styles.feedbackRow}>
            <ThemedText type="smallBold" color={feedback === 'hit' ? Brand.blue : Brand.accent}>
              {feedback === 'hit' ? 'Bullseye! 🎯' : `Off by ${Math.round(Math.abs((marker ?? 0) - target))}`}
            </ThemedText>
            <BigButton label="Next →" variant="primary" onPress={next} />
          </View>
        )}
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
    justifyContent: 'center',
  },
  centered: { flex: 1, justifyContent: 'center', padding: Spacing.four, maxWidth: MaxContentWidth, width: '100%', alignSelf: 'center' },
  target: { color: Brand.ink, textAlign: 'center', fontSize: 52, lineHeight: 58, marginTop: Spacing.two },
  pad: { paddingVertical: Spacing.five },
  line: { height: 64, justifyContent: 'center' },
  lineBar: {
    height: 8,
    borderRadius: 4,
    backgroundColor: Brand.ink,
    borderTopLeftRadius: 6,
    borderBottomRightRadius: 6,
  },
  endLabel: {
    position: 'absolute',
    top: -6,
    color: Brand.muted,
    fontSize: 14,
    fontFamily: 'PatrickHand_400Regular',
  },
  marker: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
    marginLeft: -10,
    borderWidth: 2,
    borderColor: Brand.ink,
  },
  trueMark: {
    position: 'absolute',
    width: 0,
    height: 40,
    marginLeft: -1,
    borderLeftWidth: 3,
    borderStyle: 'dashed',
    borderColor: Brand.blue,
  },
  feedbackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
});
