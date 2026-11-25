import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import React, { useEffect } from 'react';
import { ActivityIndicator, useColorScheme, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider, useAuth } from '@/context/AuthContext';
import { CampusDataProvider } from '@/context/CampusDataContext';
import { NetworkProvider } from '@/context/NetworkContext';

SplashScreen.preventAutoHideAsync().catch(() => {});

function RootNavigator() {
  const { isAuthenticated, isStudent, isAdmin, isLoadingAuth } = useAuth();

  useEffect(() => {
    if (!isLoadingAuth) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [isLoadingAuth]);

  if (isLoadingAuth) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC' }}>
        <ActivityIndicator size="large" color="#800000" />
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'fade',
        contentStyle: { backgroundColor: '#F8FAFC' },
      }}
    >
      {/* Entry Route */}
      <Stack.Screen name="index" />

      {/* Rute Tamu / Belum Login */}
      <Stack.Protected guard={!isAuthenticated}>
        <Stack.Screen name="login" options={{ animation: 'fade' }} />
        <Stack.Screen name="register" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen
          name="admin/login"
          options={{
            animation: 'slide_from_bottom',
          }}
        />
      </Stack.Protected>

      {/* Rute Khusus Mahasiswa */}
      <Stack.Protected guard={isStudent}>
        <Stack.Screen name="home" />
        <Stack.Screen name="explore" />
        <Stack.Screen name="claims" />
        <Stack.Screen name="profile" />
        <Stack.Screen
          name="report-lost"
          options={{
            animation: 'slide_from_bottom',
          }}
        />
        <Stack.Screen
          name="camera"
          options={{
            animation: 'slide_from_bottom',
          }}
        />
        <Stack.Screen
          name="claim/[id]"
          options={{
            animation: 'slide_from_bottom',
          }}
        />
      </Stack.Protected>

      {/* Rute Bersama (Mahasiswa & Petugas yang Login) */}
      <Stack.Protected guard={isAuthenticated}>
        <Stack.Screen
          name="item/[id]"
          options={{
            animation: 'slide_from_right',
          }}
        />
      </Stack.Protected>

      {/* Rute Khusus Petugas / Admin */}
      <Stack.Protected guard={isAdmin}>
        <Stack.Screen name="admin/dashboard" />
        <Stack.Screen name="admin/reports" />
        <Stack.Screen name="admin/items" />
        <Stack.Screen name="admin/create" />
        <Stack.Screen name="admin/claims" />
        <Stack.Screen name="admin/profile" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <SafeAreaProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <NetworkProvider>
          <AuthProvider>
            <CampusDataProvider>
              <RootNavigator />
            </CampusDataProvider>
          </AuthProvider>
        </NetworkProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
