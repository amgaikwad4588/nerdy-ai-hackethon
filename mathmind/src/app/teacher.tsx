import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MasteryRing } from '@/components/mastery-ring';
import { ThemedText } from '@/components/themed-text';
import { Brand, MaxContentWidth, Spacing } from '@/constants/theme';
import { MISCONCEPTIONS, SKILLS, SKILL_BY_ID } from '@/lib/curriculum';
import { MASTERY_THRESHOLD, useStore } from '@/lib/store';

const MC_BY_TAG = Object.fromEntries(MISCONCEPTIONS.map((m) => [m.tag, m]));

function masteryColor(level: number): string {
  if (level >= MASTERY_THRESHOLD) return Brand.correct;
  if (level >= 0.5) return Brand.gentle;
  if (level > 0) return Brand.spark;
  return '#C9D0DA';
}

export default function Teacher() {
  const { studentName, mastery, events } = useStore();
  const openEvents = events.filter((e) => !e.resolved);
  const overall = SKILLS.reduce((s, sk) => s + (mastery[sk.id] ?? 0), 0) / SKILLS.length;
  const struggling = SKILLS.filter((s) => (mastery[s.id] ?? 0) < 0.5);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Student header */}
        <View style={styles.headerCard}>
          <View style={{ flex: 1 }}>
            <ThemedText type="subtitle" style={{ color: Brand.ink }}>
              {studentName}
            </ThemedText>
            <ThemedText type="small" style={{ color: Brand.muted }}>
              Grade 3 · {Math.round(overall * 100)}% average mastery
            </ThemedText>
          </View>
          <MasteryRing level={overall} size={64} color={Brand.primary} />
        </View>

        {/* AI insight — the "data back to teachers" payoff */}
        <View style={styles.insight}>
          <ThemedText type="smallBold" style={{ color: Brand.primaryDark }}>
            Today’s focus
          </ThemedText>
          <ThemedText style={{ color: Brand.ink, marginTop: Spacing.one }}>
            {openEvents.length > 0
              ? `${studentName} is stuck on ${SKILL_BY_ID[openEvents[0].skillId].title.toLowerCase()}. ${
                  MC_BY_TAG[openEvents[0].tag]?.description ?? ''
                }`
              : `${studentName} has no open misconceptions right now — great time to advance difficulty.`}
          </ThemedText>
        </View>

        {/* Mastery heatmap */}
        <ThemedText type="smallBold" style={styles.sectionLabel}>
          MASTERY HEATMAP
        </ThemedText>
        <View style={styles.heatmap}>
          {SKILLS.map((s) => {
            const lvl = mastery[s.id] ?? 0;
            return (
              <View key={s.id} style={styles.heatCell}>
                <View style={[styles.heatDot, { backgroundColor: masteryColor(lvl) }]}>
                  <ThemedText type="smallBold" style={{ color: '#fff' }}>
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
        <ThemedText type="smallBold" style={styles.sectionLabel}>
          MISCONCEPTIONS TO RETEACH ({openEvents.length})
        </ThemedText>
        {openEvents.length === 0 && (
          <ThemedText type="small" style={{ color: Brand.muted }}>
            Nothing flagged. 🎉
          </ThemedText>
        )}
        {openEvents.map((e) => {
          const mc = MC_BY_TAG[e.tag];
          const skill = SKILL_BY_ID[e.skillId];
          return (
            <View key={e.id} style={styles.mcCard}>
              <View style={[styles.mcBar, { backgroundColor: Brand.domain[skill.domain] }]} />
              <View style={{ flex: 1 }}>
                <ThemedText type="smallBold" style={{ color: Brand.ink }}>
                  {skill.title} · {skill.code}
                </ThemedText>
                <ThemedText type="small" style={{ color: Brand.ink, marginTop: 2 }}>
                  {mc?.description}
                </ThemedText>
                <ThemedText type="small" style={{ color: Brand.correct, marginTop: Spacing.one }}>
                  Reteach: {mc?.remediation}
                </ThemedText>
              </View>
            </View>
          );
        })}

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
  safe: { flex: 1, backgroundColor: Brand.cream },
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
    backgroundColor: Brand.card,
    borderRadius: 20,
    padding: Spacing.four,
  },
  insight: {
    backgroundColor: '#EAF1FE',
    borderRadius: 16,
    padding: Spacing.four,
    borderLeftWidth: 4,
    borderLeftColor: Brand.primary,
  },
  sectionLabel: { color: Brand.muted, letterSpacing: 1, marginTop: Spacing.two },
  heatmap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.three },
  heatCell: { width: 88, alignItems: 'center', gap: Spacing.one },
  heatDot: {
    width: 56,
    height: 56,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heatLabel: { color: Brand.muted, textAlign: 'center' },
  mcCard: {
    flexDirection: 'row',
    backgroundColor: Brand.card,
    borderRadius: 16,
    padding: Spacing.three,
    gap: Spacing.three,
  },
  mcBar: { width: 5, borderRadius: 3 },
  footer: { color: Brand.muted, marginTop: Spacing.three, fontStyle: 'italic' },
});
