import * as Speech from 'expo-speech';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BigButton } from '@/components/big-button';
import { MasteryRing } from '@/components/mastery-ring';
import { ThemedText } from '@/components/themed-text';
import { Brand, MaxContentWidth, Spacing } from '@/constants/theme';
import { SKILLS, SKILL_BY_ID, generateTask } from '@/lib/curriculum';
import { MASTERY_THRESHOLD, useStore } from '@/lib/store';
import { tutorTurn } from '@/lib/tutor';
import type { Difficulty, Task, TutorResult } from '@/lib/types';

const TASKS_PER_SESSION = 5;

// Lowest-mastery skill first — that's where the child needs coaching (and where the
// interesting misconceptions surface for the demo).
function pickSkillId(mastery: Record<string, number>): string {
  return [...SKILLS].sort(
    (a, b) => (mastery[a.id] ?? 0) - (mastery[b.id] ?? 0),
  )[0].id;
}

export default function Learn() {
  const router = useRouter();
  const store = useStore();
  const { mastery, difficulty, streak, recordTurn, resolveOpenEvents } = store;

  const [task, setTask] = useState<Task | null>(null);
  const [answer, setAnswer] = useState('');
  const [thinking, setThinking] = useState('');
  const [phase, setPhase] = useState<'answering' | 'feedback' | 'done'>('answering');
  const [result, setResult] = useState<TutorResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [count, setCount] = useState(0);
  const seed = useRef(Math.floor(Math.random() * 1e9));

  const skill = task ? SKILL_BY_ID[task.skillId] : null;

  const speak = useCallback((text: string) => {
    Speech.stop();
    Speech.speak(text, { rate: 0.95, pitch: 1.05 });
  }, []);

  const nextTask = useCallback(() => {
    const skillId = pickSkillId(useStore.getState().mastery);
    const diff = (useStore.getState().difficulty[skillId] ?? 1) as Difficulty;
    seed.current += 1;
    const t = generateTask(skillId, diff, seed.current);
    setTask(t);
    setAnswer('');
    setThinking('');
    setResult(null);
    setPhase('answering');
    speak(t.prompt);
  }, [speak]);

  useEffect(() => {
    nextTask();
    return () => {
      void Speech.stop();
    };
  }, [nextTask]);

  async function submit(chosen?: string) {
    const finalAnswer = chosen ?? answer;
    if (!task || !finalAnswer.trim() || busy) return;
    setBusy(true);
    setAnswer(finalAnswer);
    const r = await tutorTurn(task, finalAnswer, thinking);
    setResult(r);
    recordTurn({
      id: `${task.id}-${Date.now()}`,
      at: Date.now(),
      skillId: task.skillId,
      taskId: task.id,
      studentAnswer: finalAnswer,
      studentThinking: thinking || undefined,
      result: r,
    });
    if (r.isCorrect) resolveOpenEvents(task.skillId);
    speak(r.message);
    setPhase('feedback');
    setBusy(false);
  }

  function advance() {
    const n = count + 1;
    setCount(n);
    if (n >= TASKS_PER_SESSION) {
      setPhase('done');
      Speech.stop();
    } else {
      nextTask();
    }
  }

  const progress = useMemo(() => count / TASKS_PER_SESSION, [count]);

  if (phase === 'done') {
    const topSkill = pickSkillId(mastery);
    const unlocked = (mastery[topSkill] ?? 0) >= MASTERY_THRESHOLD;
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centered}>
          <ThemedText type="title" style={{ color: Brand.correct, textAlign: 'center' }}>
            Great focus! 🎉
          </ThemedText>
          <ThemedText style={{ color: Brand.muted, textAlign: 'center', marginVertical: Spacing.three }}>
            You finished a {TASKS_PER_SESSION}-question set with a {streak}🔥 streak.
            {unlocked ? ' You unlocked a game!' : ' Keep going to unlock a game.'}
          </ThemedText>
          <BigButton
            label="Play Number Line Dash 🏁"
            color={Brand.spark}
            onPress={() => router.replace('/game')}
            style={{ alignSelf: 'stretch' }}
          />
          <BigButton
            label="Back home"
            variant="ghost"
            color={Brand.ink}
            onPress={() => router.replace('/')}
            style={{ alignSelf: 'stretch', marginTop: Spacing.three }}
          />
        </View>
      </SafeAreaView>
    );
  }

  if (!task || !skill) return null;
  const accent = Brand.domain[skill.domain];

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        {/* Progress + one skill in focus */}
        <View style={styles.topRow}>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progress * 100}%`, backgroundColor: accent }]} />
          </View>
          <MasteryRing level={mastery[skill.id] ?? 0} size={40} color={accent} />
        </View>
        <ThemedText type="small" style={{ color: Brand.muted }}>
          {skill.title} · Level {difficulty[skill.id] ?? 1}
        </ThemedText>

        {/* The single task in focus */}
        <View style={styles.taskCard}>
          <Pressable onPress={() => speak(task.prompt)} style={styles.speaker} hitSlop={12}>
            <ThemedText style={{ fontSize: 22 }}>🔊</ThemedText>
          </Pressable>
          <ThemedText type="subtitle" style={styles.prompt}>
            {task.prompt}
          </ThemedText>
        </View>

        {phase === 'answering' && (
          <>
            {task.kind === 'choice' ? (
              <View style={{ gap: Spacing.two }}>
                {task.choices!.map((c) => (
                  <BigButton
                    key={c}
                    label={c}
                    variant="ghost"
                    color={accent}
                    disabled={busy}
                    onPress={() => submit(c === 'They are equal' ? 'theyareequal' : c)}
                  />
                ))}
              </View>
            ) : (
              <>
                <TextInput
                  value={answer}
                  onChangeText={setAnswer}
                  keyboardType="numbers-and-punctuation"
                  placeholder="Your answer"
                  placeholderTextColor={Brand.muted}
                  style={styles.input}
                  editable={!busy}
                  onSubmitEditing={() => submit()}
                />
                <BigButton label={busy ? 'Thinking…' : 'Check it'} color={accent} disabled={busy} onPress={() => submit()} />
              </>
            )}
            <TextInput
              value={thinking}
              onChangeText={setThinking}
              placeholder="Optional: how did you figure it out?"
              placeholderTextColor={Brand.muted}
              style={styles.thinkingInput}
              editable={!busy}
              multiline
            />
          </>
        )}

        {phase === 'feedback' && result && (
          <View
            style={[
              styles.feedback,
              { borderColor: result.isCorrect ? Brand.correct : Brand.gentle },
            ]}
          >
            <ThemedText type="smallBold" style={{ color: result.isCorrect ? Brand.correct : Brand.gentle }}>
              {result.isCorrect ? 'Correct! ✅' : result.misconceptionTag ? 'Let’s rethink 🤔' : 'Not yet — keep going'}
            </ThemedText>
            <ThemedText style={{ color: Brand.ink, marginTop: Spacing.one }}>
              {result.message}
            </ThemedText>
            {!result.isCorrect && !!result.hint && (
              <ThemedText type="small" style={{ color: Brand.muted, marginTop: Spacing.two }}>
                Hint: {result.hint}
              </ThemedText>
            )}
            <View style={{ flexDirection: 'row', gap: Spacing.two, marginTop: Spacing.three }}>
              {!result.isCorrect && (
                <BigButton
                  label="Try again"
                  variant="ghost"
                  color={accent}
                  onPress={() => setPhase('answering')}
                  style={{ flex: 1 }}
                />
              )}
              <BigButton
                label={result.isCorrect ? 'Next →' : 'Skip →'}
                color={accent}
                onPress={advance}
                style={{ flex: 1 }}
              />
            </View>
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
  },
  centered: { flex: 1, justifyContent: 'center', padding: Spacing.four },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  progressTrack: {
    flex: 1,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#E7E2D6',
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 5 },
  taskCard: {
    backgroundColor: Brand.card,
    borderRadius: 20,
    padding: Spacing.four,
    minHeight: 140,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  speaker: { position: 'absolute', top: Spacing.three, right: Spacing.three },
  prompt: { color: Brand.ink, textAlign: 'center', fontSize: 26, lineHeight: 34 },
  input: {
    backgroundColor: Brand.card,
    borderRadius: 16,
    padding: Spacing.three,
    fontSize: 22,
    color: Brand.ink,
    textAlign: 'center',
    borderWidth: 2,
    borderColor: '#E7E2D6',
  },
  thinkingInput: {
    backgroundColor: '#FFFDF8',
    borderRadius: 14,
    padding: Spacing.three,
    fontSize: 15,
    color: Brand.ink,
    borderWidth: 1,
    borderColor: '#EFE9DC',
    minHeight: 48,
  },
  feedback: {
    backgroundColor: Brand.card,
    borderRadius: 18,
    padding: Spacing.four,
    borderWidth: 2,
  },
});
