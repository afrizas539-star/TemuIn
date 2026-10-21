import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Image,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/context/AuthContext';

const { width } = Dimensions.get('window');

/**
 * PRIORITAS 1 — WELCOME / LOADING SCREEN
 * 
 * Alur:
 * Buka aplikasi -> Welcome / Splash Screen -> Logo aplikasi -> Loading singkat
 * -> Cek status autentifikasi:
 *    - Jika belum login -> halaman Login (/login)
 *    - Jika sudah login -> Dashboard sesuai role:
 *      * Mahasiswa -> /home
 *      * Admin/Petugas -> /admin/dashboard
 */
export default function WelcomeSplashScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isAuthenticated, role, isLoadingAuth } = useAuth();

  const [fadeAnim] = useState(new Animated.Value(0));
  const [scaleAnim] = useState(new Animated.Value(0.92));
  const [statusText, setStatusText] = useState('Memuat aplikasi lost & found...');

  useEffect(() => {
    // Animasi muncul logo halus
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 6,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  useEffect(() => {
    if (isLoadingAuth) {
      setStatusText('Memeriksa status sesi autentifikasi...');
      return;
    }

    setStatusText('Menyiapkan dashboard...');

    // Transisi singkat setelah autentifikasi selesai diverifikasi
    const timer = setTimeout(() => {
      if (!isAuthenticated || !role) {
        // Belum login -> Halaman Login Role
        router.replace('/login');
      } else if (role === 'admin') {
        // Admin -> Dashboard Admin
        router.replace('/admin/dashboard');
      } else {
        // Mahasiswa -> Dashboard Mahasiswa
        router.replace('/home');
      }
    }, 700);

    return () => clearTimeout(timer);
  }, [isLoadingAuth, isAuthenticated, role]);

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: Math.max(insets.top, Platform.OS === 'android' ? 24 : 16),
          paddingBottom: Math.max(insets.bottom, 24),
        },
      ]}
    >
      <StatusBar style="dark" />

      {/* Decorative top pattern */}
      <View style={styles.topAccent} />

      <View style={styles.centerBox}>
        <Animated.View
          style={[
            styles.logoContainer,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {/* Logo TemuIn Resmi */}
          <View style={styles.logoBadge}>
            <Image
              source={require('@/assets/images/logo-temuin.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>

          {/* Identitas Universitas & Kampus */}
          <View style={styles.titleWrap}>
            <Text style={styles.universityName}>Universitas Muhammadiyah Malang</Text>
            <Text style={styles.appSubtitle}>
              Sistem Informasi Lost & Found Resmi Kampus
            </Text>
          </View>
        </Animated.View>

        {/* Loading Indicator & Status Info */}
        <View style={styles.loadingSection}>
          <ActivityIndicator size="small" color="#0266B3" />
          <Text style={styles.statusText}>{statusText}</Text>
        </View>
      </View>

      {/* Footer Info */}
      <View style={styles.footer}>
        <View style={styles.securityBadge}>
          <Ionicons name="shield-checkmark" size={14} color="#059669" />
          <Text style={styles.securityText}>Sistem Terverifikasi • Universitas Muhammadiyah Malang</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  topAccent: {
    position: 'absolute',
    top: -80,
    right: -80,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: '#EFF6FF',
    opacity: 0.8,
  },
  centerBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  logoContainer: {
    alignItems: 'center',
  },
  logoBadge: {
    width: 160,
    height: 160,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#0266B3',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 20,
    padding: 10,
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  titleWrap: {
    alignItems: 'center',
  },
  universityName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.3,
    textAlign: 'center',
  },
  appSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 6,
    textAlign: 'center',
    fontWeight: '500',
    maxWidth: width * 0.8,
  },
  loadingSection: {
    marginTop: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  statusText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
    width: '100%',
  },
  securityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  securityText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#065F46',
  },
});