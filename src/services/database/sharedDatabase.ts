import { Platform } from 'react-native';

import { localStorage } from '../storage/localStorage';

import { CampusItem, ClaimRequest, ClaimStatus, ItemStatus, LostItem, FoundItem } from '@/types';

/**
 * SharedDatabaseService
 * Arsitektur Database Bersama (Prioritas 4 & 5)
 * 
 * Bertanggung jawab menghubungkan data antar user (Mahasiswa A, Mahasiswa B, Admin/Petugas).
 * Mendukung sinkronisasi ke Backend API Server (Node.js/REST/Supabase)
 * dengan sinkronisasi otomatis dan fallback cache offline.
 */

// Host default backend server
// Pada Android emulator: 10.0.2.2 mengarah ke host machine localhost
const DEFAULT_HOST = Platform.OS === 'android' ? 'http://10.0.2.2:3001' : 'http://localhost:3001';

export interface DatabaseState {
  items: CampusItem[];
  claims: ClaimRequest[];
  lastSyncedAt: string;
}

export type DatabaseChangeListener = (state: DatabaseState) => void;

class SharedDatabaseService {
  private backendUrl: string = DEFAULT_HOST;
  private isOnline: boolean = false;
  private listeners: Set<DatabaseChangeListener> = new Set();
  private pollInterval: any = null;
  private cachedState: DatabaseState = {
    items: [], // Data barang disinkronkan dari Supabase
    claims: [], // Data klaim disinkronkan dari Supabase
    lastSyncedAt: new Date().toISOString(),
  };

  constructor() {
    this.init();
  }

  private async init() {
    // 1. Muat cache dari localStorage
    const savedItems = await localStorage.getObject<CampusItem[]>('@temuin_cache_items');
    const savedClaims = await localStorage.getObject<ClaimRequest[]>('@temuin_cache_claims');

    if (savedItems && savedItems.length > 0) {
      this.cachedState.items = savedItems;
    }
    if (savedClaims && savedClaims.length > 0) {
      this.cachedState.claims = savedClaims;
    }

    // 2. Coba hubungkan ke Shared Backend Server
    await this.checkBackendConnection();

    // 3. Jalankan auto-sync background polling (setiap 5 detik)
    this.startAutoSync();
  }

  public setBackendUrl(url: string) {
    this.backendUrl = url;
    this.checkBackendConnection();
  }

  public getBackendUrl(): string {
    return this.backendUrl;
  }

  public isBackendConnected(): boolean {
    return this.isOnline;
  }

  public subscribe(listener: DatabaseChangeListener): () => void {
    this.listeners.add(listener);
    // Kirim state saat ini segera
    listener(this.cachedState);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners() {
    this.listeners.forEach((fn) => {
      try {
        fn(this.cachedState);
      } catch (err) {
        console.warn('[SharedDatabase] Error notifying listener:', err);
      }
    });
  }

  /**
   * Cek koneksi ke backend HTTP database
   */
  public async checkBackendConnection(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);

      const res = await fetch(`${this.backendUrl}/api/health`, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        this.isOnline = true;
        // Tarik data terbaru dari backend
        await this.pullFromBackend();
        return true;
      }
    } catch {
      this.isOnline = false;
    }
    return false;
  }

  /**
   * Tarik data terbaru dari Shared Database Backend
   */
  public async pullFromBackend(): Promise<DatabaseState> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      const res = await fetch(`${this.backendUrl}/api/data`, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const remoteData = await res.json();
        if (remoteData.items && remoteData.claims) {
          this.cachedState = {
            items: remoteData.items,
            claims: remoteData.claims,
            lastSyncedAt: new Date().toISOString(),
          };
          this.isOnline = true;

          // Simpan snapshot ke local cache
          await localStorage.setObject('@temuin_cache_items', remoteData.items);
          await localStorage.setObject('@temuin_cache_claims', remoteData.claims);

          this.notifyListeners();
          return this.cachedState;
        }
      }
    } catch {
      // Backend unreachable, fallback ke cached state
      this.isOnline = false;
    }
    return this.cachedState;
  }

  /**
   * Kirim perubahan ke backend database atau simpan ke state bersama
   */
  public async syncPush(payload: { items?: CampusItem[]; claims?: ClaimRequest[] }): Promise<void> {
    if (payload.items) {
      this.cachedState.items = payload.items;
      await localStorage.setObject('@temuin_cache_items', payload.items);
    }
    if (payload.claims) {
      this.cachedState.claims = payload.claims;
      await localStorage.setObject('@temuin_cache_claims', payload.claims);
    }
    this.cachedState.lastSyncedAt = new Date().toISOString();
    this.notifyListeners();

    // Kirim ke remote HTTP server jika online
    if (this.isOnline) {
      try {
        await fetch(`${this.backendUrl}/api/sync`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            items: this.cachedState.items,
            claims: this.cachedState.claims,
          }),
        });
      } catch {
        this.isOnline = false;
      }
    }
  }

  /**
   * Mulai auto-sync interval
   */
  private startAutoSync() {
    if (this.pollInterval) clearInterval(this.pollInterval);
    this.pollInterval = setInterval(async () => {
      await this.checkBackendConnection();
    }, 5000);
  }

  public getState(): DatabaseState {
    return this.cachedState;
  }
}

export const sharedDatabase = new SharedDatabaseService();
