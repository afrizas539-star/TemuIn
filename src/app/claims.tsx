import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react'; // <-- Ditambahkan useEffect di sini
import {
  FlatList,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { StudentBottomNav } from '@/components/StudentBottomNav';
import { useAuth } from '@/context/AuthContext';
import { useCampusData } from '@/context/CampusDataContext';
import { ClaimRequest } from '@/types';

export default function StudentClaimsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, isAuthenticated, isLoadingAuth } = useAuth();
  const { claims } = useCampusData();

  useEffect(() => {
    if (!isLoadingAuth && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, isLoadingAuth]);

  // Filter klaim milik mahasiswa yang aktif
  const studentClaims = claims.filter(
    (c) => !c.userId || c.userId === user?.id || c.studentNim === user?.nim || c.studentName === user?.name
  );

  const [selectedClaim, setSelectedClaim] = useState<ClaimRequest | null>(null);

  const getStatusBadgeStyle = (status: ClaimRequest['status']) => {
    switch (status) {
      case 'Terverifikasi':
        return { bg: '#DCFCE7', text: '#15803D', border: '#86EFAC' };
      case 'Klaim Ditolak':
        return { bg: '#FEE2E2', text: '#B91C1C', border: '#FCA5A5' };
      default:
        return { bg: '#FEF3C7', text: '#B45309', border: '#FDE68A' };
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      {/* Header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: Math.max(insets.top, Platform.OS === 'android' ? 24 : 12),
          },
        ]}
      >
        <Text style={styles.headerTitle}>Status Klaim Saya</Text>
        <Text style={styles.headerSubtitle}>
          Pantau proses verifikasi barang di Universitas Muhammadiyah Malang
        </Text>
      </View>

      {/* Info Card */}
      <View style={styles.infoBanner}>
        <Ionicons name="shield-checkmark" size={20} color="#2563EB" />
        <View style={styles.infoBannerTextWrap}>
          <Text style={styles.infoBannerTitle}>Verifikasi Dokumen Oleh Satpam UMM</Text>
          <Text style={styles.infoBannerDesc}>
            Pengajuan klaim diperiksa secara manual oleh petugas keamanan Universitas Muhammadiyah Malang. Jika disetujui, bawa KTM fisik untuk serah terima barang.
          </Text>
        </View>
      </View>

      {/* Claims List */}
      <FlatList
        data={studentClaims}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          const badge = getStatusBadgeStyle(item.status);
          return (
            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.claimCard}
              onPress={() => setSelectedClaim(item)}
            >
              <View style={styles.cardHeader}>
                <View style={styles.itemTitleWrap}>
                  <Text style={styles.itemCategory}>{item.itemCategory}</Text>
                  <Text style={styles.itemTitle} numberOfLines={1}>
                    {item.itemTitle}
                  </Text>
                </View>

                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: badge.bg, borderColor: badge.border },
                  ]}
                >
                  <Text style={[styles.statusBadgeText, { color: badge.text }]}>
                    {item.status}
                  </Text>
                </View>
              </View>

              <View style={styles.cardBody}>
                <View style={styles.detailRow}>
                  <Ionicons name="person-outline" size={13} color="#64748B" />
                  <Text style={styles.detailText}>
                    {item.studentName} ({item.studentNim})
                  </Text>
                </View>

                <View style={styles.detailRow}>
                  <Ionicons name="calendar-outline" size={13} color="#64748B" />
                  <Text style={styles.detailText}>Diajukan: {item.createdAt}</Text>
                </View>

                {item.adminNotes ? (
                  <View style={styles.notesBox}>
                    <Text style={styles.notesLabel}>Catatan Petugas:</Text>
                    <Text style={styles.notesContent}>{item.adminNotes}</Text>
                  </View>
                ) : null}
              </View>

              <View style={styles.cardFooter}>
                <Text style={styles.clickHintText}>Ketuk untuk lihat detail & instruksi</Text>
                <Ionicons name="chevron-forward" size={14} color="#2563EB" />
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="document-text-outline" size={48} color="#94A3B8" />
            <Text style={styles.emptyTitle}>Belum Ada Pengajuan Klaim</Text>
            <Text style={styles.emptySubtitle}>
              Jika Anda menemukan barang yang cocok di katalog kampus, silakan kunjungi Posko Keamanan Kampus dengan membawa KTM aktif untuk verifikasi dan serah terima oleh petugas.
            </Text>
            <TouchableOpacity
              style={styles.browseBtn}
              onPress={() => router.push('/')}
            >
              <Text style={styles.browseBtnText}>Buka Katalog Barang</Text>
            </TouchableOpacity>
          </View>
        }
      />

      <StudentBottomNav activeTab="claims" />

      {/* Modal Detail Klaim */}
      <Modal
        visible={selectedClaim !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedClaim(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedClaim && (
              <>
                <View style={styles.modalTop}>
                  <View>
                    <Text style={styles.modalHeading}>Detail Pengajuan Klaim</Text>
                    <Text style={styles.modalSubheading}>{selectedClaim.id}</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setSelectedClaim(null)}
                    style={styles.closeModalBtn}
                  >
                    <Ionicons name="close" size={22} color="#0F172A" />
                  </TouchableOpacity>
                </View>

                <View style={styles.claimStatusSummary}>
                  <Text style={styles.summaryLabel}>Status Terkini:</Text>
                  <View
                    style={[
                      styles.statusBadge,
                      {
                        backgroundColor: getStatusBadgeStyle(selectedClaim.status).bg,
                        borderColor: getStatusBadgeStyle(selectedClaim.status).border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusBadgeText,
                        { color: getStatusBadgeStyle(selectedClaim.status).text },
                      ]}
                    >
                      {selectedClaim.status}
                    </Text>
                  </View>
                </View>

                <View style={styles.infoBlock}>
                  <Text style={styles.blockLabel}>Barang yang Diklaim:</Text>
                  <Text style={styles.blockValueBold}>{selectedClaim.itemTitle}</Text>
                  <Text style={styles.blockValueSub}>
                    Kategori: {selectedClaim.itemCategory}
                  </Text>
                </View>

                <View style={styles.infoBlock}>
                  <Text style={styles.blockLabel}>Data Pengaju:</Text>
                  <Text style={styles.blockValue}>
                    {selectedClaim.studentName} (NIM: {selectedClaim.studentNim})
                  </Text>
                  <Text style={styles.blockValueSub}>{selectedClaim.studentFaculty}</Text>
                  <Text style={styles.blockValueSub}>WhatsApp: {selectedClaim.studentPhone}</Text>
                </View>

                <View style={styles.infoBlock}>
                  <Text style={styles.blockLabel}>Ciri Bukti Kepemilikan:</Text>
                  <Text style={styles.blockValueDesc}>{selectedClaim.proofDetails}</Text>
                </View>

                {selectedClaim.status === 'Terverifikasi' ? (
                  <View style={styles.instructionBoxVerified}>
                    <Ionicons name="checkmark-circle" size={20} color="#15803D" />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.instructionTitleVerified}>
                        Barang Siap Diserahkan!
                      </Text>
                      <Text style={styles.instructionDescVerified}>
                        Silakan datangi Pos Satpam Kampus (Gedung Rektorat Lt. 1) dengan menunjukkan KTM fisik asli Anda.
                      </Text>
                    </View>
                  </View>
                ) : selectedClaim.status === 'Klaim Ditolak' ? (
                  <View style={styles.instructionBoxRejected}>
                    <Ionicons name="close-circle" size={20} color="#B91C1C" />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.instructionTitleRejected}>Klaim Ditolak</Text>
                      <Text style={styles.instructionDescRejected}>
                        {selectedClaim.adminNotes ||
                          'Data atau bukti tidak sesuai dengan fisik barang yang diamankan.'}
                      </Text>
                    </View>
                  </View>
                ) : (
                  <View style={styles.instructionBoxPending}>
                    <Ionicons name="time" size={20} color="#B45309" />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.instructionTitlePending}>Dalam Proses Verifikasi</Text>
                      <Text style={styles.instructionDescPending}>
                        Petugas posko sedang mencocokkan data kepemilikan. Pantau halaman ini secara berkala.
                      </Text>
                    </View>
                  </View>
                )}

                <TouchableOpacity
                  style={styles.modalClosePrimaryBtn}
                  onPress={() => setSelectedClaim(null)}
                >
                  <Text style={styles.modalClosePrimaryBtnText}>Tutup</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.4,
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  infoBanner: {
    flexDirection: 'row',
    backgroundColor: '#EFF6FF',
    borderRadius: 14,
    padding: 12,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    gap: 10,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  infoBannerTextWrap: {
    flex: 1,
  },
  infoBannerTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E40AF',
    marginBottom: 2,
  },
  infoBannerDesc: {
    fontSize: 11,
    color: '#3B82F6',
    lineHeight: 16,
  },
  listContent: {
    padding: 16,
    paddingBottom: 24,
  },
  claimCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  itemTitleWrap: {
    flex: 1,
    marginRight: 10,
  },
  itemCategory: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  cardBody: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC',
    gap: 6,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: 12,
    color: '#475569',
  },
  notesBox: {
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 8,
    marginTop: 6,
    borderLeftWidth: 3,
    borderLeftColor: '#2563EB',
  },
  notesLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
  },
  notesContent: {
    fontSize: 12,
    color: '#1E293B',
    marginTop: 2,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  clickHintText: {
    fontSize: 11,
    color: '#2563EB',
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#334155',
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 19,
    marginBottom: 20,
  },
  browseBtn: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  browseBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
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
    maxHeight: '90%',
  },
  modalTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  modalHeading: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalSubheading: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  closeModalBtn: {
    padding: 4,
  },
  claimStatusSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  summaryLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  infoBlock: {
    marginBottom: 12,
  },
  blockLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 2,
  },
  blockValueBold: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  blockValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E293B',
  },
  blockValueSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
  },
  blockValueDesc: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 18,
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 8,
    marginTop: 4,
  },
  instructionBoxVerified: {
    flexDirection: 'row',
    backgroundColor: '#DCFCE7',
    padding: 12,
    borderRadius: 12,
    gap: 10,
    marginTop: 6,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  instructionTitleVerified: {
    fontSize: 13,
    fontWeight: '700',
    color: '#15803D',
  },
  instructionDescVerified: {
    fontSize: 12,
    color: '#166534',
    marginTop: 2,
    lineHeight: 17,
  },
  instructionBoxRejected: {
    flexDirection: 'row',
    backgroundColor: '#FEE2E2',
    padding: 12,
    borderRadius: 12,
    gap: 10,
    marginTop: 6,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  instructionTitleRejected: {
    fontSize: 13,
    fontWeight: '700',
    color: '#B91C1C',
  },
  instructionDescRejected: {
    fontSize: 12,
    color: '#991B1B',
    marginTop: 2,
    lineHeight: 17,
  },
  instructionBoxPending: {
    flexDirection: 'row',
    backgroundColor: '#FEF3C7',
    padding: 12,
    borderRadius: 12,
    gap: 10,
    marginTop: 6,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  instructionTitlePending: {
    fontSize: 13,
    fontWeight: '700',
    color: '#B45309',
  },
  instructionDescPending: {
    fontSize: 12,
    color: '#92400E',
    marginTop: 2,
    lineHeight: 17,
  },
  modalClosePrimaryBtn: {
    backgroundColor: '#0F172A',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalClosePrimaryBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});