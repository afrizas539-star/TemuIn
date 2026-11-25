import { Session } from '@supabase/supabase-js';
import React, { createContext, useContext, useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase';
import { apiService } from '@/services/api/apiService';
import { AdminProfile, User, UserRole } from '@/types';

/**
 * Validasi domain email sesuai kebijakan kampus:
 * - Mahasiswa: Harus berakhiran tepat @webmail.umm.ac.id
 * - Petugas: Harus berakhiran tepat @umm.ac.id (dan BUKAN @webmail.umm.ac.id)
 */
export function validateEmailDomain(email: string): {
  isValid: boolean;
  role: UserRole | null;
  errorMessage?: string;
} {
  const normalized = email.trim().toLowerCase();

  if (!normalized || !normalized.includes('@')) {
    return {
      isValid: false,
      role: null,
      errorMessage: 'Format email tidak valid. Masukkan email resmi kampus.',
    };
  }

  // 1. Mahasiswa: Harus berakhiran tepat @webmail.umm.ac.id
  if (normalized.endsWith('@webmail.umm.ac.id')) {
    const prefix = normalized.split('@webmail.umm.ac.id')[0];
    if (!prefix || prefix.includes('@')) {
      return {
        isValid: false,
        role: null,
        errorMessage: 'Alamat email mahasiswa tidak valid.',
      };
    }
    return {
      isValid: true,
      role: 'student',
    };
  }

  // 2. Petugas: Harus berakhiran tepat @umm.ac.id dan bukan @webmail.umm.ac.id
  if (normalized.endsWith('@umm.ac.id')) {
    const prefix = normalized.split('@umm.ac.id')[0];
    if (!prefix || prefix.includes('@')) {
      return {
        isValid: false,
        role: null,
        errorMessage: 'Alamat email petugas tidak valid.',
      };
    }
    return {
      isValid: true,
      role: 'admin',
    };
  }

  // 3. Domain di luar UMM ditolak
  return {
    isValid: false,
    role: null,
    errorMessage:
      'Domain email tidak diizinkan. Gunakan @webmail.umm.ac.id untuk mahasiswa atau @umm.ac.id untuk petugas.',
  };
}

export const DEFAULT_ADMIN_DATA: AdminProfile = {
  name: 'Petugas Pengelola',
  email: 'petugas@umm.ac.id',
  phone: '081298765432',
  avatarUri:
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=400&auto=format&fit=crop',
  role: 'Petugas Pengelola Lost & Found Kampus',
  officeLocation: 'Posko Keamanan Pusat (Gedung Rektorat Lt. 1)',
};

export interface AuthContextType {
  session: Session | null;
  user: User | null;
  role: UserRole | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isStudent: boolean;
  isAdminAuthenticated: boolean; // Backwards-compatible
  adminProfile: AdminProfile;
  isLoadingAuth: boolean;
  isSubmitting: boolean;
  signUp: (
    email: string,
    pass: string,
    name: string,
    nim?: string,
    phone?: string,
    faculty?: string
  ) => Promise<{ success: boolean; message?: string }>;
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

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [adminProfile, setAdminProfile] = useState<AdminProfile>(DEFAULT_ADMIN_DATA);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Helper untuk memformat input NIM menjadi email mahasiswa UMM
  const normalizeIdentifier = (input: string): string => {
    const trimmed = input.trim();
    if (/^\d+$/.test(trimmed)) {
      return `${trimmed}@webmail.umm.ac.id`.toLowerCase();
    }
    return trimmed.toLowerCase();
  };

  // Efek 1: Inisialisasi session dan listener auth realtime (sinkron tanpa await query DB di callback)
  useEffect(() => {
    let mounted = true;

    // Ambil sesi tersimpan pertama kali
    supabase.auth
      .getSession()
      .then(({ data: { session: initialSession }, error }) => {
        if (error) {
          console.warn('[AuthContext] Gagal mendapatkan session awal:', error.message);
        }
        if (mounted) {
          setSession(initialSession);
          if (initialSession?.access_token) {
            apiService.saveToken(initialSession.access_token).catch(() => {});
          }
        }
      })
      .catch((err) => {
        console.warn('[AuthContext] Error getSession:', err);
      });

    // Subscribe perubahan auth Supabase
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      if (mounted) {
        setSession(currentSession);
        if (currentSession?.access_token) {
          apiService.saveToken(currentSession.access_token).catch(() => {});
        } else {
          apiService.removeToken().catch(() => {});
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Efek 2: Sinkronisasi data profil dari tabel `profiles` saat session berubah
  useEffect(() => {
    let isCurrent = true;

    async function loadUserProfile() {
      if (!session?.user) {
        setUser(null);
        setRole(null);
        setAdminProfile(DEFAULT_ADMIN_DATA);
        setIsLoadingAuth(false);
        return;
      }

      try {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (error || !profile) {
          console.warn('[AuthContext] Profil pengguna tidak ditemukan di database:', error?.message);
          await supabase.auth.signOut();
          if (isCurrent) {
            setUser(null);
            setRole(null);
            setIsLoadingAuth(false);
          }
          return;
        }

        if (!profile.is_active) {
          console.warn('[AuthContext] Akun pengguna nonaktif.');
          await supabase.auth.signOut();
          if (isCurrent) {
            setUser(null);
            setRole(null);
            setIsLoadingAuth(false);
          }
          return;
        }

        if (!isCurrent) return;

        const currentRole = profile.role as UserRole;
        setRole(currentRole);

        const mappedUser: User = {
          id: profile.id,
          name: profile.name,
          email: profile.email,
          role: currentRole,
          phone: profile.phone || '',
          nim: profile.nim || undefined,
          faculty: profile.faculty || undefined,
          photo: profile.photo || undefined,
          isActive: profile.is_active,
        };
        setUser(mappedUser);

        if (currentRole === 'admin' || currentRole === 'super_admin') {
          setAdminProfile({
            name: profile.name,
            email: profile.email,
            phone: profile.phone || '',
            avatarUri: profile.photo || DEFAULT_ADMIN_DATA.avatarUri,
            role:
              currentRole === 'super_admin'
                ? 'Super Admin / Kepala Keamanan'
                : 'Petugas Pengelola Lost & Found Kampus',
            officeLocation:
              profile.office_location || DEFAULT_ADMIN_DATA.officeLocation,
            isActive: profile.is_active,
          });
        }
      } catch (err) {
        console.error('[AuthContext] Gagal memuat profil:', err);
      } finally {
        if (isCurrent) {
          setIsLoadingAuth(false);
        }
      }
    }

    loadUserProfile();

    return () => {
      isCurrent = false;
    };
  }, [session]);

  // Alur Sign Up Mahasiswa
  const signUp = async (
    email: string,
    pass: string,
    name: string,
    nim?: string,
    phone?: string,
    faculty?: string
  ): Promise<{ success: boolean; message?: string }> => {
    const normalizedEmail = normalizeIdentifier(email);
    const domainCheck = validateEmailDomain(normalizedEmail);

    if (!domainCheck.isValid || domainCheck.role !== 'student') {
      return {
        success: false,
        message:
          domainCheck.errorMessage ||
          'Pendaftaran akun hanya diperuntukkan bagi mahasiswa aktif dengan email @webmail.umm.ac.id.',
      };
    }

    if (pass.length < 6) {
      return {
        success: false,
        message: 'Kata sandi minimal 6 karakter demi keamanan akun Anda.',
      };
    }

    try {
      setIsSubmitting(true);
      const trimmedNim = nim?.trim();
      const { data, error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password: pass,
        options: {
          data: {
            name: name.trim(),
            ...(trimmedNim ? { nim: trimmedNim } : {}),
            phone: phone?.trim() || '',
            faculty: faculty?.trim() || '',
          },
        },
      });

      if (error) {
        return {
          success: false,
          message:
            error.message.includes('already registered') || error.message.includes('unique')
              ? 'Email atau akun ini telah terdaftar. Silakan langsung masuk.'
              : 'Gagal melakukan pendaftaran. Silakan coba kembali sesaat lagi.',
        };
      }

      if (data.session) {
        setSession(data.session);
      }

      return {
        success: true,
        message: 'Pendaftaran akun berhasil.',
      };
    } catch (err: any) {
      return {
        success: false,
        message: err?.message || 'Terjadi kesalahan sistem saat pendaftaran akun.',
      };
    } finally {
      setIsSubmitting(false);
    }
  };

  // Alur Login Global (Mendukung input email atau NIM)
  const login = async (
    emailOrNim: string,
    pass: string,
    _preferredRole?: UserRole
  ): Promise<{ success: boolean; role?: UserRole; message?: string }> => {
    const email = normalizeIdentifier(emailOrNim);

    if (!email || !pass) {
      return {
        success: false,
        message: 'Email/NIM dan kata sandi wajib diisi.',
      };
    }

    try {
      setIsSubmitting(true);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: pass,
      });

      if (error || !data.user) {
        return {
          success: false,
          message: 'Email atau kata sandi yang Anda masukkan tidak sesuai.',
        };
      }

      // Ambil data profil untuk verifikasi status aktif dan role
      const { data: profile, error: profileErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();

      if (profileErr || !profile) {
        await supabase.auth.signOut();
        return {
          success: false,
          message: 'Data profil akun tidak ditemukan di sistem kampus.',
        };
      }

      if (!profile.is_active) {
        await supabase.auth.signOut();
        return {
          success: false,
          message: 'Akun Anda dinonaktifkan. Silakan hubungi bagian administrasi kampus.',
        };
      }

      const activeRole = profile.role as UserRole;
      setSession(data.session);
      setRole(activeRole);

      return {
        success: true,
        role: activeRole,
      };
    } catch (err: any) {
      return {
        success: false,
        message: err?.message || 'Gagal masuk. Silakan periksa koneksi internet Anda.',
      };
    } finally {
      setIsSubmitting(false);
    }
  };

  // Login khusus mahasiswa
  const loginAsStudent = async (
    identifier: string,
    pass: string
  ): Promise<{ success: boolean; message?: string }> => {
    const res = await login(identifier, pass, 'student');
    if (!res.success) {
      return { success: false, message: res.message };
    }
    if (res.role !== 'student') {
      await supabase.auth.signOut();
      return {
        success: false,
        message: 'Akses ditolak: Akun Anda bukan akun mahasiswa.',
      };
    }
    return { success: true };
  };

  // Login khusus admin/petugas
  const loginAsAdmin = async (
    email: string,
    pass: string
  ): Promise<{ success: boolean; message?: string }> => {
    const normalized = email.trim().toLowerCase();
    if (!normalized.endsWith('@umm.ac.id') || normalized.endsWith('@webmail.umm.ac.id')) {
      return {
        success: false,
        message: 'Login petugas hanya diizinkan untuk email dinas kampus (@umm.ac.id).',
      };
    }

    const res = await login(normalized, pass, 'admin');
    if (!res.success) {
      return { success: false, message: res.message };
    }
    if (res.role !== 'admin' && res.role !== 'super_admin') {
      await supabase.auth.signOut();
      return {
        success: false,
        message: 'Akses ditolak: Akun Anda tidak memiliki wewenang petugas.',
      };
    }
    return { success: true };
  };

  // Logout
  const logout = async (): Promise<void> => {
    try {
      setIsLoadingAuth(true);
      await supabase.auth.signOut();
    } catch (err) {
      console.warn('[AuthContext] Error saat signOut:', err);
    } finally {
      setSession(null);
      setUser(null);
      setRole(null);
      setAdminProfile(DEFAULT_ADMIN_DATA);
      setIsLoadingAuth(false);
    }
  };

  // Update profil admin
  const updateProfile = async (
    updated: Partial<AdminProfile>
  ): Promise<{ success: boolean; message?: string }> => {
    if (!session?.user) {
      return { success: false, message: 'Sesi login tidak aktif.' };
    }

    try {
      const updateData: any = {};
      if (updated.name) updateData.name = updated.name.trim();
      if (updated.phone) updateData.phone = updated.phone.trim();
      if (updated.officeLocation) updateData.office_location = updated.officeLocation.trim();
      if (updated.avatarUri) updateData.photo = updated.avatarUri;

      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', session.user.id);

      if (error) {
        return { success: false, message: 'Gagal memperbarui profil di database.' };
      }

      setAdminProfile((prev) => ({ ...prev, ...updated }));
      return { success: true, message: 'Profil petugas berhasil diperbarui.' };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Terjadi kesalahan sistem.' };
    }
  };

  // Update profil mahasiswa
  const updateStudentProfile = async (
    updated: Partial<User>
  ): Promise<{ success: boolean; message?: string }> => {
    if (!session?.user) {
      return { success: false, message: 'Sesi login tidak aktif.' };
    }

    try {
      const updateData: any = {};
      if (updated.name) updateData.name = updated.name.trim();
      if (updated.phone) updateData.phone = updated.phone.trim();
      if (updated.nim) updateData.nim = updated.nim.trim();
      if (updated.faculty) updateData.faculty = updated.faculty.trim();
      if (updated.photo) updateData.photo = updated.photo;

      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', session.user.id);

      if (error) {
        return { success: false, message: 'Gagal memperbarui profil mahasiswa.' };
      }

      setUser((prev) => (prev ? { ...prev, ...updated } : null));
      return { success: true, message: 'Profil mahasiswa berhasil diperbarui.' };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Terjadi kesalahan sistem.' };
    }
  };

  const isAuthenticated = !!session?.user && !!user;
  const isAdmin = role === 'admin' || role === 'super_admin';
  const isStudent = role === 'student';
  const isAdminAuthenticated = isAuthenticated && isAdmin;

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        role,
        isAuthenticated,
        isAdmin,
        isStudent,
        isAdminAuthenticated,
        adminProfile,
        isLoadingAuth,
        isSubmitting,
        signUp,
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

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth harus digunakan di dalam AuthProvider');
  }
  return context;
};
