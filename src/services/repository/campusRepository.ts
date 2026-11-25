import { INITIAL_CAMPUS_ITEMS, STATUS_COLORS } from '@/constants/initialData';
import { supabase } from '@/lib/supabase';
import {
  addClaimToDatabase,
  addItemToDatabase,
  deleteItemFromDatabase,
  getAllClaimsFromDatabase,
  getAllItemsFromDatabase,
  subscribeToClaims,
  subscribeToItems,
  updateClaimInDatabase,
  updateItemInDatabase,
} from '@/services/supabase/dataService';
import {
  CampusItem,
  CampusLocation,
  ClaimRequest,
  ClaimStatus,
  FoundItemStatus,
  ItemStatus,
  LostItemStatus,
  User,
  UserRole,
  VerificationStatus,
} from '@/types';

/**
 * CampusRepository â€” Supabase Edition
 *
 * Semua operasi data barang (items) dan klaim (claims) diarahkan
 * ke Supabase Database dengan subscription realtime.
 */

// Helper terpusat untuk mendapatkan status auth dan role aktif dari Supabase
async function getActiveAuth(): Promise<{ user: User | null; role: UserRole | null; isAdmin: boolean }> {
  try {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) {
      return { user: null, role: null, isAdmin: false };
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authUser.id)
      .single();

    if (!profile) {
      return { user: null, role: null, isAdmin: false };
    }

    const role = profile.role as UserRole;
    const user: User = {
      id: profile.id,
      name: profile.name,
      email: profile.email,
      role,
      phone: profile.phone || '',
      nim: profile.nim || undefined,
      faculty: profile.faculty || undefined,
      photo: profile.photo || undefined,
      isActive: profile.is_active,
    };

    return {
      user,
      role,
      isAdmin: role === 'admin' || role === 'super_admin',
    };
  } catch (err) {
    console.warn('[CampusRepository] Gagal mengambil active auth:', err);
    return { user: null, role: null, isAdmin: false };
  }
}

// State lokal (cache) yang diperbarui via realtime listener
let _items: CampusItem[] = [...INITIAL_CAMPUS_ITEMS];
let _claims: ClaimRequest[] = [];
let _listeners: ((state: { items: CampusItem[]; claims: ClaimRequest[] }) => void)[] = [];

function _notifyListeners() {
  const state = { items: _items, claims: _claims };
  _listeners.forEach((fn) => {
    try {
      fn(state);
    } catch (err) {
      console.warn('[CampusRepository] Listener error:', err);
    }
  });
}

// Inisialisasi realtime listener ke Supabase
let _unsubItems: (() => void) | null = null;
let _unsubClaims: (() => void) | null = null;

function _ensureListeners() {
  if (_unsubItems) return; // sudah berjalan

  _unsubItems = subscribeToItems((items) => {
    _items = items;
    _notifyListeners();
  });

  _unsubClaims = subscribeToClaims((claims) => {
    _claims = claims;
    _notifyListeners();
  });
}

class CampusRepository {
  constructor() {
    _ensureListeners();
  }

