import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BigButton } from '@/components/big-button';
import { Buddy } from '@/components/buddy';
import { MasteryRing } from '@/components/mastery-ring';
import { PaperBg, SketchSurface, StickyTag } from '@/components/sketch';
import { ThemedText } from '@/components/themed-text';
import { Brand, MaxContentWidth, Spacing, Wobbly } from '@/constants/theme';
import { DOMAIN_LABEL, SKILLS } from '@/lib/curriculum';
import { MASTERY_THRESHOLD, useStore } from '@/lib/store';

// The student's own progress dashboard — a growth mirror that reinforces mastery-based
// learning. Populated from the shared store; seeds a believable demo story if empty.

// Clearly-dummy demo bits the store doesn't track yet.
const WEEK = [
  { day: 'M', min: 12 },
  { day: 'T', min: 18 },
  { day: 'W', min: 8 },
  { day: 'T', min: 22 },
  { day: 'F', min: 16 },
  { day: 'S', min: 25 },
  { day: 'S', min: 14 },
];
const RECENT_GAMES = [
  { name: 'Math Sprint', detail: 'Ranked #1 of 6', color: Brand.blue },
  { name: 'Bird Shooter', detail: '82% accuracy', color: Brand.accent },
  { name: 'Highway Racer', detail: 'Finished 2nd of 4', color: Brand.ink },
];

function statusFor(level: number): { label: string; color: string } {
  if (level >= MASTERY_THRESHOLD) return { label: 'Mastered', color: Brand.blue };
  if (level >= 0.5) return { label: 'Getting there', color: Brand.ink };
  if (level > 0) return { label: 'Keep practicing', color: Brand.accent };
  return { label: 'Not started', color: Brand.muted };
}

