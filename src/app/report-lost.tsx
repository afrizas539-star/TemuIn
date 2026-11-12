import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ApiErrorMessage } from '@/components/ApiErrorMessage';
import { ImagePickerButton } from '@/components/ImagePickerButton';
import { CAMPUS_CATEGORIES } from '@/constants/initialData';
import { AppRadius, Colors } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useCampusData } from '@/context/CampusDataContext';
import { apiService } from '@/services/api/apiService';
import { CampusItem } from '@/types';

/**
 * Interface untuk input data laporan form mahasiswa (Rubrik: Object menggunakan Interface)
 */
export interface ReportFormData {
  title: string;
  category: string;
  location: string;
  date: string;
  description: string;
}

/**
 * Interface draft in-memory untuk mencegah data input hilang saat membuka layar kamera
 */
interface ReportDraft {
  title: string;
  category: string;
  location: string;
  faculty: string;
  date: string;
  description: string;
  additionalInfo: string;
  imageUri: string;
}

// Module-level memory draft agar nilai form tidak hilang saat berpindah ke layar sensor kamera
let reportFormDraft: ReportDraft = {
  title: '',
  category: CAMPUS_CATEGORIES[1],
  location: '',
  faculty: '',
  date: '',
  description: '',
  additionalInfo: '',
  imageUri: '',
};

function clearReportDraft() {
  reportFormDraft = {
    title: '',
    category: CAMPUS_CATEGORIES[1],
    location: '',
    faculty: '',
    date: '',
    description: '',
    additionalInfo: '',
    imageUri: '',
  };
}

/**
 * Custom Async Function yang memvalidasi data menggunakan Promise eksplisit
 * dengan fungsi resolve() saat input valid, dan reject() saat ada kesalahan input.
 * (Rubrik: Custom Async Function & Menggunakan fungsi .resolve(), dan .reject())
 */
function validateReportAsync(data: ReportFormData): Promise<ReportFormData> {
  return new Promise((resolve, reject) => {
    if (!data.title.trim()) {
      reject(new Error('Nama barang yang hilang wajib diisi.'));
    } else if (!data.category || data.category === 'Semua') {
      reject(new Error('Silakan pilih kategori barang.'));
    } else if (!data.location.trim()) {
      reject(new Error('Lokasi terakhir barang terlihat/hilang wajib diisi.'));
    } else if (!data.date.trim()) {
      reject(new Error('Perkiraan tanggal kehilangan wajib diisi.'));
    } else if (!data.description.trim()) {
      reject(new Error('Deskripsi ciri-ciri khusus barang wajib diisi secara detail.'));
    } else {
      resolve(data);
    }
  });
}

/**
 * PRIORITAS 6 — FITUR MAHASISWA: LAPOR BARANG HILANG
 * 
 * Mahasiswa dapat melaporkan barang yang hilang.
 * Setelah dikirim:
 * - Status Verifikasi: 'Menunggu Verifikasi'
 * - Status Barang: 'DALAM PENCARIAN'
 * - Laporan masuk ke antrean verifikasi Admin/Petugas.
 */
