// A hand-drawn gear that jumps to Settings. Used in the top-right corner of screens.

import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, type ViewStyle } from 'react-native';
import Svg, { Circle, Line } from 'react-native-svg';

import { Brand } from '@/constants/theme';

function GearIcon({ size = 26, color = Brand.ink }: { size?: number; color?: string }) {
  // Eight teeth radiating from the rim.
  const teeth = Array.from({ length: 8 }).map((_, i) => {
    const a = (i * Math.PI) / 4;
    return {
      x1: 12 + Math.cos(a) * 7.5,
      y1: 12 + Math.sin(a) * 7.5,
      x2: 12 + Math.cos(a) * 11,
      y2: 12 + Math.sin(a) * 11,
    };
  });
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {teeth.map((t, i) => (
        <Line key={i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} stroke={color} strokeWidth={3} strokeLinecap="round" />
      ))}
      <Circle cx={12} cy={12} r={7} fill="none" stroke={color} strokeWidth={2.4} />
      <Circle cx={12} cy={12} r={2.6} fill={color} />
    </Svg>
  );
}

export function SettingsButton({ color = Brand.ink, style }: { color?: string; style?: ViewStyle }) {
  const router = useRouter();
  return (
    <Pressable
      onPress={() => router.push('/settings')}
      hitSlop={12}
      accessibilityRole="button"
      accessibilityLabel="Settings"
      style={[styles.btn, style]}
    >
      <GearIcon color={color} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: Brand.ink,
    backgroundColor: Brand.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
