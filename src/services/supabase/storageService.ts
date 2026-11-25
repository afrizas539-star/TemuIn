import { File } from 'expo-file-system';
import { Platform } from 'react-native';

import { supabase } from '@/lib/supabase';

/**
 * Membaca URI lokal (file:// atau content://) menggunakan XMLHttpRequest
 * sebagai fallback yang kompatibel dengan Android & iOS.
 */
function readUriWithXHR(uri: string): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.onload = () => {
      if ((xhr.status >= 200 && xhr.status < 300) || xhr.status === 0) {
        if (xhr.response instanceof ArrayBuffer && xhr.response.byteLength > 0) {
          resolve(xhr.response);
        } else {
          reject(new Error('File foto lokal kosong atau tidak dapat dibaca.'));
        }
      } else {
        reject(new Error(`Gagal membaca file foto lokal (HTTP ${xhr.status}).`));
      }
    };
    xhr.onerror = () => reject(new Error('Gagal membaca file foto lokal dari perangkat.'));
    xhr.responseType = 'arraybuffer';
    xhr.open('GET', uri, true);
    xhr.send(null);
  });
}

/**
 * Membaca file gambar dari URI perangkat menjadi ArrayBuffer yang valid.
 * Menghindari bug React Native `fetch(file://...)` di Android yang sering
 * mengembalikan teks "File not found" (14 bytes) alih-alih isi gambar asli.
 */
async function readLocalFileAsArrayBuffer(localUri: string): Promise<ArrayBuffer> {
  let arrayBuffer: ArrayBuffer;

  if (Platform.OS === 'web') {
    const response = await fetch(localUri);
    if (!response.ok) {
      throw new Error(`Gagal membaca file foto (${response.status}).`);
    }
    arrayBuffer = await response.arrayBuffer();
  } else if (localUri.startsWith('file://')) {
    try {
      const file = new File(localUri);
      arrayBuffer = await file.arrayBuffer();
    } catch {
      arrayBuffer = await readUriWithXHR(localUri);
    }
  } else {
    arrayBuffer = await readUriWithXHR(localUri);
  }

  // Tolak hasil baca yang terlalu kecil/korup (mis. teks error "File not found")
  if (!arrayBuffer || arrayBuffer.byteLength < 64) {
    throw new Error('File foto lokal tidak ditemukan atau rusak. Silakan ambil foto ulang.');
  }

  return arrayBuffer;
}

/**
 * Service untuk menangani unggah dan pengelolaan file/foto di Supabase Storage.
 *
 * Bucket:
 * 1. 'item-photos': Public bucket untuk foto barang temuan dan kehilangan.
 * 2. 'id-cards': Private bucket untuk dokumen sensitif KTM / identitas klaim.
 */

/**
 * Helper untuk mengecek apakah URL foto berasal dari Supabase Storage
 */
export function isSupabaseStorageUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  return (
    url.includes('.supabase.co/storage/v1/object/') ||
    url.includes('/storage/v1/object/public/') ||
    url.includes('/storage/v1/object/sign/')
  );
}

/**
 * Unggah foto dari perangkat ke Supabase Storage.
 *
 * @param localUri URI file dari kamera atau galeri (misal: file://... atau content://...)
 * @param folder Direktori/kategori penyimpanan (misal: 'items/lost', 'items/found', 'id-cards')
 * @returns Promise<string> Public download URL permanen untuk foto umum, atau path untuk bucket privat
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

  try {
    const isIdCard = folder.toLowerCase().includes('id_card') || folder.toLowerCase().includes('id-card');
    const bucket = isIdCard ? 'id-cards' : 'item-photos';

    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 9);
    
    // Untuk bucket id-cards, simpan di bawah folder UID jika ada user login agar memenuhi RLS
    let filePath = `${folder}/${timestamp}_${randomSuffix}.jpg`;
    if (isIdCard) {
      const { data: { user } } = await supabase.auth.getUser();
      const userFolder = user?.id || 'anonymous';
      filePath = `${userFolder}/${timestamp}_${randomSuffix}.jpg`;
    }

    // Baca file lokal menjadi ArrayBuffer secara aman (mendukung file:// & content:// di Android/iOS)
    const arrayBuffer = await readLocalFileAsArrayBuffer(localUri);

    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filePath, arrayBuffer, {
        contentType: 'image/jpeg',
        upsert: true,
      });

    if (error) {
      console.error('[Supabase Storage] Gagal unggah file:', error.message);
      throw new Error(`Gagal mengunggah foto ke Supabase Storage: ${error.message}`);
    }

    if (bucket === 'item-photos') {
      const { data: publicUrlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(data.path);
      return publicUrlData.publicUrl;
    }

    // Untuk bucket privat id-cards, simpan path agar dapat dibuatkan signed URL
    return data.path;
  } catch (error: any) {
    console.error('[Supabase Storage] Error:', error);
    throw new Error(error?.message || 'Gagal mengunggah foto ke Supabase Storage.');
  }
}

/**
 * Dapatkan Signed URL sementara untuk foto sensitif (mis. KTM di bucket id-cards)
 *
 * @param path Path relatif file di bucket id-cards
 * @param expiresIn Detik masa berlaku signed URL (default 3600 = 1 jam)
 */
export async function getSignedIdCardUrl(path: string, expiresIn: number = 3600): Promise<string> {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }

  try {
    const { data, error } = await supabase.storage
      .from('id-cards')
      .createSignedUrl(path, expiresIn);

    if (error) {
      console.error('[Supabase Storage] Gagal membuat signed URL:', error.message);
      return '';
    }

    return data.signedUrl;
  } catch (err) {
    console.warn('[Supabase Storage] Exception signed URL:', err);
    return '';
  }
}

/**
 * Hapus foto dari Supabase Storage berdasarkan URL atau path.
 */
export async function deletePhotoFromStorage(photoUrlOrPath: string): Promise<void> {
  if (!photoUrlOrPath || typeof photoUrlOrPath !== 'string') return;

  try {
    let bucket = 'item-photos';
    let path = photoUrlOrPath;

    if (photoUrlOrPath.includes('/item-photos/')) {
      bucket = 'item-photos';
      path = photoUrlOrPath.split('/item-photos/')[1];
    } else if (photoUrlOrPath.includes('/id-cards/')) {
      bucket = 'id-cards';
      path = photoUrlOrPath.split('/id-cards/')[1];
    }

    // Hilangkan query parameters jika ada
    path = path.split('?')[0];

    const { error } = await supabase.storage
      .from(bucket)
      .remove([path]);

    if (error) {
      console.warn('[Supabase Storage] Gagal menghapus foto:', error.message);
    }
  } catch (error: any) {
    console.warn('[Supabase Storage] Gagal menghapus:', error);
  }
}

/**
 * Mengganti foto lama dengan yang baru.
 */
export async function replaceItemPhoto(
  oldPhotoUrl: string,
  newLocalUri: string,
  folder: string = 'items'
): Promise<string> {
  const newUrl = await uploadItemPhotoToStorage(newLocalUri, folder);
  if (oldPhotoUrl && oldPhotoUrl !== newUrl) {
    deletePhotoFromStorage(oldPhotoUrl).catch(() => {});
  }
  return newUrl;
}
