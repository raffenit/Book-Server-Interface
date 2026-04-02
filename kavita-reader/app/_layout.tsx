import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { AudioPlayerProvider } from '../contexts/AudioPlayerContext';
import { View, ActivityIndicator } from 'react-native';
import { Colors } from '../constants/theme';
import { PWAInstallBanner } from '../components/PWAInstallBanner';
import { MiniPlayer } from '../components/MiniPlayer';
import { kavitaAPI } from '../services/kavitaAPI';
import { absAPI } from '../services/audiobookshelfAPI';
import { useState, useEffect } from 'react';
import { Slot, useRouter, useSegments } from 'expo-router';
import { storage } from '../services/storage';
 
const [isReady, setIsReady] = useState(false);
const [showLogin, setShowLogin] = useState(true);

export default function RootLayout() {
  setIsReady(false);
  setShowLogin(true);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    const bootApp = async () => {
      // 1. Initialize your APIs
      await kavitaAPI.initialize();
      await absAPI.initialize();

      // 2. Check .env variables (Your "Developer Mode" bypass)
      const hasKavita = !!(process.env.EXPO_PUBLIC_KAVITA_URL && process.env.EXPO_PUBLIC_KAVITA_API_KEY);
      const hasAbs = !!(process.env.EXPO_PUBLIC_ABS_URL && process.env.EXPO_PUBLIC_ABS_TOKEN);

      if (hasKavita || hasAbs) {
        setShowLogin(false); // Bypasses the login screen
      } else {
        // Optional: Check if they have a saved manual login in storage
        const hasStored = await storage.getItem('server_url');
        if (hasStored) setShowLogin(false);
      }

      setIsReady(true);
    };

    bootApp();
  }, []);

  // 3. Navigation Guard
  useEffect(() => {
    if (!isReady) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (showLogin && !inAuthGroup) {
      // Redirect to login if they aren't authenticated
      router.replace('/(auth)/login');
    } else if (!showLogin && inAuthGroup) {
      // Redirect to main app if they ARE authenticated
      router.replace('/(tabs)');
    }
  }, [isReady, showLogin, segments]);

  if (!isReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0d0d12' }}>
        <ActivityIndicator size="large" color="#e8a838" />
      </View>
    );
  }
  //return <Slot />;
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <AudioPlayerProvider>
          <StatusBar style="light" />
          <RootLayoutNav />
          <PWAInstallBanner />
        </AudioPlayerProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}

function RootLayoutNav() {

  const { isAuthenticated, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    const bootApp = async () => {
      await kavitaAPI.initialize();
      await absAPI.initialize();

      // Check if either service is configured via .env
      const hasKavita = !!(process.env.EXPO_PUBLIC_KAVITA_URL && process.env.EXPO_PUBLIC_KAVITA_API_KEY);
      const hasAbs = !!(process.env.EXPO_PUBLIC_ABS_URL && process.env.EXPO_PUBLIC_ABS_TOKEN);

      if (hasKavita || hasAbs) {
        setShowLogin(false); // Skip to Main App
      }
      setIsReady(true);
    };
    bootApp();
  }, []);

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';
    if (!isAuthenticated && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (isAuthenticated && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, isLoading, segments]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.background, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color={Colors.accent} size="large" />
      </View>
    );
  }

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="reader/pdf"
          options={{
            headerShown: false,
            presentation: 'fullScreenModal',
            animation: 'fade',
          }}
        />
        <Stack.Screen
          name="reader/epub"
          options={{
            headerShown: false,
            presentation: 'fullScreenModal',
            animation: 'fade',
          }}
        />
        <Stack.Screen
          name="series/[id]"
          options={{
            headerShown: false,
            animation: 'slide_from_right',
          }}
        />
        <Stack.Screen
          name="audiobook/[id]"
          options={{
            headerShown: false,
            presentation: 'modal',
            animation: 'slide_from_bottom',
          }}
        />
      </Stack>
      {/* MiniPlayer sits above all screens so audio persists across navigation */}
      <MiniPlayer />
    </>
  );
}


