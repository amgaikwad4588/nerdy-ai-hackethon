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
 * MathMind brand palette. Warm, focused, and high-contrast — friendly enough for a
 * grade 3-5 learner, calm enough to keep an ADHD single-task screen low-distraction.
 * Deliberately not AI-slop (no purple mesh gradients / generic glassmorphism).
 */
export const Brand = {
  primary: '#2F6FED', // calm confident blue — actions, focus
  primaryDark: '#1E4FB8',
  ink: '#16233B', // near-navy text
  correct: '#1FA971', // green — mastery, "yes"
  gentle: '#F4A62A', // amber — nudge, "not yet" (never harsh red for kids)
  spark: '#F26D5B', // coral accent — rewards, streaks
  cream: '#FBF7EF', // warm off-white canvas
  card: '#FFFFFF',
  muted: '#6B7687',
  domain: {
    'base-ten': '#2F6FED',
    operations: '#7A5AF8',
    fractions: '#1FA971',
  } as Record<string, string>,
} as const;

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
