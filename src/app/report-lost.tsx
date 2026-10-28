import { Ionicons } from '@expo/vector-icons';
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
import { useAuth } from '@/context/AuthContext';
import { useCampusData } from '@/context/CampusDataContext';

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
  const params = useLocalSearchParams<{ photoUri?: string }>();

  // Form states
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState(CAMPUS_CATEGORIES[1]); // default 'KTM & Kartu'
  const [location, setLocation] = useState('');
  const [faculty, setFaculty] = useState('');
  const [date, setDate] = useState(
    'Hari ini • ' +
      new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) +
      ' WIB'
  );
  const [description, setDescription] = useState('');
  const [additionalInfo, setAdditionalInfo] = useState('');
  const [imageUri, setImageUri] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState<unknown>(null);

  // Menerima hasil foto dari layar kamera (Task 03)
  useEffect(() => {
    if (params.photoUri) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setImageUri(params.photoUri);
    }
  }, [params.photoUri]);

  const handleSubmit = async () => {
    setApiError(null);
    // Validasi form (Prioritas 20)
    if (!title.trim()) {
      Alert.alert('Form Belum Lengkap', 'Nama barang yang hilang wajib diisi.');
      return;
    }
    if (!category || category === 'Semua') {
      Alert.alert('Form Belum Lengkap', 'Silakan pilih kategori barang.');
      return;
    }
    if (!location.trim()) {
      Alert.alert(
        'Form Belum Lengkap',
        'Lokasi terakhir barang terlihat/hilang wajib diisi.'
      );
      return;
    }
    if (!date.trim()) {
      Alert.alert('Form Belum Lengkap', 'Perkiraan tanggal kehilangan wajib diisi.');
      return;
    }
    if (!description.trim()) {
      Alert.alert(
        'Form Belum Lengkap',
        'Deskripsi ciri-ciri khusus barang wajib diisi secara detail.'
      );
      return;
    }

    try {
      setIsSubmitting(true);
      const studentName = user?.name || 'Mahasiswa Kampus';
      const studentId = user?.id || `mhs-${Date.now()}`;

      await reportLostItem({
        title: title.trim(),
        category,
        location: location.trim(),
        faculty,
        date: date.trim(),
        description: description.trim(),
        additionalInfo: additionalInfo.trim(),
        image: imageUri || undefined,
        userId: studentId,
        reporter: `${studentName} (${user?.nim || 'Mahasiswa'})`,
      });

      Alert.alert(
        'Laporan Berhasil Dikirim!',
        'Laporan Anda berstatus "Menunggu Verifikasi". Petugas keamanan kampus akan memeriksa laporan sebelum diterbitkan ke katalog publik.',
        [
          {
            text: 'Lihat Status di Home',
            onPress: () => router.replace('/home'),
          },
        ]
      );
    } catch (err) {
      setApiError(err);
    } finally {
      setIsSubmitting(false);
    }
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
              onChangeText={setTitle}
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
                    onPress={() => setCategory(cat)}
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
              onChangeText={setLocation}
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
              onChangeText={setFaculty}
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
              onChangeText={setDate}
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
              onChangeText={setDescription}
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
              onChangeText={setAdditionalInfo}
            />
          </View>

          {/* Foto Barang Jika Ada */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Foto Barang (Jika Tersedia)</Text>

            {/* Tombol Ambil Foto Langsung dari Sensor Kamera (Task 01 - 03) */}
            <TouchableOpacity
              style={styles.cameraPickerBtn}
              onPress={() => router.push('/camera' as any)}
              activeOpacity={0.8}
            >
              <View style={styles.cameraIconBox}>
                <Ionicons name="camera" size={20} color="#2563EB" />
              </View>
              <View style={styles.cameraBtnTextWrap}>
                <Text style={styles.cameraBtnTitle}>Ambil Foto dengan Kamera</Text>
                <Text style={styles.cameraBtnSubtitle}>
                  Potret barang langsung menggunakan sensor kamera
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
            </TouchableOpacity>

            <ImagePickerButton
              imageUri={imageUri}
              onImageSelected={setImageUri}
              onImageRemoved={() => setImageUri('')}
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
  cameraPickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    gap: 12,
  },
  cameraIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#DBEAFE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraBtnTextWrap: {
    flex: 1,
  },
  cameraBtnTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1D4ED8',
    marginBottom: 2,
  },
  cameraBtnSubtitle: {
    fontSize: 11,
    color: '#64748B',
  },
});
