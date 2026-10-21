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
import { ApiErrorMessage } from '@/components/ApiErrorMessage';
import { useAuth } from '@/context/AuthContext';
import { useCampusData } from '@/context/CampusDataContext';
import { ClaimRequest, ClaimStatus } from '@/types';

export default function AdminClaimsScreen() {
  const router = useRouter();
  const { isAdminAuthenticated, isLoadingAuth } = useAuth();
  const { claims, verifyClaim } = useCampusData();

  useEffect(() => {
    if (!isLoadingAuth && !isAdminAuthenticated) {
      router.replace('/admin/login');
    }
  }, [isAdminAuthenticated, isLoadingAuth]);

  const [filterStatus, setFilterStatus] = useState<string>('Semua');
  const [selectedClaim, setSelectedClaim] = useState<ClaimRequest | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showFullIdCard, setShowFullIdCard] = useState(false);
  const [verifyError, setVerifyError] = useState<unknown>(null);

  const filteredClaims = claims.filter((c) => {
    if (filterStatus === 'Semua') return true;
    return c.status === filterStatus;
  });

  const handleOpenDetail = (claim: ClaimRequest) => {
    setSelectedClaim(claim);
    setAdminNotes(claim.adminNotes || '');
  };

  const handleVerify = async (approved: boolean) => {
    if (!selectedClaim) return;

    if (!approved && !adminNotes.trim()) {
      Alert.alert(
        'Catatan Penolakan Wajib Diisi',
        'Mohon berikan alasan penolakan agar mahasiswa mengetahui ketidaksesuaian klaim.'
      );
      return;
    }

    try {
      setIsProcessing(true);
      setVerifyError(null);
      const res = await verifyClaim(selectedClaim.id, approved, adminNotes.trim());
      if (res.success) {
        Alert.alert('Sukses', res.message);
        setSelectedClaim(null);
      } else {
        setVerifyError(res.message || 'Terjadi kesalahan saat memverifikasi klaim.');
      }
    } catch (e) {
      setVerifyError(e);
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusBadge = (st: ClaimStatus) => {
    switch (st) {
      case 'Terverifikasi':
        return { bg: '#DCFCE7', text: '#15803D', border: '#86EFAC' };
      case 'Klaim Ditolak':
        return { bg: '#FEE2E2', text: '#B91C1C', border: '#FCA5A5' };
      default:
        return { bg: '#FEF3C7', text: '#B45309', border: '#FDE68A' };
    }
  };

  if (isLoadingAuth || !isAdminAuthenticated) {
    return null;
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <AdminHeader
        title="Verifikasi Klaim Mahasiswa"
        subtitle={`${claims.length} permohonan klaim • Universitas Muhammadiyah Malang`}
      />

      {/* Filter Tabs */}
      <View style={styles.filterBar}>
        {['Semua', 'Menunggu Verifikasi', 'Terverifikasi', 'Klaim Ditolak'].map((tab) => {
          const isActive = filterStatus === tab;
          return (
            <TouchableOpacity
              key={tab}
              style={[styles.filterChip, isActive && styles.filterChipActive]}
              onPress={() => setFilterStatus(tab)}
            >
              <Text style={[styles.filterText, isActive && styles.filterTextActive]}>
                {tab}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Claims List */}
      <FlatList
        data={filteredClaims}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          const badge = getStatusBadge(item.status);
          return (
            <TouchableOpacity
              style={styles.claimCard}
              activeOpacity={0.8}
              onPress={() => handleOpenDetail(item)}
            >
              <View style={styles.cardTopRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardCategory}>{item.itemCategory}</Text>
                  <Text style={styles.cardItemTitle} numberOfLines={1}>
                    {item.itemTitle}
                  </Text>
                </View>

                <View
                  style={[
                    styles.statusPill,
                    { backgroundColor: badge.bg, borderColor: badge.border },
                  ]}
                >
                  <Text style={[styles.statusPillText, { color: badge.text }]}>
                    {item.status}
                  </Text>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.infoRow}>
                <Ionicons name="person" size={14} color="#4F46E5" />
                <Text style={styles.infoName}>
                  {item.studentName} • NIM {item.studentNim}
                </Text>
              </View>

              <View style={styles.infoRow}>
                <Ionicons name="school-outline" size={14} color="#64748B" />
                <Text style={styles.infoSub}>{item.studentFaculty}</Text>
              </View>

              <View style={styles.infoRow}>
                <Ionicons name="call-outline" size={14} color="#64748B" />
                <Text style={styles.infoSub}>WA: {item.studentPhone}</Text>
              </View>

              {/* SENSITIVE KTM BADGE INDICATOR */}
              <View style={styles.ktmAttachedBadge}>
                <Ionicons name="card" size={13} color="#B45309" />
                <Text style={styles.ktmAttachedText}>Foto KTM/KTP Terlampir (Khusus Petugas)</Text>
              </View>

              <View style={styles.cardFooter}>
                <Text style={styles.submittedAt}>{item.createdAt}</Text>
                <View style={styles.reviewBtn}>
                  <Text style={styles.reviewBtnText}>Periksa Data & KTM</Text>
                  <Ionicons name="chevron-forward" size={13} color="#4F46E5" />
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="file-tray-outline" size={48} color="#94A3B8" />
            <Text style={styles.emptyTitle}>Tidak ada klaim</Text>
            <Text style={styles.emptySub}>
              Tidak ada permohonan klaim dengan filter status ini.
            </Text>
          </View>
        }
      />

      <AdminBottomNav activeTab="claims" />

      {/* Modal Detail Verifikasi & Review KTM */}
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
                <View style={styles.modalHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalHeading}>Verifikasi Identitas Mahasiswa</Text>
                    <Text style={styles.modalSubheading}>
                      ID Klaim: {selectedClaim.id} • {selectedClaim.createdAt}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setSelectedClaim(null)}
                    style={styles.closeBtn}
                  >
                    <Ionicons name="close" size={24} color="#0F172A" />
                  </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false}>
                  {/* Barang Target */}
                  <View style={styles.targetItemBox}>
                    <Text style={styles.targetLabel}>Barang yang Diklaim:</Text>
                    <Text style={styles.targetTitle}>{selectedClaim.itemTitle}</Text>
                    <Text style={styles.targetCategory}>
                      Kategori: {selectedClaim.itemCategory}
                    </Text>
                  </View>

                  {/* Data Mahasiswa */}
                  <View style={styles.sectionBox}>
                    <Text style={styles.boxTitle}>Data Mahasiswa Pengaju</Text>
                    <View style={styles.dataGrid}>
                      <Text style={styles.dataKey}>Nama Lengkap:</Text>
                      <Text style={styles.dataVal}>{selectedClaim.studentName}</Text>
                    </View>
                    <View style={styles.dataGrid}>
                      <Text style={styles.dataKey}>NIM Kampus:</Text>
                      <Text style={styles.dataVal}>{selectedClaim.studentNim}</Text>
                    </View>
                    <View style={styles.dataGrid}>
                      <Text style={styles.dataKey}>Fakultas / Prodi:</Text>
                      <Text style={styles.dataVal}>{selectedClaim.studentFaculty}</Text>
                    </View>
                    <View style={styles.dataGrid}>
                      <Text style={styles.dataKey}>No WhatsApp:</Text>
                      <Text style={styles.dataVal}>{selectedClaim.studentPhone}</Text>
                    </View>
                  </View>

                  {/* Bukti Ciri Khusus */}
                  <View style={styles.sectionBox}>
                    <Text style={styles.boxTitle}>Rincian Ciri Khusus (Bukti Kepemilikan)</Text>
                    <Text style={styles.proofText}>{selectedClaim.proofDetails}</Text>
                  </View>

                  {/* FOTO SENSITIF KTM/KTP (ADMIN ONLY) */}
                  <View style={[styles.sectionBox, styles.sensitiveSection]}>
                    <View style={styles.sensitiveHeaderRow}>
                      <Ionicons name="shield-checkmark" size={16} color="#B45309" />
                      <Text style={styles.sensitiveHeading}>
                        Foto KTM / KTP Terlampir (Data Rahasia)
                      </Text>
                    </View>
                    <Text style={styles.sensitiveHint}>
                      Cocokkan Nama ({selectedClaim.studentName}) dan NIM ({selectedClaim.studentNim}) pada foto kartu identitas ini:
                    </Text>

                    {selectedClaim.idCardImage ? (
                      <TouchableOpacity
                        activeOpacity={0.9}
                        onPress={() => setShowFullIdCard(true)}
                        style={styles.ktmImageWrapper}
                      >
                        <Image
                          source={{ uri: selectedClaim.idCardImage }}
                          style={styles.ktmImage}
                          resizeMode="cover"
                        />
                        <View style={styles.zoomHintBadge}>
                          <Ionicons name="scan-outline" size={14} color="#FFFFFF" />
                          <Text style={styles.zoomHintText}>Ketuk untuk Perbesar</Text>
                        </View>
                      </TouchableOpacity>
                    ) : (
                      <View style={styles.noKtmBox}>
                        <Text style={styles.noKtmText}>Tidak ada foto KTM yang diunggah.</Text>
                      </View>
                    )}
                  </View>

                  {/* ApiErrorMessage jika verifikasi gagal */}
                  <ApiErrorMessage
                    error={verifyError}
                    onDismiss={() => setVerifyError(null)}
                  />

                  {/* Admin Notes Input */}
                  <View style={styles.sectionBox}>
                    <Text style={styles.boxTitle}>Catatan Petugas (Opsional untuk Setuju, Wajib jika Ditolak)</Text>
                    <TextInput
                      style={styles.notesInput}
                      placeholder="Masukkan catatan verifikasi atau alasan penolakan..."
                      placeholderTextColor="#94A3B8"
                      multiline
                      numberOfLines={3}
                      value={adminNotes}
                      onChangeText={setAdminNotes}
                    />
                  </View>

                  {/* Action Buttons */}
                  <View style={styles.modalActionButtons}>
                    <TouchableOpacity
                      style={[styles.approveBtn, isProcessing && { opacity: 0.6 }]}
                      onPress={() => handleVerify(true)}
                      disabled={isProcessing}
                    >
                      <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
                      <Text style={styles.approveBtnText}>
                        {isProcessing ? 'Memproses...' : 'Setujui & Verifikasi'}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.rejectBtn, isProcessing && { opacity: 0.6 }]}
                      onPress={() => handleVerify(false)}
                      disabled={isProcessing}
                    >
                      <Ionicons name="close-circle" size={18} color="#DC2626" />
                      <Text style={styles.rejectBtnText}>Tolak Klaim</Text>
                    </TouchableOpacity>
                  </View>
                </ScrollView>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Modal Fullscreen Foto KTM/KTP */}
      <Modal
        visible={showFullIdCard && selectedClaim !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setShowFullIdCard(false)}
      >
        <View style={styles.fullImageOverlay}>
          <TouchableOpacity
            style={styles.closeFullImageBtn}
            onPress={() => setShowFullIdCard(false)}
          >
            <Ionicons name="close-circle" size={32} color="#FFFFFF" />
          </TouchableOpacity>

          {selectedClaim?.idCardImage && (
            <Image
              source={{ uri: selectedClaim.idCardImage }}
              style={styles.fullIdImage}
              resizeMode="contain"
            />
          )}
          <Text style={styles.fullImageCaption}>
            KTM a.n {selectedClaim?.studentName} ({selectedClaim?.studentNim})
          </Text>
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
  filterBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
  },
  filterChipActive: {
    backgroundColor: '#4F46E5',
  },
  filterText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  filterTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  listContent: {
    padding: 16,
    paddingBottom: 30,
  },
  claimCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardCategory: {
    fontSize: 10,
    fontWeight: '700',
    color: '#4F46E5',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cardItemTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 2,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 10,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  infoName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  infoSub: {
    fontSize: 12,
    color: '#64748B',
  },
  ktmAttachedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 6,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  ktmAttachedText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#92400E',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC',
  },
  submittedAt: {
    fontSize: 11,
    color: '#94A3B8',
  },
  reviewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  reviewBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4F46E5',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#334155',
    marginTop: 12,
  },
  emptySub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '90%',
  },
  modalHeader: {
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
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },
  targetItemBox: {
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  targetLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#2563EB',
    textTransform: 'uppercase',
  },
  targetTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E40AF',
    marginTop: 2,
  },
  targetCategory: {
    fontSize: 11,
    color: '#3B82F6',
    marginTop: 1,
  },
  sectionBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  boxTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 8,
  },
  dataGrid: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  dataKey: {
    width: 110,
    fontSize: 12,
    color: '#64748B',
  },
  dataVal: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: '#0F172A',
  },
  proofText: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 18,
  },
  sensitiveSection: {
    backgroundColor: '#FFFDF5',
    borderColor: '#FDE68A',
  },
  sensitiveHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  sensitiveHeading: {
    fontSize: 12,
    fontWeight: '800',
    color: '#92400E',
  },
  sensitiveHint: {
    fontSize: 11,
    color: '#B45309',
    marginBottom: 10,
    lineHeight: 16,
  },
  ktmImageWrapper: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#FCD34D',
    position: 'relative',
    height: 180,
    backgroundColor: '#FEF3C7',
  },
  ktmImage: {
    width: '100%',
    height: '100%',
  },
  zoomHintBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  zoomHintText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  noKtmBox: {
    padding: 16,
    alignItems: 'center',
  },
  noKtmText: {
    color: '#94A3B8',
    fontSize: 12,
  },
  notesInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    padding: 10,
    fontSize: 12,
    color: '#0F172A',
    height: 70,
    textAlignVertical: 'top',
  },
  modalActionButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
    marginBottom: 20,
  },
  approveBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#16A34A',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
  },
  approveBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  rejectBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
  },
  rejectBtnText: {
    color: '#DC2626',
    fontSize: 13,
    fontWeight: '700',
  },
  fullImageOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.92)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  closeFullImageBtn: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 10,
  },
  fullIdImage: {
    width: '100%',
    height: '75%',
  },
  fullImageCaption: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 16,
  },
});
