import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
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

export default function RegisterScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { signUp, isSubmitting } = useAuth();

  const [name, setName] = useState('');
  const [nim, setNim] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [faculty, setFaculty] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [apiError, setApiError] = useState<unknown>(null);

  const handleRegister = async () => {
    setApiError(null);

    const trimmedName = name.trim();
    const trimmedNim = nim.trim();
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedName) {
      setApiError('Silakan masukkan nama lengkap Anda.');
      return;
    }

    if (!trimmedNim) {
      setApiError('Silakan masukkan NIM Anda.');
      return;
    }

    if (!/^\d+$/.test(trimmedNim)) {
      setApiError('NIM harus berupa angka yang valid.');
      return;
    }

    if (!trimmedEmail) {
      setApiError('Silakan masukkan email kampus (@webmail.umm.ac.id).');
      return;
    }

    if (!trimmedEmail.endsWith('@webmail.umm.ac.id')) {
      setApiError('Pendaftaran hanya dapat menggunakan email mahasiswa: nama@webmail.umm.ac.id');
      return;
    }

    if (!password || password.length < 6) {
      setApiError('Kata sandi minimal 6 karakter.');
      return;
    }

    if (password !== confirmPassword) {
      setApiError('Konfirmasi kata sandi tidak cocok.');
      return;
    }

    try {
      const res = await signUp(trimmedEmail, password, trimmedName, trimmedNim, phone, faculty);
      if (res.success) {
        // Pendaftaran berhasil, route protection guard atau session akan mengarahkan
        router.replace('/home');
      } else {
        setApiError(res.message || 'Pendaftaran gagal. Silakan coba kembali.');
      }
    } catch (err) {
      setApiError(err);
    }
  };

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
            paddingTop: Math.max(insets.top + 20, 40),
            paddingBottom: Math.max(insets.bottom + 20, 32),
          },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header Branding */}
        <View style={styles.brandContainer}>
          <Image
            source={require('../../assets/images/logo-temuin.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.brandTitle}>Daftar Akun Mahasiswa</Text>
          <Text style={styles.brandSubtitle}>
            Gunakan email @webmail.umm.ac.id untuk mengakses layanan TemuIn
          </Text>
        </View>

        {/* Form Container */}
        <View style={styles.formCard}>
          <ApiErrorMessage error={apiError} onDismiss={() => setApiError(null)} />

          {/* Nama Lengkap */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Nama Lengkap</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="person-outline" size={20} color="#64748B" style={styles.inputIcon} />
              <TextInput
                style={styles.textInput}
                placeholder="Contoh: Muhammad Farhan"
                placeholderTextColor="#94A3B8"
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
                editable={!isSubmitting}
              />
            </View>
          </View>

          {/* NIM */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>NIM (Nomor Induk Mahasiswa)</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="card-outline" size={20} color="#64748B" style={styles.inputIcon} />
              <TextInput
                style={styles.textInput}
                placeholder="Contoh: 202210370311001"
                placeholderTextColor="#94A3B8"
                value={nim}
                onChangeText={setNim}
                keyboardType="number-pad"
                editable={!isSubmitting}
              />
            </View>
          </View>

          {/* Email Mahasiswa */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Email Mahasiswa (@webmail.umm.ac.id)</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="mail-outline" size={20} color="#64748B" style={styles.inputIcon} />
              <TextInput
                style={styles.textInput}
                placeholder="202210370311xxx@webmail.umm.ac.id"
                placeholderTextColor="#94A3B8"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                editable={!isSubmitting}
              />
            </View>
          </View>

          {/* Fakultas */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Fakultas / Jurusan (Opsional)</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="school-outline" size={20} color="#64748B" style={styles.inputIcon} />
              <TextInput
                style={styles.textInput}
                placeholder="Teknik Informatika"
                placeholderTextColor="#94A3B8"
                value={faculty}
                onChangeText={setFaculty}
                editable={!isSubmitting}
              />
            </View>
          </View>

          {/* Nomor HP */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Nomor WhatsApp / HP (Opsional)</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="call-outline" size={20} color="#64748B" style={styles.inputIcon} />
              <TextInput
                style={styles.textInput}
                placeholder="08123456789"
                placeholderTextColor="#94A3B8"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                editable={!isSubmitting}
              />
            </View>
          </View>

          {/* Kata Sandi */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Kata Sandi</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="lock-closed-outline" size={20} color="#64748B" style={styles.inputIcon} />
              <TextInput
                style={styles.textInput}
                placeholder="Minimal 6 karakter"
                placeholderTextColor="#94A3B8"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                editable={!isSubmitting}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeButton}
              >
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color="#64748B"
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Konfirmasi Kata Sandi */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Ulangi Kata Sandi</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="shield-checkmark-outline" size={20} color="#64748B" style={styles.inputIcon} />
              <TextInput
                style={styles.textInput}
                placeholder="Masukkan kembali kata sandi"
                placeholderTextColor="#94A3B8"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showPassword}
                editable={!isSubmitting}
              />
            </View>
          </View>

          {/* Tombol Daftar */}
          <TouchableOpacity
            style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
            onPress={handleRegister}
            disabled={isSubmitting}
            activeOpacity={0.8}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.submitButtonText}>Daftar Sekarang</Text>
            )}
          </TouchableOpacity>

          {/* Tautan ke Login */}
          <View style={styles.footerLinkRow}>
            <Text style={styles.footerText}>Sudah memiliki akun? </Text>
            <TouchableOpacity onPress={() => router.replace('/login')} disabled={isSubmitting}>
              <Text style={styles.loginLinkText}>Masuk di sini</Text>
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
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  brandContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logo: {
    width: 90,
    height: 90,
    marginBottom: 12,
  },
  brandTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 6,
  },
  brandSubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 18,
  },
  formCard: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 8,
  },
  textInput: {
    flex: 1,
    height: 46,
    fontSize: 14,
    color: '#0F172A',
  },
  eyeButton: {
    padding: 6,
  },
  submitButton: {
    backgroundColor: '#800000', // Warna UMM maroon
    height: 48,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  footerLinkRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 13,
    color: '#64748B',
  },
  loginLinkText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#800000',
  },
});
