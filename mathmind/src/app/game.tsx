import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { LayoutChangeEvent, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BigButton } from '@/components/big-button';
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
        <View style={styles.centered}>
          <ThemedText type="title" style={{ color: Brand.spark, textAlign: 'center' }}>
            {score}/{ROUNDS} 🏁
          </ThemedText>
          <ThemedText style={{ color: Brand.muted, textAlign: 'center', marginVertical: Spacing.three }}>
            {score >= 5 ? 'Number line master!' : 'Nice dashing — your aim is getting sharper.'}
          </ThemedText>
          <BigButton label="Back home" color={Brand.primary} onPress={() => router.replace('/')} style={{ alignSelf: 'stretch' }} />
        </View>
      </SafeAreaView>
    );
  }

  const targetPct = (target / MAX) * 100;
  const markerPct = marker != null ? (marker / MAX) * 100 : null;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <ThemedText type="small" style={{ color: Brand.muted, textAlign: 'center' }}>
          Round {round + 1} of {ROUNDS} · Score {score}
        </ThemedText>
        <ThemedText type="title" style={styles.target}>
          Tap {target}
        </ThemedText>
        <ThemedText type="small" style={{ color: Brand.muted, textAlign: 'center' }}>
          on the line from 0 to {MAX}
        </ThemedText>

        <View style={styles.lineWrap}>
          <Pressable onPress={onLine} onLayout={onLayout} style={styles.line}>
            <View style={styles.lineBar} />
            {/* endpoints */}
            <ThemedText style={[styles.endLabel, { left: 0 }]}>0</ThemedText>
            <ThemedText style={[styles.endLabel, { right: 0 }]}>{MAX}</ThemedText>
            {/* the runner's guess */}
            {markerPct != null && (
              <View
                style={[
                  styles.marker,
                  {
                    left: `${markerPct}%`,
                    backgroundColor: feedback === 'hit' ? Brand.correct : Brand.gentle,
                  },
                ]}
              />
            )}
            {/* reveal the true spot after a guess */}
            {feedback && (
              <View style={[styles.trueMark, { left: `${targetPct}%` }]} />
            )}
          </Pressable>
        </View>

        {feedback && (
          <View style={styles.feedbackRow}>
            <ThemedText type="smallBold" style={{ color: feedback === 'hit' ? Brand.correct : Brand.gentle }}>
              {feedback === 'hit' ? 'Bullseye! 🎯' : `Off by ${Math.round(Math.abs((marker ?? 0) - target))}`}
            </ThemedText>
            <BigButton label="Next →" color={Brand.spark} onPress={next} />
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Brand.cream },
  container: {
    flex: 1,
    padding: Spacing.four,
    gap: Spacing.three,
    maxWidth: MaxContentWidth,
    width: '100%',
    alignSelf: 'center',
    justifyContent: 'center',
  },
  centered: { flex: 1, justifyContent: 'center', padding: Spacing.four },
  target: { color: Brand.ink, textAlign: 'center', fontSize: 52, lineHeight: 58 },
  lineWrap: { paddingVertical: Spacing.five },
  line: { height: 64, justifyContent: 'center' },
  lineBar: { height: 8, borderRadius: 4, backgroundColor: '#D9D2C4' },
  endLabel: { position: 'absolute', top: -4, color: Brand.muted, fontSize: 13 },
  marker: {
    position: 'absolute',
    width: 18,
    height: 18,
    borderRadius: 9,
    marginLeft: -9,
    borderWidth: 3,
    borderColor: '#fff',
  },
  trueMark: {
    position: 'absolute',
    width: 3,
    height: 34,
    marginLeft: -1.5,
    backgroundColor: Brand.correct,
    borderRadius: 2,
  },
  feedbackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
});
