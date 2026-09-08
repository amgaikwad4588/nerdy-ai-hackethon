import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MasteryRing } from '@/components/mastery-ring';
import { PaperBg, SketchSurface, StickyTag } from '@/components/sketch';
import { ThemedText } from '@/components/themed-text';
import { Brand, MaxContentWidth, Spacing, Wobbly } from '@/constants/theme';
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

const avg = (m: Record<string, number>) => SKILLS.reduce((s, sk) => s + (m[sk.id] ?? 0), 0) / SKILLS.length;

export default function Teacher() {
  const { classroom, roster, loadDemoData } = useStore();
  useEffect(() => {
    if (roster.length === 0) loadDemoData();
  }, [roster.length, loadDemoData]);

  const [selId, setSelId] = useState<string | null>(null);
  const selected = roster.find((s) => s.id === selId) ?? roster[0] ?? null;

  if (!selected) {
    return (
      <SafeAreaView style={styles.safe}>
        <PaperBg />
        <View style={styles.container}>
          <ThemedText type="small" style={{ color: Brand.muted }}>No class yet — loading the demo class…</ThemedText>
        </View>
      </SafeAreaView>
    );
  }

  const openEvents = selected.events.filter((e) => !e.resolved);
  const overall = avg(selected.mastery);
  const struggling = SKILLS.filter((s) => (selected.mastery[s.id] ?? 0) < 0.5);

  return (
    <SafeAreaView style={styles.safe}>
      <PaperBg />
      <ScrollView contentContainerStyle={styles.container}>
        {/* Class header with the join code */}
        <SketchSurface decoration="tack" rotate={-1} shadow={6} radius="lg" style={styles.classCard}>
          <View style={{ flex: 1 }}>
            <ThemedText type="subtitle">{classroom?.name ?? 'My Class'}</ThemedText>
            <ThemedText type="small" style={{ color: Brand.muted, marginTop: 2 }}>
              {classroom?.teacherName ?? 'Teacher'} · {roster.length} students
            </ThemedText>
          </View>
          <View style={styles.codeBox}>
            <ThemedText type="small" color={Brand.muted}>JOIN CODE</ThemedText>
            <ThemedText type="subtitle" style={{ color: Brand.blue, letterSpacing: 2 }}>{classroom?.code ?? '——'}</ThemedText>
          </View>
        </SketchSurface>

        {/* Roster — tap a student to drill in */}
        <StickyTag label="MY CLASS" rotate={-3} style={{ marginTop: Spacing.four }} />
        <View style={styles.roster}>
          {roster.map((stu) => {
            const open = stu.events.filter((e) => !e.resolved).length;
            const isSel = stu.id === selected.id;
            return (
              <Pressable key={stu.id} onPress={() => setSelId(stu.id)} style={[styles.chip, isSel && styles.chipSel]}>
                <MasteryRing level={avg(stu.mastery)} size={40} color={Brand.blue} />
                <View style={{ flex: 1 }}>
                  <ThemedText type="smallBold">{stu.name}</ThemedText>
                  <ThemedText type="small" style={{ color: open > 0 ? Brand.accent : Brand.muted }}>
                    {open > 0 ? `${open} to reteach` : 'on track'}
                  </ThemedText>
                </View>
                {open > 0 && <View style={styles.dot} />}
              </Pressable>
            );
          })}
        </View>

        {/* Selected student detail */}
        <StickyTag label={selected.name.toUpperCase()} color={Brand.postit} rotate={2} style={{ marginTop: Spacing.five }} />
        <SketchSurface radius="md" shadow={4} style={{ marginTop: Spacing.two, flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ flex: 1 }}>
            <ThemedText type="smallBold">{selected.name}</ThemedText>
            <ThemedText type="small" style={{ color: Brand.muted }}>
              Grade {selected.grade} · {Math.round(overall * 100)}% average mastery
            </ThemedText>
          </View>
          <MasteryRing level={overall} size={56} color={Brand.blue} />
        </SketchSurface>

        {/* AI insight — the "data back to teachers" payoff */}
        <SketchSurface tone="postit" decoration="tape" rotate={1} shadow={5} style={{ marginTop: Spacing.four }}>
          <ThemedText type="smallBold" color={Brand.blue}>TODAY&apos;S FOCUS</ThemedText>
          <ThemedText style={{ marginTop: Spacing.one }}>
            {openEvents.length > 0
              ? `${selected.name} is stuck on ${SKILL_BY_ID[openEvents[0].skillId].title.toLowerCase()}. ${MC_BY_TAG[openEvents[0].tag]?.description ?? ''}`
              : `${selected.name} has no open misconceptions — a great time to bump up the difficulty.`}
          </ThemedText>
        </SketchSurface>

        {/* Mastery heatmap */}
        <StickyTag label="MASTERY HEATMAP" rotate={-3} style={{ marginTop: Spacing.five }} />
        <View style={styles.heatmap}>
          {SKILLS.map((s, i) => {
            const lvl = selected.mastery[s.id] ?? 0;
            const c = masteryColor(lvl);
            const onColor = c === Brand.erased ? Brand.ink : '#fff';
            return (
              <View key={s.id} style={styles.heatCell}>
                <View style={[styles.heatDot, { backgroundColor: c, transform: [{ rotate: `${i % 2 === 0 ? -2 : 2}deg` }] }]}>
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
        <StickyTag label={`RETEACH LIST (${openEvents.length})`} color={Brand.accent} rotate={2} style={{ marginTop: Spacing.five }} />
        {openEvents.length === 0 && (
          <ThemedText type="small" style={{ color: Brand.muted, marginTop: Spacing.two }}>Nothing flagged right now.</ThemedText>
        )}
        <View style={{ gap: Spacing.three, marginTop: Spacing.two }}>
          {openEvents.map((e, i) => {
            const mc = MC_BY_TAG[e.tag];
            const skill = SKILL_BY_ID[e.skillId];
            return (
              <SketchSurface key={e.id} radius="md" shadow={3} rotate={i % 2 === 0 ? -0.5 : 0.5} style={styles.mcCard}>
                <View style={[styles.mcBar, { backgroundColor: Brand.domain[skill.domain] }]} />
                <View style={{ flex: 1 }}>
                  <ThemedText type="smallBold">{skill.title} · {skill.code}</ThemedText>
                  <ThemedText type="small" style={{ marginTop: 2 }}>{mc?.description}</ThemedText>
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
            Suggested small group for {selected.name}: {struggling.map((s) => s.title).join(', ')}.
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
  classCard: { flexDirection: 'row', alignItems: 'center', marginTop: Spacing.two },
  codeBox: {
    alignItems: 'center',
    backgroundColor: Brand.card,
    borderWidth: 2,
    borderColor: Brand.ink,
    ...Wobbly.sm,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  roster: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.three, marginTop: Spacing.two },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    width: '47%',
    minWidth: 200,
    flexGrow: 1,
    backgroundColor: Brand.card,
    borderWidth: 2,
    borderColor: Brand.ink,
    ...Wobbly.sm,
    padding: Spacing.two,
  },
  chipSel: { borderColor: Brand.blue, borderWidth: 3, backgroundColor: '#eef3fb' },
  dot: { width: 12, height: 12, borderRadius: 6, backgroundColor: Brand.accent, borderWidth: 1, borderColor: Brand.ink },
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
  mcCard: { flexDirection: 'row', gap: Spacing.three, alignItems: 'flex-start' },
  mcBar: { width: 6, alignSelf: 'stretch', borderRadius: 3, backgroundColor: Brand.ink },
  footer: { color: Brand.muted, marginTop: Spacing.three, fontStyle: 'italic', textAlign: 'center' },
});
