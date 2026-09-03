import { StyleSheet, Text, type TextProps } from 'react-native';

import { Brand, HandFonts } from '@/constants/theme';

export type ThemedTextProps = TextProps & {
  type?: 'default' | 'title' | 'small' | 'smallBold' | 'subtitle' | 'link' | 'linkPrimary' | 'code';
  /** Override the pencil-black default. */
  color?: string;
};

/**
 * All type is handwritten: Kalam (felt-tip marker) for headings and emphasis,
 * Patrick Hand for body. Weight is baked into the family, so we never set
 * fontWeight. Default colour is soft pencil black on paper.
 */
export function ThemedText({ style, type = 'default', color, ...rest }: ThemedTextProps) {
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
