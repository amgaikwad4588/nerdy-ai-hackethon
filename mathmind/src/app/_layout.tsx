import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { Brand } from '@/constants/theme';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: Brand.cream },
          headerTintColor: Brand.ink,
          headerTitleStyle: { fontWeight: '700' },
          contentStyle: { backgroundColor: Brand.cream },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="learn" options={{ title: 'Practice' }} />
        <Stack.Screen name="game" options={{ title: 'Number Line Dash', presentation: 'modal' }} />
        <Stack.Screen name="teacher" options={{ title: 'Class Dashboard' }} />
      </Stack>
    </>
  );
}
