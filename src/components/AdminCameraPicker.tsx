import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { deletePhotoFromStorage, uploadItemPhotoToStorage } from '@/services/supabase/storageService';

interface AdminCameraPickerProps {
  imageUri?: string;
  onImageUploaded: (downloadUrl: string) => void;
  onImageRemoved: () => void;
  title?: string;
  subtitle?: string;
  storageFolder?: string;
}

export const AdminCameraPicker: React.FC<AdminCameraPickerProps> = ({
  imageUri,
  onImageUploaded,
  onImageRemoved,
  title = 'Dokumentasi Foto Barang Temuan',
  subtitle = 'Ambil foto fisik barang langsung dengan kamera HP atau pilih dari galeri',
  storageFolder = 'items',
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const [localPreview, setLocalPreview] = useState<string>(imageUri || '');

  // Sinkronisasi jika prop imageUri berubah dari luar
  React.useEffect(() => {
    if (imageUri !== localPreview) {
      setLocalPreview(imageUri || '');
    }
  }, [imageUri]);

  /**
   * Helper proses upload ke Supabase Storage dengan rollback aman jika gagal
   */
  const processAndUpload = async (pickedUri: string) => {
    const previousImage = localPreview;
    try {
      setIsUploading(true);
      setUploadStatus('Menyiapkan foto...');
      setLocalPreview(pickedUri); // Tampilkan preview seketika

      setUploadStatus('Mengunggah ke Supabase Storage...');
      const downloadUrl = await uploadItemPhotoToStorage(pickedUri, storageFolder);

      setLocalPreview(downloadUrl);
      onImageUploaded(downloadUrl);
      Alert.alert('Sukses', 'Foto barang berhasil diunggah ke Supabase Storage.');
    } catch (error: any) {
      console.error('Error saat upload foto:', error);
      // Jangan menghapus foto lama jika upload pengganti gagal
      setLocalPreview(previousImage);
      Alert.alert(
        'Upload Foto Gagal',
        error?.message || 'Gagal mengunggah foto ke Supabase Storage. Silakan coba lagi.'
      );
    } finally {
      setIsUploading(false);
      setUploadStatus('');
    }
  };

  /**
   * 1. Ambil Foto langsung via Kamera HP
   */
  const handleTakePhoto = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          'Izin Kamera Diperlukan',
          'Aplikasi membutuhkan izin akses kamera untuk mendokumentasikan barang temuan.'
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        await processAndUpload(result.assets[0].uri);
      }
    } catch (e: any) {
      console.warn('Gagal membuka kamera:', e);
      Alert.alert('Error Kamera', 'Gagal membuka kamera perangkat. Silakan coba lagi.');
    }
  };

  /**
   * 2. Pilih dari Galeri HP
   */
  const handlePickFromGallery = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          'Izin Galeri Diperlukan',
          'Aplikasi membutuhkan izin galeri untuk memilih foto dokumentasi barang.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        await processAndUpload(result.assets[0].uri);
      }
    } catch (e: any) {
      console.warn('Gagal membuka galeri:', e);
      Alert.alert('Error Galeri', 'Gagal membuka galeri perangkat.');
    }
  };

  /**
   * 3. Hapus Foto
   */
  const handleRemovePhoto = () => {
    Alert.alert(
      'Hapus Foto',
      'Apakah Anda yakin ingin menghapus foto barang ini?',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus',
          style: 'destructive',
          onPress: () => {
            setLocalPreview('');
            onImageRemoved();
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {localPreview ? (
        <View style={styles.previewCard}>
          <Image
            source={{ uri: localPreview }}
            style={styles.previewImage}
            resizeMode="cover"
          />

          {/* Loading Overlay saat sedang mengunggah ke Supabase Storage */}
          {isUploading && (
            <View style={styles.uploadingOverlay}>
              <ActivityIndicator size="large" color="#FFFFFF" />
              <Text style={styles.uploadingText}>{uploadStatus}</Text>
            </View>
          )}

          {/* Status Badge jika foto sudah online di Cloud Storage */}
          {localPreview.startsWith('http') && !isUploading && (
            <View style={styles.cloudBadge}>
              <Ionicons name="cloud-done" size={14} color="#FFFFFF" />
              <Text style={styles.cloudBadgeText}>Tersimpan di Cloud Storage</Text>
            </View>
          )}

          {/* Action Buttons: Foto Ulang & Hapus */}
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.smallBtn, styles.retakeBtn]}
              onPress={handleTakePhoto}
              disabled={isUploading}
              activeOpacity={0.8}
            >
              <Ionicons name="camera-reverse" size={15} color="#0266B3" />
              <Text style={styles.retakeBtnText}>Foto Ulang</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.smallBtn, styles.galleryBtn]}
              onPress={handlePickFromGallery}
              disabled={isUploading}
              activeOpacity={0.8}
            >
              <Ionicons name="image-outline" size={15} color="#475569" />
              <Text style={styles.galleryBtnText}>Ganti dari Galeri</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.smallBtn, styles.deleteBtn]}
              onPress={handleRemovePhoto}
              disabled={isUploading}
              activeOpacity={0.8}
            >
              <Ionicons name="trash-outline" size={15} color="#DC2626" />
              <Text style={styles.deleteBtnText}>Hapus</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={styles.pickerBox}>
          <View style={styles.iconCircle}>
            <Ionicons name="camera" size={28} color="#0266B3" />
          </View>

          <Text style={styles.titleText}>{title}</Text>
          <Text style={styles.subtitleText}>{subtitle}</Text>

          {isUploading ? (
            <View style={styles.loadingInline}>
              <ActivityIndicator size="small" color="#0266B3" />
              <Text style={styles.loadingInlineText}>{uploadStatus}</Text>
            </View>
          ) : (
            <View style={styles.buttonRow}>
              {/* Tombol Ambil Foto Kamera */}
              <TouchableOpacity
                style={styles.primaryCameraBtn}
                onPress={handleTakePhoto}
                activeOpacity={0.8}
              >
                <Ionicons name="camera" size={16} color="#FFFFFF" />
                <Text style={styles.primaryCameraBtnText}>Ambil Foto</Text>
              </TouchableOpacity>

              {/* Tombol Pilih dari Galeri */}
              <TouchableOpacity
                style={styles.secondaryGalleryBtn}
                onPress={handlePickFromGallery}
                activeOpacity={0.8}
              >
                <Ionicons name="images-outline" size={16} color="#334155" />
                <Text style={styles.secondaryGalleryBtnText}>Pilih dari Galeri</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  pickerBox: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#93C5FD',
    borderRadius: 14,
    backgroundColor: '#F0F9FF',
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  titleText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
    textAlign: 'center',
  },
  subtitleText: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 14,
    paddingHorizontal: 12,
    lineHeight: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  primaryCameraBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0266B3',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
    shadowColor: '#0266B3',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  primaryCameraBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  secondaryGalleryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  secondaryGalleryBtnText: {
    color: '#334155',
    fontSize: 13,
    fontWeight: '600',
  },
  previewCard: {
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  previewImage: {
    width: '100%',
    height: 220,
  },
  uploadingOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  uploadingText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  cloudBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: 'rgba(2, 102, 179, 0.85)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 5,
  },
  cloudBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 10,
    gap: 8,
    backgroundColor: '#F8FAFC',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  smallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    gap: 4,
  },
  retakeBtn: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  retakeBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0266B3',
  },
  galleryBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  galleryBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  deleteBtn: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  deleteBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#DC2626',
  },
  loadingInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
  },
  loadingInlineText: {
    fontSize: 12,
    color: '#0266B3',
    fontWeight: '600',
  },
});
