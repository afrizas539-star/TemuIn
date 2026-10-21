import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ConnectionStatus } from '@/components/ConnectionStatus';
import { ItemCard } from '@/components/ItemCard';
import { StatusBadge } from '@/components/StatusBadge';
import { StudentBottomNav } from '@/components/StudentBottomNav';
import { CAMPUS_CATEGORIES } from '@/constants/initialData';
import { useAuth } from '@/context/AuthContext';
import { useCampusData } from '@/context/CampusDataContext';
import { useNetwork } from '@/context/NetworkContext';

/**
 * HOME MAHASISWA — TEMUIN UNIVERSITAS MUHAMMADIYAH MALANG
 *
 * Komponen:
 * 1. Top Bar: Logo resmi TemuIn UMM + Judul + Universitas + Tombol Info Posko
 * 2. Sapaan Mahasiswa & Indikator Status Koneksi (Online / Menghubungkan / Server Tidak Tersedia / Offline)
 * 3. Banner Informasi Kampus UMM ("Temukan • Laporkan • Bertemu")
 * 4. Ringkasan Statistik Barang Kampus Real-time
 * 5. Akses Cepat (Shortcut): Lapor Kehilangan & Explore Temuan
 * 6. Status Laporan Milik Mahasiswa Sendiri
 * 7. Search Bar & Filter Kategori Horizontal
 * 8. Katalog Barang Kampus dengan Navigasi Detail Kartu
 * 9. Navigasi Bawah Terpadu (Home, Explore, Klaim, Bantuan)
 */
