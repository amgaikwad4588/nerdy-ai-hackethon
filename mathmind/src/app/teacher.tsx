import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MasteryRing } from '@/components/mastery-ring';
import { PaperBg, SketchSurface, StickyTag } from '@/components/sketch';
import { ThemedText } from '@/components/themed-text';
import { Brand, MaxContentWidth, Spacing } from '@/constants/theme';
import { MISCONCEPTIONS, SKILLS, SKILL_BY_ID } from '@/lib/curriculum';
import { MASTERY_THRESHOLD, useStore } from '@/lib/store';

const MC_BY_TAG = Object.fromEntries(MISCONCEPTIONS.map((m) => [m.tag, m]));

// Pencil-palette heat: blue = mastered, dark pencil = getting there, red = reteach.
function masteryColor(level: number): string {
  if (level >= MASTERY_THRESHOLD) return Brand.blue;
  if (level >= 0.5) return Brand.ink;
  if (level > 0) return Brand.accent;
  return Brand.erased;
}

export default function Teacher() {
  const { studentName, mastery, events } = useStore();
  const openEvents = events.filter((e) => !e.resolved);
  const overall = SKILLS.reduce((s, sk) => s + (mastery[sk.id] ?? 0), 0) / SKILLS.length;
  const struggling = SKILLS.filter((s) => (mastery[s.id] ?? 0) < 0.5);

  return (
    <SafeAreaView style={styles.safe}>
      <PaperBg />
      <ScrollView contentContainerStyle={styles.container}>
        {/* Student header — pinned */}
        <SketchSurface decoration="tack" rotate={-1} shadow={6} radius="lg" style={styles.headerCard}>
          <View style={{ flex: 1 }}>
            <ThemedText type="subtitle">{studentName}</ThemedText>
            <ThemedText type="small" style={{ color: Brand.muted }}>
              Grade 3 · {Math.round(overall * 100)}% average mastery
            </ThemedText>
          </View>
          <View style={{ transform: [{ rotate: '4deg' }] }}>
            <MasteryRing level={overall} size={64} color={Brand.blue} />
          </View>
        </SketchSurface>

        {/* AI insight — the "data back to teachers" payoff, on a post-it */}
        <SketchSurface tone="postit" decoration="tape" rotate={1} shadow={5} style={{ marginTop: Spacing.four }}>
          <ThemedText type="smallBold" color={Brand.blue}>
            TODAY’S FOCUS
          </ThemedText>
          <ThemedText style={{ marginTop: Spacing.one }}>
            {openEvents.length > 0
              ? `${studentName} is stuck on ${SKILL_BY_ID[openEvents[0].skillId].title.toLowerCase()}. ${
                  MC_BY_TAG[openEvents[0].tag]?.description ?? ''
                }`
              : `${studentName} has no open misconceptions right now — great time to bump up the difficulty.`}
          </ThemedText>
        </SketchSurface>

        {/* Mastery heatmap */}
        <StickyTag label="MASTERY HEATMAP" rotate={-3} style={{ marginTop: Spacing.five }} />
        <View style={styles.heatmap}>
          {SKILLS.map((s, i) => {
            const lvl = mastery[s.id] ?? 0;
            const c = masteryColor(lvl);
            const onColor = c === Brand.erased ? Brand.ink : '#fff';
            return (
              <View key={s.id} style={styles.heatCell}>
                <View
                  style={[
                    styles.heatDot,
                    {
                      backgroundColor: c,
                      transform: [{ rotate: `${i % 2 === 0 ? -2 : 2}deg` }],
                    },
                  ]}
                >
                  <ThemedText type="smallBold" color={onColor} style={{ fontSize: 17 }}>
                    {Math.round(lvl * 100)}
                  </ThemedText>
                </View>
                <ThemedText type="small" style={styles.heatLabel} numberOfLines={2}>
                  {s.title}
                </ThemedText>
              </View>
            );
          })}
        </View>

        {/* Misconceptions to reteach */}
        <StickyTag
          label={`RETEACH LIST (${openEvents.length})`}
          color={Brand.accent}
          rotate={2}
          style={{ marginTop: Spacing.five }}
        />
        {openEvents.length === 0 && (
          <ThemedText type="small" style={{ color: Brand.muted, marginTop: Spacing.two }}>
            Nothing flagged right now.
          </ThemedText>
        )}
        <View style={{ gap: Spacing.three, marginTop: Spacing.two }}>
          {openEvents.map((e, i) => {
            const mc = MC_BY_TAG[e.tag];
            const skill = SKILL_BY_ID[e.skillId];
            return (
              <SketchSurface key={e.id} radius="md" shadow={3} rotate={i % 2 === 0 ? -0.5 : 0.5} style={styles.mcCard}>
                <View style={[styles.mcBar, { backgroundColor: Brand.domain[skill.domain] }]} />
                <View style={{ flex: 1 }}>
                  <ThemedText type="smallBold">
                    {skill.title} · {skill.code}
                  </ThemedText>
                  <ThemedText type="small" style={{ marginTop: 2 }}>
                    {mc?.description}
                  </ThemedText>
                  <ThemedText type="small" color={Brand.blue} style={{ marginTop: Spacing.one }}>
                    Reteach: {mc?.remediation}
                  </ThemedText>
                </View>
              </SketchSurface>
            );
          })}
        </View>

        {struggling.length > 0 && (
          <ThemedText type="small" style={styles.footer}>
            Suggested small group: {struggling.map((s) => s.title).join(', ')}.
          </ThemedText>
        )}
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
  headerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.two,
  },
  heatmap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.three, marginTop: Spacing.two },
  heatCell: { width: 92, alignItems: 'center', gap: Spacing.one },
  heatDot: {
    width: 60,
    height: 60,
    borderWidth: 2,
    borderColor: Brand.ink,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 8,
    borderBottomRightRadius: 20,
    borderBottomLeftRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heatLabel: { color: Brand.muted, textAlign: 'center' },
  mcCard: {
    flexDirection: 'row',
    gap: Spacing.three,
    alignItems: 'flex-start',
  },
  mcBar: { width: 6, alignSelf: 'stretch', borderRadius: 3, backgroundColor: Brand.ink },
  footer: { color: Brand.muted, marginTop: Spacing.three, fontStyle: 'italic', textAlign: 'center' },
});
