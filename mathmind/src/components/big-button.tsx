// Hand-drawn button. Wobbly oval, thick pencil border, hard offset shadow. On hover
// it fills with marker ink and the shadow shrinks (it "lifts"); when pressed the
// shadow vanishes and it translates into place — the button "presses flat" onto paper.

import { useState } from 'react';
import { Pressable, StyleSheet, Text, type ViewStyle } from 'react-native';

import { Brand, HandFonts, offsetShadow, Wobbly } from '@/constants/theme';

type Variant = 'primary' | 'secondary' | 'ghost';

export function BigButton({
  label,
  onPress,
  variant = 'primary',
  tint = Brand.ink,
  disabled,
  style,
}: {
  label: string;
  onPress: () => void;
  variant?: Variant;
  /** For ghost: the border/text colour (and hover fill). */
  tint?: string;
  disabled?: boolean;
  style?: ViewStyle;
}) {
  const [hovered, setHovered] = useState(false);

  // Resting look per variant.
  const resting =
    variant === 'secondary'
      ? { bg: Brand.erased, border: Brand.ink, text: Brand.ink, fill: Brand.blue }
      : variant === 'ghost'
        ? { bg: 'transparent', border: tint, text: tint, fill: tint }
        : { bg: Brand.card, border: Brand.ink, text: Brand.ink, fill: Brand.accent };

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      style={({ pressed }) => {
        const size = pressed ? 0 : hovered ? 2 : 4;
        const shift = pressed ? 4 : hovered ? 2 : 0;
        return [
          styles.base,
          Wobbly.pill,
          {
            backgroundColor: hovered && !disabled ? resting.fill : resting.bg,
            borderColor: resting.border,
          },
          offsetShadow(size, Brand.ink),
          { transform: [{ translateX: shift }, { translateY: shift }] },
          disabled && { opacity: 0.45 },
          style,
        ];
      }}
    >
      {({ pressed }) => (
        <Text
          style={[
            styles.label,
            { color: hovered && !disabled ? '#fff' : resting.text },
            pressed && { color: variant === 'ghost' ? tint : '#fff' },
          ]}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 52,
    borderWidth: 3,
    paddingHorizontal: 22,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontFamily: HandFonts.body,
    fontSize: 19,
    letterSpacing: 0.3,
  },
});
