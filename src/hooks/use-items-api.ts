import { useCallback, useEffect, useState } from 'react';
import { apiService } from '@/services/api/apiService';
import { CampusItem, ItemStatus } from '@/types';

/**
 * Hook useItemsApi — Mengelola 6 Siklus Penuh CRUD Async REST API:
 * 1. READ    : fetchItems() via fetch() async/await dalam useEffect
 * 2. STATE   : const [loading, setLoading] = useState(true)
 * 3. CREATE  : POST /api/items lewat fetch()
 * 4. UPDATE  : PATCH /api/items/:id (ubah status / isResolved)
 * 5. ERROR   : try...catch penanganan kesalahan jaringan & respons server
 * 6. RE-FETCH: Pull-to-refresh & reload manual
 */
export function useItemsApi() {
  const [items, setItems] = useState<CampusItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<any>(null);

  // 01. READ: Ambil daftar data dari server REST API
  const fetchData = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setIsRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      // Request GET /api/items via fetch() async/await
      const data = await apiService.fetchItems();
      setItems(data);
    } catch (err: any) {
      console.warn('[useItemsApi] Gagal mengambil data:', err.message || err);
      setError(err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // 01. Jalankan di dalam useEffect saat komponen dimuat
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // 06. RE-FETCH: Fungsi reload manual dan pull-to-refresh
  const reload = useCallback(async () => {
    await fetchData(true);
  }, [fetchData]);

  // 03. CREATE: POST /api/items
  const addItem = useCallback(
    async (newItemData: Partial<CampusItem>): Promise<CampusItem> => {
      try {
        const created = await apiService.createItem(newItemData);
        // Perbarui list secara otomatis (optimistik / respons baru di urutan teratas)
        setItems((prev) => [created, ...prev.filter((i) => i.id !== created.id)]);
        return created;
      } catch (err: any) {
        console.error('[useItemsApi] Gagal menambah item:', err);
        throw err;
      }
    },
    []
  );

  // 04. UPDATE: PATCH /api/items/:id untuk status tugas/item
  const toggleResolved = useCallback(async (item: CampusItem) => {
    const nextResolved = !item.isResolved;
    const nextStatus: ItemStatus = nextResolved ? 'SELESAI' : (item.type === 'found' ? 'TERSEDIA' : 'DALAM PENCARIAN');

    // Optimistic UI update
    setItems((prev) =>
      prev.map((i) =>
        i.id === item.id
          ? {
              ...i,
              isResolved: nextResolved,
              status: nextStatus,
              statusColor: nextResolved ? '#2F6B4F' : (item.type === 'found' ? '#2F6B4F' : '#B4532A'),
            }
          : i
      )
    );

    try {
      const updated = await apiService.patchItem(item.id, {
        isResolved: nextResolved,
        status: nextStatus,
      });

      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, ...updated } : i))
      );
    } catch (err: any) {
      // Rollback jika server gagal
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? item : i))
      );
      throw err;
    }
  }, []);

  // Ubah status item langsung (misal: 'DALAM PENCARIAN', 'BARANG DITEMUKAN', 'SELESAI')
  const updateStatus = useCallback(async (id: string, newStatus: ItemStatus) => {
    try {
      const isResolved = newStatus === 'SELESAI' || newStatus === 'DIAMBIL / SELESAI';
      const updated = await apiService.patchItem(id, {
        status: newStatus,
        isResolved,
      });
      setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...updated } : i)));
    } catch (err) {
      throw err;
    }
  }, []);

  // Hapus item (DELETE)
  const deleteItem = useCallback(async (id: string) => {
    const backup = items;
    setItems((prev) => prev.filter((i) => i.id !== id));
    try {
      await apiService.deleteItem(id);
    } catch (err) {
      setItems(backup); // Rollback
      throw err;
    }
  }, [items]);

  return {
    items,
    loading,
    isLoading: loading,
    isRefreshing,
    error,
    reload,
    fetchData,
    addItem,
    toggleResolved,
    updateStatus,
    deleteItem,
  };
}

