/**
 * ============================================================
 * SPRINT 04 / PEKAN 5: TOKEN-BASED AUTH & SECURE API SERVICE
 * ============================================================
 *
 * Menggunakan `fetch()` bawaan JavaScript dengan Expo SecureStore
 * untuk mengamankan komunikasi RESTful API dengan JWT Token:
 *   - POST /login atau /api/login → Autentikasi & Pengambilan JWT Token
 *   - GET  /api/health            → Cek koneksi server (Public)
 *   - GET  /api/items             → Ambil daftar barang (Protected)
 *   - GET  /api/claims            → Ambil daftar klaim (Protected)
 *   - GET  /api/programs          → Ambil daftar program kampus (Protected)
 *   - GET  /api/data              → Ambil seluruh data (Protected)
 *   - POST /api/sync              → Sinkronisasi data ke server (Protected)
 *   - GET  /api/items/:id         → Ambil detail satu barang (Protected)
 *
 * Setiap request ke protected endpoint otomatis menyertakan:
 *   Authorization: Bearer <token>
 *
 * Status 401 Unauthorized akan mereset token & memicu re-login.
 */

import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import {
  APIDataResponseDTO,
  APIHealthDTO,
  APISyncResponseDTO,
  CampusItemDTO,
  ClaimRequestDTO,
  LoginRequestDTO,
  LoginResponseDTO,
  ProgramDTO,
  mapAPIDataResponseToModels,
  mapCampusItemDTOToModel,
  mapCampusItemsDTOToModels,
  mapClaimRequestsDTOToModels,
} from './dto';

import { secureStorage } from '@/services/storage/secureStorage';
import { CampusItem, ClaimRequest } from '@/types';

// ─────────────────────────────────────────────────────────
// KONFIGURASI API & SECURE STORE KEYS
// ─────────────────────────────────────────────────────────

export const SECURE_KEY_ACCESS_TOKEN = 'access_token';

/**
 * Base URL default untuk backend server lokal.
 * Android emulator menggunakan 10.0.2.2 untuk mengakses host localhost.
 */
const DEFAULT_API_BASE_URL =
  Platform.OS === 'android'
    ? 'http://10.0.2.2:3001'
    : 'http://localhost:3001';

/** Timeout default untuk request (dalam ms) */
const DEFAULT_TIMEOUT_MS = 5000;

/** Timeout untuk health check (lebih pendek) */
const HEALTH_CHECK_TIMEOUT_MS = 2500;

// ─────────────────────────────────────────────────────────
// HELPER AMAN UNTUK SECURESTORE (Dengan Web Fallback)
// ─────────────────────────────────────────────────────────

/**
 * Membaca token secara aman dari SecureStore
 */
async function getStoredAccessToken(): Promise<string | null> {
  if (Platform.OS === 'web') {
    return await secureStorage.getItem(SECURE_KEY_ACCESS_TOKEN);
  }
  try {
    return await SecureStore.getItemAsync(SECURE_KEY_ACCESS_TOKEN);
  } catch (err) {
    console.warn('[SecureStore] Gagal membaca access_token:', err);
    return await secureStorage.getItem(SECURE_KEY_ACCESS_TOKEN);
  }
}

/**
 * Menyimpan token secara aman di SecureStore
 */
async function saveStoredAccessToken(token: string): Promise<void> {
  if (Platform.OS === 'web') {
    await secureStorage.setItem(SECURE_KEY_ACCESS_TOKEN, token);
  } else {
    try {
      await SecureStore.setItemAsync(SECURE_KEY_ACCESS_TOKEN, token);
    } catch (err) {
      console.warn('[SecureStore] Gagal menyimpan access_token:', err);
    }
    await secureStorage.setItem(SECURE_KEY_ACCESS_TOKEN, token);
  }
}

/**
 * Menghapus token dari SecureStore
 */
async function deleteStoredAccessToken(): Promise<void> {
  if (Platform.OS === 'web') {
    await secureStorage.removeItem(SECURE_KEY_ACCESS_TOKEN);
  } else {
    try {
      await SecureStore.deleteItemAsync(SECURE_KEY_ACCESS_TOKEN);
    } catch (err) {
      console.warn('[SecureStore] Gagal menghapus access_token:', err);
    }
    await secureStorage.removeItem(SECURE_KEY_ACCESS_TOKEN);
  }
}

// ─────────────────────────────────────────────────────────
// API ERROR CLASS
// ─────────────────────────────────────────────────────────

/**
 * Custom error class untuk error dari API.
 * Menyimpan HTTP status code dan response body.
 */
export class ApiError extends Error {
  public statusCode: number;
  public responseBody?: string;

  constructor(message: string, statusCode: number, responseBody?: string) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.responseBody = responseBody;
  }
}

// ─────────────────────────────────────────────────────────
// API SERVICE CLASS
// ─────────────────────────────────────────────────────────

class ApiService {
  private baseUrl: string;
  private timeoutMs: number;
  private unauthorizedCallback?: () => void;

