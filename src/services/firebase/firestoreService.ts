import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  where,
  Unsubscribe,
} from 'firebase/firestore';

import { db } from '@/config/firebase';
import { AdminProfile, CampusItem, ClaimRequest, User, UserRole } from '@/types';

// Koleksi Firestore
const ITEMS_COLLECTION = 'items';
const CLAIMS_COLLECTION = 'claims';
const ADMINS_COLLECTION = 'admins';
const USERS_COLLECTION = 'users';

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
  name: 'Budi Santoso, S.Sos',
  email: 'petugas@umm.ac.id',
  password: 'admin123kampus',
  phone: '081298765432',
  avatarUri: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=400&auto=format&fit=crop',
  role: 'Petugas Pengelola Lost & Found Kampus',
  officeLocation: 'Posko Keamanan Pusat (Gedung Rektorat Lt. 1)',
};

// ─── ADMINS & USERS ───────────────────────────────────────────────────────────

export interface FirestoreAccountCheck {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
  nim?: string;
  faculty?: string;
  photo?: string;
  password?: string;
  status?: 'active' | 'inactive';
  isActive?: boolean;
  officeLocation?: string;
}

/**
 * Cari profil mahasiswa di Firestore (koleksi users) berdasarkan UID Auth atau Email.
 */
export async function getUserProfileByUidOrEmail(params: {
  uid?: string;
  email?: string;
}): Promise<FirestoreAccountCheck | null> {
  try {
    const { uid, email } = params;

    // 1. Cek langsung dengan doc(db, 'users', uid)
    if (uid) {
      const docRef = doc(db, USERS_COLLECTION, uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          name: data.name || 'Mahasiswa UMM',
          email: data.email,
          role: (data.role || 'student') as UserRole,
          phone: data.phone || '',
          nim: data.nim || '',
          faculty: data.faculty || '',
          photo: data.photo || data.avatarUri || '',
          password: data.password,
          status: data.status || (data.isActive === false ? 'inactive' : 'active'),
          isActive: data.isActive !== false && data.status !== 'inactive',
        };
      }

      // Cek field uid == uid
      const qUid = query(collection(db, USERS_COLLECTION), where('uid', '==', uid));
      const snapUid = await getDocs(qUid);
      if (!snapUid.empty) {
        const d = snapUid.docs[0];
        const data = d.data();
        return {
          id: d.id,
          name: data.name || 'Mahasiswa UMM',
          email: data.email,
          role: (data.role || 'student') as UserRole,
          phone: data.phone || '',
          nim: data.nim || '',
          faculty: data.faculty || '',
          photo: data.photo || data.avatarUri || '',
          password: data.password,
          status: data.status || (data.isActive === false ? 'inactive' : 'active'),
          isActive: data.isActive !== false && data.status !== 'inactive',
        };
      }
    }

    // 2. Cek berdasarkan normalized email
    if (email) {
      const normalized = email.trim().toLowerCase();
      const qEmail = query(
        collection(db, USERS_COLLECTION),
        where('email', '==', normalized)
      );
      const snapEmail = await getDocs(qEmail);
      if (!snapEmail.empty) {
        const d = snapEmail.docs[0];
        const data = d.data();
        return {
          id: d.id,
          name: data.name || 'Mahasiswa UMM',
          email: data.email,
          role: (data.role || 'student') as UserRole,
          phone: data.phone || '',
          nim: data.nim || '',
          faculty: data.faculty || '',
          photo: data.photo || data.avatarUri || '',
          password: data.password,
          status: data.status || (data.isActive === false ? 'inactive' : 'active'),
          isActive: data.isActive !== false && data.status !== 'inactive',
        };
      }
    }

    return null;
  } catch (error) {
    console.error('Error fetching user profile from Firestore:', error);
    return null;
  }
}

/**
 * Cari akun admin/petugas di Firestore (koleksi admins atau users dengan role admin/super_admin).
 */