export default function Progress() {
  const router = useRouter();
  const { studentName, mastery, xp, streak, turns, loadDemoData } = useStore();

  // Seed a demo story only if the store is empty, so real play isn't wiped.
  const overallNow = SKILLS.reduce((s, sk) => s + (mastery[sk.id] ?? 0), 0) / SKILLS.length;
  useEffect(() => {
    if (xp === 0 && turns.length === 0 && overallNow < 0.01) loadDemoData();
  }, [xp, turns.length, overallNow, loadDemoData]);

  const overall = overallNow;
  const mastered = SKILLS.filter((s) => (mastery[s.id] ?? 0) >= MASTERY_THRESHOLD);
  const level = Math.floor(xp / 100) + 1;
  const nextSkill = [...SKILLS].sort((a, b) => (mastery[a.id] ?? 0) - (mastery[b.id] ?? 0))[0];
  const maxMin = Math.max(...WEEK.map((w) => w.min), 1);

  const badges = [
    ...mastered.slice(0, 2).map((s) => `${s.title} star`),
    `${streak}-day streak`,
    `${xp} stars`,
    'Sprint champ',
  ];

  return (
    <SafeAreaView style={styles.safe}>
      <PaperBg />
      <ScrollView contentContainerStyle={styles.container}>
        {/* Header — who + level */}
        <SketchSurface decoration="tack" rotate={-1} shadow={6} radius="lg" style={styles.headerCard}>
          <View style={{ flex: 1 }}>
            <ThemedText type="subtitle">Hi {studentName}!</ThemedText>
            <ThemedText type="small" style={{ color: Brand.muted, marginTop: 2 }}>
              Level {level} · {xp} stars · {streak} day streak
            </ThemedText>
            <ThemedText type="small" style={{ color: Brand.blue, marginTop: Spacing.one }}>
              {mastered.length} of {SKILLS.length} skills mastered
            </ThemedText>
          </View>
          <View style={{ transform: [{ rotate: '4deg' }] }}>
            <MasteryRing level={overall} size={72} color={Brand.blue} />
          </View>
        </SketchSurface>

        {/* Milo cheer */}
        <Buddy
          mood="cheer"
          message={`You're on a ${streak}-day streak, ${studentName}! Let's master ${nextSkill.title.toLowerCase()} next.`}
          style={{ marginTop: Spacing.three }}
        />

        {/* Skills detail */}
        <StickyTag label="MY SKILLS" rotate={-3} style={{ marginTop: Spacing.four }} />
        <View style={{ gap: Spacing.three, marginTop: Spacing.two }}>
          {SKILLS.map((s, i) => {
            const lvl = mastery[s.id] ?? 0;
            const st = statusFor(lvl);
            return (
              <SketchSurface key={s.id} radius="sm" shadow={3} rotate={i % 2 === 0 ? -0.5 : 0.5} style={styles.skillRow}>
                <MasteryRing level={lvl} size={48} color={Brand.domain[s.domain]} />
                <View style={{ flex: 1 }}>
                  <ThemedText type="smallBold">{s.title}</ThemedText>
                  <ThemedText type="small" style={{ color: Brand.muted }}>
                    {DOMAIN_LABEL[s.domain]}
                  </ThemedText>
                </View>
                <View style={[styles.statusPill, { borderColor: st.color }]}>
                  <ThemedText type="small" color={st.color}>{st.label}</ThemedText>
                </View>
              </SketchSurface>
            );
          })}
        </View>

        {/* Badges */}
        <StickyTag label="MY BADGES" color={Brand.postit} rotate={2} style={{ marginTop: Spacing.five }} />
        <View style={styles.badgeWrap}>
          {badges.map((b, i) => (
            <View key={b} style={[styles.badge, { transform: [{ rotate: `${i % 2 === 0 ? -3 : 3}deg` }] }]}>
              <ThemedText type="smallBold" color={Brand.ink}>{b}</ThemedText>
            </View>
          ))}
        </View>

        {/* This week */}
        <StickyTag label="THIS WEEK" rotate={-2} style={{ marginTop: Spacing.five }} />
        <SketchSurface radius="md" shadow={4} style={{ marginTop: Spacing.two }}>
          <View style={styles.weekRow}>
            {WEEK.map((w, i) => (
              <View key={i} style={styles.weekCol}>
                <View style={styles.weekBarTrack}>
                  <View style={[styles.weekBar, { height: `${(w.min / maxMin) * 100}%`, backgroundColor: Brand.domain[SKILLS[i % SKILLS.length].domain] }]} />
                </View>
                <ThemedText type="small" style={{ color: Brand.muted }}>{w.day}</ThemedText>
              </View>
            ))}
          </View>
          <ThemedText type="small" style={{ color: Brand.muted, textAlign: 'center', marginTop: Spacing.two }}>
            {WEEK.reduce((s, w) => s + w.min, 0)} minutes practiced this week
          </ThemedText>
        </SketchSurface>

        {/* Recent games */}
        <StickyTag label="RECENT GAMES" rotate={2} style={{ marginTop: Spacing.five }} />
        <View style={{ gap: Spacing.three, marginTop: Spacing.two }}>
          {RECENT_GAMES.map((g) => (
            <SketchSurface key={g.name} radius="sm" shadow={3} style={styles.gameRow}>
              <View style={[styles.gameBar, { backgroundColor: g.color }]} />
              <ThemedText type="smallBold" style={{ flex: 1 }}>{g.name}</ThemedText>
              <ThemedText type="small" style={{ color: Brand.muted }}>{g.detail}</ThemedText>
            </SketchSurface>
          ))}
        </View>

        {/* Next challenge */}
        <SketchSurface tone="postit" decoration="tape" rotate={1} shadow={5} style={{ marginTop: Spacing.five }}>
          <ThemedText type="smallBold" color={Brand.blue}>MY NEXT CHALLENGE</ThemedText>
          <ThemedText style={{ marginTop: Spacing.one }}>
            Power up {nextSkill.title.toLowerCase()} — a little practice and you&apos;ll level it up!
          </ThemedText>
          <BigButton label="Practice now" variant="primary" onPress={() => router.push('/learn')} style={{ marginTop: Spacing.three }} />
        </SketchSurface>

        <BigButton label="Back home" variant="ghost" tint={Brand.ink} onPress={() => router.replace('/')} style={{ marginTop: Spacing.four }} />
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
  statusPill: { borderWidth: 2, ...Wobbly.sm, paddingHorizontal: 10, paddingVertical: 3 },
  badgeWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.three, marginTop: Spacing.two },
  badge: {
    backgroundColor: Brand.postit,
    borderWidth: 2,
    borderColor: Brand.ink,
    ...Wobbly.sm,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  weekRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', height: 120, gap: Spacing.two },
  weekCol: { flex: 1, alignItems: 'center', gap: Spacing.one },
  weekBarTrack: { width: '70%', height: 96, backgroundColor: Brand.erased, borderWidth: 2, borderColor: Brand.ink, borderRadius: 6, justifyContent: 'flex-end', overflow: 'hidden' },
  weekBar: { width: '100%', borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  gameRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  gameBar: { width: 6, alignSelf: 'stretch', borderRadius: 3 },
});