export default function StudentHomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, isAuthenticated, role, isLoadingAuth } = useAuth();
  const { items, isLoading, refreshData } = useCampusData();
  const { connectionState } = useNetwork();

  // Route Protection (Wajib Login & Role Student)
  useEffect(() => {
    if (!isLoadingAuth) {
      if (!isAuthenticated || !user) {
        router.replace('/login');
      } else if (role === 'admin') {
        router.replace('/admin/dashboard');
      }
    }
  }, [isAuthenticated, role, isLoadingAuth, user]);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Semua');
  const [filterType, setFilterType] = useState<'all' | 'lost' | 'found'>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showPoskoModal, setShowPoskoModal] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshData();
    setIsRefreshing(false);
  };

  // Laporan kehilangan milik mahasiswa yang sedang login
  const myReports = items.filter(
    (item) =>
      item.type === 'lost' &&
      (item.userId === user?.id ||
        (user?.name && item.reporter?.toLowerCase().includes(user.name.toLowerCase())))
  );

  // Katalog publik: Barang temuan + barang hilang yang disetujui
  const publicItems = items.filter((item) => {
    if (item.type === 'found') return true;
    return item.verificationStatus === 'Disetujui' || !item.verificationStatus;
  });

  // Statistik Real-time dari data aplikasi yang sebenarnya
  const totalFoundCount = items.filter(
    (i) => i.type === 'found' && (i.status === 'TERSEDIA' || i.status === 'Barang Ditemukan')
  ).length;
  const totalLostCount = items.filter((i) => i.type === 'lost').length;
  const myReportsCount = myReports.length;

  // Filter katalog berdasarkan kata kunci, kategori, dan tipe
  const filteredItems = publicItems.filter((item) => {
    const matchCategory =
      selectedCategory === 'Semua' || item.category === selectedCategory;
    const matchType = filterType === 'all' || item.type === filterType;
    const q = searchQuery.toLowerCase().trim();
    const matchSearch =
      !q ||
      item.title.toLowerCase().includes(q) ||
      item.location.toLowerCase().includes(q) ||
      item.faculty.toLowerCase().includes(q) ||
      item.description.toLowerCase().includes(q) ||
      item.status.toLowerCase().includes(q);
    return matchCategory && matchType && matchSearch;
  });

  if (isLoadingAuth || !isAuthenticated || role !== 'student') {
    return null;
  }

  const renderHeader = () => (
    <View style={styles.headerContent}>
      {/* 1. Sapaan Mahasiswa & Indikator Status Koneksi Compact */}
      <View style={styles.greetingRow}>
        <View style={styles.greetingTextWrap}>
          <Text style={styles.greetingSub}>Selamat Datang,</Text>
          <Text style={styles.greetingName} numberOfLines={1}>
            {user?.name || 'Mahasiswa Kampus'}
          </Text>
          <Text style={styles.greetingMeta} numberOfLines={1}>
            {user?.nim ? `NIM: ${user.nim} • ` : ''}Universitas Muhammadiyah Malang
          </Text>
        </View>

        {/* Indikator Status Koneksi Compact di pojok kanan (Hanya pill, tanpa banner pemecah layout) */}
        <ConnectionStatus compact />
      </View>

      {/* 2. Banner Notifikasi Offline / Server Tidak Tersedia (Full Width, Diluar Row) */}
      {(connectionState === 'offline' || connectionState === 'server_unavailable') && (
        <View style={styles.connectionAlertWrap}>
          <ConnectionStatus compact={false} showOfflineNotice={true} />
        </View>
      )}

      {/* 3. Banner Utama TemuIn */}
      <View style={styles.bannerContainer}>
        <View style={styles.bannerDecorCircle} />
        <View style={styles.bannerContent}>
          <View style={styles.bannerBadge}>
            <Ionicons name="sparkles" size={12} color="#FFFFFF" />
            <Text style={styles.bannerBadgeText}>UNIVERSITAS MUHAMMADIYAH MALANG</Text>
          </View>
          <Text style={styles.bannerTitle}>Temukan • Laporkan • Bertemu</Text>
          <Text style={styles.bannerDesc}>
            Layanan resmi pelaporan barang hilang dan temuan untuk civitas akademika Universitas Muhammadiyah Malang.
          </Text>
          <View style={styles.bannerBtnRow}>
            <TouchableOpacity
              style={styles.bannerActionBtn}
              onPress={() => router.push('/report-lost')}
              activeOpacity={0.85}
            >
              <Ionicons name="add-circle" size={16} color="#0266B3" />
              <Text style={styles.bannerActionBtnText}>Lapor Kehilangan</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* 4. Ringkasan Jumlah Barang & Laporan Kampus (Real Application Data) */}
      <View style={styles.statsSummaryRow}>
        <TouchableOpacity
          style={styles.statBox}
          activeOpacity={0.7}
          onPress={() => setFilterType('found')}
        >
          <View style={[styles.statIconBadge, { backgroundColor: '#DCFCE7' }]}>
            <Ionicons name="archive" size={16} color="#15803D" />
          </View>
          <Text style={styles.statNumber}>{totalFoundCount}</Text>
          <Text style={styles.statLabel}>Temuan Aktif</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.statBox}
          activeOpacity={0.7}
          onPress={() => setFilterType('lost')}
        >
          <View style={[styles.statIconBadge, { backgroundColor: '#FEE2E2' }]}>
            <Ionicons name="alert-circle" size={16} color="#DC2626" />
          </View>
          <Text style={styles.statNumber}>{totalLostCount}</Text>
          <Text style={styles.statLabel}>Laporan Hilang</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.statBox}
          activeOpacity={0.7}
          onPress={() => {
            if (myReports.length > 0) {
              setFilterType('lost');
            } else {
              router.push('/report-lost');
            }
          }}
        >
          <View style={[styles.statIconBadge, { backgroundColor: '#EFF6FF' }]}>
            <Ionicons name="newspaper" size={16} color="#2563EB" />
          </View>
          <Text style={styles.statNumber}>{myReportsCount}</Text>
          <Text style={styles.statLabel}>Laporan Saya</Text>
        </TouchableOpacity>
      </View>

      {/* 5. Akses Cepat (Shortcut Grid) */}
      <View style={styles.shortcutGrid}>
        <TouchableOpacity
          style={[styles.shortcutCard, styles.shortcutCardRed]}
          onPress={() => router.push('/report-lost')}
          activeOpacity={0.8}
        >
          <View style={[styles.shortcutIconCircle, { backgroundColor: '#FEE2E2' }]}>
            <Ionicons name="alert-circle" size={20} color="#DC2626" />
          </View>
          <View style={styles.shortcutTextWrap}>
            <Text style={styles.shortcutTitle}>Lapor Kehilangan</Text>
            <Text style={styles.shortcutSubtitle}>Buat laporan barang tertinggal</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color="#DC2626" />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.shortcutCard, styles.shortcutCardGreen]}
          onPress={() => router.push('/explore')}
          activeOpacity={0.8}
        >
          <View style={[styles.shortcutIconCircle, { backgroundColor: '#DCFCE7' }]}>
            <Ionicons name="search" size={20} color="#15803D" />
          </View>
          <View style={styles.shortcutTextWrap}>
            <Text style={styles.shortcutTitle}>Explore Barang</Text>
            <Text style={styles.shortcutSubtitle}>Katalog barang posko kampus</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color="#15803D" />
        </TouchableOpacity>
      </View>

      {/* 6. Status Laporan Milik Mahasiswa */}
      {myReports.length > 0 && (
        <View style={styles.myReportsSection}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionHeaderLeft}>
              <Ionicons name="newspaper-outline" size={16} color="#2563EB" />
              <Text style={styles.sectionTitle}>Status Laporan Saya</Text>
            </View>
            <Text style={styles.reportCountText}>{myReports.length} Laporan</Text>
          </View>

          {myReports.map((report) => (
            <TouchableOpacity
              key={report.id}
              style={styles.myReportCard}
              onPress={() => router.push(`/item/${report.id}` as any)}
              activeOpacity={0.8}
            >
              <View style={styles.myReportHeader}>
                <Text style={styles.myReportTitle} numberOfLines={1}>
                  {report.title}
                </Text>
                <StatusBadge
                  status={
                    report.verificationStatus === 'Menunggu Verifikasi'
                      ? 'Menunggu Verifikasi'
                      : report.status
                  }
                  size="small"
                />
              </View>
              <Text style={styles.myReportMeta}>
                📍 {report.location} • {report.date}
              </Text>
              {report.verificationStatus === 'Menunggu Verifikasi' && (
                <View style={styles.reportVerificationNotice}>
                  <Ionicons name="time" size={13} color="#B45309" />
                  <Text style={styles.reportVerificationText}>
                    Menunggu verifikasi admin sebelum diterbitkan ke katalog publik.
                  </Text>
                </View>
              )}
              {report.status === 'BARANG DITEMUKAN' && (
                <View style={styles.reportFoundNotice}>
                  <Ionicons name="checkmark-circle" size={14} color="#1D4ED8" />
                  <Text style={styles.reportFoundText}>
                    Barang Anda telah ditemukan oleh petugas! Silakan hubungi posko keamanan.
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* 7. Search Bar & Horizontal Category Filter */}
      <View style={styles.searchSection}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color="#64748B" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Cari nama barang, gedung, fakultas..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={10}>
              <Ionicons name="close-circle" size={18} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>

        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={CAMPUS_CATEGORIES}
          keyExtractor={(item) => item}
          contentContainerStyle={styles.categoryScroll}
          renderItem={({ item: cat }) => {
            const isActive = selectedCategory === cat;
            return (
              <TouchableOpacity
                style={[styles.categoryChip, isActive && styles.categoryChipActive]}
                onPress={() => setSelectedCategory(cat)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.categoryChipText,
                    isActive && styles.categoryChipTextActive,
                  ]}
                >
                  {cat}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* 8. List Header & Filter Toggle */}
      <View style={styles.listHeaderRow}>
        <View style={styles.listHeaderLeft}>
          <Text style={styles.listTitle}>Katalog Barang Kampus</Text>
          <Text style={styles.listSubtitle}>
            Menampilkan {filteredItems.length} barang tercatat
          </Text>
        </View>

        <View style={styles.typeToggle}>
          <TouchableOpacity
            style={[styles.toggleBtn, filterType === 'all' && styles.toggleBtnActive]}
            onPress={() => setFilterType('all')}
          >
            <Text
              style={[styles.toggleText, filterType === 'all' && styles.toggleTextActive]}
            >
              Semua
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleBtn, filterType === 'found' && styles.toggleBtnActive]}
            onPress={() => setFilterType('found')}
          >
            <Text
              style={[styles.toggleText, filterType === 'found' && styles.toggleTextActive]}
            >
              Temuan
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleBtn, filterType === 'lost' && styles.toggleBtnActive]}
            onPress={() => setFilterType('lost')}
          >
            <Text
              style={[styles.toggleText, filterType === 'lost' && styles.toggleTextActive]}
            >
              Hilang
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      {/* Top Navbar dengan Logo TemuIn Resmi */}
      <View
        style={[
          styles.topBar,
          {
            paddingTop: Math.max(insets.top, Platform.OS === 'android' ? 24 : 12),
          },
        ]}
      >
        <View style={styles.brandRow}>
          <View style={styles.logoBadge}>
            <Image
              source={require('@/assets/images/logo-temuin.png')}
              style={styles.topLogoImage}
              resizeMode="contain"
            />
          </View>
          <View style={styles.brandInfoWrap}>
            <Text style={styles.brandName}>
              Temu<Text style={styles.brandHighlight}>In</Text>
            </Text>
            <Text style={styles.brandTagline} numberOfLines={1}>
              Universitas Muhammadiyah Malang
            </Text>
          </View>
        </View>

        <View style={styles.topRightActions}>
          <TouchableOpacity
            style={styles.poskoBtn}
            onPress={() => setShowPoskoModal(true)}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Buka informasi posko keamanan kampus"
          >
            <Ionicons name="shield-checkmark-outline" size={18} color="#1E293B" />
          </TouchableOpacity>
        </View>
      </View>

      {/* List Katalog Barang */}
      <FlatList
        data={filteredItems}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={[
          styles.listContainer,
          {
            paddingBottom: Math.max(insets.bottom + 85, 110),
          },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={['#2563EB']}
          />
        }
        renderItem={({ item }) => (
          <View style={styles.cardItemWrapper}>
            <ItemCard item={item} />
          </View>
        )}
        ListEmptyComponent={
          isLoading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator size="small" color="#2563EB" />
              <Text style={styles.loadingText}>Memuat katalog barang kampus...</Text>
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="search-outline" size={44} color="#94A3B8" />
              <Text style={styles.emptyTitle}>Tidak ada barang yang cocok</Text>
              <Text style={styles.emptyDesc}>
                {searchQuery
                  ? `Tidak ada hasil untuk pencarian "${searchQuery}". Coba kata kunci lain atau reset filter.`
                  : 'Belum ada barang pada kategori ini. Silakan pilih kategori atau filter lain.'}
              </Text>
            </View>
          )
        }
      />

      {/* Bottom Navigation */}
      <StudentBottomNav activeTab="home" />

      {/* Modal Posko Keamanan */}
      <Modal visible={showPoskoModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Ionicons name="shield-checkmark" size={24} color="#2563EB" />
              <Text style={styles.modalTitle}>Posko Lost & Found Kampus</Text>
            </View>
            <Text style={styles.modalDesc}>
              Untuk verifikasi fisik dan serah terima barang temuan, silakan datangi posko resmi:
            </Text>
            <View style={styles.poskoRow}>
              <Text style={styles.poskoItemTitle}>📍 Posko Keamanan Pusat</Text>
              <Text style={styles.poskoItemSub}>Gedung Rektorat Lantai 1 (24 Jam)</Text>
            </View>
            <View style={styles.poskoRow}>
              <Text style={styles.poskoItemTitle}>📍 Resepsionis Perpustakaan</Text>
              <Text style={styles.poskoItemSub}>Lantai 2 Meja Informasi Utama</Text>
            </View>
            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={() => setShowPoskoModal(false)}
            >
              <Text style={styles.modalCloseText}>Tutup</Text>
            </TouchableOpacity>
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
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    marginRight: 10,
  },
  logoBadge: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 2,
    overflow: 'hidden',
  },
  topLogoImage: {
    width: '100%',
    height: '100%',
  },
  brandInfoWrap: {
    flex: 1,
  },
  brandName: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  brandHighlight: {
    color: '#F58220',
  },
  brandTagline: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
  },
  topRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  poskoBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    paddingBottom: 110,
  },
  headerContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  greetingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    minHeight: 46,
  },
  greetingTextWrap: {
    flex: 1,
    paddingRight: 10,
  },
  greetingSub: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  greetingName: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  greetingMeta: {
    fontSize: 11,
    color: '#2563EB',
    fontWeight: '600',
    marginTop: 1,
  },
  connectionAlertWrap: {
    marginBottom: 12,
    width: '100%',
  },
  bannerContainer: {
    backgroundColor: '#1E3A8A',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    position: 'relative',
    overflow: 'hidden',
  },
  bannerDecorCircle: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#2563EB',
    opacity: 0.35,
  },
  bannerContent: {
    position: 'relative',
    zIndex: 1,
  },
  bannerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 8,
  },
  bannerBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  bannerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 6,
    lineHeight: 22,
  },
  bannerDesc: {
    fontSize: 11,
    color: '#DBEAFE',
    lineHeight: 16,
    marginBottom: 12,
  },
  bannerBtnRow: {
    flexDirection: 'row',
  },
  bannerActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  bannerActionBtnText: {
    color: '#0266B3',
    fontSize: 12,
    fontWeight: '700',
  },

  // Stats Summary
  statsSummaryRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  statIconBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  statNumber: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  statLabel: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
    marginTop: 1,
  },

  // Shortcuts
  shortcutGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  shortcutCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
    minWidth: 0,
    overflow: 'hidden',
  },
  shortcutCardRed: {
    borderColor: '#FECDD3',
  },
  shortcutCardGreen: {
    borderColor: '#BBF7D0',
  },
  shortcutIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shortcutTextWrap: {
    flex: 1,
  },
  shortcutTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
  },
  shortcutSubtitle: {
    fontSize: 9,
    color: '#64748B',
    marginTop: 1,
  },

  // Laporan Saya
  myReportsSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
  },
  reportCountText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  myReportCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 6,
  },
  myReportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  myReportTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
    flex: 1,
    marginRight: 8,
  },
  myReportMeta: {
    fontSize: 10,
    color: '#64748B',
  },
  reportVerificationNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FEF3C7',
    padding: 6,
    borderRadius: 6,
    marginTop: 6,
  },
  reportVerificationText: {
    fontSize: 10,
    color: '#92400E',
    fontWeight: '600',
    flex: 1,
  },
  reportFoundNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#EFF6FF',
    padding: 6,
    borderRadius: 6,
    marginTop: 6,
  },
  reportFoundText: {
    fontSize: 10,
    color: '#1E40AF',
    fontWeight: '700',
    flex: 1,
  },

  // Search & Filters
  searchSection: {
    marginBottom: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 42,
    marginBottom: 8,
  },
  searchIcon: {
    marginRight: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
    color: '#0F172A',
  },
  categoryScroll: {
    gap: 6,
  },
  categoryChip: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 7,
  },
  categoryChipActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  categoryChipText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  categoryChipTextActive: {
    color: '#FFFFFF',
  },

  // List Header
  listHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  listHeaderLeft: {
    flex: 1,
  },
  listTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  listSubtitle: {
    fontSize: 10,
    color: '#64748B',
  },
  typeToggle: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    borderRadius: 8,
    padding: 2,
  },
  toggleBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  toggleBtnActive: {
    backgroundColor: '#FFFFFF',
  },
  toggleText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
  },
  toggleTextActive: {
    color: '#0F172A',
    fontWeight: '700',
  },

  cardItemWrapper: {
    paddingHorizontal: 16,
  },
  loadingWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    gap: 8,
  },
  loadingText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 36,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
    marginTop: 8,
  },
  emptyDesc: {
    fontSize: 11,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 16,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalDesc: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 14,
    lineHeight: 17,
  },
  poskoRow: {
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
  },
  poskoItemTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  poskoItemSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  modalCloseBtn: {
    backgroundColor: '#2563EB',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  modalCloseText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
});
