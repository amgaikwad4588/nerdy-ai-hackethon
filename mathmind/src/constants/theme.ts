/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#000000',
    background: '#ffffff',
    backgroundElement: '#F0F0F3',
    backgroundSelected: '#E0E1E6',
    textSecondary: '#60646C',
  },
  dark: {
    text: '#ffffff',
    background: '#000000',
    backgroundElement: '#212225',
    backgroundSelected: '#2E3135',
    textSecondary: '#B0B4BA',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

/**
 * MathMind "Hand-Drawn" palette — notebook paper, pencil lead, correction marker,
 * and ballpoint blue. Limited on purpose: pencil black, paper white, red, blue,
 * post-it yellow. Semantics for this app: BLUE = correct / mastery, RED = "let's
 * rethink" (a correction-marker note, never scary), YELLOW = highlights.
 * Keys keep their old names so screens inherit the restyle without churn.
 */
export const Brand = {
  primary: '#2d5da1', // blue ballpoint — primary actions, focus
  primaryDark: '#1f4576',
  ink: '#2d2d2d', // soft pencil black (never pure black)
  correct: '#2d5da1', // blue tick — right answers, mastery
  gentle: '#ff4d4d', // correction-marker red — nudge / "not yet"
  spark: '#ff4d4d', // marker red — rewards, streaks, accents
  cream: '#fdfbf7', // warm paper canvas
  card: '#ffffff',
  muted: '#6f6a60', // faded pencil gray
  paper: '#fdfbf7',
  accent: '#ff4d4d', // red correction marker
  blue: '#2d5da1', // blue ballpoint pen
  postit: '#fff9c4', // post-it yellow
  erased: '#e5e0d8', // old paper / erased pencil
  domain: {
    // three ink colours (ballpoint / pencil / marker) rather than a rainbow
    'base-ten': '#2d5da1',
    operations: '#2d2d2d',
    fractions: '#ff4d4d',
  } as Record<string, string>,
} as const;

/**
 * Handwritten type. Kalam (marker) for headings, Patrick Hand for body. These family
 * names are the ones @expo-google-fonts registers once useFonts() resolves.
 */
export const HandFonts = {
  heading: 'Kalam_700Bold',
  headingAlt: 'Kalam_400Regular',
  body: 'PatrickHand_400Regular',
} as const;

/**
 * Wobbly, hand-drawn corners. RN can't express the elliptical `255px 15px / …`
 * syntax, so we asymmetrically vary each corner — the same "no straight lines"
 * intent, expressed cross-platform. Spread onto a View's style.
 */
export const Wobbly = {
  sm: {
    borderTopLeftRadius: 14,
    borderTopRightRadius: 6,
    borderBottomRightRadius: 16,
    borderBottomLeftRadius: 8,
  },
  md: {
    borderTopLeftRadius: 26,
    borderTopRightRadius: 10,
    borderBottomRightRadius: 24,
    borderBottomLeftRadius: 12,
  },
  lg: {
    borderTopLeftRadius: 42,
    borderTopRightRadius: 16,
    borderBottomRightRadius: 40,
    borderBottomLeftRadius: 18,
  },
  // button oval — pill-ish but lopsided
  pill: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 20,
    borderBottomRightRadius: 26,
    borderBottomLeftRadius: 18,
  },
} as const;

/**
 * Hard offset shadow (cut-paper look) — a solid offset with NO blur, exactly as the
 * design spec calls for (`4px 4px 0px #2d2d2d`). RN 0.76+ / react-native-web support
 * `boxShadow` as a real cross-platform style prop, so this renders identically on web
 * and native. Pass the offset size and colour.
 */
export function offsetShadow(size = 4, color = '#2d2d2d') {
  return { boxShadow: `${size}px ${size}px 0px ${color}` } as const;
}

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
