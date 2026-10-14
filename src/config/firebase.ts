import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp, getApps, initializeApp } from 'firebase/app';
// @ts-ignore
import { getAuth, getReactNativePersistence, initializeAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { Platform } from 'react-native';

const firebaseConfig = {
  apiKey: "AIzaSyCqwbJlyMPmEI6wr_nKFVZm6OvJH4blEIY",
  authDomain: "temuin-2808e.firebaseapp.com",
  projectId: "temuin-2808e",
  storageBucket: "temuin-2808e.firebasestorage.app",
  messagingSenderId: "510115226009",
  appId: "1:510115226009:web:3cba590fe6673a3b6f3308",
  measurementId: "G-YZ569K32KQ",
};

// Inisialisasi Firebase App dengan pencegahan duplicate instance
export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Inisialisasi Firebase Auth dengan persistence kompatibel React Native & Web
let authInstance: ReturnType<typeof getAuth>;
try {
  if (Platform.OS === 'web') {
    authInstance = getAuth(app);
  } else {
    try {
      authInstance = initializeAuth(app, {
        persistence: getReactNativePersistence(AsyncStorage),
      });
    } catch {
      // Jika sudah diinisialisasi sebelumnya (Fast Refresh)
      authInstance = getAuth(app);
    }
  }
} catch (authError) {
  console.warn('[Firebase] Warning saat inisialisasi Auth:', authError);
  authInstance = getAuth(app);
}

export const auth = authInstance;

// Inisialisasi Firestore
export const db = getFirestore(app);

console.log('[Startup] Firebase (App, Auth, Firestore) berhasil diinisialisasi.');