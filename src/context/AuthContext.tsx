import * as SecureStore from 'expo-secure-store';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';

import {
  apiService,
  ApiError,
  SECURE_KEY_ACCESS_TOKEN,
} from '@/services/api/apiService';
import {
  DEFAULT_ADMIN_DATA,
  getAdminByEmailFromFirestore,
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
  const loginAsStudent = async (
    identifier: string,
    pass: string,
    skipApi: boolean = false
  ): Promise<{ success: boolean; message?: string }> => {
    const trimmed = identifier.trim().toLowerCase();

    if (!trimmed) {
      return { success: false, message: 'NIM atau Email Kampus wajib diisi.' };
    }
    if (!pass) {
      return { success: false, message: 'Password akun mahasiswa wajib diisi.' };
    }
    if (pass.length < 4) {
      return { success: false, message: 'Password minimal 4 karakter.' };
    }

    // 1. Coba login ke REST API backend jika belum dicoba
    if (!skipApi) {
      try {
        const apiRes = await apiService.login(trimmed, pass);
        if (apiRes && apiRes.access_token) {
          const studentUser: User = {
            id: apiRes.user.id,
            name: apiRes.user.name,
            email: apiRes.user.email,
            role: 'student',
            phone: apiRes.user.phone || '081234567890',
            nim: apiRes.user.nim || (trimmed.includes('@') ? '2210511045' : trimmed),
            faculty: apiRes.user.faculty || 'Fakultas Ilmu Komputer',
            photo: apiRes.user.photo || DEFAULT_STUDENT.photo,
          };

          await storeAccessToken(apiRes.access_token);
          await secureStorage.setObject(SECURE_KEY_USER, studentUser);
          await secureStorage.setItem(SECURE_KEY_ROLE, 'student');

          setUser(studentUser);
          return { success: true };
        }
      } catch (err: any) {
        if (err instanceof ApiError && (err.statusCode === 401 || err.statusCode === 400)) {
          return { success: false, message: 'NIM/Email atau Password salah.' };
        }
      }
    }

    // 2. Fallback offline: buat token JWT lokal dan simpan ke SecureStore
    const studentUser: User = {
      id: trimmed.includes('@') ? `mhs-${trimmed.split('@')[0]}` : `mhs-${trimmed}`,
      name:
        trimmed === '2210511045' || trimmed.includes('nabila')
          ? DEFAULT_STUDENT.name
          : 'Mahasiswa Kampus',
      email: trimmed.includes('@') ? trimmed : `${trimmed}@mahasiswa.kampus.ac.id`,
      role: 'student',
      phone: '081234567890',
      nim: trimmed.includes('@') ? '2210511045' : trimmed,
      faculty: 'Fakultas Ilmu Komputer',
      photo: DEFAULT_STUDENT.photo,
    };

    const token = createMockJwt(studentUser);

    // TASK 01: Simpan access_token secara aman ke Expo SecureStore
    await storeAccessToken(token);
    await secureStorage.setObject(SECURE_KEY_USER, studentUser);
    await secureStorage.setItem(SECURE_KEY_ROLE, 'student');

    setUser(studentUser);
    return { success: true };
  };

  /**
   * LOGIN SEBAGAI ADMIN / PETUGAS (Task 01)
   */
  const loginAsAdmin = async (
    email: string,
    pass: string,
    skipApi: boolean = false
  ): Promise<{ success: boolean; message?: string }> => {
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedEmail) {
      return { success: false, message: 'Email akun Gmail petugas wajib diisi.' };
    }
    if (!trimmedEmail.includes('@') || !trimmedEmail.includes('.')) {
      return { success: false, message: 'Format email Gmail tidak valid.' };
    }
    if (!pass) {
      return { success: false, message: 'Password akun admin wajib diisi.' };
    }

    // 1. Coba login ke REST API backend jika belum dicoba
    if (!skipApi) {
      try {
        const apiRes = await apiService.login(trimmedEmail, pass);
        if (apiRes && apiRes.access_token) {
          const adminUser: User = {
            id: apiRes.user.id,
            name: apiRes.user.name,
            email: apiRes.user.email,
            role: 'admin',
            phone: apiRes.user.phone || '081298765432',
            photo: apiRes.user.photo || DEFAULT_ADMIN.avatarUri,
          };

          await storeAccessToken(apiRes.access_token);
          await secureStorage.setObject(SECURE_KEY_USER, adminUser);
          await secureStorage.setItem(SECURE_KEY_ROLE, 'admin');

          setUser(adminUser);
          return { success: true };
        }
      } catch (err: any) {
        if (err instanceof ApiError && (err.statusCode === 401 || err.statusCode === 400)) {
          return { success: false, message: 'Email atau password admin salah.' };
        }
      }
    }

    // 2. Fallback Firestore
    try {
      const adminData = await getAdminByEmailFromFirestore(trimmedEmail);

      if (!adminData) {
        return {
          success: false,
          message: 'Akun Gmail petugas tidak terdaftar. Periksa kembali email Anda.',
        };
      }

      if (adminData.password !== pass) {
        return {
          success: false,
          message: 'Password akun admin salah. Silakan coba lagi.',
        };
      }

      const adminUser: User = {
        id: 'admin-1',
        name: adminData.name,
        email: adminData.email,
        role: 'admin',
        phone: adminData.phone,
        photo: adminData.avatarUri,
      };

      const token = createMockJwt(adminUser);

      // TASK 01: Simpan access_token secara aman ke Expo SecureStore
      await storeAccessToken(token);
      await secureStorage.setObject(SECURE_KEY_USER, adminUser);
      await secureStorage.setItem(SECURE_KEY_ROLE, 'admin');

      setAdminProfile(adminData);
      setUser(adminUser);
      return { success: true };
    } catch (err) {
      console.error('Error login admin via Firestore fallback:', err);
      return { success: false, message: 'Gagal terhubung ke database autentikasi.' };
    }
  };

  /**
   * Login fleksibel dengan auto-deteksi role & REST API call (Task 01)
   */
  const login = async (
    emailOrNim: string,
    pass: string,
    preferredRole?: UserRole
  ): Promise<{ success: boolean; role?: UserRole; message?: string }> => {
    const trimmed = emailOrNim.trim().toLowerCase();

    // 1. Coba REST API login terlebih dahulu
    try {
      const res = await apiService.login(trimmed, pass);
      if (res && res.access_token && res.user) {
        const loggedUser: User = {
          id: res.user.id,
          name: res.user.name,
          email: res.user.email,
          role: res.user.role,
          phone: res.user.phone || '081234567890',
          nim: res.user.nim,
          faculty: res.user.faculty,
          photo: res.user.photo,
        };

        // Simpan access_token ke SecureStore
        await storeAccessToken(res.access_token);
        await secureStorage.setObject(SECURE_KEY_USER, loggedUser);
        await secureStorage.setItem(SECURE_KEY_ROLE, loggedUser.role);

        if (loggedUser.role === 'admin') {
          setAdminProfile((prev) => ({
            ...prev,
            name: loggedUser.name,
            email: loggedUser.email,
            phone: loggedUser.phone || prev.phone,
            avatarUri: loggedUser.photo || prev.avatarUri,
          }));
        }

        setUser(loggedUser);
        return { success: true, role: loggedUser.role };
      }
    } catch (err: any) {
      // Jika server secara eksplisit mengembalikan 401 atau 400 (password/email salah)
      if (err instanceof ApiError && (err.statusCode === 401 || err.statusCode === 400)) {
        return { success: false, message: 'Email/NIM atau password salah.' };
      }
    }

    // 2. Fallback routing jika server offline (skipApi = true agar tidak coba fetch ulang)
    if (preferredRole === 'admin') {
      const adminRes = await loginAsAdmin(emailOrNim, pass, true);
      return { ...adminRes, role: 'admin' };
    }

    const isEmailFormat = trimmed.includes('@') && trimmed.includes('.');
    const adminEmail = adminProfile.email.trim().toLowerCase();
    const isAdminAccount =
      trimmed === adminEmail ||
      trimmed === 'admin.kampus@gmail.com' ||
      trimmed.includes('admin') ||
      trimmed.includes('petugas');

    if (isEmailFormat && isAdminAccount) {
      const adminResult = await loginAsAdmin(emailOrNim, pass, true);
      if (adminResult.success) return { ...adminResult, role: 'admin' };
    }

    const studentResult = await loginAsStudent(emailOrNim, pass, true);
    return { ...studentResult, role: 'student' };
  };

  /**
   * LOGOUT (Task 03)
   * Menghapus access_token dari SecureStore:
   *   await SecureStore.deleteItemAsync('access_token');
   * Reset authentication state (user = null, isAuthenticated = false).
   */
  const logout = async () => {
    try {
      // TASK 03: Hapus access_token dari SecureStore
      await removeAccessToken();
      await secureStorage.removeItem('auth_session_token');
      await secureStorage.removeItem(SECURE_KEY_USER);
      await secureStorage.removeItem(SECURE_KEY_ROLE);
      console.log('[AuthContext] Logout berhasil: Token dihapus dari SecureStore.');
    } catch (e) {
      console.warn('Gagal menghapus token sesi:', e);
    } finally {
      // Reset state autentikasi
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
  const isAdmin = role === 'admin';
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