export async function getAdminProfileByUidOrEmail(params: {
  uid?: string;
  email?: string;
}): Promise<FirestoreAccountCheck | null> {
  try {
    const { uid, email } = params;

    // 1. Cek di koleksi admins dengan doc(db, 'admins', uid)
    if (uid) {
      const docRef = doc(db, ADMINS_COLLECTION, uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        const roleStr = String(data.role || '').toLowerCase();
        const resolvedRole: UserRole = roleStr.includes('super') ? 'super_admin' : 'admin';
        return {
          id: docSnap.id,
          name: data.name || 'Petugas Kampus',
          email: data.email,
          role: resolvedRole,
          phone: data.phone || '',
          photo: data.avatarUri || data.photo || '',
          password: data.password,
          status: data.status || (data.isActive === false ? 'inactive' : 'active'),
          isActive: data.isActive !== false && data.status !== 'inactive',
          officeLocation: data.officeLocation || 'Posko Keamanan Pusat',
        };
      }

      // Cek field uid di admins
      const qUid = query(collection(db, ADMINS_COLLECTION), where('uid', '==', uid));
      const snapUid = await getDocs(qUid);
      if (!snapUid.empty) {
        const d = snapUid.docs[0];
        const data = d.data();
        const roleStr = String(data.role || '').toLowerCase();
        const resolvedRole: UserRole = roleStr.includes('super') ? 'super_admin' : 'admin';
        return {
          id: d.id,
          name: data.name || 'Petugas Kampus',
          email: data.email,
          role: resolvedRole,
          phone: data.phone || '',
          photo: data.avatarUri || data.photo || '',
          password: data.password,
          status: data.status || (data.isActive === false ? 'inactive' : 'active'),
          isActive: data.isActive !== false && data.status !== 'inactive',
          officeLocation: data.officeLocation || 'Posko Keamanan Pusat',
        };
      }
    }

    // 2. Cek di koleksi admins berdasarkan email
    if (email) {
      const normalized = email.trim().toLowerCase();
      const qEmail = query(
        collection(db, ADMINS_COLLECTION),
        where('email', '==', normalized)
      );
      const snapEmail = await getDocs(qEmail);
      if (!snapEmail.empty) {
        const d = snapEmail.docs[0];
        const data = d.data();
        const roleStr = String(data.role || '').toLowerCase();
        const resolvedRole: UserRole = roleStr.includes('super') ? 'super_admin' : 'admin';
        return {
          id: d.id,
          name: data.name || 'Petugas Kampus',
          email: data.email,
          role: resolvedRole,
          phone: data.phone || '',
          photo: data.avatarUri || data.photo || '',
          password: data.password,
          status: data.status || (data.isActive === false ? 'inactive' : 'active'),
          isActive: data.isActive !== false && data.status !== 'inactive',
          officeLocation: data.officeLocation || 'Posko Keamanan Pusat',
        };
      }

      // Cek juga di koleksi users jika disimpan dengan role 'admin' atau 'super_admin'
      const qUserAdmin = query(
        collection(db, USERS_COLLECTION),
        where('email', '==', normalized),
        where('role', 'in', ['admin', 'super_admin', 'Petugas Pengelola Lost & Found Kampus'])
      );
      const snapUserAdmin = await getDocs(qUserAdmin);
      if (!snapUserAdmin.empty) {
        const d = snapUserAdmin.docs[0];
        const data = d.data();
        const roleStr = String(data.role || '').toLowerCase();
        const resolvedRole: UserRole = roleStr.includes('super') ? 'super_admin' : 'admin';
        return {
          id: d.id,
          name: data.name || 'Petugas Kampus',
          email: data.email,
          role: resolvedRole,
          phone: data.phone || '',
          photo: data.photo || data.avatarUri || '',
          password: data.password,
          status: data.status || (data.isActive === false ? 'inactive' : 'active'),
          isActive: data.isActive !== false && data.status !== 'inactive',
          officeLocation: data.officeLocation || 'Posko Keamanan Pusat',
        };
      }
    }

    return null;
  } catch (error) {
    console.error('Error fetching admin profile from Firestore:', error);
    return null;
  }
}

/**
 * Cari profil akun di Firestore (baik koleksi admins maupun users).
 * Digunakan oleh Single Unified Login untuk mendeteksi profil dan role resmi secara otomatis.
 */
export async function getAnyUserProfileByUidOrEmail(params: {
  uid?: string;
  email?: string;
}): Promise<FirestoreAccountCheck | null> {
  try {
    // 1. Cek terlebih dahulu di koleksi admins
    const adminProfile = await getAdminProfileByUidOrEmail(params);
    if (adminProfile) return adminProfile;

    // 2. Cek di koleksi users (mahasiswa)
    const studentProfile = await getUserProfileByUidOrEmail(params);
    if (studentProfile) return studentProfile;

    return null;
  } catch (error) {
    console.error('Error fetching profile from Firestore in getAnyUserProfileByUidOrEmail:', error);
    return null;
  }
}

/**
 * Cari akun admin di Firestore berdasarkan email (Backwards-compatibility).
 */
export async function getAdminByEmailFromFirestore(email: string): Promise<AdminProfile | null> {
  const profile = await getAdminProfileByUidOrEmail({ email });
  if (!profile) return null;
  return {
    name: profile.name,
    email: profile.email,
    phone: profile.phone || '',
    password: profile.password,
    avatarUri: profile.photo || '',
    role: profile.role === 'super_admin' ? 'Super Admin' : 'Petugas Pengelola Lost & Found Kampus',
    officeLocation: profile.officeLocation || 'Posko Keamanan Pusat',
    status: profile.status,
    isActive: profile.isActive,
  };
}

/**
 * Cari profil mahasiswa di Firestore (koleksi users) (Backwards-compatibility).
 */
export async function getUserProfileFromFirestore(email: string): Promise<User | null> {
  const profile = await getUserProfileByUidOrEmail({ email });
  if (!profile) return null;
  return {
    id: profile.id,
    name: profile.name,
    email: profile.email,
    role: profile.role,
    phone: profile.phone || '',
    nim: profile.nim || '',
    faculty: profile.faculty || '',
    photo: profile.photo || '',
    status: profile.status,
    isActive: profile.isActive,
  };
}

