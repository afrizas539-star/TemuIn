import * as SecureStore from 'expo-secure-store';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';

import { auth } from '@/config/firebase';
import {
  apiService,
  ApiError,
  SECURE_KEY_ACCESS_TOKEN,
} from '@/services/api/apiService';
import {
  DEFAULT_ADMIN_DATA,
  getAdminProfileByUidOrEmail,
  getAnyUserProfileByUidOrEmail,
  getUserProfileByUidOrEmail,
  validateEmailDomain,
} from '@/services/firebase/firestoreService';
import { secureStorage } from '@/services/storage/secureStorage';
import { AdminProfile, User, UserRole } from '@/types';

interface AuthContextType {
  user: User | null;
  role: UserRole | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isStudent: boolean;
  isAdminAuthenticated: boolean; // Backwards-compatible
  adminProfile: AdminProfile;
  isLoadingAuth: boolean;
  loginAsStudent: (
    identifier: string,
    pass: string
  ) => Promise<{ success: boolean; message?: string }>;
  loginAsAdmin: (
    email: string,
    pass: string
  ) => Promise<{ success: boolean; message?: string }>;
  login: (
    emailOrNim: string,
    pass: string,
    preferredRole?: UserRole
  ) => Promise<{ success: boolean; role?: UserRole; message?: string }>;
  logout: () => Promise<void>;
  updateProfile: (
    updated: Partial<AdminProfile>
  ) => Promise<{ success: boolean; message?: string }>;
  updateStudentProfile: (
    updated: Partial<User>
  ) => Promise<{ success: boolean; message?: string }>;
}

const DEFAULT_ADMIN: AdminProfile = DEFAULT_ADMIN_DATA;

const DEFAULT_STUDENT: User = {
  id: 'mhs-2210511045',
  name: 'Nabila Putri Aryani',
  email: 'nabila.putri@mahasiswa.kampus.ac.id',
  role: 'student',
  phone: '081234567890',
  nim: '2210511045',
  faculty: 'Fakultas Ilmu Komputer',
  photo:
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=400&auto=format&fit=crop',
};

// SecureStore Keys
const SECURE_KEY_TOKEN = SECURE_KEY_ACCESS_TOKEN; // 'access_token' (Sprint 04 Task 01)
const SECURE_KEY_USER = 'auth_active_user';
const SECURE_KEY_ROLE = 'auth_active_role';
const SECURE_KEY_ADMIN_PROFILE = 'admin_profile_data';

