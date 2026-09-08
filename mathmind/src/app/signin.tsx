import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BigButton } from '@/components/big-button';
import { PaperBg, SketchSurface, StickyTag } from '@/components/sketch';
import { ThemedText } from '@/components/themed-text';
import { Brand, HandFonts, MaxContentWidth, Spacing, Wobbly } from '@/constants/theme';
import { useStore } from '@/lib/store';

// Demo-grade sign-in + rostering. Teacher opens a class (which has a join code); a student
// enters that code + their name to join. Local for the demo — a production build would put
// Supabase Auth + RLS behind these same actions.

export default function SignIn() {
  const router = useRouter();
  const { createClass, joinClass, loadDemoData } = useStore();
  const [mode, setMode] = useState<'pick' | 'student' | 'teacher'>('pick');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');

  const input = (value: string, set: (v: string) => void, placeholder: string, extra?: object) => (
    <TextInput
      value={value}
      onChangeText={set}
      placeholder={placeholder}
      placeholderTextColor={`${Brand.ink}66`}
      style={[styles.input, Wobbly.sm]}
      {...extra}
    />
  );

  return (
    <SafeAreaView style={styles.safe}>
      <PaperBg />
      <View style={styles.container}>
        <StickyTag label="SIGN IN" rotate={-3} style={{ alignSelf: 'flex-start' }} />
        <ThemedText type="title" style={{ fontSize: 40, lineHeight: 46 }}>Who&apos;s here?</ThemedText>

        {mode === 'pick' && (
          <View style={{ gap: Spacing.three, marginTop: Spacing.three }}>
            <SketchSurface radius="md" shadow={4} rotate={-0.5}>
              <ThemedText type="smallBold">I&apos;m a student</ThemedText>
              <ThemedText type="small" style={{ color: Brand.muted, marginVertical: Spacing.one }}>
                Join your class with the code your teacher gives you.
              </ThemedText>
              <BigButton label="I'm a student" variant="primary" onPress={() => setMode('student')} />
            </SketchSurface>
            <SketchSurface radius="md" shadow={4} rotate={0.5} tone="postit">
              <ThemedText type="smallBold">I&apos;m a teacher</ThemedText>
              <ThemedText type="small" style={{ color: Brand.ink, marginVertical: Spacing.one }}>
                Open your class notebook and share the join code with students.
              </ThemedText>
              <BigButton label="I'm a teacher" variant="ghost" tint={Brand.ink} onPress={() => setMode('teacher')} />
            </SketchSurface>
          </View>
        )}

        {mode === 'student' && (
          <View style={{ gap: Spacing.three, marginTop: Spacing.three }}>
            <ThemedText type="small" style={{ color: Brand.muted }}>Enter your name and the class join code.</ThemedText>
            {input(name, setName, 'Your name')}
            {input(code, setCode, 'Class code (e.g. MATH42)', { autoCapitalize: 'characters', maxLength: 8 })}
            <BigButton
              label="Join class"
              variant="primary"
              disabled={!name.trim()}
              onPress={() => {
                joinClass(code.trim(), name.trim());
                router.replace('/');
              }}
            />
            <BigButton label="Back" variant="ghost" tint={Brand.muted} onPress={() => setMode('pick')} />
          </View>
        )}

        {mode === 'teacher' && (
          <View style={{ gap: Spacing.three, marginTop: Spacing.three }}>
            <ThemedText type="small" style={{ color: Brand.muted }}>
              Open your class to see every student&apos;s mastery and the join code they use.
            </ThemedText>
            {input(name, setName, 'Your name (optional)')}
            <BigButton
              label="Open my class"
              variant="primary"
              onPress={() => {
                createClass('Room 3B', name.trim() || 'Ms. Rivera');
                loadDemoData(); // seed the class roster for the demo
                router.replace('/teacher');
              }}
            />
            <BigButton label="Back" variant="ghost" tint={Brand.muted} onPress={() => setMode('pick')} />
          </View>
        )}

        <BigButton label="Back home" variant="ghost" tint={Brand.ink} onPress={() => router.replace('/')} style={{ marginTop: Spacing.five }} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Brand.paper },
  container: {
    flex: 1,
    padding: Spacing.four,
    gap: Spacing.two,
    maxWidth: MaxContentWidth,
    width: '100%',
    alignSelf: 'center',
  },
  input: {
    backgroundColor: Brand.card,
    borderWidth: 2,
    borderColor: Brand.ink,
    padding: Spacing.three,
    fontFamily: HandFonts.body,
    fontSize: 20,
    color: Brand.ink,
  },
});
