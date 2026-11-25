import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { AppState, Platform } from 'react-native';

/**
 * Storage adapter kustom menggunakan expo-secure-store untuk platform native (Android & iOS),
 * dan fallback ke localStorage untuk platform web.
 *
 * CATATAN PENGEMBANGAN:
 * Jika ukuran session Supabase di masa depan melebihi batas simpan SecureStore (maks ~2048 bytes
 * pada beberapa perangkat Android SharedPreferences), gunakan pola "LargeSecureStore":
 * - Enkripsi payload session menggunakan AES-256.
 * - Simpan kunci enkripsi di expo-secure-store.
 * - Simpan payload terenkripsi di @react-native-async-storage/async-storage.
 */
const ExpoSecureStoreAdapter = {
  getItem: (key: string): Promise<string | null> => {
    if (Platform.OS === 'web') {
      if (typeof localStorage !== 'undefined') {
        return Promise.resolve(localStorage.getItem(key));
      }
      return Promise.resolve(null);
    }
    return SecureStore.getItemAsync(key);
  },
  setItem: (key: string, value: string): Promise<void> => {
    if (Platform.OS === 'web') {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(key, value);
      }
      return Promise.resolve();
    }
    return SecureStore.setItemAsync(key, value);
  },
  removeItem: (key: string): Promise<void> => {
    if (Platform.OS === 'web') {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(key);
      }
      return Promise.resolve();
    }
    return SecureStore.deleteItemAsync(key);
  },
};

const rawUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
// Bersihkan URL jika diakhiri dengan /rest/v1/ atau trailing slash
const supabaseUrl = rawUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    '[Supabase] Peringatan: EXPO_PUBLIC_SUPABASE_URL atau EXPO_PUBLIC_SUPABASE_ANON_KEY belum terkonfigurasi di file .env'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Listener AppState untuk mengelola lifecycle auto-refresh token saat aplikasi dibuka/dibackground
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      supabase.auth.startAutoRefresh();
    } else {
      supabase.auth.stopAutoRefresh();
    }
  });
}
