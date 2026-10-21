import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import {
  Alert,
  Image,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ApiErrorMessage } from '@/components/ApiErrorMessage';
import { StatusBadge } from '@/components/StatusBadge';
import { STATUS_COLORS } from '@/constants/initialData';
import { useAuth } from '@/context/AuthContext';
import { useCampusData } from '@/context/CampusDataContext';
import { useNetwork } from '@/context/NetworkContext';
import { AppApiError } from '@/services/api/httpErrors';
import { ItemStatus } from '@/types';

export default function ItemDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { getItemById, updateItemStatus, deleteItem } = useCampusData();
  const { isAdminAuthenticated } = useAuth();
  const { connectionState } = useNetwork();

  const [showStatusModal, setShowStatusModal] = useState(false);
  const [actionError, setActionError] = useState<unknown>(null);

  const item = getItemById(id as string);

  if (!item) {
    const errorToDisplay =
      connectionState === 'offline'
        ? new AppApiError({
            isNetworkError: true,
            message: 'Koneksi gagal — server tidak dapat dijangkau.',
          })
        : new AppApiError({
            statusCode: 404,
            message: 'HTTP 404 — Barang yang kamu cari tidak ditemukan.',
          });

    return (
      <View style={[styles.container, styles.center, { padding: 24 }]}>
        <StatusBar style="dark" />
        <ApiErrorMessage
          error={errorToDisplay}
          onRetry={() => router.replace('/explore')}
          containerStyle={{ width: '100%' }}
        />
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
        >
          <Text style={styles.backBtnText}>Kembali ke Katalog</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isLost = item.type === 'lost';
  const DONE_STATUSES = [
    'Sudah Diambil',
    'Selesai',
    'SELESAI',
    'DIAMBIL / SELESAI',
    'Klaim Ditolak',
  ];
  const isItemAvailable =
    item.type === 'found' && !DONE_STATUSES.includes(item.status as string);
  const isUserAdmin = Boolean(isAdminAuthenticated);


  // PRIORITAS 8: Status Barang Hilang dan Temuan Dipisah
  const LOST_STATUSES: ItemStatus[] = [
    'DALAM PENCARIAN',
    'BARANG DITEMUKAN',
    'SELESAI',
  ];

  const FOUND_STATUSES: ItemStatus[] = [
    'TERSEDIA',
    'DIAMBIL / SELESAI',
  ];

  const handleUpdateStatus = async (newStatus: ItemStatus) => {
    try {
      setActionError(null);
      await updateItemStatus(item.id, newStatus);
      setShowStatusModal(false);
      Alert.alert('Sukses', `Status barang diperbarui menjadi: ${newStatus}`);
    } catch (err) {
      setActionError(err);
    }
  };

  const handleDeleteItem = () => {
    Alert.alert(
      'Hapus Barang',
      'Apakah Anda yakin ingin menghapus data laporan barang ini?',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteItem(item.id);
              router.back();
            } catch (err) {
              setActionError(err);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Floating Back Button & Admin Badge */}
      <View
        style={[
          styles.floatingHeader,
          {
            top: Math.max(insets.top, Platform.OS === 'android' ? 24 : 12),
          },
        ]}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.floatingCircleBtn}
          activeOpacity={0.8}
        >
          <Ionicons name="arrow-back" size={20} color="#0F172A" />
        </TouchableOpacity>

        {isAdminAuthenticated && (
          <TouchableOpacity
            style={styles.adminActionPill}
            onPress={() => setShowStatusModal(true)}
          >
            <Ionicons name="construct" size={14} color="#FFFFFF" />
            <Text style={styles.adminActionPillText}>Ubah Status</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Full Image */}
        <View style={styles.imageContainer}>
          <Image source={{ uri: item.image }} style={styles.image} resizeMode="cover" />
          <View
            style={[
              styles.typeBadgeOverlay,
              { backgroundColor: isLost ? '#DC2626' : '#16A34A' },
            ]}
          >
            <Text style={styles.typeBadgeText}>
              {isLost ? 'BARANG HILANG' : 'BARANG TEMUAN'}
            </Text>
          </View>
        </View>

        {/* Content Body */}
        <View style={styles.body}>
          {/* Status & Category */}
          <View style={styles.statusCategoryRow}>
            <StatusBadge status={item.status} size="medium" />
            <Text style={styles.categoryBadge}>{item.category}</Text>
          </View>

          {/* Title */}
          <Text style={styles.title}>{item.title}</Text>

          {/* Info Table */}
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <View style={styles.infoIconBox}>
                <Ionicons name="business" size={16} color="#2563EB" />
              </View>
              <View style={styles.infoTextBox}>
                <Text style={styles.infoLabel}>Lingkup Fakultas / Unit</Text>
                <Text style={styles.infoValue}>{item.faculty}</Text>
              </View>
            </View>

            <View style={styles.infoDivider} />

            <View style={styles.infoRow}>
              <View style={styles.infoIconBox}>
                <Ionicons name="location" size={16} color="#DC2626" />
              </View>
              <View style={styles.infoTextBox}>
                <Text style={styles.infoLabel}>Lokasi Kejadian / Ditemukan</Text>
                <Text style={styles.infoValue}>{item.location}</Text>
              </View>
            </View>

            <View style={styles.infoDivider} />

            <View style={styles.infoRow}>
              <View style={styles.infoIconBox}>
                <Ionicons name="time" size={16} color="#059669" />
              </View>
              <View style={styles.infoTextBox}>
                <Text style={styles.infoLabel}>Waktu Kejadian</Text>
                <Text style={styles.infoValue}>{item.date}</Text>
              </View>
            </View>

            <View style={styles.infoDivider} />

            <View style={styles.infoRow}>
              <View style={styles.infoIconBox}>
                <Ionicons name="shield-checkmark" size={16} color="#D97706" />
              </View>
              <View style={styles.infoTextBox}>
                <Text style={styles.infoLabel}>Pelapor / Penanggung Jawab</Text>
                <Text style={styles.infoValue}>{item.reporter}</Text>
              </View>
            </View>
          </View>

          {/* Description */}
          <Text style={styles.sectionTitle}>Deskripsi & Ciri Khusus</Text>
          <View style={styles.descriptionBox}>
            <Text style={styles.descriptionText}>{item.description}</Text>
          </View>

          {item.reward && (
            <View style={styles.rewardCard}>
              <Ionicons name="gift" size={20} color="#D97706" />
              <View style={{ flex: 1 }}>
                <Text style={styles.rewardTitle}>Imbalan dari Pelapor</Text>
                <Text style={styles.rewardValue}>{item.reward}</Text>
              </View>
            </View>
          )}

          {/* SOP Pengambilan Barang Card */}
          {/* SOP Pengambilan Barang Card */}
          <View style={styles.sopPickupCard}>
            <Ionicons name="shield-checkmark" size={20} color="#2563EB" />
            <View style={{ flex: 1 }}>
              <Text style={styles.sopPickupTitle}>Prosedur Pengambilan Barang</Text>
              <Text style={styles.sopPickupText}>
                Pengambilan barang temuan hanya dilayani langsung oleh Petugas Keamanan di Posko Kampus. Mahasiswa tidak melakukan klaim mandiri melalui aplikasi — silakan datangi posko dengan membawa KTM aktif dan menyebutkan ciri khusus barang.
              </Text>
            </View>
          </View>

          {/* Admin Tools If Logged In */}
          {isAdminAuthenticated && (
            <View style={styles.adminActionCard}>
              <Text style={styles.adminActionTitle}>Menu Pengelola (Admin)</Text>
              <View style={styles.adminActionBtnRow}>
                <TouchableOpacity
                  style={styles.adminStatusBtn}
                  onPress={() => setShowStatusModal(true)}
                >
                  <Ionicons name="swap-horizontal" size={16} color="#FFFFFF" />
                  <Text style={styles.adminStatusBtnText}>Ubah Status</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.adminDeleteBtn}
                  onPress={handleDeleteItem}
                >
                  <Ionicons name="trash-outline" size={16} color="#DC2626" />
                  <Text style={styles.adminDeleteBtnText}>Hapus Data</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Bottom Sticky Action Bar */}
      <View
        style={[
          styles.bottomActionBar,
          {
            paddingBottom: Math.max(insets.bottom, 12),
          },
        ]}
      >
        <TouchableOpacity
          style={styles.sharePoskoBtn}
          activeOpacity={0.7}
          onPress={() =>
            Alert.alert(
              'Posko Keamanan Kampus',
              'Hubungi Pos Satpam Utama: Ext. 101 atau kunjungi Posko di Gerbang Utama Kampus.'
            )
          }
        >
          <Ionicons name="call-outline" size={18} color="#1E293B" />
          <Text style={styles.sharePoskoBtnText}>Posko</Text>
        </TouchableOpacity>

        {isUserAdmin && isItemAvailable ? (
          <TouchableOpacity
            style={styles.mainClaimBtn}
            activeOpacity={0.8}
            onPress={() => router.push(`/claim/${item.id}` as any)}
          >
            <Ionicons name="clipboard-outline" size={18} color="#FFFFFF" />
            <Text style={styles.mainClaimBtnText}>Input Pengambilan (Petugas)</Text>
          </TouchableOpacity>
        ) : !isUserAdmin && isItemAvailable ? (
          <TouchableOpacity
            style={styles.pickupInfoBtn}
            activeOpacity={0.8}
            onPress={() =>
              Alert.alert(
                'Prosedur Pengambilan Barang Temuan',
                'Pengambilan barang temuan harus melalui verifikasi langsung oleh petugas di Posko Keamanan Kampus.\n\nLangkah pengambilan:\n1. Kunjungi Posko Keamanan Kampus.\n2. Bawa Kartu Tanda Mahasiswa (KTM) aktif.\n3. Jelaskan rincian dan ciri khusus barang yang Anda kenali kepada petugas.\n4. Petugas akan memvalidasi bukti kepemilikan dan menyerahkan barang fisik.',
                [{ text: 'Saya Mengerti' }]
              )
            }
          >
            <Ionicons name="information-circle-outline" size={18} color="#FFFFFF" />
            <Text style={styles.pickupInfoBtnText}>Prosedur Pengambilan</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.disabledClaimBtn}>
            <Ionicons name="lock-closed" size={16} color="#94A3B8" />
            <Text style={styles.disabledClaimBtnText}>
              {DONE_STATUSES.includes(item.status as string)
                ? 'Barang Sudah Diambil / Selesai'
                : item.type === 'lost'
                ? `Laporan Kehilangan (${item.status})`
                : 'Pengambilan Tidak Tersedia'}
            </Text>
          </View>
        )}
      </View>

      {/* Modal Ubah Status Admin */}
      <Modal
        visible={showStatusModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowStatusModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Ubah Status Barang</Text>
              <TouchableOpacity onPress={() => setShowStatusModal(false)}>
                <Ionicons name="close" size={24} color="#0F172A" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSub}>
              Pilih status terkini untuk disinkronkan secara real-time ke aplikasi mahasiswa:
            </Text>

            {(item.type === 'lost' ? LOST_STATUSES : FOUND_STATUSES).map((st) => {
              const isCurrent = item.status === st;
              const colorInfo = STATUS_COLORS[st];
              return (
                <TouchableOpacity
                  key={st}
                  style={[
                    styles.statusOption,
                    isCurrent && styles.statusOptionCurrent,
                  ]}
                  onPress={() => handleUpdateStatus(st)}
                >
                  <View
                    style={[
                      styles.statusDot,
                      { backgroundColor: colorInfo?.text || '#2563EB' },
                    ]}
                  />
                  <Text
                    style={[
                      styles.statusOptionText,
                      isCurrent && styles.statusOptionTextCurrent,
                    ]}
                  >
                    {st}
                  </Text>
                  {isCurrent && (
                    <Ionicons name="checkmark-circle" size={18} color="#2563EB" />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  notFoundTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 12,
  },
  notFoundDesc: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 20,
  },
  backBtn: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  backBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  floatingHeader: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  floatingCircleBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  adminActionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4F46E5',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  adminActionPillText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  scrollContent: {
    paddingBottom: 100,
  },
  imageContainer: {
    width: '100%',
    height: 280,
    backgroundColor: '#F1F5F9',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  typeBadgeOverlay: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  typeBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  body: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -20,
  },
  statusCategoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  categoryBadge: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    lineHeight: 26,
    marginBottom: 16,
  },
  infoCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  infoTextBox: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
    textTransform: 'uppercase',
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 1,
  },
  infoDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
  },
  descriptionBox: {
    backgroundColor: '#F8FAFC',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  descriptionText: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 20,
  },
  rewardCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    padding: 12,
    borderRadius: 12,
    gap: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  rewardTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#B45309',
  },
  rewardValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#92400E',
    marginTop: 1,
  },
  sopPickupCard: {
    flexDirection: 'row',
    backgroundColor: '#EFF6FF',
    padding: 14,
    borderRadius: 14,
    gap: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    alignItems: 'flex-start',
  },
  sopPickupTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E3A8A',
    marginBottom: 4,
  },
  sopPickupText: {
    fontSize: 12,
    color: '#1E40AF',
    lineHeight: 18,
  },
  adminActionCard: {
    backgroundColor: '#F1F5F9',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    marginTop: 8,
  },
  adminActionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 10,
  },
  adminActionBtnRow: {
    flexDirection: 'row',
    gap: 10,
  },
  adminStatusBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4F46E5',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  adminStatusBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  adminDeleteBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  adminDeleteBtnText: {
    color: '#DC2626',
    fontSize: 12,
    fontWeight: '700',
  },
  bottomActionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingHorizontal: 16,
    paddingTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 8,
  },
  sharePoskoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
  },
  sharePoskoBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  mainClaimBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563EB',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  mainClaimBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  pickupInfoBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0284C7',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  pickupInfoBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  disabledClaimBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
  },
  disabledClaimBtnText: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalSub: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 16,
  },
  statusOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  statusOptionCurrent: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 10,
  },
  statusOptionText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#1E293B',
  },
  statusOptionTextCurrent: {
    color: '#2563EB',
    fontWeight: '700',
  },
});