export default function StudentReportLostScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { reportLostItem } = useCampusData();

  // Parameter dari layar kamera (Task 03 - Integrasi antar layar)
  const params = useLocalSearchParams<{
    photoUri?: string;
    title?: string;
    category?: string;
    location?: string;
    faculty?: string;
    date?: string;
    description?: string;
    additionalInfo?: string;
  }>();

  // Form states diinisialisasi dari draft memory agar tidak ter-reset saat pengguna memotret dengan kamera
  const [title, setTitle] = useState(
    () => reportFormDraft.title || (params.title ? String(params.title) : '')
  );
  const [category, setCategory] = useState(
    () =>
      reportFormDraft.category ||
      (params.category ? String(params.category) : CAMPUS_CATEGORIES[1])
  );
  const [location, setLocation] = useState(
    () => reportFormDraft.location || (params.location ? String(params.location) : '')
  );
  const [faculty, setFaculty] = useState(
    () => reportFormDraft.faculty || (params.faculty ? String(params.faculty) : '')
  );
  const [date, setDate] = useState(
    () =>
      reportFormDraft.date ||
      (params.date
        ? String(params.date)
        : 'Hari ini • ' +
          new Date().toLocaleTimeString('id-ID', {
            hour: '2-digit',
            minute: '2-digit',
          }) +
          ' WIB')
  );
  const [description, setDescription] = useState(
    () =>
      reportFormDraft.description ||
      (params.description ? String(params.description) : '')
  );
  const [additionalInfo, setAdditionalInfo] = useState(
    () =>
      reportFormDraft.additionalInfo ||
      (params.additionalInfo ? String(params.additionalInfo) : '')
  );
  const [imageUri, setImageUri] = useState(
    () =>
      reportFormDraft.imageUri || (params.photoUri ? String(params.photoUri) : '')
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState<unknown>(null);

  // Sinkronisasi nilai input dengan draft in-memory
  const updateTitle = (val: string) => {
    setTitle(val);
    reportFormDraft.title = val;
  };
  const updateCategory = (val: string) => {
    setCategory(val);
    reportFormDraft.category = val;
  };
  const updateLocation = (val: string) => {
    setLocation(val);
    reportFormDraft.location = val;
  };
  const updateFaculty = (val: string) => {
    setFaculty(val);
    reportFormDraft.faculty = val;
  };
  const updateDate = (val: string) => {
    setDate(val);
    reportFormDraft.date = val;
  };
  const updateDescription = (val: string) => {
    setDescription(val);
    reportFormDraft.description = val;
  };
  const updateAdditionalInfo = (val: string) => {
    setAdditionalInfo(val);
    reportFormDraft.additionalInfo = val;
  };
  const updateImageUri = (val: string) => {
    setImageUri(val);
    reportFormDraft.imageUri = val;
  };

  // Menerima hasil foto dari layar kamera sensor (Task 03)
  useEffect(() => {
    if (params.photoUri) {
      updateImageUri(params.photoUri);
    }
    if (params.title && !title) {
      updateTitle(params.title);
    }
    if (params.category && category !== params.category) {
      updateCategory(params.category);
    }
    if (params.location && !location) {
      updateLocation(params.location);
    }
    if (params.faculty && !faculty) {
      updateFaculty(params.faculty);
    }
    if (params.date && !date) {
      updateDate(params.date);
    }
    if (params.description && !description) {
      updateDescription(params.description);
    }
    if (params.additionalInfo && !additionalInfo) {
      updateAdditionalInfo(params.additionalInfo);
    }
  }, [params]);

  // Memotret langsung menggunakan kamera perangkat dengan fitur crop foto
  const handleDirectCamera = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          'Izin Kamera Dibutuhkan',
          'Aplikasi membutuhkan akses ke kamera untuk memotret barang yang hilang.'
        );
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 0.8,
      });
      if (!result.canceled && result.assets && result.assets[0]?.uri) {
        updateImageUri(result.assets[0].uri);
      }
    } catch (e) {
      console.warn('Gagal memotret langsung:', e);
    }
  };

  const handleSubmit = () => {
    setApiError(null);
    setIsSubmitting(true);

    const studentName = user?.name || 'Mahasiswa Kampus';
    const studentId = user?.id || `mhs-${Date.now()}`;

    // 03. CREATE & Rubrik: Menggunakan Custom Async Function dengan .then(), .catch(), .finally()
    validateReportAsync({ title, category, location, date, description })
      .then((validForm: ReportFormData) => {
        // Pre-built & Custom Async: Kirim HTTP POST via fetch() ke REST API Server
        return apiService
          .createItem({
            title: validForm.title.trim(),
            category: validForm.category,
            location: validForm.location.trim(),
            faculty: faculty.trim() || undefined,
            date: validForm.date.trim(),
            description: validForm.description.trim(),
            image: imageUri || undefined,
            reporter: `${studentName} (${user?.nim || 'Mahasiswa'})`,
            type: 'lost',
            status: 'DALAM PENCARIAN',
          })
          .then((serverItem) => ({ serverSuccess: true, item: serverItem }))
          .catch((apiErr) => {
            // Graceful handling jika server REST API backend belum dinyalakan/terjangkau
            console.warn(
              '[ReportLost] Server REST API backend belum terjangkau, menyimpan laporan secara lokal:',
              apiErr.message
            );
            return { serverSuccess: false, item: null, error: apiErr };
          });
      })
      .then((apiResult) => {
        // Simpan ke state & repository lokal kampus agar data tersimpan dan langsung terlihat di Home
        return reportLostItem({
          title: title.trim(),
          category,
          location: location.trim(),
          faculty: faculty.trim() || undefined,
          date: date.trim(),
          description: description.trim(),
          additionalInfo: additionalInfo.trim() || undefined,
          image: imageUri || undefined,
          userId: studentId,
          reporter: `${studentName} (${user?.nim || 'Mahasiswa'})`,
        }).then(() => apiResult);
      })
      .then((apiResult) => {
        // Hapus draft form setelah laporan berhasil disimpan
        clearReportDraft();

        if (apiResult.serverSuccess) {
          Alert.alert(
            'Laporan Berhasil Terkirim!',
            'Laporan kehilangan Anda telah berhasil disimpan ke REST API server dan berstatus "Menunggu Verifikasi" oleh petugas keamanan kampus.',
            [
              {
                text: 'Lihat Status di Beranda',
                onPress: () => router.replace('/home'),
              },
            ]
          );
        } else {
          Alert.alert(
            'Laporan Berhasil Disimpan!',
            'Laporan Anda berhasil disimpan di perangkat.\n\nCatatan: Server REST API backend belum terhubung/aktif (jalankan "npm run backend" di terminal jika ingin menyinkronkan ke server). Data laporan tetap aman dan langsung dapat Anda pantau di Beranda.',
            [
              {
                text: 'Buka Beranda',
                onPress: () => router.replace('/home'),
              },
            ]
          );
        }
      })
      .catch((err: Error) => {
        setApiError(err);
        Alert.alert('Perhatian', err.message || 'Terjadi kesalahan saat memproses laporan.');
      })
      .finally(() => {
        setIsSubmitting(false);
      });
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <StatusBar style="dark" />

      {/* Header Bar */}
      <View
        style={[
          styles.headerBar,
          {
            paddingTop: Math.max(insets.top, Platform.OS === 'android' ? 24 : 12),
          },
        ]}
      >
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={20} color="#0F172A" />
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle}>Lapor Barang Hilang</Text>
          <Text style={styles.headerSubtitle}>Universitas Muhammadiyah Malang</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingBottom: Math.max(insets.bottom + 24, 36),
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Verification Info Banner */}
        <View style={styles.noticeCard}>
          <Ionicons name="shield-outline" size={22} color="#D97706" />
          <View style={styles.noticeTextWrap}>
            <Text style={styles.noticeTitle}>Alur Verifikasi Petugas</Text>
            <Text style={styles.noticeDesc}>
              Setelah submit, laporan berstatus <Text style={styles.bold}>Menunggu Verifikasi</Text>. Admin akan memvalidasi agar tidak terjadi laporan palsu sebelum dipublikasikan.
            </Text>
          </View>
        </View>

        {/* Form Container */}
        <View style={styles.formCard}>
          {/* ApiErrorMessage jika terjadi error */}
          <ApiErrorMessage
            error={apiError}
            onRetry={handleSubmit}
            onDismiss={() => setApiError(null)}
          />

          {/* Nama Barang */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Nama Barang Hilang <Text style={styles.req}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Contoh: Dompet Hitam Eiger, KTM Fisip, Botol Minum"
              placeholderTextColor="#94A3B8"
              value={title}
              onChangeText={updateTitle}
            />
          </View>

          {/* Kategori */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Kategori Barang <Text style={styles.req}>*</Text>
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
              {CAMPUS_CATEGORIES.filter((c) => c !== 'Semua').map((cat) => {
                const isSelected = category === cat;
                return (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.categoryChip, isSelected && styles.categoryChipSelected]}
                    onPress={() => updateCategory(cat)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.categoryChipText,
                        isSelected && styles.categoryChipTextSelected,
                      ]}
                    >
                      {cat}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Lokasi Terakhir Terlihat */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Lokasi Terakhir Terlihat <Text style={styles.req}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Contoh: GKB 3 Ruang 201, Kantin FEB, Parkir Motor"
              placeholderTextColor="#94A3B8"
              value={location}
              onChangeText={updateLocation}
            />
          </View>

          {/* Fakultas / Area Gedung (Opsional) */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Fakultas / Area Gedung{' '}
              <Text style={{ fontSize: 11, color: '#64748B', fontWeight: '400' }}>(Opsional)</Text>
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Contoh: Fakultas Teknik, Kantin Pusat"
              placeholderTextColor="#94A3B8"
              value={faculty}
              onChangeText={updateFaculty}
            />
          </View>

          {/* Tanggal & Waktu */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Tanggal & Perkiraan Waktu <Text style={styles.req}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Contoh: Hari ini • 14:00 WIB"
              placeholderTextColor="#94A3B8"
              value={date}
              onChangeText={updateDate}
            />
          </View>

          {/* Deskripsi Barang */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Deskripsi & Ciri-Ciri Khusus <Text style={styles.req}>*</Text>
            </Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Sebutkan warna, merk, stiker, isi di dalam barang, atau tanda unik lainnya..."
              placeholderTextColor="#94A3B8"
              value={description}
              onChangeText={updateDescription}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          {/* Informasi Tambahan */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Informasi Tambahan / Kontak Lain</Text>
            <TextInput
              style={styles.input}
              placeholder="Nomor WA alternatif atau pesan untuk penemu..."
              placeholderTextColor="#94A3B8"
              value={additionalInfo}
              onChangeText={updateAdditionalInfo}
            />
          </View>

          {/* Foto Barang Jika Ada */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Foto Barang (Jika Tersedia)</Text>

            {/* Tombol Ambil Foto Kamera */}
            <TouchableOpacity
              style={styles.takePhotoBtn}
              onPress={handleDirectCamera}
              activeOpacity={0.8}
            >
              <Ionicons name="camera" size={18} color="#0266B3" />
              <Text style={styles.takePhotoBtnText}>Ambil Foto</Text>
            </TouchableOpacity>

            <ImagePickerButton
              imageUri={imageUri}
              onImageSelected={updateImageUri}
              onImageRemoved={() => updateImageUri('')}
              title="Unggah Foto dari Galeri"
              subtitle="Pilih foto barang jika Anda pernah memfotonya"
            />
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={isSubmitting}
            activeOpacity={0.85}
          >
            <Ionicons name="paper-plane" size={18} color="#FFFFFF" />
            <Text style={styles.submitButtonText}>
              {isSubmitting ? 'Mengirim Laporan...' : 'Kirim Laporan Kehilangan'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    gap: 12,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleWrap: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  scrollContent: {
    padding: 16,
  },
  noticeCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFBEB',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#FDE68A',
    gap: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  noticeTextWrap: {
    flex: 1,
  },
  noticeTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#92400E',
  },
  noticeDesc: {
    fontSize: 11,
    color: '#78350F',
    marginTop: 2,
    lineHeight: 16,
  },
  bold: {
    fontWeight: '700',
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
  },
  req: {
    color: '#DC2626',
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0F172A',
  },
  textArea: {
    minHeight: 90,
  },
  chipScroll: {
    flexDirection: 'row',
    marginTop: 4,
  },
  categoryChip: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  categoryChipSelected: {
    backgroundColor: '#EFF6FF',
    borderColor: '#2563EB',
  },
  categoryChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  categoryChipTextSelected: {
    color: '#2563EB',
    fontWeight: '700',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563EB',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    marginTop: 10,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  takePhotoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E8F2FA',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 8,
    gap: 8,
  },
  takePhotoBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0266B3',
  },
});