/**
 * Simpan profil mahasiswa ke Firestore (koleksi users).
 */
export async function saveUserProfileToFirestore(user: User): Promise<void> {
  try {
    const ref = collection(db, USERS_COLLECTION);
    await addDoc(ref, {
      ...user,
      createdAt: new Date().toISOString(),
    });
  } catch (error) {
    console.warn('Gagal menyimpan profil mahasiswa ke Firestore:', error);
  }
}

/**
 * Memastikan minimal ada 1 akun admin default di Firestore (auto-seed jika kosong).
 */
export async function ensureDefaultAdminInFirestore(): Promise<AdminProfile> {
  const existing = await getAdminByEmailFromFirestore(DEFAULT_ADMIN_DATA.email);
  if (existing) return existing;

  const ref = collection(db, ADMINS_COLLECTION);
  await addDoc(ref, {
    ...DEFAULT_ADMIN_DATA,
    createdAt: new Date().toISOString(),
  });
  return DEFAULT_ADMIN_DATA;
}


// ─── ITEMS ────────────────────────────────────────────────────────────────────

/**
 * Tambahkan dokumen barang baru ke koleksi `items`.
 * Menggunakan addDoc agar Firestore auto-generate ID.
 */
export async function addItemToFirestore(
  itemData: Omit<CampusItem, 'id'>
): Promise<CampusItem> {
  const ref = collection(db, ITEMS_COLLECTION);

  // Filter out any undefined fields so Firestore addDoc never throws invalid data error
  const cleanData: Record<string, unknown> = {};
  Object.entries(itemData).forEach(([key, val]) => {
    if (val !== undefined) {
      cleanData[key] = val;
    }
  });

  const createdAt = new Date().toISOString();
  const docRef = await addDoc(ref, {
    ...cleanData,
    createdAt,
  });

  return { id: docRef.id, ...itemData, createdAt };
}

/**
 * Ambil semua barang dari Firestore (one-time fetch).
 */
export async function getAllItemsFromFirestore(): Promise<CampusItem[]> {
  const q = query(
    collection(db, ITEMS_COLLECTION),
    orderBy('createdAt', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<CampusItem, 'id'>) }));
}

/**
 * Perbarui field barang tertentu di Firestore.
 */
export async function updateItemInFirestore(
  itemId: string,
  updatedFields: Partial<CampusItem>
): Promise<void> {
  const ref = doc(db, ITEMS_COLLECTION, itemId);
  await updateDoc(ref, updatedFields as Record<string, unknown>);
}

/**
 * Hapus barang dari Firestore.
 */
export async function deleteItemFromFirestore(itemId: string): Promise<void> {
  const ref = doc(db, ITEMS_COLLECTION, itemId);
  await deleteDoc(ref);
}

/**
 * Subscribe realtime ke koleksi `items`.
 * Mengembalikan fungsi unsubscribe.
 */
export function subscribeToItems(
  callback: (items: CampusItem[]) => void
): Unsubscribe {
  const q = query(
    collection(db, ITEMS_COLLECTION),
    orderBy('createdAt', 'desc')
  );
  return onSnapshot(q, (snapshot) => {
    const items = snapshot.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<CampusItem, 'id'>),
    }));
    callback(items);
  });
}

// ─── CLAIMS ───────────────────────────────────────────────────────────────────

/**
 * Tambahkan klaim baru ke koleksi `claims`.
 */
export async function addClaimToFirestore(
  claimData: Omit<ClaimRequest, 'id'>
): Promise<ClaimRequest> {
  const ref = collection(db, CLAIMS_COLLECTION);

  const cleanData: Record<string, unknown> = {};
  Object.entries(claimData).forEach(([key, val]) => {
    if (val !== undefined) {
      cleanData[key] = val;
    }
  });

  const createdAt = new Date().toISOString();
  const docRef = await addDoc(ref, {
    ...cleanData,
    createdAt,
  });

  return { id: docRef.id, ...claimData };
}

/**
 * Ambil semua klaim dari Firestore (one-time fetch).
 */
export async function getAllClaimsFromFirestore(): Promise<ClaimRequest[]> {
  const q = query(
    collection(db, CLAIMS_COLLECTION),
    orderBy('createdAt', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ClaimRequest, 'id'>) }));
}

/**
 * Perbarui field klaim tertentu di Firestore.
 */
export async function updateClaimInFirestore(
  claimId: string,
  updatedFields: Partial<ClaimRequest>
): Promise<void> {
  const ref = doc(db, CLAIMS_COLLECTION, claimId);
  await updateDoc(ref, updatedFields as Record<string, unknown>);
}

/**
 * Subscribe realtime ke koleksi `claims`.
 */
export function subscribeToClaims(
  callback: (claims: ClaimRequest[]) => void
): Unsubscribe {
  const q = query(
    collection(db, CLAIMS_COLLECTION),
    orderBy('createdAt', 'desc')
  );
  return onSnapshot(q, (snapshot) => {
    const claims = snapshot.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<ClaimRequest, 'id'>),
    }));
    callback(claims);
  });
}
