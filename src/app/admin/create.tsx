import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { AdminBottomNav } from '@/components/AdminBottomNav';
import { AdminCameraPicker } from '@/components/AdminCameraPicker';
import { AdminHeader } from '@/components/AdminHeader';
import { ApiErrorMessage } from '@/components/ApiErrorMessage';
import { InteractiveCampusMapModal } from '@/components/InteractiveCampusMapModal';
import { CAMPUS_CATEGORIES } from '@/constants/initialData';
import { useAuth } from '@/context/AuthContext';
import { useCampusData } from '@/context/CampusDataContext';
import { deletePhotoFromStorage } from '@/services/firebase/storageService';
import { CampusLocation, ItemType } from '@/types';

export default function AdminCreateReportScreen() {
  const router = useRouter();
  const { isAdminAuthenticated, role, adminProfile, isLoadingAuth } = useAuth();
  const { addItem } = useCampusData();

  // Route protection
  useEffect(() => {
    if (!isLoadingAuth) {
      if (!isAdminAuthenticated) {
        if (role === 'student') {
          Alert.alert('Akses Ditolak', 'Mahasiswa tidak memiliki izin menambahkan barang temuan.');
          router.replace('/home');
        } else {
          router.replace('/login');
        }
      }
    }
  }, [isAdminAuthenticated, role, isLoadingAuth]);

  // Form states
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState(CAMPUS_CATEGORIES[1]); // default 'KTM & Kartu'
  const [type, setType] = useState<ItemType>('found'); // default 'found'
  const [location, setLocation] = useState('');
  const [locationDetail, setLocationDetail] = useState<CampusLocation | undefined>(undefined);
  const [showMapModal, setShowMapModal] = useState(false);
  const [faculty, setFaculty] = useState('');
  const [date, setDate] = useState('Hari ini • ' + new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB');
  const [description, setDescription] = useState('');
  const [reporter, setReporter] = useState(adminProfile.name);
  const [imageUri, setImageUri] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState<unknown>(null);

  const handleSubmit = async () => {
    setApiError(null);
    if (!title.trim()) {
      Alert.alert('Form Belum Lengkap', 'Nama barang temuan wajib diisi.');
      return;
    }
    if (!location.trim()) {
      Alert.alert('Form Belum Lengkap', 'Lokasi tempat barang ditemukan wajib diisi.');
      return;
    }
    if (!description.trim()) {
      Alert.alert('Form Belum Lengkap', 'Deskripsi barang dan kondisi fisik wajib diisi.');
      return;
    }

    try {
      setIsSubmitting(true);
      // If no custom image uploaded, provide a neat fallback placeholder
      const finalImage =
        imageUri ||
        (type === 'found'
          ? 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?q=80&w=600&auto=format&fit=crop'
          : 'https://images.unsplash.com/photo-1594980596870-8aa52a78d8cd?q=80&w=600&auto=format&fit=crop');

      const newItem = await addItem({
        title: title.trim(),
        category,
        type,
        status: 'TERSEDIA',
        foundStatus: 'TERSEDIA',
        statusColor: '#15803D',
        date: date.trim() || 'Hari ini',
        location: location.trim(),
        locationDetail,
        faculty,
        description: description.trim(),
        reporter: reporter.trim() || adminProfile.name,
        image: finalImage,
        reward: null,
      });

      Alert.alert(
        'Laporan Berhasil Disimpan!',
        `Data "${newItem.title}" telah dipublikasikan di katalog kampus secara real-time.`,
        [
          {
            text: 'Lihat Daftar Barang',
            onPress: () => router.replace('/admin/items'),
          },
        ]
      );
    } catch (e) {
      setApiError(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingAuth || !isAdminAuthenticated) {
    return null;
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <StatusBar style="light" />

      <AdminHeader
        title="Input Laporan Barang"
        subtitle="Entri data barang temuan atau kehilangan fisik"
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Error message display */}
        <ApiErrorMessage
          error={apiError}
          onRetry={handleSubmit}
          onDismiss={() => setApiError(null)}
        />

        {/* Tipe Laporan Toggle */}
        <View style={styles.typeToggleCard}>
          <Text style={styles.toggleCardLabel}>Jenis Laporan:</Text>
          <View style={styles.typeBtnRow}>
            <TouchableOpacity
              style={[
                styles.typeOptionBtn,
                type === 'found' && styles.typeOptionBtnActiveFound,
              ]}
              onPress={() => setType('found')}
            >
              <Ionicons
                name="gift-outline"
                size={16}
                color={type === 'found' ? '#FFFFFF' : '#64748B'}
              />
              <Text
                style={[
                  styles.typeOptionText,
                  type === 'found' && styles.typeOptionTextActive,
                ]}
              >
                Barang Temuan
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.typeOptionBtn,
                type === 'lost' && styles.typeOptionBtnActiveLost,
              ]}
              onPress={() => setType('lost')}
            >
              <Ionicons
                name="alert-circle"
                size={16}
                color={type === 'lost' ? '#FFFFFF' : '#64748B'}
              />
              <Text
                style={[
                  styles.typeOptionText,
                  type === 'lost' && styles.typeOptionTextActive,
                ]}
              >
                Barang Hilang
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Form Inputs */}
        <View style={styles.formCard}>
          <Text style={styles.formSectionTitle}>Informasi Barang</Text>

          {/* Nama Barang */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Nama Barang <Text style={styles.req}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Contoh: Dompet Lipat Hitam Eiger"
              placeholderTextColor="#94A3B8"
              value={title}
              onChangeText={setTitle}
            />
          </View>

          {/* Kategori Horizontal Picker */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Kategori Barang <Text style={styles.req}>*</Text>
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.catPillRow}>
                {CAMPUS_CATEGORIES.filter((c) => c !== 'Semua').map((cat) => {
                  const isSelected = category === cat;
                  return (
                    <TouchableOpacity
                      key={cat}
                      style={[
                        styles.catPill,
                        isSelected && styles.catPillActive,
                      ]}
                      onPress={() => setCategory(cat)}
                    >
                      <Text
                        style={[
                          styles.catPillText,
                          isSelected && styles.catPillTextActive,
                        ]}
                      >
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
          </View>

          {/* Lokasi Ditemukan */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Lokasi Ditemukan / Hilang <Text style={styles.req}>*</Text>
            </Text>
            <View style={styles.locationInputRow}>
              <TextInput
                style={[styles.input, { flex: 1, marginBottom: 0 }]}
                placeholder="Contoh: Ruang 304 Gedung Kuliah Bersama (GKB) 3"
                placeholderTextColor="#94A3B8"
                value={location}
                onChangeText={setLocation}
              />
              <TouchableOpacity
                style={styles.mapPickerBtn}
                onPress={() => setShowMapModal(true)}
                activeOpacity={0.8}
              >
                <Ionicons name="map-outline" size={16} color="#0266B3" />
                <Text style={styles.mapPickerBtnText}>Peta</Text>
              </TouchableOpacity>
            </View>

            {locationDetail && (
              <View style={styles.locationDetailBadge}>
                <Ionicons name="checkmark-circle" size={14} color="#15803D" />
                <Text style={styles.locationDetailText}>
                  Titik Kampus III UMM: {locationDetail.latitude.toFixed(6)}, {locationDetail.longitude.toFixed(6)}
                </Text>
              </View>
            )}
          </View>

          {/* Lingkup Fakultas / Unit (Opsional) */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Lingkup Fakultas / Unit{' '}
              <Text style={{ fontSize: 11, color: '#64748B', fontWeight: '400' }}>(Opsional)</Text>
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Contoh: Fakultas Teknik, Perpustakaan Pusat"
              placeholderTextColor="#94A3B8"
              value={faculty}
              onChangeText={setFaculty}
            />
          </View>

          {/* Tanggal & Waktu */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Tanggal & Waktu Ditemukan</Text>
            <TextInput
              style={styles.input}
              placeholder="Hari ini • 14:00 WIB"
              placeholderTextColor="#94A3B8"
              value={date}
              onChangeText={setDate}
            />
          </View>

          {/* Deskripsi */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Deskripsi Fisik & Ciri Khusus <Text style={styles.req}>*</Text>
            </Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Jelaskan warna, merk, stiker, atau kondisi barang secara rinci..."
              placeholderTextColor="#94A3B8"
              multiline
              numberOfLines={4}
              value={description}
              onChangeText={setDescription}
            />
          </View>

          {/* Petugas Penerima */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Petugas Penerima / Posko</Text>
            <TextInput
              style={styles.input}
              placeholder="Nama Petugas / Satpam Posko"
              placeholderTextColor="#94A3B8"
              value={reporter}
              onChangeText={setReporter}
            />
          </View>

          {/* FITUR KAMERA PETUGAS / ADMIN (BAGIAN 2 REQUIREMENT) */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Dokumentasi Foto Barang Temuan</Text>
            <Text style={styles.fieldHint}>
              Ambil foto fisik barang langsung dengan kamera HP petugas atau pilih dari galeri untuk diunggah ke Firebase Storage.
            </Text>

            <AdminCameraPicker
              imageUri={imageUri}
              onImageUploaded={(downloadUrl) => setImageUri(downloadUrl)}
              onImageRemoved={() => {
                if (
                  imageUri &&
                  (imageUri.includes('firebasestorage.googleapis.com') ||
                    imageUri.includes('firebasestorage.app'))
                ) {
                  deletePhotoFromStorage(imageUri).catch(() => {});
                }
                setImageUri('');
              }}
              title="Kamera & Foto Barang"
              subtitle="Foto kondisi barang sebelum disimpan di sistem"
              storageFolder={type === 'found' ? 'items/found' : 'items/lost'}
            />
          </View>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitBtn, isSubmitting && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={isSubmitting}
          activeOpacity={0.8}
        >
          <Ionicons name="save-outline" size={20} color="#FFFFFF" />
          <Text style={styles.submitBtnText}>
            {isSubmitting ? 'Menyimpan Laporan...' : 'Simpan & Publikasikan Laporan'}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Interactive Map Modal */}
      <InteractiveCampusMapModal
        visible={showMapModal}
        onClose={() => setShowMapModal(false)}
        initialCoordinate={
          locationDetail
            ? { latitude: locationDetail.latitude, longitude: locationDetail.longitude }
            : undefined
        }
        onConfirmLocation={(loc) => {
          setLocationDetail(loc);
          setLocation(loc.address);
        }}
      />

      <AdminBottomNav activeTab="create" />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  locationInputRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  mapPickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 4,
  },
  mapPickerBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0266B3',
  },
  locationDetailBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginTop: 6,
    gap: 6,
  },
  locationDetailText: {
    fontSize: 11,
    color: '#15803D',
    fontWeight: '600',
  },
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  typeToggleCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  toggleCardLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 8,
  },
  typeBtnRow: {
    flexDirection: 'row',
    gap: 10,
  },
  typeOptionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    gap: 6,
  },
  typeOptionBtnActiveFound: {
    backgroundColor: '#16A34A',
  },
  typeOptionBtnActiveLost: {
    backgroundColor: '#DC2626',
  },
  typeOptionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  typeOptionTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 20,
  },
  formSectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 14,
  },
  inputGroup: {
    marginBottom: 14,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
  },
  req: {
    color: '#DC2626',
  },
  fieldHint: {
    fontSize: 11,
    color: '#64748B',
    marginBottom: 6,
    lineHeight: 16,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: '#0F172A',
  },
  textArea: {
    height: 90,
    textAlignVertical: 'top',
  },
  catPillRow: {
    flexDirection: 'row',
    gap: 8,
  },
  catPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  catPillActive: {
    backgroundColor: '#4F46E5',
    borderColor: '#4F46E5',
  },
  catPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  catPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4F46E5',
    borderRadius: 14,
    paddingVertical: 14,
    gap: 8,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
