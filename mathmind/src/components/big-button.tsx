// Large, high-contrast tappable button. Big hit targets and clear single actions
// keep the interface friendly for young learners and low-friction for ADHD focus.

import { Pressable, StyleSheet, type ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Brand, Spacing } from '@/constants/theme';

export function BigButton({
  label,
  onPress,
  color = Brand.primary,
  disabled,
  variant = 'solid',
  style,
}: {
  label: string;
  onPress: () => void;
  color?: string;
  disabled?: boolean;
  variant?: 'solid' | 'ghost';
  style?: ViewStyle;
}) {
  const solid = variant === 'solid';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        solid
          ? { backgroundColor: color }
          : { backgroundColor: 'transparent', borderWidth: 2, borderColor: color },
        pressed && { transform: [{ scale: 0.98 }], opacity: 0.92 },
        disabled && { opacity: 0.4 },
        style,
      ]}
    >
      <ThemedText
        type="smallBold"
        style={[styles.label, { color: solid ? '#fff' : color }]}
      >
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 56,
    borderRadius: 16,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { fontSize: 17, letterSpacing: 0.2 },
});
