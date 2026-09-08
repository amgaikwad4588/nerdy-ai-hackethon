import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BigButton } from '@/components/big-button';
import { Buddy } from '@/components/buddy';
import { MasteryRing } from '@/components/mastery-ring';
import { SettingsButton } from '@/components/settings-button';
import { PaperBg, SketchSurface, StickyTag } from '@/components/sketch';
import { ThemedText } from '@/components/themed-text';
import { Brand, MaxContentWidth, Spacing, Wobbly, offsetShadow } from '@/constants/theme';
import { DOMAIN_LABEL, SKILLS } from '@/lib/curriculum';
import { MASTERY_THRESHOLD, useStore } from '@/lib/store';

const GAMES = [
  { id: 'game', title: 'Math Sprint', blurb: 'Beat the clock', color: Brand.blue },
  { id: 'car', title: 'Highway Racer', blurb: 'Race your class', color: Brand.accent },
  { id: 'birds', title: 'Bird Shooter', blurb: 'Shoot the answer', color: '#3f9d6b' },
] as const;

export default function Home() {
  const router = useRouter();
  const { studentName, mastery, xp, streak, setRole, loadDemoData } = useStore();

  const overall = SKILLS.reduce((s, sk) => s + (mastery[sk.id] ?? 0), 0) / SKILLS.length;
  const mastered = SKILLS.filter((s) => (mastery[s.id] ?? 0) >= MASTERY_THRESHOLD).length;

  return (
    <SafeAreaView style={styles.safe}>
      <PaperBg />
      <ScrollView contentContainerStyle={styles.container}>
        {/* ---- Masthead ---- */}
        <View style={styles.masthead}>
          <View style={{ flex: 1 }}>
            <View style={styles.brandRow}>
              <ThemedText type="title" style={styles.brand}>MathMind</ThemedText>
              <ThemedText type="title" style={styles.bang}>!</ThemedText>
            </View>
            <View style={styles.wavyUnderline} />
            <ThemedText type="small" style={{ color: Brand.muted, marginTop: Spacing.two }}>
              Talk-it-through math for grades 3–5
            </ThemedText>
          </View>
          <View style={styles.mastheadRight}>
            <View style={{ transform: [{ rotate: '4deg' }] }}>
              <MasteryRing level={overall} size={56} color={Brand.blue} />
            </View>
            <SettingsButton />
          </View>
        </View>

        {/* ---- Hero: Milo + stats + primary action (the focal point) ---- */}
        <SketchSurface decoration="tape" rotate={-0.75} shadow={7} radius="lg" style={styles.hero}>
          <Buddy mood="happy" message={`Hi ${studentName}! Ready to talk it through?`} size={84} />

          <View style={styles.statRow}>
            <Stat value={`${mastered}/${SKILLS.length}`} label="mastered" tint={Brand.blue} />
            <Stat value={String(xp)} label="XP" tint={Brand.ink} />
            <Stat value={String(streak)} label="day streak" tint={Brand.accent} />
          </View>

          <BigButton
            label="Start a 90-second practice"
            variant="primary"
            onPress={() => {
              setRole('student');
              router.push('/learn');
            }}
          />
          <BigButton
            label="See my progress"
            variant="ghost"
            tint={Brand.blue}
            onPress={() => {
              setRole('student');
              router.push('/progress');
            }}
            style={{ marginTop: Spacing.two }}
          />
        </SketchSurface>

        {/* ---- Skills ---- */}
        <View style={styles.sectionHead}>
          <StickyTag label="YOUR SKILLS" rotate={-2} />
          <ThemedText type="small" style={{ color: Brand.muted }}>
            {mastered} of {SKILLS.length} mastered
          </ThemedText>
        </View>
        <View style={styles.skillGrid}>
          {SKILLS.map((s) => {
            const lvl = mastery[s.id] ?? 0;
            return (
              <View key={s.id} style={styles.skillCard}>
                <MasteryRing level={lvl} size={44} color={Brand.domain[s.domain]} />
                <View style={{ flex: 1 }}>
                  <ThemedText type="smallBold" numberOfLines={1}>{s.title}</ThemedText>
                  <ThemedText type="small" style={{ color: Brand.muted }} numberOfLines={1}>
                    {DOMAIN_LABEL[s.domain]}
                  </ThemedText>
                </View>
                <ThemedText type="smallBold" style={{ color: Brand.domain[s.domain] }}>
                  {Math.round(lvl * 100)}%
                </ThemedText>
              </View>
            );
          })}
        </View>

        {/* ---- Games ---- */}
        <View style={styles.sectionHead}>
          <StickyTag label="PLAY & PRACTICE" rotate={-2} />
          <ThemedText type="small" style={{ color: Brand.muted }}>reward + more practice</ThemedText>
        </View>
        <View style={styles.gameRow}>
          {GAMES.map((g) => (
            <Pressable key={g.id} onPress={() => router.push(`/${g.id}` as never)} style={styles.gameTile}>
              <View style={[styles.gameStripe, { backgroundColor: g.color }]} />
              <ThemedText type="smallBold" numberOfLines={1}>{g.title}</ThemedText>
              <ThemedText type="small" style={{ color: Brand.muted }} numberOfLines={1}>{g.blurb}</ThemedText>
            </Pressable>
          ))}
        </View>

        {/* ---- Grown-ups (de-emphasized) ---- */}
        <View style={styles.grownups}>
          <ThemedText type="smallBold" style={{ color: Brand.muted, letterSpacing: 0.5 }}>FOR GROWN-UPS</ThemedText>
          <ThemedText type="small" style={{ color: Brand.muted, marginTop: 2, marginBottom: Spacing.three }}>
            Teachers see every student&apos;s mastery and misconceptions to reteach; parents get a calm home summary.
          </ThemedText>
          <View style={styles.grownRow}>
            <BigButton
              label="Teacher"
              variant="ghost"
              tint={Brand.ink}
              onPress={() => {
                setRole('teacher');
                loadDemoData();
                router.push('/teacher');
              }}
              style={styles.grownBtn}
            />
            <BigButton
              label="Parent"
              variant="ghost"
              tint={Brand.blue}
              onPress={() => {
                loadDemoData();
                router.push('/parent');
              }}
              style={styles.grownBtn}
            />
            <BigButton
              label="Sign in"
              variant="ghost"
              tint={Brand.muted}
              onPress={() => router.push('/signin')}
              style={styles.grownBtn}
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({ value, label, tint }: { value: string; label: string; tint: string }) {
  return (
    <View style={styles.stat}>
      <ThemedText type="smallBold" style={{ color: tint, fontSize: 22, lineHeight: 26 }}>{value}</ThemedText>
      <ThemedText type="small" style={{ color: Brand.muted }}>{label}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Brand.paper },
  container: {
    padding: Spacing.four,
    gap: Spacing.four,
    maxWidth: MaxContentWidth,
    width: '100%',
    alignSelf: 'center',
  },

  masthead: { flexDirection: 'row', alignItems: 'center', marginTop: Spacing.two },
  mastheadRight: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  brandRow: { flexDirection: 'row', alignItems: 'flex-start' },
  brand: { fontSize: 44, lineHeight: 48 },
  bang: { fontSize: 44, lineHeight: 48, color: Brand.accent, transform: [{ rotate: '8deg' }], marginLeft: 2 },
  wavyUnderline: {
    height: 4,
    width: 150,
    marginTop: 2,
    backgroundColor: Brand.accent,
    borderTopLeftRadius: 8,
    borderBottomRightRadius: 8,
    transform: [{ rotate: '-1deg' }],
  },

  hero: { gap: Spacing.three },
  statRow: { flexDirection: 'row', gap: Spacing.two },
  stat: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: Brand.cream,
    borderWidth: 2,
    borderColor: Brand.ink,
    ...Wobbly.sm,
    paddingVertical: Spacing.two,
  },

  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },

  skillGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.three, marginTop: -Spacing.two },
  skillCard: {
    flexBasis: '47%',
    flexGrow: 1,
    minWidth: 220,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    backgroundColor: Brand.card,
    borderWidth: 2,
    borderColor: Brand.ink,
    ...Wobbly.sm,
    ...offsetShadow(3, Brand.ink),
    padding: Spacing.three,
  },

  gameRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.three, marginTop: -Spacing.two },
  gameTile: {
    flexBasis: '31%',
    flexGrow: 1,
    minWidth: 150,
    backgroundColor: Brand.card,
    borderWidth: 2,
    borderColor: Brand.ink,
    ...Wobbly.md,
    ...offsetShadow(4, Brand.ink),
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    gap: 2,
    overflow: 'hidden',
  },
  gameStripe: { position: 'absolute', top: 0, left: 0, bottom: 0, width: 6 },

  grownups: {
    backgroundColor: Brand.erased,
    borderWidth: 2,
    borderColor: Brand.ink,
    borderStyle: 'dashed',
    ...Wobbly.md,
    padding: Spacing.three,
    marginTop: Spacing.two,
  },
  grownRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  grownBtn: { flexBasis: '31%', flexGrow: 1, minWidth: 120 },
});
