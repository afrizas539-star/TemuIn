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

  const handleRefresh = async () => {
    try {
      setIsRefreshing(true);
      setLoadError(null);
      await refreshData();
    } catch (err) {
      setLoadError(err);
    } finally {
      setIsRefreshing(false);
    }
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
    marginBottom: 12,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
    paddingVertical: 0,
  },
  typeFilterRow: {
    flexDirection: 'row',
    gap: 8,
  },
  typeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  typeBtnActive: {
    backgroundColor: '#0F172A',
  },
  typeBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  typeBtnTextActive: {
    color: '#FFFFFF',
  },
  categoryBarWrap: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  categoryScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  catChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  catChipActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  catChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
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
    color: '#64748B',
  },
  resultsBold: {
    fontWeight: '700',
    color: '#0F172A',
  },
  resetFilterText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2563EB',
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
    color: '#334155',
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 4,
    textAlign: 'center',
  },
});