import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BigButton } from '@/components/big-button';
import { MasteryRing } from '@/components/mastery-ring';
import { ThemedText } from '@/components/themed-text';
import { Brand, MaxContentWidth, Spacing } from '@/constants/theme';
import { DOMAIN_LABEL, SKILLS, SKILL_BY_ID } from '@/lib/curriculum';
import { MASTERY_THRESHOLD, useStore } from '@/lib/store';
import { tutorMode } from '@/lib/tutor';

export default function Home() {
  const router = useRouter();
  const { studentName, mastery, xp, streak, setRole, loadDemoData } = useStore();

  const overall =
    SKILLS.reduce((s, sk) => s + (mastery[sk.id] ?? 0), 0) / SKILLS.length;
  const mastered = SKILLS.filter((s) => (mastery[s.id] ?? 0) >= MASTERY_THRESHOLD).length;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.headerRow}>
          <View>
            <ThemedText type="title" style={styles.brand}>
              MathMind
            </ThemedText>
            <ThemedText style={{ color: Brand.muted }}>
              Talk-it-through math for grades 3–5
            </ThemedText>
          </View>
          <MasteryRing level={overall} size={64} color={Brand.primary} />
        </View>

        {/* Student entry */}
        <View style={styles.card}>
          <ThemedText type="subtitle" style={{ color: Brand.ink }}>
            Hi {studentName}! 👋
          </ThemedText>
          <ThemedText style={{ color: Brand.muted, marginBottom: Spacing.three }}>
            {mastered} of {SKILLS.length} skills mastered · {xp} XP · {streak}🔥 streak
          </ThemedText>
          <BigButton
            label="Start a 90-second practice"
            color={Brand.primary}
            onPress={() => {
              setRole('student');
              router.push('/learn');
            }}
          />
        </View>

        {/* Skill chips */}
        <ThemedText type="smallBold" style={styles.sectionLabel}>
          YOUR SKILLS
        </ThemedText>
        <View style={styles.skillGrid}>
          {SKILLS.map((s) => (
            <View key={s.id} style={styles.skillChip}>
              <MasteryRing
                level={mastery[s.id] ?? 0}
                size={44}
                color={Brand.domain[s.domain]}
              />
              <View style={{ flex: 1 }}>
                <ThemedText type="smallBold" style={{ color: Brand.ink }}>
                  {s.title}
                </ThemedText>
                <ThemedText type="small" style={{ color: Brand.muted }}>
                  {DOMAIN_LABEL[s.domain]}
                </ThemedText>
              </View>
            </View>
          ))}
        </View>

        {/* Teacher entry */}
        <View style={[styles.card, { marginTop: Spacing.four }]}>
          <ThemedText type="smallBold" style={{ color: Brand.ink }}>
            For teachers
          </ThemedText>
          <ThemedText type="small" style={{ color: Brand.muted, marginBottom: Spacing.three }}>
            See each student's mastery and the misconceptions to reteach.
          </ThemedText>
          <BigButton
            label="Open class dashboard"
            variant="ghost"
            color={Brand.ink}
            onPress={() => {
              setRole('teacher');
              loadDemoData();
              router.push('/teacher');
            }}
          />
        </View>

        <ThemedText type="small" style={styles.footer}>
          Tutor mode: {tutorMode === 'live' ? 'Live (Claude)' : 'Offline demo'} ·{' '}
          {SKILL_BY_ID['frac-compare'].code} + 5 more skills
        </ThemedText>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Brand.cream },
  container: {
    padding: Spacing.four,
    gap: Spacing.three,
    maxWidth: MaxContentWidth,
    width: '100%',
    alignSelf: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.two,
  },
  brand: { color: Brand.ink, fontSize: 40, lineHeight: 44 },
  card: {
    backgroundColor: Brand.card,
    borderRadius: 20,
    padding: Spacing.four,
    gap: Spacing.one,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  sectionLabel: {
    color: Brand.muted,
    letterSpacing: 1,
    marginTop: Spacing.three,
    marginBottom: Spacing.one,
  },
  skillGrid: { gap: Spacing.two },
  skillChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    backgroundColor: Brand.card,
    borderRadius: 16,
    padding: Spacing.three,
  },
  footer: {
    textAlign: 'center',
    color: Brand.muted,
    marginTop: Spacing.four,
  },
});
