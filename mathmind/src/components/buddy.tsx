// Milo — the class buddy. A hand-drawn fox who guides the student and "talks" (his
// mouth moves whenever the shared read-aloud voice is speaking). Pure SVG so he
// renders identically on web + native, with gentle idle motion so he feels alive.

import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import Svg, { Circle, Ellipse, G, Line, Path, Polygon } from 'react-native-svg';

import { ThemedText } from '@/components/themed-text';
import { Brand, HandFonts, offsetShadow, Spacing, Wobbly } from '@/constants/theme';
import { onTalking, speak } from '@/lib/speak';

export type BuddyMood = 'idle' | 'happy' | 'thinking' | 'cheer' | 'oops';

// Warm fox coat — one friendly hue that still sits with the paper/ink/red palette.
const FOX = '#e8955a';
const FOX_DARK = '#d97b3c';

/** The fox face on its own. Blinks on a timer; mouth opens while `talking`. */
export function MiloFace({ size = 96, mood = 'idle', talking = false }: {
  size?: number;
  mood?: BuddyMood;
  talking?: boolean;
}) {
  const [blink, setBlink] = useState(false);
  const [mouthOpen, setMouthOpen] = useState(false);

  // Natural blink every few seconds.
  useEffect(() => {
    let alive = true;
    let t: ReturnType<typeof setTimeout>;
    const loop = () => {
      const wait = 2200 + Math.random() * 2600;
      t = setTimeout(() => {
        if (!alive) return;
        setBlink(true);
        setTimeout(() => alive && setBlink(false), 130);
        loop();
      }, wait);
    };
    loop();
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, []);

  // Flap the mouth while speaking.
  useEffect(() => {
    if (!talking) {
      setMouthOpen(false);
      return;
    }
    const id = setInterval(() => setMouthOpen((o) => !o), 170);
    return () => clearInterval(id);
  }, [talking]);

  const ink = Brand.ink;
  const sw = 3; // stroke width, hand-drawn weight
  const happy = mood === 'happy' || mood === 'cheer';
  const eyeR = blink ? 0 : 4.4;

  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      {/* Ears */}
      <Polygon points="14,40 30,6 46,32" fill={FOX} stroke={ink} strokeWidth={sw} strokeLinejoin="round" />
      <Polygon points="86,40 70,6 54,32" fill={FOX} stroke={ink} strokeWidth={sw} strokeLinejoin="round" />
      <Polygon points="24,32 31,16 39,31" fill={Brand.accent} opacity={0.85} />
      <Polygon points="76,32 69,16 61,31" fill={Brand.accent} opacity={0.85} />

      {/* Head */}
      <Path
        d="M50 90 C28 90 16 74 16 54 C16 36 30 26 50 26 C70 26 84 36 84 54 C84 74 72 90 50 90 Z"
        fill={FOX}
        stroke={ink}
        strokeWidth={sw}
        strokeLinejoin="round"
      />

      {/* Cream muzzle + cheeks */}
      <Path
        d="M50 58 C36 58 27 63 27 71 C27 82 38 90 50 90 C62 90 73 82 73 71 C73 63 64 58 50 58 Z"
        fill={Brand.cream}
        stroke={ink}
        strokeWidth={2}
      />
      <Circle cx={30} cy={64} r={6} fill={Brand.accent} opacity={0.22} />
      <Circle cx={70} cy={64} r={6} fill={Brand.accent} opacity={0.22} />

      {/* Eyes (blink shrinks them to a wink line) */}
      {blink ? (
        <>
          <Line x1={34} y1={51} x2={42} y2={51} stroke={ink} strokeWidth={sw} strokeLinecap="round" />
          <Line x1={58} y1={51} x2={66} y2={51} stroke={ink} strokeWidth={sw} strokeLinecap="round" />
        </>
      ) : (
        <>
          <Circle cx={38} cy={51} r={eyeR} fill={ink} />
          <Circle cx={62} cy={51} r={eyeR} fill={ink} />
          <Circle cx={39.4} cy={49.6} r={1.3} fill={Brand.card} />
          <Circle cx={63.4} cy={49.6} r={1.3} fill={Brand.card} />
        </>
      )}

      {/* Brows tilt with mood */}
      {mood === 'thinking' && (
        <Line x1={33} y1={43} x2={43} y2={45} stroke={ink} strokeWidth={2.4} strokeLinecap="round" />
      )}
      {mood === 'oops' && (
        <>
          <Line x1={33} y1={45} x2={43} y2={42} stroke={ink} strokeWidth={2.4} strokeLinecap="round" />
          <Line x1={57} y1={42} x2={67} y2={45} stroke={ink} strokeWidth={2.4} strokeLinecap="round" />
        </>
      )}

      {/* Nose */}
      <Path d="M46 63 L54 63 L50 68 Z" fill={ink} />
      <Line x1={50} y1={68} x2={50} y2={72} stroke={ink} strokeWidth={2} strokeLinecap="round" />

      {/* Mouth: opens while talking, smiles when happy, small 'o' when oops */}
      {mouthOpen ? (
        <Ellipse cx={50} cy={77} rx={5} ry={4} fill={FOX_DARK} stroke={ink} strokeWidth={2} />
      ) : mood === 'oops' ? (
        <Circle cx={50} cy={77} r={3} fill="none" stroke={ink} strokeWidth={2.4} />
      ) : (
        <Path
          d={happy ? 'M42 73 Q50 82 58 73' : 'M44 74 Q50 79 56 74'}
          fill="none"
          stroke={ink}
          strokeWidth={2.6}
          strokeLinecap="round"
        />
      )}

      {/* Cheer sparkles */}
      {mood === 'cheer' && (
        <G stroke={Brand.spark} strokeWidth={2.4} strokeLinecap="round">
          <Line x1={12} y1={20} x2={12} y2={28} />
          <Line x1={8} y1={24} x2={16} y2={24} />
          <Line x1={88} y1={26} x2={88} y2={34} />
          <Line x1={84} y1={30} x2={92} y2={30} />
        </G>
      )}
    </Svg>
  );
}

