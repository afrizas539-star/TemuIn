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

export default function AdminLoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { login, isAdminAuthenticated, adminProfile, isLoadingAuth } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [apiError, setApiError] = useState<unknown>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isAdminAuthenticated) {
      router.replace('/admin/dashboard');
    }
  }, [isAdminAuthenticated]);

  const handleLogin = async () => {
    setApiError(null);
    if (!email.trim()) {
      setApiError('Silakan masukkan akun email Anda.');
      return;
    }
    if (!password) {
      setApiError('Silakan masukkan password akun.');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await login(email, password);
      if (res.success) {
        router.replace('/admin/dashboard');
      } else {
        setApiError(res.message || 'Login gagal. Silakan periksa kembali data Anda.');
      }
    } catch (e) {
      setApiError(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFillDemo = () => {
    setEmail(adminProfile.email || 'admin.kampus@gmail.com');
    setPassword(adminProfile.password || 'admin123kampus');
    setApiError(null);
  };

  if (isLoadingAuth) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <StatusBar style="light" />

      {/* Top Banner & Branding */}
      <View
        style={[
          styles.topHeader,
          {
            paddingTop: Math.max(insets.top + 10, Platform.OS === 'android' ? 36 : 24),
          },
        ]}
      >
        <TouchableOpacity
          style={styles.backToStudentBtn}
          onPress={() => router.replace('/login')}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={18} color="#CBD5E1" />
          <Text style={styles.backToStudentText}>Kembali ke Mode Mahasiswa</Text>
        </TouchableOpacity>

        <View style={styles.logoCircle}>
          <Image
            source={require('@/assets/images/logo-temuin.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
        </View>
        <Text style={styles.appTitle}>Portal Petugas TemuIn</Text>
        <Text style={styles.appSub}>Universitas Muhammadiyah Malang</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.loginCard}>
          <Text style={styles.loginTitle}>Masuk Akun Petugas</Text>
          <Text style={styles.loginDesc}>
            Gunakan akun resmi pengelola untuk memverifikasi laporan dan klaim barang civitas akademika.
          </Text>

          {/* Reusable HTTP / API Error Display */}
          <ApiErrorMessage
            error={apiError}
            onRetry={handleLogin}
            onDismiss={() => setApiError(null)}
          />

          {/* Gmail Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Akun Gmail</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="mail-outline" size={18} color="#64748B" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="nama.petugas@gmail.com"
                placeholderTextColor="#94A3B8"
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  if (apiError) setApiError(null);
                }}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
              />
            </View>
          </View>

          {/* Password Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Password</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="key-outline" size={18} color="#64748B" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Masukkan password..."
                placeholderTextColor="#94A3B8"
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  if (apiError) setApiError(null);
                }}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeBtn}
                hitSlop={8}
              >
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={18}
                  color="#64748B"
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Login Button */}
          <TouchableOpacity
            style={[styles.loginBtn, isSubmitting && styles.loginBtnDisabled]}
            onPress={handleLogin}
            disabled={isSubmitting}
            activeOpacity={0.8}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="log-in-outline" size={18} color="#FFFFFF" />
                <Text style={styles.loginBtnText}>Masuk ke Dashboard</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Info Akun */}
          <View style={styles.demoCard}>
            <View style={styles.demoHeader}>
              <Ionicons name="information-circle" size={16} color="#4F46E5" />
              <Text style={styles.demoTitle}>Akun Petugas:</Text>
            </View>
            <Text style={styles.demoCreds}>
              Gmail: <Text style={styles.demoCredsBold}>{adminProfile.email}</Text>
            </Text>
            <Text style={[styles.demoCreds, { marginTop: 4, color: '#64748B' }]}>
              Password: <Text style={styles.demoCredsBold}>{adminProfile.password || 'admin123kampus'}</Text>
            </Text>
            <TouchableOpacity style={styles.fillDemoBtn} onPress={handleFillDemo}>
              <Text style={styles.fillDemoBtnText}>Isi Akun Demo Otomatis</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  topHeader: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    alignItems: 'center',
    backgroundColor: '#0F172A',
  },
  backToStudentBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    marginBottom: 16,
    paddingVertical: 6,
  },
  backToStudentText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
  },
  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 6,
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  appTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  appSub: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 3,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 30,
  },
  loginCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  loginTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  loginDesc: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 18,
    marginBottom: 18,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 10,
    padding: 10,
    gap: 8,
    marginBottom: 14,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 12,
    flex: 1,
  },
  inputGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 46,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
    paddingVertical: 0,
  },
  eyeBtn: {
    padding: 6,
  },
  loginBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4F46E5',
    borderRadius: 12,
    paddingVertical: 13,
    gap: 8,
    marginTop: 8,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  loginBtnDisabled: {
    opacity: 0.6,
  },
  loginBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  demoCard: {
    backgroundColor: '#EEF2FF',
    borderRadius: 12,
    padding: 12,
    marginTop: 18,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  demoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  demoTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#3730A3',
  },
  demoCreds: {
    fontSize: 11,
    color: '#4338CA',
    lineHeight: 16,
  },
  demoCredsBold: {
    fontWeight: '700',
  },
  fillDemoBtn: {
    marginTop: 8,
    backgroundColor: '#FFFFFF',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  fillDemoBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4F46E5',
  },
});
