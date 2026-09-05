import { Platform, StyleSheet, Text, type TextProps, type TextStyle } from 'react-native';

import { Brand, HandFonts } from '@/constants/theme';
import { useStore } from '@/lib/store';

export type ThemedTextProps = TextProps & {
  type?: 'default' | 'title' | 'small' | 'smallBold' | 'subtitle' | 'link' | 'linkPrimary' | 'code';
  /** Override the pencil-black default. */
  color?: string;
};

// A plain, highly legible font stack for the reading-friendly (dyslexia-friendlier) mode.
const READABLE_FONT = Platform.select({ web: 'Verdana, "Segoe UI", Tahoma, sans-serif', default: 'sans-serif' });

/**
 * All type is handwritten: Kalam (felt-tip marker) for headings and emphasis,
 * Patrick Hand for body. Accessibility settings can swap to a plain legible font and/or
 * boost contrast, applied here so the whole app follows.
 */
export function ThemedText({ style, type = 'default', color, ...rest }: ThemedTextProps) {
  const readableFont = useStore((s) => s.settings.readableFont);
  const highContrast = useStore((s) => s.settings.highContrast);

  const a11y: TextStyle = {};
  if (readableFont) {
    a11y.fontFamily = READABLE_FONT;
    a11y.letterSpacing = 0.2;
  }
  if (highContrast) {
    if (!color) a11y.color = '#000';
    if (readableFont) a11y.fontWeight = '700';
  }

  return (
    <Text
      style={[
        { color: color ?? Brand.ink },
        type === 'default' && styles.default,
        type === 'title' && styles.title,
        type === 'small' && styles.small,
        type === 'smallBold' && styles.smallBold,
        type === 'subtitle' && styles.subtitle,
        type === 'link' && styles.link,
        type === 'linkPrimary' && styles.linkPrimary,
        type === 'code' && styles.code,
        style,
        a11y,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  default: { fontFamily: HandFonts.body, fontSize: 18, lineHeight: 26 },
  small: { fontFamily: HandFonts.body, fontSize: 15, lineHeight: 21 },
  smallBold: { fontFamily: HandFonts.heading, fontSize: 15, lineHeight: 22 },
  title: { fontFamily: HandFonts.heading, fontSize: 44, lineHeight: 50 },
  subtitle: { fontFamily: HandFonts.heading, fontSize: 28, lineHeight: 36 },
  link: { fontFamily: HandFonts.body, fontSize: 15, lineHeight: 26 },
  linkPrimary: { fontFamily: HandFonts.body, fontSize: 15, lineHeight: 26, color: Brand.blue },
  code: { fontFamily: 'monospace', fontSize: 13 },
});