  constructor(
    baseUrl: string = DEFAULT_API_BASE_URL,
    timeoutMs: number = DEFAULT_TIMEOUT_MS
  ) {
    this.baseUrl = baseUrl;
    this.timeoutMs = timeoutMs;
  }

  // ── Konfigurasi ──

  /** Update base URL server (misalnya saat switch ke production) */
  setBaseUrl(url: string): void {
    this.baseUrl = url;
  }

  /** Ambil base URL saat ini */
  getBaseUrl(): string {
    return this.baseUrl;
  }

  /**
   * Daftarkan handler saat menerima HTTP 401 Unauthorized
   * Digunakan oleh AuthContext untuk otomatis mengarahkan ke /login
   */
  setUnauthorizedCallback(callback: () => void): void {
    this.unauthorizedCallback = callback;
  }

  // ── Token Management Public Helpers ──

  async getStoredToken(): Promise<string | null> {
    return await getStoredAccessToken();
  }

  async saveToken(token: string): Promise<void> {
    await saveStoredAccessToken(token);
  }

  async removeToken(): Promise<void> {
    await deleteStoredAccessToken();
  }

  // ── Private Helper: Fetch dengan timeout & Bearer Token ──

  /**
   * Wrapper fetch() dengan:
   * 1. AbortController timeout.
   * 2. Otomatis attach token Bearer ke protected endpoints (Task 02).
   * 3. Tangani 401 Unauthorized dengan menghapus token & panggil callback re-login.
   */
  private async fetchWithTimeout(
    endpoint: string,
    options: RequestInit = {},
    customTimeoutMs?: number,
    isPublic: boolean = false
  ): Promise<Response> {
    const url = `${this.baseUrl}${endpoint}`;
    const timeout = customTimeoutMs || this.timeoutMs;

    // TASK 02: Baca token dari SecureStore jika bukan endpoint publik
    let authHeaders: Record<string, string> = {};
    if (!isPublic) {
      const token = await getStoredAccessToken();
      if (token) {
        authHeaders['Authorization'] = `Bearer ${token}`;
      }
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
          ...options.headers,
        },
      });

      clearTimeout(timeoutId);

      // TASK 02: Jika server merespons 401 Unauthorized (token invalid / kadaluarsa)
      if (response.status === 401) {
        console.warn(
          `[ApiService] 401 Unauthorized dari ${endpoint}! Token kadaluarsa atau tidak valid.`
        );
        // Hapus token dari SecureStore
        await deleteStoredAccessToken();

        // Picu callback auth context agar user diarahkan ke login
        if (this.unauthorizedCallback) {
          try {
            this.unauthorizedCallback();
          } catch (cbErr) {
            console.warn('[ApiService] Error executing unauthorized callback:', cbErr);
          }
        }

        const body = await response.text().catch(() => '');
        throw new ApiError(
          'Sesi Anda telah berakhir atau token tidak valid (401). Silakan login kembali.',
          401,
          body
        );
      }

      // Tangani HTTP Response selain 2xx
      if (!response.ok) {
        const body = await response.text().catch(() => '');
        throw new ApiError(
          `HTTP ${response.status}: ${response.statusText}`,
          response.status,
          body
        );
      }

      return response;
    } catch (error: any) {
      clearTimeout(timeoutId);

      // Re-throw ApiError as-is
      if (error instanceof ApiError) throw error;

      // Network error / timeout
      if (error.name === 'AbortError') {
        throw new ApiError(
          `Request timeout setelah ${timeout}ms ke ${endpoint}`,
          0
        );
      }

      throw new ApiError(
        `Network error: ${error.message || 'Tidak dapat terhubung ke server'}`,
        0
      );
    }
  }

  // ── Public API Methods ──

  /**
   * POST /login (Task 01)
   * Login ke server backend dengan email & password.
   * Mengembalikan JWT access_token dan data user.
   * Token disimpan secara aman ke SecureStore:
   *   await SecureStore.setItemAsync('access_token', token);
   */
  async login(email: string, password: string): Promise<LoginResponseDTO> {
    const payload: LoginRequestDTO = { email, password };

    try {
      let response: Response;

      // Coba POST ke /login terlebih dahulu, lalu /api/login jika 404
      try {
        response = await this.fetchWithTimeout(
          '/login',
          {
            method: 'POST',
            body: JSON.stringify(payload),
          },
          undefined,
          true // Public endpoint
        );
      } catch (err: any) {
        if (err instanceof ApiError && err.statusCode === 404) {
          response = await this.fetchWithTimeout(
            '/api/login',
            {
              method: 'POST',
              body: JSON.stringify(payload),
            },
            undefined,
            true
          );
        } else {
          throw err;
        }
      }

      const json: LoginResponseDTO = await response.json();

      if (!json.access_token) {
        throw new ApiError(
          'Response login tidak valid: access_token tidak ditemukan.',
          500
        );
      }

      // TASK 01: Simpan access_token secara aman ke Expo SecureStore
      await saveStoredAccessToken(json.access_token);
      return json;
    } catch (error) {
      console.warn('[ApiService] Gagal login via REST API:', (error as Error).message);
      throw error;
    }
  }

  /**
   * GET /api/health
   * Cek apakah server backend aktif dan dapat diakses (Public).
   */
  async checkHealth(): Promise<APIHealthDTO | null> {
    try {
      const response = await this.fetchWithTimeout(
        '/api/health',
        { method: 'GET' },
        HEALTH_CHECK_TIMEOUT_MS,
        true // Public
      );
      const data: APIHealthDTO = await response.json();
      console.log('[ApiService] Health check OK:', data.service);
      return data;
    } catch (error) {
      console.warn('[ApiService] Health check gagal:', (error as Error).message);
      return null;
    }
  }

  /**
   * GET /api/items (Protected Endpoint)
   * Ambil seluruh daftar barang dari REST API.
   * Header Authorization: Bearer <token> disertakan otomatis.
   */
  async fetchItems(): Promise<CampusItem[]> {
    try {
      const response = await this.fetchWithTimeout('/api/items', {
        method: 'GET',
      });
      const json = await response.json();

      const rawItems: CampusItemDTO[] = Array.isArray(json)
        ? json
        : json.items || [];

      const mappedItems = mapCampusItemsDTOToModels(rawItems);
      console.log(
        `[ApiService] Berhasil fetch ${mappedItems.length} items dari API`
      );
      return mappedItems;
    } catch (error) {
      console.error('[ApiService] Gagal fetch items:', (error as Error).message);
      throw error;
    }
  }

  /**
   * GET /api/claims (Protected Endpoint)
   * Ambil seluruh daftar klaim dari REST API.
   */
  async fetchClaims(): Promise<ClaimRequest[]> {
    try {
      const response = await this.fetchWithTimeout('/api/claims', {
        method: 'GET',
      });
      const json = await response.json();

      const rawClaims: ClaimRequestDTO[] = Array.isArray(json)
        ? json
        : json.claims || [];

      const mappedClaims = mapClaimRequestsDTOToModels(rawClaims);
      console.log(
        `[ApiService] Berhasil fetch ${mappedClaims.length} claims dari API`
      );
      return mappedClaims;
    } catch (error) {
      console.error('[ApiService] Gagal fetch claims:', (error as Error).message);
      throw error;
    }
  }

  /**
   * GET /api/programs (Protected Endpoint)
   * Ambil daftar program bantuan & layanan kampus dari REST API.
   */
  async fetchPrograms(): Promise<ProgramDTO[]> {
    try {
      const response = await this.fetchWithTimeout('/api/programs', {
        method: 'GET',
      });
      const json = await response.json();
      return Array.isArray(json) ? json : json.programs || [];
    } catch (error) {
      console.error('[ApiService] Gagal fetch programs:', (error as Error).message);
      throw error;
    }
  }

  /**
   * GET /api/data (Protected Endpoint)
   * Ambil seluruh data (items + claims) sekaligus.
   */
  async fetchAllData(): Promise<{ items: CampusItem[]; claims: ClaimRequest[] }> {
    try {
      const response = await this.fetchWithTimeout('/api/data', {
        method: 'GET',
      });
      const json: APIDataResponseDTO = await response.json();

      const mapped = mapAPIDataResponseToModels(json);
      console.log(
        `[ApiService] Berhasil fetch data lengkap: ${mapped.items.length} items, ${mapped.claims.length} claims`
      );
      return mapped;
    } catch (error) {
      console.error(
        '[ApiService] Gagal fetch all data:',
        (error as Error).message
      );
      throw error;
    }
  }

  /**
   * GET /api/items/:id (Protected Endpoint)
   * Ambil detail satu barang berdasarkan ID.
   */
  async fetchItemById(id: string): Promise<CampusItem | null> {
    try {
      const response = await this.fetchWithTimeout(`/api/items/${id}`, {
        method: 'GET',
      });
      const json: CampusItemDTO = await response.json();

      if (!json || !json.id) return null;

      return mapCampusItemDTOToModel(json);
    } catch (error) {
      console.warn(
        `[ApiService] Gagal fetch item ${id}:`,
        (error as Error).message
      );
      return null;
    }
  }

  /**
   * POST /api/sync (Protected Endpoint)
   * Sinkronisasi data dari aplikasi ke server (push).
   */
  async syncData(data: {
    items?: CampusItem[];
    claims?: ClaimRequest[];
  }): Promise<APISyncResponseDTO | null> {
    try {
      const response = await this.fetchWithTimeout('/api/sync', {
        method: 'POST',
        body: JSON.stringify({
          items: data.items,
          claims: data.claims,
        }),
      });

      const result: APISyncResponseDTO = await response.json();
      console.log('[ApiService] Sync berhasil:', result.updatedAt);
      return result;
    } catch (error) {
      console.warn('[ApiService] Gagal sync data:', (error as Error).message);
      return null;
    }
  }
}

// ─────────────────────────────────────────────────────────
// SINGLETON INSTANCE
// ─────────────────────────────────────────────────────────

/** Singleton API Service yang digunakan di seluruh aplikasi */
export const apiService = new ApiService();
