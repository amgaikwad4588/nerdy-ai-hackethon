import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BigButton } from '@/components/big-button';
import { MasteryRing } from '@/components/mastery-ring';
import { PaperBg, SketchSurface, StickyTag } from '@/components/sketch';
import { ThemedText } from '@/components/themed-text';
import { Brand, MaxContentWidth, Spacing } from '@/constants/theme';
import { MISCONCEPTIONS, SKILLS, SKILL_BY_ID } from '@/lib/curriculum';
import { MASTERY_THRESHOLD, useStore } from '@/lib/store';

const MC_BY_TAG = Object.fromEntries(MISCONCEPTIONS.map((m) => [m.tag, m]));

// Simple, screen-free things a parent can do at home for each skill.
const HOME_ACTIVITY: Record<string, string> = {
  'place-value': "On a car ride, point at a number plate and ask 'what is the 3 worth in 305?'",
  'multi-add': 'Add up a few grocery prices together and check the total.',
  'mult-facts': 'Count by 4s to 40 out loud — turn a times table into a game.',
  'mult-arrays': 'Count things in rows (an egg carton, a muffin tin) as rows × columns.',
  'frac-compare': 'Cut a snack into pieces and ask: is 1/4 or 1/8 the bigger piece?',
  'frac-equiv': 'Break half a chocolate bar into more pieces to show 1/2 = 2/4.',
};

export default function Parent() {
  const router = useRouter();
  const { studentName, mastery, streak, events, turns, xp, loadDemoData } = useStore();

  const overall = SKILLS.reduce((s, sk) => s + (mastery[sk.id] ?? 0), 0) / SKILLS.length;
  useEffect(() => {
    if (xp === 0 && turns.length === 0 && overall < 0.01) loadDemoData();
  }, [xp, turns.length, overall, loadDemoData]);

  const mastered = SKILLS.filter((s) => (mastery[s.id] ?? 0) >= MASTERY_THRESHOLD);
  const focus = [...SKILLS].sort((a, b) => (mastery[a.id] ?? 0) - (mastery[b.id] ?? 0))[0];
  const openEvent = events.find((e) => !e.resolved);
  const openMc = openEvent ? MC_BY_TAG[openEvent.tag] : null;

  return (
    <SafeAreaView style={styles.safe}>
      <PaperBg />
      <ScrollView contentContainerStyle={styles.container}>
        {/* Header */}
        <SketchSurface decoration="tack" rotate={-1} shadow={6} radius="lg" style={styles.headerCard}>
          <View style={{ flex: 1 }}>
            <ThemedText type="subtitle">{studentName}&apos;s progress</ThemedText>
            <ThemedText type="small" style={{ color: Brand.muted, marginTop: 2 }}>
              A calm weekly snapshot for parents.
            </ThemedText>
          </View>
          <View style={{ transform: [{ rotate: '4deg' }] }}>
            <MasteryRing level={overall} size={68} color={Brand.blue} />
          </View>
        </SketchSurface>

        {/* Plain-language summary */}
        <SketchSurface radius="md" shadow={4} style={{ marginTop: Spacing.four }}>
          <ThemedText type="smallBold" color={Brand.blue}>HOW {studentName.toUpperCase()} IS DOING</ThemedText>
          <ThemedText style={{ marginTop: Spacing.one }}>
            {studentName} has mastered {mastered.length} of {SKILLS.length} skills and is on a{' '}
            {streak}-day streak. Overall mastery is about {Math.round(overall * 100)}%.
            {mastered.length > 0 ? ` Strong on ${mastered.map((s) => s.title.toLowerCase()).join(', ')}.` : ''}
          </ThemedText>
        </SketchSurface>

        {/* What we're working on + at-home activity */}
        <StickyTag label="WHAT WE'RE WORKING ON" color={Brand.postit} rotate={-2} style={{ marginTop: Spacing.five }} />
        <SketchSurface radius="md" shadow={4} style={{ marginTop: Spacing.two }}>
          <ThemedText type="smallBold">{focus.title}</ThemedText>
          <ThemedText type="small" style={{ color: Brand.muted, marginTop: 2 }}>
            {openMc
              ? `Right now, ${studentName} sometimes thinks: ${openMc.description}`
              : `${studentName} is building confidence here — a little practice will level it up.`}
          </ThemedText>
          <View style={styles.tipBox}>
            <ThemedText type="smallBold" color={Brand.blue}>TRY AT HOME</ThemedText>
            <ThemedText style={{ marginTop: 2 }}>
              {HOME_ACTIVITY[focus.id] ?? 'Talk through one math moment together each day.'}
            </ThemedText>
          </View>
        </SketchSurface>

        {/* Skills overview (read-only) */}
        <StickyTag label="SKILLS" rotate={2} style={{ marginTop: Spacing.five }} />
        <View style={{ gap: Spacing.three, marginTop: Spacing.two }}>
          {SKILLS.map((s) => {
            const lvl = mastery[s.id] ?? 0;
            const label = lvl >= MASTERY_THRESHOLD ? 'Mastered' : lvl >= 0.5 ? 'Getting there' : lvl > 0 ? 'Practicing' : 'Not started';
            const color = lvl >= MASTERY_THRESHOLD ? Brand.blue : lvl >= 0.5 ? Brand.ink : lvl > 0 ? Brand.accent : Brand.muted;
            return (
              <SketchSurface key={s.id} radius="sm" shadow={3} style={styles.skillRow}>
                <MasteryRing level={lvl} size={44} color={Brand.domain[s.domain]} />
                <View style={{ flex: 1 }}>
                  <ThemedText type="smallBold">{s.title}</ThemedText>
                  <ThemedText type="small" style={{ color: Brand.muted }}>{SKILL_BY_ID[s.id].code}</ThemedText>
                </View>
                <ThemedText type="small" color={color}>{label}</ThemedText>
              </SketchSurface>
            );
          })}
        </View>

        <ThemedText type="small" style={styles.footer}>
          This view is read-only and updates as {studentName} practices. Nothing here is shared outside your device in the demo.
        </ThemedText>

        <BigButton label="Back home" variant="ghost" tint={Brand.ink} onPress={() => router.replace('/')} style={{ marginTop: Spacing.three }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Brand.paper },
  container: {
    padding: Spacing.four,
    gap: Spacing.three,
    maxWidth: MaxContentWidth,
    width: '100%',
    alignSelf: 'center',
  },
  headerCard: { flexDirection: 'row', alignItems: 'center', marginTop: Spacing.two },
  skillRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  tipBox: {
    marginTop: Spacing.three,
    backgroundColor: Brand.postit,
    borderWidth: 2,
    borderColor: Brand.ink,
    borderStyle: 'dashed',
    padding: Spacing.three,
  },
  footer: { color: Brand.muted, marginTop: Spacing.four, fontStyle: 'italic', textAlign: 'center' },
});
