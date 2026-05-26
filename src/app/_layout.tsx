import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from '@/lib/useColorScheme';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { useEffect, useState, useCallback } from 'react';
import { PermissionOnboarding, shouldShowOnboarding } from '@/components/PermissionOnboarding';
// Initialise RevenueCat SDK as early as possible
import '@/lib/purchases';
import { checkPremiumEntitlement } from '@/lib/purchases';
import usePurchasesStore from '@/lib/state/purchases-store';

export const unstable_settings = {
  // Ensure that reloading on `/modal` keeps a back button present.
  initialRouteName: '(tabs)',
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav({ colorScheme }: { colorScheme: 'light' | 'dark' | null | undefined }) {
  const [showOnboarding, setShowOnboarding] = useState<boolean | null>(null);
  const queryClient = useQueryClient();
  const setPremium = usePurchasesStore((s) => s.setPremium);

  // Check entitlement from RevenueCat on every launch; persisted value is shown immediately
  useEffect(() => {
    checkPremiumEntitlement().then((premium) => setPremium(premium));
  }, [setPremium]);

  useEffect(() => {
    async function checkOnboarding() {
      const shouldShow = await shouldShowOnboarding();
      setShowOnboarding(shouldShow);
      // Hide splash screen once we know the onboarding state
      SplashScreen.hideAsync();
    }
    checkOnboarding();
  }, []);

  const handleOnboardingComplete = useCallback(() => {
    setShowOnboarding(false);
    // Refresh albums data after permission is granted
    queryClient.invalidateQueries({ queryKey: ['albums'] });
  }, [queryClient]);

  // Don't render until we know if we should show onboarding
  if (showOnboarding === null) {
    return null;
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      {showOnboarding && <PermissionOnboarding onComplete={handleOnboardingComplete} />}
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="album/[id]" options={{ presentation: 'card' }} />
        <Stack.Screen name="photo/[id]" options={{ presentation: 'card', headerShown: false }} />
        <Stack.Screen name="settings" options={{ presentation: 'card' }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
        <Stack.Screen name="paywall" options={{ presentation: 'modal', headerShown: false }} />
        <Stack.Screen name="frame-builder" options={{ presentation: 'modal', headerShown: false }} />
      </Stack>
    </ThemeProvider>
  );
}



export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <KeyboardProvider>
          <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
          <RootLayoutNav colorScheme={colorScheme} />
        </KeyboardProvider>
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}