/**
 * Milo + a speech bubble. Tap him to (re)hear the line. Speech itself is triggered by
 * whoever calls `speak()`; Milo just listens for talking state to move his mouth, and
 * shows the current `message` in his bubble.
 */
export function Buddy({
  message,
  mood = 'idle',
  size = 92,
  name = 'Milo',
  onReplay,
  style,
}: {
  message?: string;
  mood?: BuddyMood;
  size?: number;
  name?: string;
  onReplay?: () => void;
  style?: ViewStyle;
}) {
  const [talking, setTalking] = useState(false);
  const bob = useRef(new Animated.Value(0)).current;

  useEffect(() => onTalking(setTalking), []);

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(bob, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(bob, { toValue: 0, duration: 1400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [bob]);

  const translateY = bob.interpolate({ inputRange: [0, 1], outputRange: [0, -6] });

  const replay = () => {
    if (onReplay) onReplay();
    else if (message) speak(message);
  };

  return (
    <View style={[styles.row, style]}>
      <Pressable onPress={replay} hitSlop={10} accessibilityRole="button" accessibilityLabel={`${name} says: ${message ?? ''}`}>
        <Animated.View style={{ transform: [{ translateY }] }}>
          <MiloFace size={size} mood={mood} talking={talking} />
        </Animated.View>
      </Pressable>

      {message ? (
        <View style={styles.bubbleWrap}>
          <View style={styles.beak} />
          <Pressable onPress={replay} style={styles.bubble}>
            <ThemedText type="smallBold" style={styles.name}>
              {name}
            </ThemedText>
            <ThemedText style={styles.msg}>{message}</ThemedText>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  bubbleWrap: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  beak: {
    width: 0,
    height: 0,
    borderTopWidth: 8,
    borderBottomWidth: 8,
    borderRightWidth: 12,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderRightColor: Brand.ink,
    marginRight: -1,
  },
  bubble: {
    flex: 1,
    backgroundColor: Brand.card,
    borderWidth: 2,
    borderColor: Brand.ink,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    ...Wobbly.md,
    ...offsetShadow(3, Brand.ink),
  },
  name: { color: Brand.blue, letterSpacing: 0.4, marginBottom: 1 },
  msg: { color: Brand.ink, fontFamily: HandFonts.body, fontSize: 17, lineHeight: 23 },
});