  // â”€â”€â”€ READ â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  async getAllItems(): Promise<CampusItem[]> {
    if (_items.length > 0) return _items;
    try {
      const fsItems = await getAllItemsFromDatabase();
      if (fsItems && fsItems.length > 0) {
        _items = fsItems;
      }
    } catch (e) {
      console.warn('[CampusRepository] Fallback items cache:', e);
    }
    return _items;
  }

  async getPublicCatalog(): Promise<CampusItem[]> {
    const all = await this.getAllItems();
    return all.filter((item) => {
      if (item.type === 'found') return true;
      return item.verificationStatus === 'Disetujui' || !item.verificationStatus;
    });
  }

  async getLostReports(): Promise<CampusItem[]> {
    const all = await this.getAllItems();
    return all.filter((item) => item.type === 'lost');
  }

  async getStudentLostReports(userId: string): Promise<CampusItem[]> {
    const all = await this.getAllItems();
    return all.filter((item) => item.type === 'lost' && item.userId === userId);
  }

  // â”€â”€â”€ BARANG HILANG (LAPORAN MAHASISWA) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  /**
   * FITUR MAHASISWA: Lapor Barang Hilang (Prioritas 6)
   * Status awal: 'Menunggu Verifikasi'
   * Status barang: 'DALAM PENCARIAN'
   * Disimpan ke Supabase koleksi `items`.
   */
  async reportLostItem(data: {
    title: string;
    category: string;
    description: string;
    location: string;
    locationDetail?: CampusLocation;
    date: string;
    image?: string;
    additionalInfo?: string;
    userId: string;
    reporter: string;
    faculty?: string;
  }): Promise<CampusItem> {
    // Validasi gambar: jangan pernah menyimpan URI lokal file:// ke Supabase
    let finalImage = data.image?.trim();
    if (!finalImage || finalImage.startsWith('file://') || finalImage.startsWith('content://')) {
      finalImage = 'https://images.unsplash.com/photo-1594980596870-8aa52a78d8cd?q=80&w=600&auto=format&fit=crop';
    }

    const itemData: Omit<CampusItem, 'id'> = {
      title: data.title.trim(),
      category: data.category,
      type: 'lost',
      status: 'DALAM PENCARIAN',
      lostStatus: 'DALAM PENCARIAN',
      verificationStatus: 'Menunggu Verifikasi',
      statusColor: STATUS_COLORS['DALAM PENCARIAN']?.text || '#B91C1C',
      date: data.date.trim() || 'Hari ini',
      location: data.location.trim(),
      locationDetail: data.locationDetail,
      faculty: data.faculty || 'Semua Fakultas',
      description: data.description.trim(),
      additionalInfo: data.additionalInfo?.trim() || '',
      reporter: data.reporter.trim(),
      userId: data.userId,
      image: finalImage,
      reward: null,
      createdAt: new Date().toISOString(),
    };

    // addDoc ke Supabase â€” ID digenerate otomatis
    const newItem = await addItemToDatabase(itemData);
    return newItem;
  }

  // â”€â”€â”€ VERIFIKASI LAPORAN (ADMIN) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  /**
   * VERIFIKASI LAPORAN KEHILANGAN OLEH ADMIN (Prioritas 7)
   */
  async verifyLostReport(
    itemId: string,
    approved: boolean,
    adminNotes?: string
  ): Promise<{ success: boolean; message: string }> {
    const newVerificationStatus: VerificationStatus = approved ? 'Disetujui' : 'Ditolak';
    const newStatus: ItemStatus = approved ? 'DALAM PENCARIAN' : ('Ditolak' as ItemStatus);

    const target = _items.find((i) => i.id === itemId);
    if (!target) {
      return { success: false, message: 'Laporan barang hilang tidak ditemukan.' };
    }

    const updatedFields: Partial<CampusItem> = {
      verificationStatus: newVerificationStatus,
      status: newStatus,
      statusColor: approved
        ? STATUS_COLORS['DALAM PENCARIAN'].text
        : STATUS_COLORS['Ditolak'].text,
    };

    if (adminNotes) {
      updatedFields.additionalInfo = target.additionalInfo
        ? `${target.additionalInfo} | Catatan Admin: ${adminNotes}`
        : `Catatan Admin: ${adminNotes}`;
    }

    await updateItemInDatabase(itemId, updatedFields);
    return {
      success: true,
      message: approved
        ? 'Laporan kehilangan berhasil diverifikasi dan dipublikasikan ke katalog!'
        : 'Laporan kehilangan telah ditolak.',
    };
  }

  // â”€â”€â”€ BARANG TEMUAN (INPUT ADMIN/PETUGAS) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  /**
   * INPUT BARANG TEMUAN OLEH ADMIN/PETUGAS (Prioritas 8 & 14)
   * Status: 'TERSEDIA'
   * Disimpan ke Supabase koleksi `items`.
   */
  async addFoundItem(data: {
    title: string;
    category: string;
    description: string;
    location: string;
    locationDetail?: CampusLocation;
    date: string;
    image: string;
    reporter: string;
    faculty?: string;
  }): Promise<CampusItem> {
    // Validasi wewenang: Mahasiswa dilarang menambahkan barang temuan
    const authState = await getActiveAuth();
    if (!authState.isAdmin) {
      throw new Error('Akses ditolak: Hanya Petugas/Admin resmi yang berwenang menambahkan data barang temuan.');
    }

    let finalImage = data.image?.trim();
    if (!finalImage || finalImage.startsWith('file://') || finalImage.startsWith('content://')) {
      finalImage = 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?q=80&w=600&auto=format&fit=crop';
    }

    const itemData: Omit<CampusItem, 'id'> = {
      title: data.title.trim(),
      category: data.category,
      type: 'found',
      status: 'TERSEDIA',
      foundStatus: 'TERSEDIA',
      statusColor: STATUS_COLORS['TERSEDIA']?.text || '#15803D',
      date: data.date.trim() || 'Hari ini',
      location: data.location.trim(),
      locationDetail: data.locationDetail,
      faculty: data.faculty || 'Semua Fakultas',
      description: data.description.trim(),
      reporter: data.reporter.trim(),
      image: finalImage,
      reward: null,
      createdAt: new Date().toISOString(),
    };

    // addDoc ke Supabase â€” ID digenerate otomatis
    const newItem = await addItemToDatabase(itemData);
    return newItem;
  }

  // â”€â”€â”€ HUBUNGKAN BARANG â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  /**
   * HUBUNGKAN BARANG HILANG DENGAN BARANG TEMUAN (Prioritas 9 & 11)
   */
  async linkLostWithFound(
    lostItemId: string,
    foundItemId: string
  ): Promise<{ success: boolean; message: string }> {
    const lostItem = _items.find((i) => i.id === lostItemId);
    const foundItem = _items.find((i) => i.id === foundItemId);

    if (!lostItem || !foundItem) {
      return { success: false, message: 'Data barang hilang atau temuan tidak ditemukan.' };
    }

    await updateItemInDatabase(lostItemId, {
      status: 'BARANG DITEMUKAN' as ItemStatus,
      lostStatus: 'BARANG DITEMUKAN' as LostItemStatus,
      statusColor: STATUS_COLORS['BARANG DITEMUKAN'].text,
      foundItemId: foundItemId,
    });

    await updateItemInDatabase(foundItemId, {
      linkedLostItemId: lostItemId,
    });

    return {
      success: true,
      message: `Berhasil menghubungkan! Laporan "${lostItem.title}" kini berstatus BARANG DITEMUKAN.`,
    };
  }

  // â”€â”€â”€ UPDATE STATUS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  async updateItemStatus(itemId: string, newStatus: ItemStatus): Promise<void> {
    const item = _items.find((i) => i.id === itemId);
    const authState = await getActiveAuth();
    const isAdmin = authState.isAdmin;

    // Mahasiswa TIDAK BOLEH mengubah status barang temuan
    if (item?.type === 'found' && !isAdmin) {
      throw new Error('Akses ditolak: Mahasiswa tidak memiliki wewenang mengubah status barang temuan.');
    }

    const updatedFields: Partial<CampusItem> = {
      status: newStatus,
      statusColor: STATUS_COLORS[newStatus]?.text || '#334155',
    };

    if (item) {
      if (item.type === 'lost') {
        if (
          newStatus === 'DALAM PENCARIAN' ||
          newStatus === 'BARANG DITEMUKAN' ||
          newStatus === 'SELESAI'
        ) {
          updatedFields.lostStatus = newStatus as LostItemStatus;
        }
      } else {
        if (
          newStatus === 'TERSEDIA' ||
          newStatus === 'DIAMBIL / SELESAI' ||
          newStatus === 'SELESAI'
        ) {
          updatedFields.foundStatus = (
            newStatus === 'SELESAI' ? 'DIAMBIL / SELESAI' : newStatus
          ) as FoundItemStatus;
        }
      }
    }

    await updateItemInDatabase(itemId, updatedFields);
  }

  async updateItem(itemId: string, updatedFields: Partial<CampusItem>): Promise<void> {
    const item = _items.find((i) => i.id === itemId);
    const authState = await getActiveAuth();
    const isAdmin = authState.isAdmin;

    // Mahasiswa TIDAK BOLEH mengedit data barang temuan
    if (item?.type === 'found' && !isAdmin) {
      throw new Error('Akses ditolak: Mahasiswa tidak diizinkan mengubah informasi barang temuan.');
    }

    // Pastikan jika ada gambar baru, bukan merupakan file:// atau content:// lokal tanpa diunggah terlebih dahulu
    if (updatedFields.image && (updatedFields.image.startsWith('file://') || updatedFields.image.startsWith('content://'))) {
      throw new Error('Format gambar tidak valid. Gambar harus diunggah terlebih dahulu.');
    }

    const extra: Partial<CampusItem> = {};
    if (updatedFields.status) {
      extra.statusColor = STATUS_COLORS[updatedFields.status]?.text || '#334155';
    }
    await updateItemInDatabase(itemId, { ...updatedFields, ...extra });
  }

  async deleteItem(itemId: string): Promise<void> {
    const item = _items.find((i) => i.id === itemId);
    const authState = await getActiveAuth();
    const isAdmin = authState.isAdmin;
    const activeUser = authState.user;

    // Mahasiswa TIDAK BOLEH menghapus barang temuan
    if (item?.type === 'found' && !isAdmin) {
      throw new Error('Akses ditolak: Mahasiswa tidak diizinkan menghapus data barang temuan.');
    }

    // Jika barang hilang, hanya admin atau pemilik laporan yang boleh menghapus
    if (item?.type === 'lost' && !isAdmin && item.userId !== activeUser?.id) {
      throw new Error('Akses ditolak: Anda hanya dapat menghapus laporan kehilangan milik Anda sendiri.');
    }

    await deleteItemFromDatabase(itemId);
  }

  // â”€â”€â”€ KLAIM â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  /**
   * PROSES KLAIM OLEH MAHASISWA (Prioritas 10 & 12)
   * Disimpan ke Supabase koleksi `claims`.
   */
  async submitClaim(claimData: {
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
    idCardImage: string;
  }): Promise<{ success: boolean; claimId?: string; message?: string }> {
    try {
      const newClaimData: Omit<ClaimRequest, 'id'> = {
        ...claimData,
        status: 'Menunggu Verifikasi',
        createdAt:
          'Hari ini â€¢ ' +
          new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) +
          ' WIB',
      };

      const newClaim = await addClaimToDatabase(newClaimData);

      // Update status item menjadi 'Proses Klaim'
      await this.updateItemStatus(claimData.itemId, 'Proses Klaim');

      return {
        success: true,
        claimId: newClaim.id,
        message:
          'Pengajuan klaim berhasil dikirim! Petugas keamanan akan memverifikasi dokumen KTM/KTP Anda.',
      };
    } catch (err) {
      console.error('[CampusRepository] submitClaim error:', err);
      return { success: false, message: 'Gagal mengajukan klaim. Silakan coba kembali.' };
    }
  }

  /**
   * VERIFIKASI KLAIM OLEH PETUGAS/ADMIN (Prioritas 10 & 19)
   */
  async verifyClaim(
    claimId: string,
    approved: boolean,
    adminNotes?: string,
    adminName?: string
  ): Promise<{ success: boolean; message?: string }> {
    try {
      const targetClaim = _claims.find((c) => c.id === claimId);
      if (!targetClaim) {
        return { success: false, message: 'Klaim tidak ditemukan.' };
      }

      const newClaimStatus: ClaimStatus = approved ? 'Terverifikasi' : 'Klaim Ditolak';
      await updateClaimInDatabase(claimId, {
        status: newClaimStatus,
        adminNotes:
          adminNotes ||
          (approved
            ? 'Klaim disetujui. Identitas KTM/KTP cocok.'
            : 'Bukti identitas atau deskripsi barang tidak cocok.'),
        verifiedAt:
          new Date().toLocaleDateString('id-ID') +
          ' â€¢ ' +
          new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) +
          ' WIB',
        verifiedBy: adminName || 'Petugas Keamanan Kampus',
      });

      if (approved) {
        await this.updateItemStatus(targetClaim.itemId, 'DIAMBIL / SELESAI');
      } else {
        await this.updateItemStatus(targetClaim.itemId, 'TERSEDIA');
      }

      return {
        success: true,
        message: approved
          ? 'Klaim disetujui! Barang siap diserahkan kepada mahasiswa.'
          : 'Klaim ditolak.',
      };
    } catch (err) {
      console.error('[CampusRepository] verifyClaim error:', err);
      return { success: false, message: 'Gagal memproses verifikasi klaim.' };
    }
  }

  // â”€â”€â”€ SUBSCRIBE & REFRESH â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  /**
   * Subscribe ke perubahan realtime (via Supabase onSnapshot).
   */
  subscribe(listener: (state: { items: CampusItem[]; claims: ClaimRequest[] }) => void) {
    _listeners.push(listener);
    // Kirim state saat ini segera
    listener({ items: _items, claims: _claims });
    return () => {
      _listeners = _listeners.filter((fn) => fn !== listener);
    };
  }

  async refreshData() {
    try {
      const fsItems = await getAllItemsFromDatabase();
      if (fsItems && fsItems.length > 0) {
        _items = fsItems;
      }
    } catch (e) {
      console.warn('[CampusRepository] Fallback items cache:', e);
    }
    try {
      const fsClaims = await getAllClaimsFromDatabase();
      if (fsClaims && fsClaims.length > 0) {
        _claims = fsClaims;
      }
    } catch (e) {
      console.warn('[CampusRepository] Fallback claims cache:', e);
    }
    _notifyListeners();
  }
}

export const campusRepository = new CampusRepository();
