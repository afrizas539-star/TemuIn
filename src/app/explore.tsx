import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react'; // <-- Tambahkan useEffect di sini
import {
  FlatList,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ApiErrorMessage } from '@/components/ApiErrorMessage';
import { ItemCard } from '@/components/ItemCard';
import { StudentBottomNav } from '@/components/StudentBottomNav';
import { CAMPUS_CATEGORIES } from '@/constants/initialData';
import { useCampusData } from '@/context/CampusDataContext';

import { useAuth } from '@/context/AuthContext';

export default function ExploreScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isAuthenticated, isLoadingAuth } = useAuth();
  const { items, refreshData } = useCampusData();

  useEffect(() => {
    if (!isLoadingAuth && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, isLoadingAuth]);

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Semua');
  const [selectedFaculty, setSelectedFaculty] = useState('Semua Fakultas');
  const [selectedType, setSelectedType] = useState<'all' | 'lost' | 'found'>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<unknown>(null);

  // Rubrik: Custom Async Function dengan .then(), .catch(), .finally()
  const handleRefresh = () => {
    setIsRefreshing(true);
    setLoadError(null);
    refreshData()
      .then(() => {
        // Data berhasil dimuat ulang
      })
      .catch((err) => {
        setLoadError(err);
      })
      .finally(() => {
        setIsRefreshing(false);
      });
  };

  // Hanya barang temuan dan barang hilang yang sudah disetujui admin
  const publicItems = items.filter(
    (item) => item.type === 'found' || item.verificationStatus === 'Disetujui' || !item.verificationStatus
  );

  const filteredItems = publicItems.filter((item) => {
    const matchCat = selectedCategory === 'Semua' || item.category === selectedCategory;
    const matchFac =
      selectedFaculty === 'Semua Fakultas' ||
      item.faculty.toLowerCase().includes(selectedFaculty.toLowerCase());
    const matchType = selectedType === 'all' || item.type === selectedType;
    const q = search.trim().toLowerCase();
    const matchSearch =
      !q ||
      item.title.toLowerCase().includes(q) ||
      item.location.toLowerCase().includes(q) ||
      item.description.toLowerCase().includes(q) ||
      item.faculty.toLowerCase().includes(q);
    return matchCat && matchFac && matchType && matchSearch;
  });

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      {/* Top Header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: Math.max(insets.top, Platform.OS === 'android' ? 24 : 12),
          },
        ]}
      >
        <Text style={styles.headerTitle}>Cari & Eksplorasi</Text>
        <Text style={styles.headerSubtitle}>
          Temukan barang hilang atau temuan di Universitas Muhammadiyah Malang
        </Text>

        {/* Search Bar */}
        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color="#64748B" />
          <TextInput
            style={styles.searchInput}
            placeholder="Cari kata kunci, nama pemilik, lokasi..."
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

        {/* Filter Tipe Pills */}
        <View style={styles.typeFilterRow}>
          <TouchableOpacity
            style={[styles.typeBtn, selectedType === 'all' && styles.typeBtnActive]}
            onPress={() => setSelectedType('all')}
          >
            <Text
              style={[styles.typeBtnText, selectedType === 'all' && styles.typeBtnTextActive]}
            >
              Semua ({items.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.typeBtn, selectedType === 'found' && styles.typeBtnActive]}
            onPress={() => setSelectedType('found')}
          >
            <Text
              style={[styles.typeBtnText, selectedType === 'found' && styles.typeBtnTextActive]}
            >
              Temuan ({items.filter((i) => i.type === 'found').length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.typeBtn, selectedType === 'lost' && styles.typeBtnActive]}
            onPress={() => setSelectedType('lost')}
          >
            <Text
              style={[styles.typeBtnText, selectedType === 'lost' && styles.typeBtnTextActive]}
            >
              Hilang ({items.filter((i) => i.type === 'lost').length})
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Category Pills */}
      <View style={styles.categoryBarWrap}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={CAMPUS_CATEGORIES}
          keyExtractor={(item) => item}
          contentContainerStyle={styles.categoryScroll}
          renderItem={({ item: cat }) => {
            const isSelected = selectedCategory === cat;
            return (
              <TouchableOpacity
                style={[styles.catChip, isSelected && styles.catChipActive]}
                onPress={() => setSelectedCategory(cat)}
                activeOpacity={0.7}
              >
                <Text style={[styles.catChipText, isSelected && styles.catChipTextActive]}>
                  {cat}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* Result Counter */}
      <View style={styles.resultsInfoRow}>
        <Text style={styles.resultsCount}>
          Ditemukan <Text style={styles.resultsBold}>{filteredItems.length}</Text> laporan
        </Text>
        {(selectedCategory !== 'Semua' || selectedType !== 'all' || search.length > 0) && (
          <TouchableOpacity
            onPress={() => {
              setSelectedCategory('Semua');
              setSelectedType('all');
              setSearch('');
            }}
          >
            <Text style={styles.resetFilterText}>Reset Filter</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Error Message jika pengambilan data gagal */}
      {loadError ? (
        <View style={{ paddingHorizontal: 16 }}>
          <ApiErrorMessage
            error={loadError}
            onRetry={handleRefresh}
            onDismiss={() => setLoadError(null)}
          />
        </View>
      ) : null}

      {/* Items List */}
      <FlatList
        data={filteredItems}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={['#0266B3']}
          />
        }
        renderItem={({ item }) => (
          <View style={styles.cardWrap}>
            <ItemCard item={item} />
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="folder-open-outline" size={48} color="#94A3B8" />
            <Text style={styles.emptyTitle}>Laporan tidak ditemukan</Text>
            <Text style={styles.emptySubtitle}>
              Tidak ada data yang cocok dengan kriteria pencarian Anda.
            </Text>
          </View>
        }
      />

      <StudentBottomNav activeTab="explore" />
    </View>
  );
}

import { AppRadius, Colors, Typography } from '@/constants/theme';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  header: {
    backgroundColor: Colors.light.surface,
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  headerTitle: {
    fontSize: Typography.size.title,
    fontWeight: '800',
    color: Colors.light.text,
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: Typography.size.caption,
    color: Colors.light.textSecondary,
    marginTop: 2,
    marginBottom: 12,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.surfaceMuted,
    borderRadius: AppRadius.small,
    paddingHorizontal: 12,
    height: 44,
    borderWidth: 1,
    borderColor: Colors.light.border,
    gap: 8,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: Colors.light.text,
    paddingVertical: 0,
  },
  typeFilterRow: {
    flexDirection: 'row',
    gap: 8,
  },
  typeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: AppRadius.small,
    backgroundColor: Colors.light.surfaceMuted,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  typeBtnActive: {
    backgroundColor: Colors.light.primary,
    borderColor: Colors.light.primary,
  },
  typeBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.light.textSecondary,
  },
  typeBtnTextActive: {
    color: '#FFFFFF',
  },
  categoryBarWrap: {
    backgroundColor: Colors.light.surface,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  categoryScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  catChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: AppRadius.small,
    backgroundColor: Colors.light.surfaceMuted,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  catChipActive: {
    backgroundColor: Colors.light.primary,
    borderColor: Colors.light.primary,
  },
  catChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.light.textSecondary,
  },
  catChipTextActive: {
    color: '#FFFFFF',
  },
  resultsInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  resultsCount: {
    fontSize: 12,
    color: Colors.light.textSecondary,
  },
  resultsBold: {
    fontWeight: '700',
    color: Colors.light.text,
  },
  resetFilterText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.light.primary,
  },
  listContent: {
    paddingBottom: 24,
  },
  cardWrap: {
    paddingHorizontal: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
    paddingHorizontal: 30,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.light.text,
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
});