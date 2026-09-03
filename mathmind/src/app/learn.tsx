import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BigButton } from '@/components/big-button';
import { Buddy, type BuddyMood } from '@/components/buddy';
import { FocusGuard } from '@/components/focus-guard';
import { MasteryRing } from '@/components/mastery-ring';
import { PaperBg, SketchSurface, SpeakerIcon, StickyTag } from '@/components/sketch';
import { ThemedText } from '@/components/themed-text';
import { Brand, HandFonts, MaxContentWidth, Spacing, Wobbly } from '@/constants/theme';
import { SKILLS, SKILL_BY_ID, generateTask } from '@/lib/curriculum';
import { speak, stopSpeaking } from '@/lib/speak';
import { MASTERY_THRESHOLD, useStore } from '@/lib/store';
import { tutorTurn } from '@/lib/tutor';
import type { Difficulty, Task, TutorResult } from '@/lib/types';

const TASKS_PER_SESSION = 5;

// Milo's between-answers nudges — coaching, kept short for ADHD focus.
const NUDGES = [
  "I'm listening — talk me through it.",
  "What's your first step?",
  "You've got this. Think it out loud.",
  'How would you start this one?',
];
function nudgeFor(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return NUDGES[Math.abs(h) % NUDGES.length];
}

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
  const { studentName, mastery, difficulty, streak, recordTurn, resolveOpenEvents } = store;

  const [task, setTask] = useState<Task | null>(null);
  const [answer, setAnswer] = useState('');
  const [thinking, setThinking] = useState('');
  const [phase, setPhase] = useState<'answering' | 'feedback' | 'done'>('answering');
  const [result, setResult] = useState<TutorResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [count, setCount] = useState(0);
  const [focused, setFocused] = useState(false);
  const seed = useRef(Math.floor(Math.random() * 1e9));

  const skill = task ? SKILL_BY_ID[task.skillId] : null;

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
  }, []);

  useEffect(() => {
    nextTask();
    return () => {
      stopSpeaking();
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
      stopSpeaking();
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
        <PaperBg />
        <View style={styles.centered}>
          <SketchSurface decoration="tape" rotate={-1} shadow={6} radius="lg" style={{ gap: Spacing.two }}>
            <ThemedText type="title" style={{ color: Brand.blue, textAlign: 'center' }}>
              Great focus!
            </ThemedText>
            <ThemedText style={{ color: Brand.muted, textAlign: 'center', marginBottom: Spacing.two }}>
              You finished {TASKS_PER_SESSION} questions with a {streak} day streak.
              {unlocked ? ' You unlocked a game!' : ' Keep going to unlock a game.'}
            </ThemedText>
            <BigButton
              label="Play Math Sprint"
              variant="primary"
              onPress={() => router.replace('/game')}
            />
            <BigButton
              label="Back home"
              variant="ghost"
              tint={Brand.ink}
              onPress={() => router.replace('/')}
            />
          </SketchSurface>
        </View>
      </SafeAreaView>
    );
  }

  if (!task || !skill) return null;
  const accent = Brand.domain[skill.domain];

  const buddyMood: BuddyMood =
    phase === 'feedback' && result
      ? result.isCorrect
        ? 'cheer'
        : result.misconceptionTag
          ? 'thinking'
          : 'oops'
      : 'happy';
  const buddyMessage =
    phase === 'feedback' && result ? result.message : nudgeFor(task.id);

  return (
    <SafeAreaView style={styles.safe}>
      <PaperBg />
      <View style={styles.container}>
        <FocusGuard studentName={studentName} />

        {/* Progress, then a tidy row: skill on the left, mastery on the right */}
        <View style={styles.header}>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: `${Math.max(6, progress * 100)}%`, backgroundColor: accent },
              ]}
            />
          </View>
          <View style={styles.labelRow}>
            <StickyTag label={`${skill.title.toUpperCase()} · LVL ${difficulty[skill.id] ?? 1}`} rotate={-1.5} />
            <MasteryRing level={mastery[skill.id] ?? 0} size={40} color={accent} />
          </View>
        </View>

        {/* Milo guides the child; tap him to hear the line again */}
        <Buddy mood={buddyMood} message={buddyMessage} onReplay={() => speak(buddyMessage)} />

        {/* The single task in focus — taped to the page */}
        <SketchSurface decoration="tape" rotate={-0.75} shadow={6} radius="lg" style={styles.taskCard}>
          <Pressable onPress={() => speak(task.prompt)} style={styles.speaker} hitSlop={12}>
            <SpeakerIcon size={20} />
          </Pressable>
          <ThemedText style={styles.prompt}>{task.prompt}</ThemedText>
        </SketchSurface>

        {phase === 'answering' && (
          <>
            {task.kind === 'choice' ? (
              <View style={{ gap: Spacing.two }}>
                {task.choices!.map((c) => (
                  <BigButton
                    key={c}
                    label={c}
                    variant="ghost"
                    tint={accent}
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
                  placeholderTextColor={`${Brand.ink}66`}
                  onFocus={() => setFocused(true)}
                  onBlur={() => setFocused(false)}
                  style={[
                    styles.input,
                    Wobbly.md,
                    { borderColor: focused ? Brand.blue : Brand.ink },
                  ]}
                  editable={!busy}
                  onSubmitEditing={() => submit()}
                />
                <BigButton label={busy ? 'Thinking…' : 'Check it'} variant="primary" disabled={busy} onPress={() => submit()} />
              </>
            )}
            <TextInput
              value={thinking}
              onChangeText={setThinking}
              placeholder="Optional: how did you figure it out?"
              placeholderTextColor={`${Brand.ink}55`}
              style={[styles.thinkingInput, Wobbly.sm]}
              editable={!busy}
              multiline
            />
          </>
        )}

        {phase === 'feedback' && result && (
          <SketchSurface
            radius="md"
            shadow={5}
            style={{ borderColor: result.isCorrect ? Brand.blue : Brand.accent, borderWidth: 3 }}
          >
            <ThemedText type="smallBold" color={result.isCorrect ? Brand.blue : Brand.accent}>
              {result.isCorrect ? 'Correct!' : result.misconceptionTag ? 'Let’s rethink' : 'Not yet — keep going'}
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
                  tint={accent}
                  onPress={() => setPhase('answering')}
                  style={{ flex: 1 }}
                />
              )}
              <BigButton
                label={result.isCorrect ? 'Next' : 'Skip'}
                variant="primary"
                onPress={advance}
                style={{ flex: 1 }}
              />
            </View>
          </SketchSurface>
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
  },
  centered: { flex: 1, justifyContent: 'center', padding: Spacing.four, maxWidth: MaxContentWidth, width: '100%', alignSelf: 'center' },
  header: { gap: Spacing.two },
  labelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  progressTrack: {
    flex: 1,
    height: 16,
    borderRadius: 9,
    backgroundColor: Brand.card,
    borderWidth: 2,
    borderColor: Brand.ink,
    overflow: 'hidden',
    padding: 2,
  },
  progressFill: { height: '100%', borderRadius: 6 },
  taskCard: { minHeight: 120, justifyContent: 'center' },
  speaker: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 2,
    borderColor: Brand.ink,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Brand.card,
  },
  prompt: {
    fontFamily: HandFonts.heading,
    color: Brand.ink,
    textAlign: 'center',
    fontSize: 30,
    lineHeight: 40,
    paddingHorizontal: Spacing.three,
  },
  input: {
    backgroundColor: Brand.card,
    padding: Spacing.three,
    fontFamily: HandFonts.body,
    fontSize: 24,
    color: Brand.ink,
    textAlign: 'center',
    borderWidth: 3,
  },
  thinkingInput: {
    backgroundColor: Brand.postit,
    padding: Spacing.three,
    fontFamily: HandFonts.body,
    fontSize: 16,
    color: Brand.ink,
    borderWidth: 2,
    borderColor: Brand.ink,
    borderStyle: 'dashed',
    minHeight: 52,
  },
});
