import { Ionicons } from '@expo/vector-icons';
import { CameraType, CameraView, FlashMode, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef, useState } from 'react';
import {
  Image,
  Linking,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  Vibration,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * ============================================================================
 * MODUL PRAKTIKUM MINGGU 7: AKSES SENSOR & KAMERA PERANGKAT
 * ============================================================================
 * Task 01: Akses Sensor & Permission Kamera (useCameraPermissions)
 * Task 02: Tampilkan Data Sensor di Console & Panel UI
 * Task 03: Interaksi, Feedback Getaran (Vibration), dan Perubahan Status UI
 * ============================================================================
 */
export default function CameraScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const cameraRef = useRef<CameraView>(null);

  // --------------------------------------------------------------------------
  // STATE KAMERA & SENSOR
  // --------------------------------------------------------------------------
  const [facing, setFacing] = useState<CameraType>('back');
  const [flash, setFlash] = useState<FlashMode>('off');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [statusText, setStatusText] = useState<string>('Kamera Siap Digunakan');
  const [cameraInfo, setCameraInfo] = useState<{
    facing: string;
    flash: string;
    width?: number;
    height?: number;
  }>({
    facing: 'back',
    flash: 'off',
  });

  // --------------------------------------------------------------------------
  // BAGIAN 1: PERMISSION (IZIN AKSES SENSOR KAMERA) - TASK 01
  // Menggunakan hook useCameraPermissions sesuai best practice Expo SDK 57/58.
  // Aplikasi aman dari crash jika izin ditolak (graceful handling).
  // --------------------------------------------------------------------------
  const [permission, requestPermission] = useCameraPermissions();

  // --------------------------------------------------------------------------
  // BAGIAN 2 & 3: DATA KAMERA & LOGGING CONSOLE - TASK 02
  // Memantau perubahan orientasi lensa dan flash secara real-time.
  // --------------------------------------------------------------------------
  useEffect(() => {
    // Log data sensor kamera ke console setiap ada perubahan
    console.log('Camera:', { facing, flash });
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCameraInfo((prev) => ({
      ...prev,
      facing,
      flash,
    }));
  }, [facing, flash]);

  // --------------------------------------------------------------------------
  // BAGIAN 4: INTERAKSI & AMBIL FOTO - TASK 03
  // Mengambil gambar dengan cameraRef, getaran (Vibration), dan update status UI.
  // --------------------------------------------------------------------------
  const handleToggleFacing = () => {
    setFacing((current) => (current === 'back' ? 'front' : 'back'));
    setStatusText(
      facing === 'back' ? 'Kamera Depan Aktif' : 'Kamera Belakang Aktif'
    );
  };

  const handleToggleFlash = () => {
    setFlash((current) => (current === 'off' ? 'on' : 'off'));
    setStatusText(flash === 'off' ? 'Flash Kamera Dinyalakan' : 'Flash Dimatikan');
  };

  const handleTakePicture = async () => {
    if (!cameraRef.current) return;

    try {
      setStatusText('Sedang memproses foto...');
      // Ambil foto dari sensor kamera dengan kompresi kualitas 0.7
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.7,
      });

      if (photo && photo.uri) {
        setPhotoUri(photo.uri);
        setCameraInfo((prev) => ({
          ...prev,
          width: photo.width,
          height: photo.height,
        }));

        // Feedback haptik/getar selama 100 milidetik saat foto berhasil diambil
        Vibration.vibrate(100);

        // Update status UI berhasil (berwarna hijau)
        setStatusText('Foto Berhasil Diambil!');
        console.log('Foto berhasil diambil:', {
          uri: photo.uri,
          width: photo.width,
          height: photo.height,
        });
      }
    } catch (error) {
      console.error('Gagal mengambil foto:', error);
      setStatusText('Gagal mengambil foto');
    }
  };

  const handleRetake = () => {
    setPhotoUri(null);
    setStatusText('Kamera Siap Digunakan');
  };

  // --------------------------------------------------------------------------
  // BAGIAN 5: KIRIM HASIL FOTO KE HALAMAN LAIN (report-lost)
  // Memakai router.navigate agar tidak membuat duplikasi layar di stack dan
  // input form yang sudah diisi mahasiswa tidak ter-reset.
  // --------------------------------------------------------------------------
  const handleUsePhoto = () => {
    if (!photoUri) return;

    router.navigate({
      pathname: '/report-lost',
      params: { photoUri },
    } as any);
  };

  // --------------------------------------------------------------------------
  // TAMPILAN JIKA PERMISSION MASIH MEMERIKSA
  // --------------------------------------------------------------------------
  if (!permission) {
    return (
      <View style={[styles.centeredContainer, { paddingTop: insets.top }]}>
        <StatusBar style="dark" />
        <Ionicons name="camera-outline" size={48} color="#94A3B8" />
        <Text style={styles.loadingText}>Memeriksa izin kamera...</Text>
      </View>
    );
  }

  // --------------------------------------------------------------------------
  // TAMPILAN JIKA PERMISSION BELUM/DITOLAK DIBERIKAN (TASK 01)
  // Menampilkan penjelasan edukatif, tombol request, dan tombol ke settings.
  // --------------------------------------------------------------------------
  if (!permission.granted) {
    return (
      <View style={[styles.centeredContainer, { paddingTop: insets.top }]}>
        <StatusBar style="dark" />
        <View style={styles.permissionCard}>
          <View style={styles.warningIconCircle}>
            <Ionicons name="alert-circle-outline" size={38} color="#DC2626" />
          </View>
          <Text style={styles.permissionTitle}>Akses Kamera Diperlukan</Text>
          <Text style={styles.permissionMessage}>
            TemuIn membutuhkan izin kamera untuk memotret barang yang hilang atau
            ditemukan agar laporan kamu memiliki bukti visual yang jelas.
          </Text>

          <View style={styles.permissionActionGroup}>
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={requestPermission}
              activeOpacity={0.8}
            >
              <Ionicons name="shield-checkmark-outline" size={18} color="#FFFFFF" />
              <Text style={styles.primaryBtnText}>Izinkan Kamera</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={() => Linking.openSettings()}
              activeOpacity={0.8}
            >
              <Ionicons name="settings-outline" size={18} color="#2563EB" />
              <Text style={styles.secondaryBtnText}>Buka Pengaturan</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.backLinkBtn}
              onPress={() => router.back()}
              activeOpacity={0.7}
            >
              <Text style={styles.backLinkText}>Kembali ke Halaman Laporan</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  // --------------------------------------------------------------------------
  // TAMPILAN UTAMA KAMERA (PREVIEW / HASIL FOTO)
  // --------------------------------------------------------------------------
  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Header Bar */}
      <View
        style={[
          styles.headerBar,
          {
            paddingTop: Math.max(
              insets.top,
              Platform.OS === 'android' ? 24 : 12
            ),
          },
        ]}
      >
        <TouchableOpacity
          style={styles.headerBackBtn}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle}>Kamera Barang</Text>
          <Text style={styles.headerSubtitle}>Foto Bukti Barang TemuIn</Text>
        </View>
        {/* Badge Status Kamera Aktif */}
        <View style={styles.activeBadge}>
          <View style={styles.activeDot} />
          <Text style={styles.activeBadgeText}>Kamera Aktif</Text>
        </View>
      </View>

      {/* Fallback Web Info */}
      {Platform.OS === 'web' && (
        <View style={styles.webNoticeBar}>
          <Ionicons name="information-circle-outline" size={16} color="#B45309" />
          <Text style={styles.webNoticeText}>
            Uji coba kamera disarankan melalui HP fisik menggunakan aplikasi Expo
            Go untuk mengakses sensor perangkat secara optimal.
          </Text>
        </View>
      )}

      {/* Area Kamera Preview / Foto Hasil */}
      <View style={styles.cameraViewport}>
        {photoUri ? (
          // Preview foto yang baru saja diambil
          <Image
            source={{ uri: photoUri }}
            style={styles.photoPreview}
            resizeMode="cover"
          />
        ) : (
          // Kamera hidup / aktif (Task 01 & 02)
          <CameraView
            ref={cameraRef}
            style={styles.camera}
            facing={facing}
            flash={flash}
          />
        )}

        {/* Panel Data Kamera di UI (Task 02) */}
        <View style={styles.dataSensorPanel}>
          <View style={styles.dataRow}>
            <View style={styles.dataItem}>
              <Text style={styles.dataLabel}>Lensa</Text>
              <Text style={styles.dataValue}>
                {cameraInfo.facing === 'back' ? 'Belakang' : 'Depan'}
              </Text>
            </View>
            <View style={styles.dataDivider} />
            <View style={styles.dataItem}>
              <Text style={styles.dataLabel}>Flash</Text>
              <Text style={styles.dataValue}>
                {cameraInfo.flash.toUpperCase()}
              </Text>
            </View>
            <View style={styles.dataDivider} />
            <View style={styles.dataItem}>
              <Text style={styles.dataLabel}>Resolusi Foto</Text>
              <Text style={styles.dataValue}>
                {cameraInfo.width && cameraInfo.height
                  ? `${cameraInfo.width}×${cameraInfo.height}`
                  : 'Belum diambil'}
              </Text>
            </View>
          </View>

          {/* Status Text Bar (Task 03) */}
          <View style={styles.statusBarWrap}>
            <Text
              style={[
                styles.statusText,
                statusText.includes('Berhasil') && styles.statusTextSuccess,
                statusText.includes('Gagal') && styles.statusTextError,
              ]}
            >
              {statusText}
            </Text>
          </View>
        </View>
      </View>

      {/* Kontrol Interaksi (Task 03) */}
      <View
        style={[
          styles.bottomControls,
          {
            paddingBottom: Math.max(insets.bottom + 16, 24),
          },
        ]}
      >
        {photoUri ? (
          // Tombol setelah foto diambil
          <View style={styles.confirmActionRow}>
            <TouchableOpacity
              style={styles.retakeBtn}
              onPress={handleRetake}
              activeOpacity={0.8}
            >
              <Ionicons name="refresh" size={20} color="#FFFFFF" />
              <Text style={styles.retakeBtnText}>Ulangi</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.usePhotoBtn}
              onPress={handleUsePhoto}
              activeOpacity={0.85}
            >
              <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
              <Text style={styles.usePhotoBtnText}>Gunakan Foto</Text>
            </TouchableOpacity>
          </View>
        ) : (
          // Tombol saat kamera sedang aktif
          <View style={styles.shutterRow}>
            {/* Toggle Flash */}
            <TouchableOpacity
              style={[
                styles.toolCircleBtn,
                flash === 'on' && styles.toolCircleBtnActive,
              ]}
              onPress={handleToggleFlash}
              activeOpacity={0.75}
            >
              <Ionicons
                name={flash === 'on' ? 'flash' : 'flash-off-outline'}
                size={22}
                color={flash === 'on' ? '#F59E0B' : '#FFFFFF'}
              />
              <Text style={styles.toolBtnLabel}>
                {flash === 'on' ? 'Flash On' : 'Flash Off'}
              </Text>
            </TouchableOpacity>

            {/* Shutter Button (Ambil Foto) */}
            <TouchableOpacity
              style={styles.shutterOuterRing}
              onPress={handleTakePicture}
              activeOpacity={0.8}
            >
              <View style={styles.shutterInnerCircle}>
                <Ionicons name="camera" size={28} color="#0F172A" />
              </View>
            </TouchableOpacity>

            {/* Toggle Flip Kamera */}
            <TouchableOpacity
              style={styles.toolCircleBtn}
              onPress={handleToggleFacing}
              activeOpacity={0.75}
            >
              <Ionicons name="camera-reverse-outline" size={24} color="#FFFFFF" />
              <Text style={styles.toolBtnLabel}>Ganti</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

// ----------------------------------------------------------------------------
// STYLESHEET
// ----------------------------------------------------------------------------
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  centeredContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 14,
    fontSize: 15,
    color: '#64748B',
    fontWeight: '500',
  },
  permissionCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
  },
  warningIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  permissionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 8,
    textAlign: 'center',
  },
  permissionMessage: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  permissionActionGroup: {
    width: '100%',
    gap: 10,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563EB',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFF6FF',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    gap: 8,
  },
  secondaryBtnText: {
    color: '#2563EB',
    fontWeight: '600',
    fontSize: 14,
  },
  backLinkBtn: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  backLinkText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    gap: 12,
    zIndex: 10,
  },
  headerBackBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleWrap: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#94A3B8',
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#10B981',
    gap: 6,
  },
  activeDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  activeBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#A7F3D0',
  },
  webNoticeBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  webNoticeText: {
    flex: 1,
    fontSize: 12,
    color: '#92400E',
    lineHeight: 16,
  },
  cameraViewport: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#000000',
    justifyContent: 'flex-end',
  },
  camera: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  photoPreview: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  dataSensorPanel: {
    margin: 16,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  dataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  dataItem: {
    alignItems: 'center',
    flex: 1,
  },
  dataDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  dataLabel: {
    fontSize: 10,
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  dataValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  statusBarWrap: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#E2E8F0',
  },
  statusTextSuccess: {
    color: '#34D399',
  },
  statusTextError: {
    color: '#F87171',
  },
  bottomControls: {
    backgroundColor: '#0F172A',
    paddingTop: 18,
    paddingHorizontal: 24,
  },
  shutterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
  },
  toolCircleBtn: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  toolCircleBtnActive: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    borderWidth: 1.5,
    borderColor: '#F59E0B',
  },
  toolBtnLabel: {
    fontSize: 9,
    color: '#E2E8F0',
    marginTop: 2,
    fontWeight: '500',
  },
  shutterOuterRing: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 4,
    borderColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  shutterInnerCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmActionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  retakeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  retakeBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  usePhotoBtn: {
    flex: 1.4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#16A34A',
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
  },
  usePhotoBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
