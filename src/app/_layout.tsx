import { useEffect } from 'react';
import { DarkTheme, DefaultTheme, ThemeProvider, Stack, router } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'react-native';
import {
  useFonts,
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from '@expo-google-fonts/plus-jakarta-sans';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { setUnauthorizedHandler } from '@/lib/api/client';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [fontsLoaded, fontError] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });

  // Sesi kedaluwarsa di layar mana pun: ke layar masuk, bukan pesan coba lagi.
  useEffect(() => {
    setUnauthorizedHandler(() => router.replace('/login'));
    return () => setUnauthorizedHandler(null);
  }, []);

  // Tahan splash sampai font siap supaya layar pertama tidak berkedip dari
  // font bawaan ke Plus Jakarta Sans. Kalau font gagal dimuat, tetap lanjut
  // dengan font sistem daripada macet di splash.
  if (!fontsLoaded && !fontError) return null;

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AnimatedSplashOverlay />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="welcome" />
        <Stack.Screen name="login" />
        <Stack.Screen name="register" />
        <Stack.Screen name="conversation" />
        <Stack.Screen name="dashboard" />
      </Stack>
    </ThemeProvider>
  );
}
