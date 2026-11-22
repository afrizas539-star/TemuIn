import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage';

import { storage } from '@/config/firebase';

/**
 * Service untuk menangani unggah dan pengelolaan file/foto barang di Firebase Storage
 */

/**
 * Unggah foto dari perangkat ke Firebase Storage.
 * Menghasilkan Download URL permanen (https://firebasestorage.googleapis.com/...)
 * yang dapat diakses oleh HP pengguna lain.
 *
 * @param localUri URI file dari kamera atau galeri (misal: file://... atau content://...)
 * @param folder Direktori penyimpanan di Firebase Storage (misal: 'items/lost', 'items/found', 'id_cards')
 * @returns Promise<string> URL download permanen
 */
export async function uploadItemPhotoToStorage(
  localUri: string,
  folder: string = 'items'
): Promise<string> {
  if (!localUri || typeof localUri !== 'string') {
    throw new Error('URI foto tidak boleh kosong.');
  }

  // Jika sudah berupa URL online (https://...), tidak perlu diunggah ulang
  if (localUri.startsWith('http://') || localUri.startsWith('https://')) {
    return localUri;
  }

  let blob: Blob | null = null;
  try {
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 9);
    // Buat path unik agar foto antar barang tidak saling bertumpuk atau tertukar
    const filename = `${folder}/${timestamp}_${randomSuffix}.jpg`;
    const storageRef = ref(storage, filename);

    // Ambil blob dari URI lokal (kompatibel Android, iOS, dan Web)
    const response = await fetch(localUri);
    blob = await response.blob();

    // Pastikan tipe konten gambar valid
    const metadata = {
      contentType: 'image/jpeg',
      customMetadata: {
        uploadedAt: new Date().toISOString(),
      },
    };

    // Upload blob ke Firebase Storage
    const uploadResult = await uploadBytes(storageRef, blob, metadata);

    // Dapatkan Download URL resmi dari Firebase Storage
    const downloadUrl = await getDownloadURL(uploadResult.ref);

    if (!downloadUrl || !downloadUrl.startsWith('http')) {
      throw new Error('Firebase Storage tidak mengembalikan download URL yang valid.');
    }

    return downloadUrl;
  } catch (error: any) {
    console.error('[Firebase Storage] Gagal mengunggah foto:', error);

    const errorMessage =
      error?.message ||
      'Gagal mengunggah foto ke Firebase Storage. Pastikan perangkat Anda terhubung ke internet.';
    throw new Error(errorMessage);
  } finally {
    // Bersihkan blob dari memori jika didukung
    if (blob && typeof (blob as any).close === 'function') {
      try {
        (blob as any).close();
      } catch {}
    }
  }
}

/**
 * Hapus foto dari Firebase Storage berdasarkan download URL.
 * Hanya menghapus jika URL berasal dari Firebase Storage (tidak menghapus placeholder luar).
 *
 * @param photoUrl URL foto yang akan dihapus
 */
export async function deletePhotoFromStorage(photoUrl: string): Promise<void> {
  if (!photoUrl || typeof photoUrl !== 'string') return;

  // Hanya proses jika merupakan URL Firebase Storage
  if (
    !photoUrl.includes('firebasestorage.googleapis.com') &&
    !photoUrl.includes('firebasestorage.app')
  ) {
    return;
  }

  try {
    const storageRef = ref(storage, photoUrl);
    await deleteObject(storageRef);
    console.log('[Firebase Storage] Foto lama berhasil dihapus dari cloud storage:', photoUrl);
  } catch (error: any) {
    // Jika file tidak ditemukan (404) atau sudah terhapus, abaikan
    if (error?.code !== 'storage/object-not-found') {
      console.warn('[Firebase Storage] Gagal menghapus foto lama:', error);
    }
  }
}

/**
 * Penggantian Foto Barang:
 * 1. Unggah foto baru ke Firebase Storage terlebih dahulu.
 * 2. Mengembalikan URL baru untuk disimpan ke Firestore oleh pemanggil.
 * 3. Jika pembaruan Firestore berhasil, pemanggil dapat memanggil deletePhotoFromStorage(oldPhotoUrl).
 * 4. Jika upload gagal, foto lama tetap aman dan tidak terhapus.
 */
export async function replaceItemPhoto(
  oldPhotoUrl: string,
  newLocalUri: string,
  folder: string = 'items'
): Promise<{ newPhotoUrl: string }> {
  // 1. Unggah foto baru terlebih dahulu
  const newPhotoUrl = await uploadItemPhotoToStorage(newLocalUri, folder);

  return { newPhotoUrl };
}
