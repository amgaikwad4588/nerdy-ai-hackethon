// Global subtitle bar — shows what Milo (or the tutor) is saying, for low-audio and
// accessibility contexts. Mounted once at the app root; listens to the shared speak layer
// and renders only while something is being spoken and captions are enabled.

import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Brand, MaxContentWidth, Spacing, Wobbly } from '@/constants/theme';
import { onCaption } from '@/lib/speak';
import { useStore } from '@/lib/store';

export function CaptionBar() {
  const captionsOn = useStore((s) => s.settings.captions);
  const [text, setText] = useState('');
  const [visible, setVisible] = useState(false);

  useEffect(
    () =>
      onCaption((t, talking) => {
        if (talking && t) setText(t);
        setVisible(talking && !!t);
      }),
    [],
  );

  if (!captionsOn || !visible || !text) return null;

  return (
    <View pointerEvents="none" style={styles.wrap}>
      <View style={styles.bar}>
        <ThemedText type="smallBold" color={Brand.postit} style={styles.speaker}>
          Milo
        </ThemedText>
        <ThemedText style={styles.text}>{text}</ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 18,
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
  },
  bar: {
    maxWidth: MaxContentWidth,
    width: '100%',
    backgroundColor: 'rgba(45,45,45,0.92)',
    borderWidth: 2,
    borderColor: Brand.ink,
    ...Wobbly.md,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
  },
  speaker: { letterSpacing: 0.5, marginBottom: 1 },
  text: { color: '#fff', fontSize: 18, lineHeight: 24 },
});
