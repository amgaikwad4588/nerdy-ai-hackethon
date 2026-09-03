// Native / non-web fallback for Focus Guard. The on-device camera check runs in the
// web build (see focus-guard.web.tsx); on phones we show a friendly explainer so the
// Practice screen stays consistent. (A native build would use expo-camera + a vision
// frame processor here.)

import { SketchSurface } from '@/components/sketch';
import { ThemedText } from '@/components/themed-text';
import { Brand, Spacing } from '@/constants/theme';

export function FocusGuard({ studentName }: { studentName: string }) {
  return (
    <SketchSurface radius="md" shadow={3} rotate={-0.5} style={{ gap: Spacing.one }}>
      <ThemedText type="smallBold">FOCUS GUARD</ThemedText>
      <ThemedText type="small" color={Brand.muted}>
        The camera focus-check runs in the MathMind web app. Open it on the web to make
        sure it&apos;s just {studentName} studying.
      </ThemedText>
    </SketchSurface>
  );
}
