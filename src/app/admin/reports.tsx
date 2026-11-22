import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { AdminBottomNav } from '@/components/AdminBottomNav';
import { AdminHeader } from '@/components/AdminHeader';
import { SafeImage } from '@/components/SafeImage';
import { StatusBadge } from '@/components/StatusBadge';
import { useAuth } from '@/context/AuthContext';
import { useCampusData } from '@/context/CampusDataContext';
import { CampusItem } from '@/types';

/**
 * PRIORITAS 7 — VERIFIKASI LAPORAN KEHILANGAN OLEH ADMIN
 * PRIORITAS 9 & 11 — HUBUNGKAN BARANG HILANG DENGAN BARANG TEMUAN
 * 
 * Admin dapat:
 * 1. Memeriksa laporan kehilangan dari mahasiswa (status: Menunggu Verifikasi)
 * 2. Menyetujui laporan -> diterbitkan ke katalog publik (status: DALAM PENCARIAN)
 * 3. Menolak laporan dengan catatan
 * 4. Menghubungkan laporan barang hilang dengan barang temuan -> status: BARANG DITEMUKAN
 */
export default function AdminLostReportsScreen() {
  const router = useRouter();
  const { isAdminAuthenticated, role, isLoadingAuth } = useAuth();
  const { items, verifyLostReport, linkLostWithFound, updateItemStatus } = useCampusData();

  useEffect(() => {
    if (!isLoadingAuth) {
      if (!isAdminAuthenticated) {
        if (role === 'student') {
          Alert.alert('Akses Ditolak', 'Mahasiswa tidak memiliki izin mengakses panel verifikasi laporan.');
          router.replace('/home');
        } else {
          router.replace('/login');
        }
      }
    }
  }, [isAdminAuthenticated, role, isLoadingAuth]);

  const [filterTab, setFilterTab] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [selectedReport, setSelectedReport] = useState<CampusItem | null>(null);
  const [rejectNotes, setRejectNotes] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [selectedFoundItemId, setSelectedFoundItemId] = useState<string>('');

  // Ambil semua laporan barang hilang
  const lostReports = items.filter((i) => i.type === 'lost');

  // Barang temuan yang aktif (untuk dihubungkan)
  const availableFoundItems = items.filter((i) => i.type === 'found');

  const filteredReports = lostReports.filter((item) => {
    if (filterTab === 'pending') {
      return item.verificationStatus === 'Menunggu Verifikasi';
    }
    if (filterTab === 'approved') {
      return item.verificationStatus === 'Disetujui' || !item.verificationStatus;
    }
    if (filterTab === 'rejected') {
      return item.verificationStatus === 'Ditolak';
    }
    return true;
  });

  const pendingCount = lostReports.filter(
    (i) => i.verificationStatus === 'Menunggu Verifikasi'
  ).length;

  const handleApprove = async (item: CampusItem) => {
    Alert.alert(
      'Konfirmasi Verifikasi',
      `Setujui dan terbitkan laporan kehilangan "${item.title}" ke katalog publik?`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Setujui & Publikasikan',
          onPress: async () => {
            const res = await verifyLostReport(item.id, true);
            Alert.alert('Sukses', res.message);
          },
        },
      ]
    );
  };

  const handleOpenReject = (item: CampusItem) => {
    setSelectedReport(item);
    setRejectNotes('');
    setShowRejectModal(true);
  };

  const handleConfirmReject = async () => {
    if (!selectedReport) return;
    if (!rejectNotes.trim()) {
      Alert.alert('Validasi', 'Mohon isi alasan penolakan laporan.');
      return;
    }

    const res = await verifyLostReport(selectedReport.id, false, rejectNotes.trim());
    setShowRejectModal(false);
    setSelectedReport(null);
    Alert.alert('Laporan Ditolak', res.message);
  };

  const handleOpenLinkModal = (item: CampusItem) => {
    setSelectedReport(item);
    setSelectedFoundItemId('');
    setShowLinkModal(true);
  };

  const handleConfirmLink = async () => {
    if (!selectedReport || !selectedFoundItemId) {
      Alert.alert('Pilih Barang Temuan', 'Silakan pilih barang temuan yang cocok.');
      return;
    }

    const res = await linkLostWithFound(selectedReport.id, selectedFoundItemId);
    setShowLinkModal(false);
    setSelectedReport(null);
    Alert.alert('Berhasil Dihubungkan', res.message);
  };

  if (isLoadingAuth || !isAdminAuthenticated) {
    return null;
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <AdminHeader
        title="Verifikasi Laporan Kehilangan"
        subtitle={`${lostReports.length} laporan kehilangan • ${pendingCount} menunggu verifikasi`}
      />

      {/* Filter Tabs */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabBtn, filterTab === 'all' && styles.tabBtnActive]}
          onPress={() => setFilterTab('all')}
        >
          <Text style={[styles.tabBtnText, filterTab === 'all' && styles.tabBtnTextActive]}>
            Semua ({lostReports.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, filterTab === 'pending' && styles.tabBtnActivePending]}
          onPress={() => setFilterTab('pending')}
        >
          <Text
            style={[
              styles.tabBtnText,
              filterTab === 'pending' && styles.tabBtnTextActivePending,
            ]}
          >
            Menunggu ({pendingCount})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, filterTab === 'approved' && styles.tabBtnActive]}
          onPress={() => setFilterTab('approved')}
        >
          <Text style={[styles.tabBtnText, filterTab === 'approved' && styles.tabBtnTextActive]}>
            Disetujui
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, filterTab === 'rejected' && styles.tabBtnActive]}
          onPress={() => setFilterTab('rejected')}
        >
          <Text style={[styles.tabBtnText, filterTab === 'rejected' && styles.tabBtnTextActive]}>
            Ditolak
          </Text>
        </TouchableOpacity>
      </View>

      {/* Reports List */}
      <FlatList
        data={filteredReports}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          const isPending = item.verificationStatus === 'Menunggu Verifikasi';
          const isFound = item.status === 'BARANG DITEMUKAN';

          return (
            <View style={styles.reportCard}>
              <View style={styles.cardHeader}>
                <View style={styles.reporterBadge}>
                  <Ionicons name="person" size={13} color="#4F46E5" />
                  <Text style={styles.reporterName} numberOfLines={1}>
                    {item.reporter}
                  </Text>
                </View>

                <StatusBadge
                  status={
                    item.verificationStatus === 'Menunggu Verifikasi'
                      ? 'Menunggu Verifikasi'
                      : item.status
                  }
                  size="small"
                />
              </View>

              <View style={styles.cardBody}>
                <SafeImage
                  uri={item.image}
                  fallbackType="lost"
                  style={styles.itemThumb}
                  resizeMode="cover"
                />
                <View style={styles.itemInfo}>
                  <Text style={styles.itemCategory}>{item.category}</Text>
                  <Text style={styles.itemTitle}>{item.title}</Text>
                  <Text style={styles.itemLoc}>📍 {item.location}</Text>
                  <Text style={styles.itemDate}>🕒 {item.date}</Text>
                </View>
              </View>

              <Text style={styles.descText} numberOfLines={3}>
                {item.description}
              </Text>

              {item.additionalInfo ? (
                <View style={styles.additionalBox}>
                  <Text style={styles.additionalText}>
                    ℹ️ Info Tambahan: {item.additionalInfo}
                  </Text>
                </View>
              ) : null}

              {/* Status Barang Ditemukan Indicator */}
              {isFound && (
                <View style={styles.foundAlertBox}>
                  <Ionicons name="link" size={14} color="#1D4ED8" />
                  <Text style={styles.foundAlertText}>
                    Barang ini telah dihubungkan dengan catatan barang temuan!
                  </Text>
                </View>
              )}

              {/* Action Buttons */}
              <View style={styles.actionRow}>
                {isPending ? (
                  <>
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.approveBtn]}
                      onPress={() => handleApprove(item)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" />
                      <Text style={styles.actionBtnText}>Verifikasi</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.actionBtn, styles.rejectBtn]}
                      onPress={() => handleOpenReject(item)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="close-circle" size={16} color="#DC2626" />
                      <Text style={[styles.actionBtnText, { color: '#DC2626' }]}>Tolak</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    {item.status !== 'BARANG DITEMUKAN' && item.status !== 'SELESAI' && (
                      <TouchableOpacity
                        style={[styles.actionBtn, styles.linkBtn]}
                        onPress={() => handleOpenLinkModal(item)}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="link" size={16} color="#2563EB" />
                        <Text style={[styles.actionBtnText, { color: '#2563EB' }]}>
                          Hubungkan Temuan
                        </Text>
                      </TouchableOpacity>
                    )}

                    {item.status === 'BARANG DITEMUKAN' && (
                      <TouchableOpacity
                        style={[styles.actionBtn, styles.doneBtn]}
                        onPress={() => {
                          Alert.alert('Tandai Selesai', 'Tandai laporan ini telah diserahkan & selesai?', [
                            { text: 'Batal', style: 'cancel' },
                            {
                              text: 'Tandai Selesai',
                              onPress: () => updateItemStatus(item.id, 'SELESAI'),
                            },
                          ]);
                        }}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="checkmark-done" size={16} color="#059669" />
                        <Text style={[styles.actionBtnText, { color: '#059669' }]}>
                          Tandai Selesai
                        </Text>
                      </TouchableOpacity>
                    )}
                  </>
                )}

                <TouchableOpacity
                  style={[styles.actionBtn, styles.detailBtn]}
                  onPress={() => router.push(`/item/${item.id}` as any)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.detailBtnText}>Lihat Detail</Text>
                  <Ionicons name="chevron-forward" size={14} color="#64748B" />
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="checkmark-done-circle-outline" size={48} color="#94A3B8" />
            <Text style={styles.emptyTitle}>Tidak ada laporan kehilangan</Text>
            <Text style={styles.emptyDesc}>
              Semua laporan mahasiswa pada filter ini telah diproses dengan baik.
            </Text>
          </View>
        }
      />

      {/* Bottom Navigation Admin */}
      <AdminBottomNav activeTab="claims" />

      {/* Modal Tolak Laporan */}
      <Modal visible={showRejectModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Tolak Laporan Kehilangan</Text>
            <Text style={styles.modalSub}>
              Berikan alasan penolakan agar mahasiswa memahami kendala pada laporannya:
            </Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Contoh: Lokasi tidak jelas / data anomali / terduga laporan ganda"
              placeholderTextColor="#94A3B8"
              value={rejectNotes}
              onChangeText={setRejectNotes}
              multiline
              numberOfLines={3}
            />
            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setShowRejectModal(false)}
              >
                <Text style={styles.modalCancelText}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirmRejectBtn}
                onPress={handleConfirmReject}
              >
                <Text style={styles.modalConfirmRejectText}>Tolak Laporan</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal Hubungkan Barang Hilang dengan Temuan (Prioritas 9 & 11) */}
      <Modal visible={showLinkModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.linkModalHeader}>
              <Ionicons name="git-merge" size={22} color="#2563EB" />
              <Text style={styles.modalTitle}>Hubungkan dengan Barang Temuan</Text>
            </View>
            <Text style={styles.modalSub}>
              Pilih barang temuan yang sesuai dengan laporan "{selectedReport?.title}":
            </Text>

            <ScrollView style={styles.foundItemListScroll}>
              {availableFoundItems.map((fi) => {
                const isSelected = selectedFoundItemId === fi.id;
                return (
                  <TouchableOpacity
                    key={fi.id}
                    style={[styles.foundItemRow, isSelected && styles.foundItemRowSelected]}
                    onPress={() => setSelectedFoundItemId(fi.id)}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={isSelected ? 'radio-button-on' : 'radio-button-off'}
                      size={18}
                      color={isSelected ? '#2563EB' : '#94A3B8'}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.foundItemTitle}>{fi.title}</Text>
                      <Text style={styles.foundItemLoc}>
                        {fi.location} • Status: {fi.status}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setShowLinkModal(false)}
              >
                <Text style={styles.modalCancelText}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalConfirmLinkBtn,
                  !selectedFoundItemId && { opacity: 0.5 },
                ]}
                onPress={handleConfirmLink}
                disabled={!selectedFoundItemId}
              >
                <Text style={styles.modalConfirmLinkText}>Hubungkan</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#1E293B',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  tabBtnActive: {
    backgroundColor: '#334155',
  },
  tabBtnActivePending: {
    backgroundColor: '#B45309',
  },
  tabBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
  },
  tabBtnTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  tabBtnTextActivePending: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  listContent: {
    padding: 16,
    paddingBottom: 80,
  },
  reportCard: {
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  reporterBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#312E81',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  reporterName: {
    color: '#C7D2FE',
    fontSize: 11,
    fontWeight: '700',
  },
  cardBody: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  itemThumb: {
    width: 64,
    height: 64,
    borderRadius: 8,
    backgroundColor: '#334155',
  },
  itemInfo: {
    flex: 1,
  },
  itemCategory: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 2,
  },
  itemLoc: {
    fontSize: 11,
    color: '#CBD5E1',
    marginTop: 2,
  },
  itemDate: {
    fontSize: 11,
    color: '#94A3B8',
  },
  descText: {
    fontSize: 12,
    color: '#CBD5E1',
    lineHeight: 17,
    marginTop: 4,
  },
  additionalBox: {
    backgroundColor: '#0F172A',
    padding: 8,
    borderRadius: 6,
    marginTop: 8,
  },
  additionalText: {
    fontSize: 11,
    color: '#94A3B8',
  },
  foundAlertBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1E3A8A',
    padding: 8,
    borderRadius: 8,
    marginTop: 8,
  },
  foundAlertText: {
    fontSize: 11,
    color: '#93C5FD',
    fontWeight: '600',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  approveBtn: {
    backgroundColor: '#15803D',
  },
  rejectBtn: {
    backgroundColor: '#FEE2E2',
  },
  linkBtn: {
    backgroundColor: '#EFF6FF',
  },
  doneBtn: {
    backgroundColor: '#ECFDF5',
  },
  detailBtn: {
    marginLeft: 'auto',
    backgroundColor: '#0F172A',
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  detailBtnText: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#94A3B8',
    marginTop: 10,
  },
  emptyDesc: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
    maxWidth: 280,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 420,
    borderWidth: 1,
    borderColor: '#334155',
  },
  linkModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  modalSub: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 6,
    marginBottom: 12,
  },
  modalInput: {
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 8,
    padding: 10,
    color: '#FFFFFF',
    fontSize: 13,
    minHeight: 70,
    textAlignVertical: 'top',
  },
  foundItemListScroll: {
    maxHeight: 220,
    marginVertical: 10,
  },
  foundItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#0F172A',
    padding: 10,
    borderRadius: 8,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#334155',
  },
  foundItemRowSelected: {
    borderColor: '#2563EB',
    backgroundColor: '#1E3A8A',
  },
  foundItemTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  foundItemLoc: {
    fontSize: 11,
    color: '#94A3B8',
  },
  modalBtnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 14,
  },
  modalCancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  modalCancelText: {
    color: '#94A3B8',
    fontWeight: '600',
    fontSize: 13,
  },
  modalConfirmRejectBtn: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  modalConfirmRejectText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  modalConfirmLinkBtn: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  modalConfirmLinkText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
});
