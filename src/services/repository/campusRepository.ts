import { INITIAL_CAMPUS_ITEMS, STATUS_COLORS } from '@/constants/initialData';
import {
  addClaimToFirestore,
  addItemToFirestore,
  deleteItemFromFirestore,
  getAllClaimsFromFirestore,
  getAllItemsFromFirestore,
  subscribeToClaims,
  subscribeToItems,
  updateClaimInFirestore,
  updateItemInFirestore,
} from '@/services/firebase/firestoreService';
import {
  CampusItem,
  ClaimRequest,
  ClaimStatus,
  FoundItemStatus,
  ItemStatus,
  LostItemStatus,
  VerificationStatus,
} from '@/types';

/**
 * CampusRepository — Firebase Firestore Edition
 *
 * Semua operasi data barang (items) dan klaim (claims) kini diarahkan
 * langsung ke Firebase Firestore. sharedDatabase/backend HTTP tidak lagi digunakan.
 */

// State lokal (cache) yang diperbarui via realtime listener
let _items: CampusItem[] = [...INITIAL_CAMPUS_ITEMS];
let _claims: ClaimRequest[] = [];
let _listeners: Array<(state: { items: CampusItem[]; claims: ClaimRequest[] }) => void> = [];

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

// Inisialisasi realtime listener ke Firestore
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

  // ─── READ ──────────────────────────────────────────────────────────────────

  async getAllItems(): Promise<CampusItem[]> {
    if (_items.length > 0) return _items;
    try {
      const fsItems = await getAllItemsFromFirestore();
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

  // ─── BARANG HILANG (LAPORAN MAHASISWA) ────────────────────────────────────

  /**
   * FITUR MAHASISWA: Lapor Barang Hilang (Prioritas 6)
   * Status awal: 'Menunggu Verifikasi'
   * Status barang: 'DALAM PENCARIAN'
   * Disimpan ke Firestore koleksi `items`.
   */
  async reportLostItem(data: {
    title: string;
    category: string;
    description: string;
    location: string;
    date: string;
    image?: string;
    additionalInfo?: string;
    userId: string;
    reporter: string;
    faculty?: string;
  }): Promise<CampusItem> {
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
      faculty: data.faculty || 'Semua Fakultas',
      description: data.description.trim(),
      additionalInfo: data.additionalInfo?.trim() || '',
      reporter: data.reporter.trim(),
      userId: data.userId,
      image:
        data.image ||
        'https://images.unsplash.com/photo-1594980596870-8aa52a78d8cd?q=80&w=600&auto=format&fit=crop',
      reward: null,
      createdAt: new Date().toISOString(),
    };

    // addDoc ke Firestore — ID digenerate otomatis
    const newItem = await addItemToFirestore(itemData);
    return newItem;
  }

  // ─── VERIFIKASI LAPORAN (ADMIN) ───────────────────────────────────────────

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

    await updateItemInFirestore(itemId, updatedFields);
    return {
      success: true,
      message: approved
        ? 'Laporan kehilangan berhasil diverifikasi dan dipublikasikan ke katalog!'
        : 'Laporan kehilangan telah ditolak.',
    };
  }

  // ─── BARANG TEMUAN (INPUT ADMIN/PETUGAS) ─────────────────────────────────

  /**
   * INPUT BARANG TEMUAN OLEH ADMIN/PETUGAS (Prioritas 8 & 14)
   * Status: 'TERSEDIA'
   * Disimpan ke Firestore koleksi `items`.
   */
  async addFoundItem(data: {
    title: string;
    category: string;
    description: string;
    location: string;
    date: string;
    image: string;
    reporter: string;
    faculty?: string;
  }): Promise<CampusItem> {
    const itemData: Omit<CampusItem, 'id'> = {
      title: data.title.trim(),
      category: data.category,
      type: 'found',
      status: 'TERSEDIA',
      foundStatus: 'TERSEDIA',
      statusColor: STATUS_COLORS['TERSEDIA']?.text || '#15803D',
      date: data.date.trim() || 'Hari ini',
      location: data.location.trim(),
      faculty: data.faculty || 'Semua Fakultas',
      description: data.description.trim(),
      reporter: data.reporter.trim(),
      image:
        data.image ||
        'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?q=80&w=600&auto=format&fit=crop',
      reward: null,
      createdAt: new Date().toISOString(),
    };

    // addDoc ke Firestore — ID digenerate otomatis
    const newItem = await addItemToFirestore(itemData);
    return newItem;
  }

  // ─── HUBUNGKAN BARANG ─────────────────────────────────────────────────────

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

    await updateItemInFirestore(lostItemId, {
      status: 'BARANG DITEMUKAN' as ItemStatus,
      lostStatus: 'BARANG DITEMUKAN' as LostItemStatus,
      statusColor: STATUS_COLORS['BARANG DITEMUKAN'].text,
      foundItemId: foundItemId,
    });

    await updateItemInFirestore(foundItemId, {
      linkedLostItemId: lostItemId,
    });

    return {
      success: true,
      message: `Berhasil menghubungkan! Laporan "${lostItem.title}" kini berstatus BARANG DITEMUKAN.`,
    };
  }

  // ─── UPDATE STATUS ────────────────────────────────────────────────────────

  async updateItemStatus(itemId: string, newStatus: ItemStatus): Promise<void> {
    const item = _items.find((i) => i.id === itemId);
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

    await updateItemInFirestore(itemId, updatedFields);
  }

  async updateItem(itemId: string, updatedFields: Partial<CampusItem>): Promise<void> {
    const extra: Partial<CampusItem> = {};
    if (updatedFields.status) {
      extra.statusColor = STATUS_COLORS[updatedFields.status]?.text || '#334155';
    }
    await updateItemInFirestore(itemId, { ...updatedFields, ...extra });
  }

  async deleteItem(itemId: string): Promise<void> {
    await deleteItemFromFirestore(itemId);
  }

  // ─── KLAIM ────────────────────────────────────────────────────────────────

  /**
   * PROSES KLAIM OLEH MAHASISWA (Prioritas 10 & 12)
   * Disimpan ke Firestore koleksi `claims`.
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
          'Hari ini • ' +
          new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) +
          ' WIB',
      };

      const newClaim = await addClaimToFirestore(newClaimData);

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
      await updateClaimInFirestore(claimId, {
        status: newClaimStatus,
        adminNotes:
          adminNotes ||
          (approved
            ? 'Klaim disetujui. Identitas KTM/KTP cocok.'
            : 'Bukti identitas atau deskripsi barang tidak cocok.'),
        verifiedAt:
          new Date().toLocaleDateString('id-ID') +
          ' • ' +
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

  // ─── SUBSCRIBE & REFRESH ──────────────────────────────────────────────────

  /**
   * Subscribe ke perubahan realtime (via Firestore onSnapshot).
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
      const fsItems = await getAllItemsFromFirestore();
      if (fsItems && fsItems.length > 0) {
        _items = fsItems;
      }
    } catch (e) {
      console.warn('[CampusRepository] Fallback items cache:', e);
    }
    try {
      const fsClaims = await getAllClaimsFromFirestore();
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
