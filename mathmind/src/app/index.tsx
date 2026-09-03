import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BigButton } from '@/components/big-button';
import { MasteryRing } from '@/components/mastery-ring';
import { DashedDivider, PaperBg, SketchSurface, StickyTag } from '@/components/sketch';
import { ThemedText } from '@/components/themed-text';
import { Brand, MaxContentWidth, Spacing } from '@/constants/theme';
import { DOMAIN_LABEL, SKILLS } from '@/lib/curriculum';
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
      <PaperBg />
      <ScrollView contentContainerStyle={styles.container}>
        {/* Masthead — a scribbled title */}
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <View style={styles.brandRow}>
              <ThemedText type="title" style={styles.brand}>
                MathMind
              </ThemedText>
              <ThemedText type="title" style={styles.bang}>
                !
              </ThemedText>
            </View>
            <View style={styles.wavyUnderline} />
            <ThemedText style={{ color: Brand.muted, marginTop: Spacing.two }}>
              Talk-it-through math for grades 3–5
            </ThemedText>
          </View>
          <View style={{ transform: [{ rotate: '4deg' }] }}>
            <MasteryRing level={overall} size={68} color={Brand.blue} />
          </View>
        </View>

        {/* Student hero card — taped to the page */}
        <SketchSurface decoration="tape" rotate={-1} shadow={6} radius="lg" style={styles.hero}>
          <ThemedText type="subtitle">Hi {studentName}! 👋</ThemedText>
          <ThemedText style={{ color: Brand.muted, marginBottom: Spacing.three }}>
            {mastered} of {SKILLS.length} skills mastered · {xp} XP · {streak}🔥 streak
          </ThemedText>
          <BigButton
            label="Start a 90-second practice ✏️"
            variant="primary"
            onPress={() => {
              setRole('student');
              router.push('/learn');
            }}
          />
        </SketchSurface>

        <StickyTag label="YOUR SKILLS" rotate={-3} style={{ marginTop: Spacing.four }} />
        <View style={styles.skillGrid}>
          {SKILLS.map((s, i) => (
            <SketchSurface
              key={s.id}
              radius="sm"
              shadow={3}
              rotate={i % 2 === 0 ? -1 : 1}
              style={styles.skillChip}
            >
              <MasteryRing level={mastery[s.id] ?? 0} size={46} color={Brand.domain[s.domain]} />
              <View style={{ flex: 1 }}>
                <ThemedText type="smallBold">{s.title}</ThemedText>
                <ThemedText type="small" style={{ color: Brand.muted }}>
                  {DOMAIN_LABEL[s.domain]}
                </ThemedText>
              </View>
            </SketchSurface>
          ))}
        </View>

        {/* Teacher entry — a pinned post-it */}
        <SketchSurface
          tone="postit"
          decoration="tack"
          rotate={1}
          shadow={5}
          style={{ marginTop: Spacing.five }}
        >
          <ThemedText type="smallBold">FOR TEACHERS</ThemedText>
          <ThemedText type="small" style={{ color: Brand.ink, marginBottom: Spacing.three, marginTop: 2 }}>
            See each student&apos;s mastery and the exact misconceptions to reteach.
          </ThemedText>
          <BigButton
            label="Open class notebook →"
            variant="ghost"
            tint={Brand.ink}
            onPress={() => {
              setRole('teacher');
              loadDemoData();
              router.push('/teacher');
            }}
          />
        </SketchSurface>

        <DashedDivider style={{ marginTop: Spacing.five }} />
        <ThemedText type="small" style={styles.footer}>
          Tutor: {tutorMode === 'live' ? 'Live (Claude) ✦' : 'Offline demo ✦'} · 6 skills across 3 domains
        </ThemedText>
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.two,
    marginBottom: Spacing.two,
  },
  brandRow: { flexDirection: 'row', alignItems: 'flex-start' },
  brand: { fontSize: 46, lineHeight: 50 },
  bang: {
    fontSize: 46,
    lineHeight: 50,
    color: Brand.accent,
    transform: [{ rotate: '8deg' }],
    marginLeft: 2,
  },
  wavyUnderline: {
    height: 4,
    width: 168,
    marginTop: 2,
    backgroundColor: Brand.accent,
    borderTopLeftRadius: 8,
    borderBottomRightRadius: 8,
    transform: [{ rotate: '-1deg' }],
  },
  hero: { marginTop: Spacing.three, gap: Spacing.one },
  skillGrid: { gap: Spacing.three, marginTop: Spacing.two },
  skillChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  footer: { textAlign: 'center', color: Brand.muted, marginTop: Spacing.two },
});
