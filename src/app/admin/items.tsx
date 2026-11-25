import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { AdminBottomNav } from '@/components/AdminBottomNav';
import { AdminCameraPicker } from '@/components/AdminCameraPicker';
import { AdminHeader } from '@/components/AdminHeader';
import { ItemCard } from '@/components/ItemCard';
import { StatusBadge } from '@/components/StatusBadge';
import { CAMPUS_CATEGORIES, STATUS_COLORS } from '@/constants/initialData';
import { useAuth } from '@/context/AuthContext';
import { useCampusData } from '@/context/CampusDataContext';
import { deletePhotoFromStorage, isSupabaseStorageUrl } from '@/services/supabase/storageService';
import { CampusItem, ItemStatus } from '@/types';

export default function AdminItemsScreen() {
  const router = useRouter();
  const { isAdminAuthenticated, role, isLoadingAuth } = useAuth();
  const { items, updateItemStatus, updateItem, deleteItem } = useCampusData();

  useEffect(() => {
    if (!isLoadingAuth) {
      if (!isAdminAuthenticated) {
        if (role === 'student') {
          Alert.alert('Akses Ditolak', 'Mahasiswa tidak memiliki izin mengakses panel pengelolaan barang.');
          router.replace('/home');
        } else {
          router.replace('/login');
        }
      }
    }
  }, [isAdminAuthenticated, role, isLoadingAuth]);

  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState('Semua');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('Semua Status');
  const [selectedItemForStatus, setSelectedItemForStatus] = useState<CampusItem | null>(null);
  const [selectedItemForPhoto, setSelectedItemForPhoto] = useState<CampusItem | null>(null);

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

  const ALL_STATUS_FILTERS: string[] = [
    'Semua Status',
    'TERSEDIA',
    'DALAM PENCARIAN',
    'BARANG DITEMUKAN',
    'DIAMBIL / SELESAI',
    'SELESAI',
  ];

  const filteredItems = items.filter((item) => {
    const matchCat = selectedCat === 'Semua' || item.category === selectedCat;
    const matchStatus =
      selectedStatusFilter === 'Semua Status' || item.status === selectedStatusFilter;
    const q = search.trim().toLowerCase();
    const matchSearch =
      !q ||
      item.title.toLowerCase().includes(q) ||
      item.location.toLowerCase().includes(q) ||
      item.description.toLowerCase().includes(q);
    return matchCat && matchStatus && matchSearch;
  });

  const handleApplyStatusChange = async (newStatus: ItemStatus) => {
    if (!selectedItemForStatus) return;
    await updateItemStatus(selectedItemForStatus.id, newStatus);
    setSelectedItemForStatus(null);
    Alert.alert('Sukses', `Status barang telah diubah menjadi: ${newStatus}`);
  };

  const handleDeleteItem = (item: CampusItem) => {
    Alert.alert(
      'Hapus Barang',
      `Apakah Anda yakin ingin menghapus "${item.title}"?`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus',
          style: 'destructive',
          onPress: async () => {
            await deleteItem(item.id);
          },
        },
      ]
    );
  };

  if (isLoadingAuth || !isAdminAuthenticated) {
    return null;
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <AdminHeader
        title="Pengelolaan Data Barang"
        subtitle={`Total ${items.length} barang tercatat dalam sistem`}
      />

      {/* Filter Section */}
      <View style={styles.filterSection}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color="#64748B" />
          <TextInput
            style={styles.searchInput}
            placeholder="Cari nama barang, lokasi, atau deskripsi..."
            placeholderTextColor="#94A3B8"
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>

        {/* Status Horizontal Quick Filters */}
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={ALL_STATUS_FILTERS}
          keyExtractor={(item) => item}
          contentContainerStyle={styles.statusFilterScroll}
          renderItem={({ item: st }) => {
            const isSelected = selectedStatusFilter === st;
            return (
              <TouchableOpacity
                style={[
                  styles.statusFilterChip,
                  isSelected && styles.statusFilterChipActive,
                ]}
                onPress={() => setSelectedStatusFilter(st)}
              >
                <Text
                  style={[
                    styles.statusFilterText,
                    isSelected && styles.statusFilterTextActive,
                  ]}
                >
                  {st}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* Items List */}
      <FlatList
        data={filteredItems}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <View style={styles.cardContainer}>
            <ItemCard item={item} isAdmin />

            {/* Quick Status Action Bar */}
            <View style={styles.cardAdminControls}>
              <TouchableOpacity
                style={styles.changeStatusBtn}
                onPress={() => setSelectedItemForStatus(item)}
                activeOpacity={0.8}
              >
                <Ionicons name="swap-horizontal" size={15} color="#4F46E5" />
                <Text style={styles.changeStatusBtnText}>Ubah Status</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.changeStatusBtn, { backgroundColor: '#F0F9FF', borderColor: '#BAE6FD' }]}
                onPress={() => setSelectedItemForPhoto(item)}
                activeOpacity={0.8}
              >
                <Ionicons name="camera" size={15} color="#0266B3" />
                <Text style={[styles.changeStatusBtnText, { color: '#0266B3' }]}>Foto</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.deleteQuickBtn}
                onPress={() => handleDeleteItem(item)}
                activeOpacity={0.8}
              >
                <Ionicons name="trash-outline" size={15} color="#DC2626" />
                <Text style={styles.deleteQuickBtnText}>Hapus</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="cube-outline" size={48} color="#94A3B8" />
            <Text style={styles.emptyTitle}>Tidak ada barang yang cocok</Text>
            <Text style={styles.emptySubtitle}>
              Coba ganti filter status atau kata kunci pencarian.
            </Text>
          </View>
        }
      />

      <AdminBottomNav activeTab="items" />

      {/* Modal Ubah Status */}
      <Modal
        visible={selectedItemForStatus !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedItemForStatus(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedItemForStatus && (
              <>
                <View style={styles.modalHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalTitle}>Ubah Status Barang</Text>
                    <Text style={styles.modalItemTitle} numberOfLines={1}>
                      {selectedItemForStatus.title}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setSelectedItemForStatus(null)}
                    style={{ padding: 4 }}
                  >
                    <Ionicons name="close" size={24} color="#0F172A" />
                  </TouchableOpacity>
                </View>

                <Text style={styles.modalDesc}>
                  Pilih status baru. Status yang dipilih akan langsung diperbarui di seluruh halaman mahasiswa:
                </Text>

                {(selectedItemForStatus.type === 'lost' ? LOST_STATUSES : FOUND_STATUSES).map((st) => {
                  const isCurrent = selectedItemForStatus.status === st;
                  const color = STATUS_COLORS[st]?.text || '#4F46E5';
                  return (
                    <TouchableOpacity
                      key={st}
                      style={[
                        styles.statusOptionBtn,
                        isCurrent && styles.statusOptionBtnCurrent,
                      ]}
                      onPress={() => handleApplyStatusChange(st)}
                    >
                      <View
                        style={[styles.statusOptionDot, { backgroundColor: color }]}
                      />
                      <Text
                        style={[
                          styles.statusOptionBtnText,
                          isCurrent && styles.statusOptionBtnTextCurrent,
                        ]}
                      >
                        {st}
                      </Text>
                      {isCurrent && (
                        <Ionicons
                          name="checkmark-circle"
                          size={18}
                          color="#4F46E5"
                        />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Modal Dokumentasi & Edit Foto Barang (Fitur Kamera Petugas) */}
      <Modal
        visible={selectedItemForPhoto !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedItemForPhoto(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedItemForPhoto && (
              <>
                <View style={styles.modalHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalTitle}>Perbarui Foto Barang</Text>
                    <Text style={styles.modalItemTitle} numberOfLines={1}>
                      {selectedItemForPhoto.title}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setSelectedItemForPhoto(null)}
                    style={{ padding: 4 }}
                  >
                    <Ionicons name="close" size={24} color="#0F172A" />
                  </TouchableOpacity>
                </View>

                <Text style={styles.modalDesc}>
                  Gunakan kamera perangkat untuk memotret kondisi fisik barang terkini atau pilih foto dari galeri. Foto otomatis disimpan ke Supabase Storage.
                </Text>

                <AdminCameraPicker
                  imageUri={selectedItemForPhoto.image}
                  onImageUploaded={async (newUrl) => {
                    const oldUrl = selectedItemForPhoto.image;
                    await updateItem(selectedItemForPhoto.id, { image: newUrl });
                    // Hapus foto lama dari Storage setelah pembaruan database berhasil
                    if (oldUrl && oldUrl !== newUrl && isSupabaseStorageUrl(oldUrl)) {
                      deletePhotoFromStorage(oldUrl).catch(() => {});
                    }
                    setSelectedItemForPhoto(null);
                    Alert.alert('Sukses', 'Foto barang berhasil diperbarui di katalog kampus!');
                  }}
                  onImageRemoved={async () => {
                    const oldUrl = selectedItemForPhoto.image;
                    const fallbackPlaceholder =
                      selectedItemForPhoto.type === 'found'
                        ? 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?q=80&w=600&auto=format&fit=crop'
                        : 'https://images.unsplash.com/photo-1594980596870-8aa52a78d8cd?q=80&w=600&auto=format&fit=crop';
                    await updateItem(selectedItemForPhoto.id, {
                      image: fallbackPlaceholder,
                    });
                    if (oldUrl && isSupabaseStorageUrl(oldUrl)) {
                      deletePhotoFromStorage(oldUrl).catch(() => {});
                    }
                    setSelectedItemForPhoto(null);
                    Alert.alert('Info', 'Foto barang telah dihapus dan diganti placeholder.');
                  }}
                  title="Kamera & Foto Barang"
                  subtitle="Ambil foto fisik barang langsung dengan kamera HP"
                  storageFolder={
                    selectedItemForPhoto.type === 'found' ? 'items/found' : 'items/lost'
                  }
                />
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
  filterSection: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 42,
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
    paddingVertical: 0,
  },
  statusFilterScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  statusFilterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
  },
  statusFilterChipActive: {
    backgroundColor: '#4F46E5',
  },
  statusFilterText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  statusFilterTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  listContent: {
    padding: 16,
    paddingBottom: 30,
  },
  cardContainer: {
    marginBottom: 16,
  },
  cardAdminControls: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 8,
    marginTop: -8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderTopWidth: 0,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    gap: 8,
    justifyContent: 'flex-end',
  },
  changeStatusBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 5,
  },
  changeStatusBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4F46E5',
  },
  deleteQuickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 5,
  },
  deleteQuickBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#DC2626',
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
  emptySubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
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
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalItemTitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  modalDesc: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 14,
    lineHeight: 17,
  },
  statusOptionBtn: {
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
  statusOptionBtnCurrent: {
    backgroundColor: '#EEF2FF',
    borderColor: '#C7D2FE',
  },
  statusOptionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 10,
  },
  statusOptionBtnText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#1E293B',
  },
  statusOptionBtnTextCurrent: {
    color: '#4F46E5',
    fontWeight: '700',
  },
});
