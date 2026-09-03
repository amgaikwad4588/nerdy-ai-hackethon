// Hand-drawn building blocks: a notebook-paper background, a wobbly "cut-paper"
// card surface with optional tape/thumbtack, a post-it section tag, and a sketchy
// dashed divider. These carry the whole aesthetic so screens stay declarative.

import { useId } from 'react';
import { StyleSheet, View, type ViewProps, type ViewStyle } from 'react-native';
import Svg, { Circle, Defs, Pattern, Rect } from 'react-native-svg';

import { ThemedText } from '@/components/themed-text';
import { Brand, HandFonts, offsetShadow, Wobbly } from '@/constants/theme';

/** Full-bleed notebook dot grid, drawn behind screen content. */
export function PaperBg() {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  return (
    <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
      <Defs>
        <Pattern id={id} width={24} height={24} patternUnits="userSpaceOnUse">
          <Circle cx={2} cy={2} r={1} fill={Brand.erased} />
        </Pattern>
      </Defs>
      <Rect x={0} y={0} width="100%" height="100%" fill={`url(#${id})`} />
    </Svg>
  );
}

type Tone = 'white' | 'postit' | 'muted';
type Decoration = 'none' | 'tape' | 'tack';
type WobbleSize = keyof typeof Wobbly;

export function SketchSurface({
  children,
  tone = 'white',
  decoration = 'none',
  rotate = 0,
  shadow = 4,
  border = 2,
  radius = 'md',
  style,
  ...rest
}: ViewProps & {
  tone?: Tone;
  decoration?: Decoration;
  rotate?: number;
  shadow?: number;
  border?: number;
  radius?: WobbleSize;
}) {
  const bg = tone === 'postit' ? Brand.postit : tone === 'muted' ? Brand.erased : Brand.card;
  return (
    <View
      style={[
        styles.surface,
        Wobbly[radius],
        { backgroundColor: bg, borderWidth: border, borderColor: Brand.ink },
        offsetShadow(shadow, Brand.ink),
        rotate ? { transform: [{ rotate: `${rotate}deg` }] } : null,
        style,
      ]}
      {...rest}
    >
      {decoration === 'tape' && <View style={styles.tape} />}
      {decoration === 'tack' && (
        <View style={styles.tack}>
          <View style={styles.tackHole} />
        </View>
      )}
      {children}
    </View>
  );
}

/** A little post-it sticky-note label, tilted like it was slapped on. */
export function StickyTag({
  label,
  color = Brand.postit,
  rotate = -2,
  style,
}: {
  label: string;
  color?: string;
  rotate?: number;
  style?: ViewStyle;
}) {
  return (
    <View
      style={[
        styles.tag,
        Wobbly.sm,
        { backgroundColor: color, transform: [{ rotate: `${rotate}deg` }] },
        style,
      ]}
    >
      <ThemedText type="smallBold" style={styles.tagText}>
        {label}
      </ThemedText>
    </View>
  );
}

/** Sketchy dashed rule for dividers and secondary edges. */
export function DashedDivider({ style }: { style?: ViewStyle }) {
  return <View style={[styles.dashed, style]} />;
}

const styles = StyleSheet.create({
  surface: {
    padding: 20,
  },
  tape: {
    position: 'absolute',
    top: -11,
    alignSelf: 'center',
    width: 96,
    height: 24,
    backgroundColor: 'rgba(45,45,45,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(45,45,45,0.18)',
    transform: [{ rotate: '-4deg' }],
  },
  tack: {
    position: 'absolute',
    top: -12,
    alignSelf: 'center',
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Brand.accent,
    borderWidth: 2,
    borderColor: Brand.ink,
    alignItems: 'center',
    justifyContent: 'center',
    ...offsetShadow(2, Brand.ink),
  },
  tackHole: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#b23636',
  },
  tag: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderWidth: 2,
    borderColor: Brand.ink,
  },
  tagText: {
    color: Brand.ink,
    letterSpacing: 0.5,
  },
  dashed: {
    borderTopWidth: 2,
    borderColor: Brand.ink,
    borderStyle: 'dashed',
    opacity: 0.4,
    marginVertical: 4,
  },
});
