import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BigButton } from '@/components/big-button';
import { PaperBg, SketchSurface, StickyTag } from '@/components/sketch';
import { ThemedText } from '@/components/themed-text';
import { Brand, MaxContentWidth, Spacing, Wobbly } from '@/constants/theme';
import { speak } from '@/lib/speak';
import { type AppSettings, useStore } from '@/lib/store';

/** Hand-drawn on/off toggle. */
function Toggle({ on, onPress }: { on: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.track, { backgroundColor: on ? Brand.blue : Brand.erased }]} accessibilityRole="switch" accessibilityState={{ checked: on }}>
      <View style={[styles.knob, { alignSelf: on ? 'flex-end' : 'flex-start' }]} />
    </Pressable>
  );
}

function Row({
  title,
  desc,
  value,
  onToggle,
}: {
  title: string;
  desc: string;
  value: boolean;
  onToggle: () => void;
}) {
  return (
    <SketchSurface radius="sm" shadow={3} style={styles.row}>
      <View style={{ flex: 1 }}>
        <ThemedText type="smallBold">{title}</ThemedText>
        <ThemedText type="small" style={{ color: Brand.muted, marginTop: 2 }}>
          {desc}
        </ThemedText>
      </View>
      <Toggle on={value} onPress={onToggle} />
    </SketchSurface>
  );
}

export default function Settings() {
  const router = useRouter();
  const { settings, setSetting } = useStore();

  const toggle = (key: keyof AppSettings) => {
    const next = !settings[key];
    setSetting(key, next);
    // Give immediate feedback that read-aloud/captions changed.
    if (key === 'readAloud' && next) speak('Read aloud is on. I can talk you through it.');
    if (key === 'captions' && next) speak('Captions are on.');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <PaperBg />
      <ScrollView contentContainerStyle={styles.container}>
        <StickyTag label="SETTINGS" rotate={-3} style={{ alignSelf: 'flex-start' }} />
        <ThemedText type="title" style={{ fontSize: 40, lineHeight: 46 }}>
          Make it yours
        </ThemedText>
        <ThemedText type="small" style={{ color: Brand.muted }}>
          Comfort and accessibility options.
        </ThemedText>

        <View style={{ gap: Spacing.three, marginTop: Spacing.three }}>
          <Row
            title="Read aloud"
            desc="Milo speaks questions and feedback out loud."
            value={settings.readAloud}
            onToggle={() => toggle('readAloud')}
          />
          <Row
            title="Captions"
            desc="Show subtitles of everything Milo says."
            value={settings.captions}
            onToggle={() => toggle('captions')}
          />
          <Row
            title="Reduce motion"
            desc="Calmer screens — less bouncing and animation."
            value={settings.reduceMotion}
            onToggle={() => toggle('reduceMotion')}
          />
          <Row
            title="Reading-friendly text"
            desc="Swap the handwriting for a plain, easy-to-read font."
            value={settings.readableFont}
            onToggle={() => toggle('readableFont')}
          />
          <Row
            title="High contrast"
            desc="Darker, bolder text that's easier to see."
            value={settings.highContrast}
            onToggle={() => toggle('highContrast')}
          />
        </View>

        <BigButton label="Back home" variant="ghost" tint={Brand.ink} onPress={() => router.replace('/')} style={{ marginTop: Spacing.five }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Brand.paper },
  container: {
    padding: Spacing.four,
    gap: Spacing.two,
    maxWidth: MaxContentWidth,
    width: '100%',
    alignSelf: 'center',
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  track: {
    width: 60,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: Brand.ink,
    padding: 3,
    justifyContent: 'center',
  },
  knob: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Brand.card,
    borderWidth: 2,
    borderColor: Brand.ink,
    ...Wobbly.sm,
  },
});
