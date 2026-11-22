export type UserRole = 'student' | 'admin' | 'super_admin';

export interface CampusLocation {
  latitude: number;
  longitude: number;
  address: string;
  campus?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone: string;
  photo?: string;
  nim?: string;
  faculty?: string;
  status?: 'active' | 'inactive';
  isActive?: boolean;
}

export type ItemType = 'lost' | 'found';

/**
 * STATUS BARANG HILANG (PRIORITAS 8):
 * 1. DALAM PENCARIAN
 * 2. BARANG DITEMUKAN
 * 3. SELESAI
 */
export type LostItemStatus = 'DALAM PENCARIAN' | 'BARANG DITEMUKAN' | 'SELESAI';

/**
 * STATUS VERIFIKASI LAPORAN HILANG (PRIORITAS 6 & 7):
 */
export type VerificationStatus = 'Menunggu Verifikasi' | 'Disetujui' | 'Ditolak';

/**
 * STATUS BARANG TEMUAN (PRIORITAS 8):
 * 1. TERSEDIA
 * 2. DIAMBIL / SELESAI
 */
export type FoundItemStatus = 'TERSEDIA' | 'DIAMBIL / SELESAI';

/**
 * ItemStatus menyeluruh yang kompatibel dengan UI dan badge
 */
export type ItemStatus =
  | 'DALAM PENCARIAN'
  | 'BARANG DITEMUKAN'
  | 'TERSEDIA'
  | 'DIAMBIL / SELESAI'
  | 'SELESAI'
  | 'Selesai'
  | 'Menunggu Verifikasi'
  | 'Disetujui'
  | 'Ditolak'
  | 'Barang Ditemukan'
  | 'Menunggu Klaim'
  | 'Proses Klaim'
  | 'Terverifikasi'
  | 'Sudah Diambil'
  | 'Dalam Pencarian'
  | 'Klaim Ditolak';

export interface CampusItem {
  id: string;
  title: string;
  category: string;
  type: ItemType;
  status: ItemStatus;
  statusColor: string;
  date: string;
  location: string;
  locationDetail?: CampusLocation;
  faculty: string;
  description: string;
  reward?: string | null;
  reporter: string;
  image: string;
  createdAt?: string;
  userId?: string;
  lostStatus?: LostItemStatus;
  foundStatus?: FoundItemStatus;
  verificationStatus?: VerificationStatus;
  foundItemId?: string;
  linkedLostItemId?: string;
  additionalInfo?: string;
  isResolved?: boolean;
}

export interface LostItem {
  id: string;
  userId: string;
  name: string;
  category: string;
  description: string;
  location: string;
  locationDetail?: CampusLocation;
  lostDate: string;
  photo?: string;
  status: LostItemStatus;
  verificationStatus: VerificationStatus;
  foundItemId?: string;
  additionalInfo?: string;
  faculty?: string;
  createdAt?: string;
}

export interface FoundItem {
  id: string;
  name: string;
  category: string;
  description: string;
  location: string;
  locationDetail?: CampusLocation;
  foundDate: string;
  photo?: string;
  status: FoundItemStatus;
  linkedLostItemId?: string;
  reporter?: string;
  faculty?: string;
  createdAt?: string;
}

export type ClaimStatus = 'Menunggu Verifikasi' | 'Terverifikasi' | 'Klaim Ditolak';

export interface ClaimRequest {
  id: string;
  itemId: string;
  itemTitle: string;
  itemCategory: string;
  itemImage?: string;
  userId?: string;
  studentName: string;
  studentNim: string;
  studentFaculty: string;
  studentPhone: string;
  proofDetails: string;
  idCardImage: string; // SENSITIVE: KTM/KTP URI
  status: ClaimStatus;
  adminNotes?: string;
  createdAt: string;
  verifiedAt?: string;
  verifiedBy?: string;
}

export interface AdminProfile {
  name: string;
  email: string;
  phone: string;
  password?: string;
  avatarUri?: string;
  role: string;
  officeLocation: string;
  status?: 'active' | 'inactive';
  isActive?: boolean;
}
