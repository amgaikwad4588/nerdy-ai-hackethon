// Milo's personalized coaching line for a game-over screen. Shows an instant local line,
// then (if a Gemini key is configured) upgrades it to a Claude/Gemini-generated,
// performance-aware sentence. Purely additive — with no key it just shows the fallback.

import { useEffect, useState } from 'react';
import type { ViewStyle } from 'react-native';

import { Buddy } from '@/components/buddy';
import { speak } from '@/lib/speak';
import { geminiCoachLine } from '@/lib/tutor/gemini';

export function MiloCoach({
  summary,
  fallback,
  style,
}: {
  summary: string; // plain-language recap fed to the model
  fallback: string; // shown instantly and if the model is unavailable
  style?: ViewStyle;
}) {
  const [line, setLine] = useState(fallback);

  useEffect(() => {
    let alive = true;
    geminiCoachLine(summary)
      .then((l) => {
        if (alive && l) setLine(l);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [summary]);

  return <Buddy mood="cheer" message={line} onReplay={() => speak(line)} style={style} />;
}
