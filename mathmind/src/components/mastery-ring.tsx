// A small circular progress ring for per-skill mastery. Uses react-native-svg,
// which ships with Expo. Frequent visible progress is core to the ADHD-friendly loop.

import Svg, { Circle } from 'react-native-svg';

import { Brand } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { View } from 'react-native';

export function MasteryRing({
  level,
  size = 56,
  color = Brand.correct,
  label,
}: {
  level: number; // 0..1
  size?: number;
  color?: string;
  label?: string;
}) {
  const stroke = 6;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, level));

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="#E7E2D6"
          strokeWidth={stroke}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={{ position: 'absolute' }}>
        <ThemedText type="smallBold" style={{ color: Brand.ink }}>
          {label ?? `${Math.round(pct * 100)}%`}
        </ThemedText>
      </View>
    </View>
  );
}
