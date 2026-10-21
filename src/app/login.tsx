import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ApiErrorMessage } from '@/components/ApiErrorMessage';
import { useAuth } from '@/context/AuthContext';

/**
 * SATU HALAMAN LOGIN — Role ditentukan otomatis dari data akun
 *
 * Alur:
 * Input Email → Input Password → Login
 * → Sistem membaca role akun
 * → Jika role = 'admin'  → Dashboard Admin (/admin/dashboard)
 * → Jika role = 'student' → Dashboard Mahasiswa (/home)
 */
export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    isAuthenticated,
    role,
    login,
    isLoadingAuth,
  } = useAuth();

  // Form states
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [apiError, setApiError] = useState<unknown>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Jika sudah login, langsung arahkan ke dashboard yang sesuai
  useEffect(() => {
    if (!isLoadingAuth && isAuthenticated && role) {
      if (role === 'admin') {
        router.replace('/admin/dashboard');
      } else {
        router.replace('/home');
      }
    }
  }, [isAuthenticated, role, isLoadingAuth]);

  /**
   * Fungsi login tunggal — menggunakan JWT REST API via apiService & AuthContext
   */
  const handleLogin = async () => {
    setApiError(null);

    const trimmedId = identifier.trim();

    if (!trimmedId) {
      setApiError('Email atau NIM wajib diisi.');
      return;
    }
    if (!password) {
      setApiError('Password wajib diisi.');
      return;
    }

    try {
      setIsSubmitting(true);

      const res = await login(trimmedId, password);
      if (res.success) {
        if (res.role === 'admin') {
          router.replace('/admin/dashboard');
        } else {
          router.replace('/home');
        }
      } else {
        setApiError(res.message || 'Login gagal. Periksa kembali email/NIM dan password.');
      }
    } catch (err) {
      setApiError(err);
    } finally {
      setIsSubmitting(false);
    }
  };



  if (isLoadingAuth) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <StatusBar style="dark" />

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: Math.max(insets.top + 16, Platform.OS === 'android' ? 36 : 24),
            paddingBottom: Math.max(insets.bottom + 20, 30),
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Branding */}
        <View style={styles.header}>
          <View style={styles.logoRow}>
            <View style={styles.logoBadge}>
              <Image
                source={require('@/assets/images/logo-temuin.png')}
                style={styles.logoImage}
                resizeMode="contain"
              />
            </View>
            <View style={styles.brandTextWrap}>
              <Text style={styles.brandTitle}>
                Temu<Text style={styles.brandHighlight}>In</Text>
              </Text>
              <Text style={styles.brandSubtitle}>Universitas Muhammadiyah Malang</Text>
              <Text style={styles.brandTagline}>Temukan • Laporkan • Bertemu</Text>
            </View>
          </View>
        </View>

        {/* Tagline Card */}
        <View style={styles.taglineCard}>
          <Ionicons name="shield-checkmark" size={20} color="#0266B3" />
          <View style={styles.taglineTextWrap}>
            <Text style={styles.taglineTitle}>Portal Layanan Lost & Found</Text>
            <Text style={styles.taglineDesc}>
              Akses terpadu bagi mahasiswa dan petugas Universitas Muhammadiyah Malang.
            </Text>
          </View>
        </View>

        {/* Form Card */}
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>Masuk ke Akun</Text>

          {/* Reusable HTTP & API Error Display */}
          <ApiErrorMessage
            error={apiError}
            onRetry={handleLogin}
            onDismiss={() => setApiError(null)}
          />

          {/* Email / NIM Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Email / NIM</Text>
            <View style={styles.inputWrap}>
              <Ionicons name="person-outline" size={20} color="#64748B" />
              <TextInput
                style={styles.textInput}
                placeholder="Email atau NIM mahasiswa"
                placeholderTextColor="#94A3B8"
                value={identifier}
                onChangeText={setIdentifier}
                autoCapitalize="none"
                keyboardType="email-address"
                autoCorrect={false}
              />
            </View>
          </View>

          {/* Password Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Password</Text>
            <View style={styles.inputWrap}>
              <Ionicons name="lock-closed-outline" size={20} color="#64748B" />
              <TextInput
                style={styles.textInput}
                placeholder="Masukkan kata sandi"
                placeholderTextColor="#94A3B8"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCorrect={false}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} hitSlop={10}>
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color="#94A3B8"
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitBtn, isSubmitting && styles.submitBtnDisabled]}
            onPress={handleLogin}
            disabled={isSubmitting}
            activeOpacity={0.85}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <Text style={styles.submitBtnText}>Masuk</Text>
                <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
              </>
            )}
          </TouchableOpacity>


        </View>

        {/* Security Notice */}
        <View style={styles.securityNotice}>
          <Ionicons name="lock-closed" size={14} color="#059669" />
          <Text style={styles.securityNoticeText}>
            Sesi login tersimpan secara aman dengan SecureStore.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  header: {
    marginBottom: 20,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  logoBadge: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0266B3',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
    padding: 4,
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  brandTextWrap: {
    flex: 1,
  },
  brandTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  brandHighlight: {
    color: '#F58220',
  },
  brandSubtitle: {
    fontSize: 12,
    color: '#1E293B',
    fontWeight: '700',
    marginTop: 1,
  },
  brandTagline: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
    marginTop: 2,
  },
  taglineCard: {
    flexDirection: 'row',
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    gap: 12,
    alignItems: 'center',
    marginBottom: 20,
  },
  taglineTextWrap: {
    flex: 1,
  },
  taglineTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  taglineDesc: {
    fontSize: 11,
    color: '#475569',
    marginTop: 2,
    lineHeight: 16,
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 18,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 16,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    padding: 10,
    borderRadius: 8,
    gap: 8,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  errorText: {
    fontSize: 12,
    color: '#B91C1C',
    flex: 1,
    fontWeight: '600',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
    gap: 10,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563EB',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    marginTop: 6,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  submitBtnDisabled: {
    opacity: 0.65,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },

  securityNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  securityNoticeText: {
    fontSize: 11,
    color: '#065F46',
    fontWeight: '500',
    textAlign: 'center',
  },
});
