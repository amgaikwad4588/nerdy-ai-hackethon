import {
  Kalam_400Regular,
  Kalam_700Bold,
  useFonts,
} from '@expo-google-fonts/kalam';
import { PatrickHand_400Regular } from '@expo-google-fonts/patrick-hand';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';

import { Brand, HandFonts } from '@/constants/theme';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded] = useFonts({
    Kalam_400Regular,
    Kalam_700Bold,
    PatrickHand_400Regular,
  });

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync();
  }, [loaded]);

  if (!loaded) return null;

  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: Brand.paper },
          headerShadowVisible: false,
          headerTintColor: Brand.ink,
          headerTitleStyle: { fontFamily: HandFonts.heading, fontSize: 22 },
          contentStyle: { backgroundColor: Brand.paper },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="learn" options={{ title: 'My Practice' }} />
        <Stack.Screen name="game" options={{ title: 'Number Line Dash', presentation: 'modal' }} />
        <Stack.Screen name="teacher" options={{ title: 'Class Notebook' }} />
      </Stack>
    </>
  );
}