// Helper local JWT untuk fallback offline jika server belum dinyalakan
function createMockJwt(u: User): string {
  try {
    const header = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9';
    const payloadObj = {
      sub: u.id,
      email: u.email,
      role: u.role,
      name: u.name,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 86400,
    };
    const jsonStr = JSON.stringify(payloadObj);
    const payloadStr =
      typeof btoa !== 'undefined'
        ? btoa(jsonStr)
        : 'mock_payload_' + Date.now();
    const signature = 'local_sig_' + Math.random().toString(36).substring(2, 10);
    return `${header}.${payloadStr}.${signature}`;
  } catch {
    return `jwt_mock_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [adminProfile, setAdminProfile] = useState<AdminProfile>(DEFAULT_ADMIN);
  const [isLoadingAuth, setIsLoadingAuth] = useState<boolean>(true);

  // Daftarkan listener 401 Unauthorized dari ApiService
  useEffect(() => {
    apiService.setUnauthorizedCallback(async () => {
      console.warn('[AuthContext] Menerima sinyal 401 Unauthorized! Melakukan logout otomatis.');
      await logout();
    });
  }, []);

  useEffect(() => {
    loadSession();
  }, []);

  const loadSession = async () => {
    try {
      // 1. Muat profil admin dari SecureStore jika ada
      const savedAdminProfile = await secureStorage.getObject<AdminProfile>(SECURE_KEY_ADMIN_PROFILE);
      if (savedAdminProfile) {
        setAdminProfile(savedAdminProfile);
      }

      // 2. Cek token sesi 'access_token' dari SecureStore
      let sessionToken: string | null = null;
      if (Platform.OS === 'web') {
        sessionToken = await secureStorage.getItem(SECURE_KEY_TOKEN);
      } else {
        try {
          sessionToken = await SecureStore.getItemAsync(SECURE_KEY_TOKEN);
        } catch {
          sessionToken = await secureStorage.getItem(SECURE_KEY_TOKEN);
        }
      }

      // Fallback ke legacy token jika access_token belum ada
      if (!sessionToken) {
        sessionToken = await secureStorage.getItem('auth_session_token');
      }

      const savedUser = await secureStorage.getObject<User>(SECURE_KEY_USER);

      if (sessionToken && savedUser && savedUser.id) {
        setUser(savedUser);
      } else {
        setUser(null);
      }
    } catch (e) {
      console.warn('Gagal memuat sesi autentifikasi aman:', e);
      setUser(null);
    } finally {
      setIsLoadingAuth(false);
    }
  };

  /**
   * Simpan access_token secara aman ke SecureStore (Task 01)
   */
  const storeAccessToken = async (token: string): Promise<void> => {
    if (Platform.OS === 'web') {
      await secureStorage.setItem(SECURE_KEY_TOKEN, token);
    } else {
      try {
        await SecureStore.setItemAsync(SECURE_KEY_TOKEN, token);
      } catch (err) {
        console.warn('[AuthContext] Gagal setItemAsync SecureStore:', err);
      }
      await secureStorage.setItem(SECURE_KEY_TOKEN, token);
    }
  };

  /**
   * Hapus access_token dari SecureStore (Task 03)
   */
  const removeAccessToken = async (): Promise<void> => {
    if (Platform.OS === 'web') {
      await secureStorage.removeItem(SECURE_KEY_TOKEN);
    } else {
      try {
        await SecureStore.deleteItemAsync(SECURE_KEY_TOKEN);
      } catch (err) {
        console.warn('[AuthContext] Gagal deleteItemAsync SecureStore:', err);
      }
      await secureStorage.removeItem(SECURE_KEY_TOKEN);
    }
  };

  /**
   * LOGIN SEBAGAI MAHASISWA (Task 01)
   */
  /**
   * LOGIN SEBAGAI MAHASISWA (BAGIAN 3 REQUIREMENT)
   * Ketentuan:
   * 1. Akun mahasiswa terdaftar boleh masuk.
   * 2. Akun mahasiswa tidak terdaftar harus DITOLAK.
   * 3. Password benar.
   * 4. Akun petugas TIDAK BOLEH masuk melalui login mahasiswa.
   * 5. Akun yang tidak aktif harus ditolak.
   * 6. Profil yang tidak ditemukan di Firestore harus ditolak.
   * 7. Jika berhasil, arahkan ke Dashboard Mahasiswa.
   * Domain email mahasiswa: @webmail.umm.ac.id
   */
  const loginAsStudent = async (
    identifier: string,
    pass: string
  ): Promise<{ success: boolean; message?: string }> => {
    const trimmed = identifier.trim().toLowerCase();

    // 1. Validasi input form
    if (!trimmed) {
      return { success: false, message: 'Email kampus (@webmail.umm.ac.id) atau NIM wajib diisi.' };
    }
    if (!pass) {
      return { success: false, message: 'Password akun mahasiswa wajib diisi.' };
    }

    // 2. Normalisasi format email mahasiswa UMM
    let studentEmail = trimmed;
    if (!trimmed.includes('@')) {
      // Jika input berupa NIM mahasiswa
      studentEmail = `${trimmed}@webmail.umm.ac.id`;
    }

    // Validasi domain email mahasiswa: hanya @webmail.umm.ac.id
    if (studentEmail.endsWith('@umm.ac.id') && !studentEmail.endsWith('@webmail.umm.ac.id')) {
      return {
        success: false,
        message: 'Akses ditolak: Akun petugas (@umm.ac.id) tidak dapat masuk melalui Portal Login Mahasiswa.',
      };
    }
    if (!studentEmail.endsWith('@webmail.umm.ac.id')) {
      return {
        success: false,
        message: 'Domain email tidak diizinkan. Gunakan email resmi mahasiswa berakhiran @webmail.umm.ac.id.',
      };
    }

    // 3. Autentikasi Kredensial via Firebase Authentication
    let authUid: string | null = null;
    let authSuccess = false;

    try {
      const userCredential = await signInWithEmailAndPassword(auth, studentEmail, pass);
      if (userCredential && userCredential.user) {
        authUid = userCredential.user.uid;
        authSuccess = true;
      }
    } catch (authError: any) {
      const code = authError?.code;
      // Jika kredensial salah / tidak terdaftar di Firebase Auth
      if (
        code === 'auth/wrong-password' ||
        code === 'auth/user-not-found' ||
        code === 'auth/invalid-credential' ||
        code === 'auth/invalid-email'
      ) {
        return {
          success: false,
          message: 'Email atau password akun mahasiswa salah. Silakan periksa kembali.',
        };
      }
      // Log jika Firebase Auth provider belum di-enable di console atau offline
      console.warn('[AuthContext] Firebase Auth Provider fallback ke database Firestore:', code);
    }

    // 4. Verifikasi dokumen profil mahasiswa di Firestore (Koleksi users)
    const firestoreUser = await getUserProfileByUidOrEmail({
      uid: authUid || undefined,
      email: studentEmail,
    });

    if (!firestoreUser) {
      if (authSuccess) {
        await signOut(auth).catch(() => {});
      }
      return {
        success: false,
        message: 'Akun mahasiswa tidak ditemukan di database resmi kampus UMM. Akses ditolak.',
      };
    }

    // Validasi password jika autentikasi Firebase Auth belum terkonfigurasi di console
    if (!authSuccess) {
      if (!firestoreUser.password || firestoreUser.password !== pass) {
        return {
          success: false,
          message: 'Password akun mahasiswa salah. Silakan periksa kembali data Anda.',
        };
      }
    }

    // 5. Validasi Role Akun: Hanya role 'student' yang diizinkan!
    if (firestoreUser.role !== 'student') {
      if (authSuccess) {
        await signOut(auth).catch(() => {});
      }
      return {
        success: false,
        message: 'Akses ditolak: Akun Petugas/Admin tidak diizinkan masuk melalui Portal Mahasiswa.',
      };
    }

    // 6. Validasi Status Akun: Akun non-aktif wajib ditolak!
    if (firestoreUser.isActive === false || firestoreUser.status === 'inactive') {
      if (authSuccess) {
        await signOut(auth).catch(() => {});
      }
      return {
        success: false,
        message: 'Akun mahasiswa Anda berstatus non-aktif. Silakan hubungi bagian kemahasiswaan UMM.',
      };
    }

    // 7. Seluruh 10 kriteria validasi berhasil -> Simpan data sesi aman ke SecureStore
    const studentUser: User = {
      id: firestoreUser.id,
      name: firestoreUser.name,
      email: firestoreUser.email,
      role: 'student',
      phone: firestoreUser.phone || '',
      nim: firestoreUser.nim || studentEmail.split('@')[0],
      faculty: firestoreUser.faculty || 'Universitas Muhammadiyah Malang',
      photo: firestoreUser.photo || DEFAULT_STUDENT.photo,
      status: 'active',
      isActive: true,
    };

    const token = createMockJwt(studentUser);
    await storeAccessToken(token);
    await secureStorage.setObject(SECURE_KEY_USER, studentUser);
    await secureStorage.setItem(SECURE_KEY_ROLE, 'student');

    setUser(studentUser);
    return { success: true };
  };

  /**
   * LOGIN SEBAGAI PETUGAS / ADMIN (BAGIAN 3 REQUIREMENT)
   * Ketentuan:
   * 1. Akun petugas terdaftar boleh masuk.
   * 2. Akun mahasiswa TIDAK BOLEH masuk melalui login petugas.
   * 3. Password benar.
   * 4. Akun tidak terdaftar harus DITOLAK.
   * 5. Akun tidak aktif harus ditolak.
   * 6. Profil tidak ditemukan di Firestore harus ditolak.
   * 7. Jika berhasil, arahkan ke Dashboard Petugas/Admin.
   * Domain email petugas/admin: @umm.ac.id
   * Pertahankan role Super Admin jika sudah tersedia.
   */
  const loginAsAdmin = async (
    email: string,
    pass: string
  ): Promise<{ success: boolean; message?: string }> => {
    const trimmedEmail = email.trim().toLowerCase();

    // 1. Validasi input
    if (!trimmedEmail) {
      return { success: false, message: 'Email resmi petugas (@umm.ac.id) wajib diisi.' };
    }
    if (!pass) {
      return { success: false, message: 'Password akun petugas/admin wajib diisi.' };
    }

    // 2. Validasi domain email petugas: Wajib @umm.ac.id dan BUKAN @webmail.umm.ac.id
    if (trimmedEmail.endsWith('@webmail.umm.ac.id')) {
      return {
        success: false,
        message: 'Akses ditolak: Akun mahasiswa tidak diizinkan masuk melalui Portal Petugas/Admin. Silakan gunakan Portal Login Mahasiswa.',
      };
    }
    if (!trimmedEmail.endsWith('@umm.ac.id')) {
      return {
        success: false,
        message: 'Domain email tidak valid. Petugas wajib menggunakan email resmi berakhiran @umm.ac.id.',
      };
    }

    // 3. Autentikasi Firebase Authentication
    let authUid: string | null = null;
    let authSuccess = false;

    try {
      const userCredential = await signInWithEmailAndPassword(auth, trimmedEmail, pass);
      if (userCredential && userCredential.user) {
        authUid = userCredential.user.uid;
        authSuccess = true;
      }
    } catch (authError: any) {
      const code = authError?.code;
      if (
        code === 'auth/wrong-password' ||
        code === 'auth/user-not-found' ||
        code === 'auth/invalid-credential' ||
        code === 'auth/invalid-email'
      ) {
        return {
          success: false,
          message: 'Email atau password akun petugas salah. Silakan coba lagi.',
        };
      }
      console.warn('[AuthContext] Firebase Auth Admin fallback ke database Firestore:', code);
    }

    // 4. Verifikasi dokumen profil petugas/admin di Firestore (Koleksi admins / users)
    const firestoreAdmin = await getAdminProfileByUidOrEmail({
      uid: authUid || undefined,
      email: trimmedEmail,
    });

    if (!firestoreAdmin) {
      if (authSuccess) {
        await signOut(auth).catch(() => {});
      }
      return {
        success: false,
        message: 'Akun petugas tidak terdaftar di database pengelola kampus UMM. Akses ditolak.',
      };
    }

    // Validasi password jika Firebase Auth tadi fallback
    if (!authSuccess) {
      if (!firestoreAdmin.password || firestoreAdmin.password !== pass) {
        return {
          success: false,
          message: 'Password akun petugas salah. Silakan coba lagi.',
        };
      }
    }

    // 5. Validasi Role: Akun mahasiswa dilarang masuk ke portal petugas!
    if (firestoreAdmin.role === 'student') {
      if (authSuccess) {
        await signOut(auth).catch(() => {});
      }
      return {
        success: false,
        message: 'Akses ditolak: Akun mahasiswa tidak memiliki wewenang administratif sebagai Petugas.',
      };
    }

    // 6. Validasi Status Akun: Akun non-aktif wajib ditolak!
    if (firestoreAdmin.isActive === false || firestoreAdmin.status === 'inactive') {
      if (authSuccess) {
        await signOut(auth).catch(() => {});
      }
      return {
        success: false,
        message: 'Akun petugas Anda berstatus non-aktif. Silakan hubungi Super Admin / Koordinator Keamanan UMM.',
      };
    }

    // 7. Pertahankan role Super Admin jika akun memiliki role 'super_admin'
    const effectiveRole: UserRole =
      firestoreAdmin.role === 'super_admin' ? 'super_admin' : 'admin';

    const adminUser: User = {
      id: firestoreAdmin.id,
      name: firestoreAdmin.name,
      email: firestoreAdmin.email,
      role: effectiveRole,
      phone: firestoreAdmin.phone || '',
      photo: firestoreAdmin.photo || DEFAULT_ADMIN.avatarUri,
      status: 'active',
      isActive: true,
    };

    const newAdminProfile: AdminProfile = {
      name: firestoreAdmin.name,
      email: firestoreAdmin.email,
      phone: firestoreAdmin.phone || '',
      avatarUri: firestoreAdmin.photo || DEFAULT_ADMIN.avatarUri,
      role:
        effectiveRole === 'super_admin'
          ? 'Super Admin'
          : 'Petugas Pengelola Lost & Found Kampus',
      officeLocation: firestoreAdmin.officeLocation || 'Posko Keamanan Pusat (Gedung Rektorat Lt. 1)',
      status: 'active',
      isActive: true,
    };

    const token = createMockJwt(adminUser);
    await storeAccessToken(token);
    await secureStorage.setObject(SECURE_KEY_USER, adminUser);
    await secureStorage.setItem(SECURE_KEY_ROLE, effectiveRole);
    await secureStorage.setObject(SECURE_KEY_ADMIN_PROFILE, newAdminProfile);

    setAdminProfile(newAdminProfile);
    setUser(adminUser);
    return { success: true };
  };

  /**
   * SATU LOGIN TERPADU MAHASISWA & PETUGAS/ADMIN (PERSYARATAN 8)
   * 
   * Alur:
   * 1. Autentikasi kredensial via Firebase Authentication.
   * 2. Ambil UID pengguna terautentikasi.
   * 3. Cari profil pengguna di database Firestore berdasarkan UID (atau email fallback).
   * 4. Tolak akun tanpa profil di Firestore atau berstatus non-aktif (panggil signOut).
   * 5. Baca role resmi dari Firestore (bukan dari input pengguna / bukan semata email).
   * 6. Simpan sesi aman ke SecureStore dan arahkan secara otomatis:
   *    - student -> /home
   *    - admin / super_admin -> /admin/dashboard
   */
  const login = async (
    emailOrNim: string,
    pass: string
  ): Promise<{ success: boolean; role?: UserRole; message?: string }> => {
    const trimmed = emailOrNim.trim().toLowerCase();

    // 1. Validasi input
    if (!trimmed) {
      return { success: false, message: 'Email kampus wajib diisi.' };
    }
    if (!pass) {
      return { success: false, message: 'Password wajib diisi.' };
    }

    // Normalisasi jika mahasiswa memasukkan NIM (hanya angka)
    let emailToAuth = trimmed;
    if (!trimmed.includes('@') && /^\d+$/.test(trimmed)) {
      emailToAuth = `${trimmed}@webmail.umm.ac.id`;
    }

    // 2. Autentikasi Kredensial via Firebase Authentication
    let authUid: string | null = null;
    let authSuccess = false;

    try {
      const userCredential = await signInWithEmailAndPassword(auth, emailToAuth, pass);
      if (userCredential && userCredential.user) {
        authUid = userCredential.user.uid;
        authSuccess = true;
      }
    } catch (authError: any) {
      const code = authError?.code;
      if (
        code === 'auth/wrong-password' ||
        code === 'auth/user-not-found' ||
        code === 'auth/invalid-credential' ||
        code === 'auth/invalid-email'
      ) {
        return {
          success: false,
          message: 'Email atau password salah. Silakan periksa kembali data Anda.',
        };
      }
      console.warn('[AuthContext] Firebase Auth fallback ke Firestore:', code);
    }

    // 3. Ambil Profil Pengguna dari Firestore berdasarkan UID atau Email resmi
    const profile = await getAnyUserProfileByUidOrEmail({
      uid: authUid || undefined,
      email: emailToAuth,
    });

    // 4. Tolak jika akun TIDAK memiliki profil di Firestore
    if (!profile) {
      if (authSuccess) {
        await signOut(auth).catch(() => {});
      }
      return {
        success: false,
        message: 'Akun Anda tidak memiliki profil yang terdaftar di database kampus UMM. Akses ditolak.',
      };
    }

    // 5. Validasi password jika autentikasi Firebase Auth belum terkonfigurasi di console (fallback)
    if (!authSuccess) {
      if (!profile.password || profile.password !== pass) {
        return {
          success: false,
          message: 'Email atau password salah. Silakan periksa kembali data Anda.',
        };
      }
    }

    // 6. Validasi status akun (Akun non-aktif wajib ditolak)
    if (profile.isActive === false || profile.status === 'inactive') {
      if (authSuccess) {
        await signOut(auth).catch(() => {});
      }
      return {
        success: false,
        message: 'Akun Anda berstatus non-aktif. Silakan hubungi pengelola kampus atau bagian kemahasiswaan UMM.',
      };
    }

    // 7. Evaluasi role resmi dari profil Firestore yang tepercaya
    const rawRole = String(profile.role || '').toLowerCase();
    let resolvedRole: UserRole | null = null;

    if (rawRole === 'student') {
      resolvedRole = 'student';
    } else if (rawRole.includes('super')) {
      resolvedRole = 'super_admin';
    } else if (rawRole === 'admin' || rawRole.includes('petugas') || rawRole.includes('keamanan')) {
      resolvedRole = 'admin';
    }

    if (!resolvedRole) {
      if (authSuccess) {
        await signOut(auth).catch(() => {});
      }
      return {
        success: false,
        message: 'Role akun tidak valid atau tidak dikenali oleh sistem. Akses ditolak.',
      };
    }

    // 8. Simpan Sesi dan Kembalikan Role Resmi
    if (resolvedRole === 'student') {
      const studentUser: User = {
        id: profile.id,
        name: profile.name,
        email: profile.email,
        role: 'student',
        phone: profile.phone || '',
        nim: profile.nim || emailToAuth.split('@')[0],
        faculty: profile.faculty || 'Universitas Muhammadiyah Malang',
        photo: profile.photo || DEFAULT_STUDENT.photo,
        status: 'active',
        isActive: true,
      };

      const token = createMockJwt(studentUser);
      await storeAccessToken(token);
      await secureStorage.setObject(SECURE_KEY_USER, studentUser);
      await secureStorage.setItem(SECURE_KEY_ROLE, 'student');

      setUser(studentUser);
      return { success: true, role: 'student' };
    } else {
      // Petugas atau Admin (termasuk Super Admin jika akun memiliki role super_admin)
      const effectiveRole: UserRole = resolvedRole;
      const adminUser: User = {
        id: profile.id,
        name: profile.name,
        email: profile.email,
        role: effectiveRole,
        phone: profile.phone || '',
        photo: profile.photo || DEFAULT_ADMIN.avatarUri,
        status: 'active',
        isActive: true,
      };

      const newAdminProfile: AdminProfile = {
        name: profile.name,
        email: profile.email,
        phone: profile.phone || '',
        avatarUri: profile.photo || DEFAULT_ADMIN.avatarUri,
        role:
          effectiveRole === 'super_admin'
            ? 'Super Admin'
            : 'Petugas Pengelola Lost & Found Kampus',
        officeLocation:
          profile.officeLocation || 'Posko Keamanan Pusat (Gedung Rektorat Lt. 1)',
        status: 'active',
        isActive: true,
      };

      const token = createMockJwt(adminUser);
      await storeAccessToken(token);
      await secureStorage.setObject(SECURE_KEY_USER, adminUser);
      await secureStorage.setItem(SECURE_KEY_ROLE, effectiveRole);
      await secureStorage.setObject(SECURE_KEY_ADMIN_PROFILE, newAdminProfile);

      setAdminProfile(newAdminProfile);
      setUser(adminUser);
      return { success: true, role: effectiveRole };
    }
  };

  /**
   * LOGOUT
   * Menghapus sesi Firebase Authentication dan SecureStore
   */
  const logout = async () => {
    try {
      await signOut(auth).catch(() => {});
      await removeAccessToken();
      await secureStorage.removeItem('auth_session_token');
      await secureStorage.removeItem(SECURE_KEY_USER);
      await secureStorage.removeItem(SECURE_KEY_ROLE);
      console.log('[AuthContext] Logout berhasil: Sesi Firebase & SecureStore dibersihkan.');
    } catch (e) {
      console.warn('Gagal menghapus token sesi:', e);
    } finally {
      setUser(null);
    }
  };

  /**
   * Update Profil Petugas / Admin
   */
  const updateProfile = async (
    updated: Partial<AdminProfile>
  ): Promise<{ success: boolean; message?: string }> => {
    try {
      const merged: AdminProfile = {
        ...adminProfile,
        ...updated,
      };

      if (!merged.name.trim()) {
        return { success: false, message: 'Nama petugas tidak boleh kosong.' };
      }
      if (!merged.email.trim() || !merged.email.includes('@')) {
        return { success: false, message: 'Email akun Gmail tidak valid.' };
      }

      setAdminProfile(merged);
      await secureStorage.setObject(SECURE_KEY_ADMIN_PROFILE, merged);

      if (user && user.role === 'admin') {
        const updatedUser: User = {
          ...user,
          name: merged.name,
          email: merged.email,
          phone: merged.phone,
          photo: merged.avatarUri,
        };
        setUser(updatedUser);
        await secureStorage.setObject(SECURE_KEY_USER, updatedUser);
      }

      return { success: true, message: 'Profil admin berhasil diperbarui!' };
    } catch {
      return { success: false, message: 'Gagal menyimpan perubahan profil admin.' };
    }
  };

  /**
   * Update Profil Mahasiswa
   */
  const updateStudentProfile = async (
    updated: Partial<User>
  ): Promise<{ success: boolean; message?: string }> => {
    try {
      if (!user) return { success: false, message: 'Belum ada user yang login.' };

      const merged: User = {
        ...user,
        ...updated,
      };

      setUser(merged);
      await secureStorage.setObject(SECURE_KEY_USER, merged);
      return { success: true, message: 'Profil mahasiswa berhasil diperbarui!' };
    } catch {
      return { success: false, message: 'Gagal menyimpan perubahan profil mahasiswa.' };
    }
  };

  const role = user ? user.role : null;
  const isAuthenticated = !!user;
  const isAdmin = role === 'admin' || role === 'super_admin';
  const isStudent = role === 'student';

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        isAuthenticated,
        isAdmin,
        isStudent,
        isAdminAuthenticated: isAdmin,
        adminProfile,
        isLoadingAuth,
        loginAsStudent,
        loginAsAdmin,
        login,
        logout,
        updateProfile,
        updateStudentProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
