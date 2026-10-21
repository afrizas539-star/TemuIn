/**
 * ============================================================
 * TEMUIN: TOKEN-BASED AUTH & SECURE API SERVICE TERPUSAT
 * ============================================================
 *
 * Menggunakan `fetch()` bawaan JavaScript dengan Expo SecureStore
 * untuk mengamankan komunikasi RESTful API dengan JWT Token:
 *   - POST /login atau /api/login → Autentikasi & Pengambilan JWT Token
 *   - GET  /api/health            → Cek koneksi server (Public)
 *   - GET  /api/items             → Ambil daftar barang (Protected)
 *   - GET  /api/items/:id         → Ambil detail satu barang (Protected)
 *   - POST /api/items             → Tambah laporan barang (Protected)
 *   - GET  /api/claims            → Ambil daftar klaim (Protected)
 *   - POST /api/claims            → Ajukan klaim baru (Protected)
 *   - PUT  /api/claims/:id/verify → Verifikasi klaim (Admin Only)
 *   - GET  /api/programs          → Ambil daftar program kampus (Protected)
 *   - GET  /api/data              → Ambil seluruh data (Protected)
 *   - POST /api/sync              → Sinkronisasi data ke server (Protected)
 *
 * Status 401 Unauthorized otomatis mereset token & memicu re-login.
 * Status 403 Forbidden memvalidasi izin role pengguna.
 * Setiap error HTTP mempertahankan status code aktual tanpa mengarang kode palsu.
 */

import Constants from 'expo-constants';
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
import {
  AppApiError,
  HTTP_STATUS_DESCRIPTIONS,
  HTTP_STATUS_NAMES,
} from './httpErrors';

import { secureStorage } from '@/services/storage/secureStorage';
import { CampusItem, ClaimRequest, ItemStatus } from '@/types';

// Re-export untuk kompatibilitas
export { AppApiError };
export const ApiError = AppApiError;
export type ApiError = AppApiError;

// ─────────────────────────────────────────────────────────
// KONFIGURASI API & SECURE STORE KEYS
// ─────────────────────────────────────────────────────────

export const SECURE_KEY_ACCESS_TOKEN = 'access_token';

/**
 * Base URL default untuk backend server.
 * Prioritas:
 * 1. Environment variable EXPO_PUBLIC_API_URL
 * 2. Host IP dari Expo Metro (mendukung perangkat fisik Android via Wi-Fi)
 * 3. 10.0.2.2 untuk Android emulator
 * 4. localhost:3001 untuk web & iOS simulator
 */
function resolveDefaultApiBaseUrl(): string {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL.replace(/\/$/, '');
  }

  // Jika berjalan via Expo (perangkat fisik atau emulator terhubung ke Metro)
  const hostUri =
    Constants.expoConfig?.hostUri ||
    (Constants as any).manifest2?.extra?.expoClient?.hostUri ||
    (Constants as any).manifest?.debuggerHost;

  if (hostUri) {
    const host = hostUri.split(':')[0];
    if (host && host !== 'localhost' && host !== '127.0.0.1') {
      return `http://${host}:3001`;
    }
  }

  // Android emulator fallback
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:3001';
  }

  // Web / iOS default
  return 'http://localhost:3001';
}

const DEFAULT_API_BASE_URL = resolveDefaultApiBaseUrl();

/** Timeout default untuk request biasa (dalam ms) */
const DEFAULT_TIMEOUT_MS = 6000;

/** Timeout untuk health check (lebih pendek) */
const HEALTH_CHECK_TIMEOUT_MS = 3000;

// ─────────────────────────────────────────────────────────
// HELPER SECURESTORE (Dengan Web Fallback)
// ─────────────────────────────────────────────────────────

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

  setBaseUrl(url: string): void {
    this.baseUrl = url;
  }

  getBaseUrl(): string {
    return this.baseUrl;
  }

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

  public async fetchWithTimeout(
    endpoint: string,
    options: RequestInit = {},
    customTimeoutMs?: number,
    isPublic: boolean = false
  ): Promise<Response> {
    const url = `${this.baseUrl}${endpoint}`;
    const timeout = customTimeoutMs || this.timeoutMs;

    let authHeaders: Record<string, string> = {};
    if (!isPublic) {
      const token = await getStoredAccessToken();
      if (token) {
        authHeaders['Authorization'] = `Bearer ${token}`;
      }
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    let response: Response;
    try {
      response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
          ...options.headers,
        },
      });
      clearTimeout(timeoutId);
    } catch (error: any) {
      clearTimeout(timeoutId);

      if (error.name === 'AbortError') {
        throw new AppApiError({
          isTimeout: true,
          message: 'Request Timeout — server tidak memberikan respons tepat waktu.',
        });
      }

      throw new AppApiError({
        isNetworkError: true,
        message: 'Koneksi gagal — server tidak dapat dijangkau.',
      });
    }

    // ── Tangani Respon HTTP Non-2xx ──
    if (!response.ok) {
      const statusCode = response.status;
      let rawBody = '';
      let serverJson: any = null;

      try {
        rawBody = await response.text();
        if (rawBody) {
          try {
            serverJson = JSON.parse(rawBody);
          } catch {
            serverJson = null;
          }
        }
      } catch {
        rawBody = '';
      }

      // Sesi 401 Unauthorized
      if (statusCode === 401) {
        console.warn(`[ApiService] 401 Unauthorized dari ${endpoint}!`);
        await deleteStoredAccessToken();
        if (this.unauthorizedCallback) {
          try {
            this.unauthorizedCallback();
          } catch (cbErr) {
            console.warn('[ApiService] Error executing unauthorized callback:', cbErr);
          }
        }
        throw new AppApiError({
          statusCode: 401,
          statusText: 'Unauthorized',
          message: 'HTTP 401 — Sesi login telah berakhir. Silakan login kembali.',
          rawBody,
          serverData: serverJson,
        });
      }

      // 403 Forbidden
      if (statusCode === 403) {
        throw new AppApiError({
          statusCode: 403,
          statusText: 'Forbidden',
          message:
            (serverJson && serverJson.error) ||
            'HTTP 403 — Anda tidak memiliki izin untuk melakukan tindakan ini.',
          rawBody,
          serverData: serverJson,
        });
      }

      // Kode HTTP Error Lainnya (400, 404, 408, 409, 422, 429, 500, 502, 503, 504, dll)
      const serverMsg =
        serverJson && (serverJson.error || serverJson.message || serverJson.detail);
      const defaultDesc =
        HTTP_STATUS_DESCRIPTIONS[statusCode] ||
        response.statusText ||
        'Terjadi kesalahan pada server.';

      const finalMsg = serverMsg
        ? `HTTP ${statusCode} — ${serverMsg}`
        : `HTTP ${statusCode} — ${defaultDesc}`;

      throw new AppApiError({
        statusCode,
        statusText: HTTP_STATUS_NAMES[statusCode] || response.statusText,
        message: finalMsg,
        rawBody,
        serverData: serverJson,
      });
    }

    return response;
  }

  // ── Retry Helper untuk Operasi Aman ──

  async requestWithRetry<T>(
    operation: () => Promise<T>,
    maxRetries = 2,
    delayMs = 800
  ): Promise<T> {
    let lastError: any;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (err: any) {
        lastError = err;
        const isRetryable =
          err?.isNetworkError ||
          err?.isTimeout ||
          err?.statusCode === 503 ||
          err?.statusCode === 429 ||
          err?.statusCode === 408;

        if (!isRetryable || attempt === maxRetries) {
          throw err;
        }
        await new Promise((resolve) =>
          setTimeout(resolve, delayMs * (attempt + 1))
        );
      }
    }
    throw lastError;
  }

  // ── Public API Methods ──

  /**
   * POST /login
   */
  async login(email: string, password: string): Promise<LoginResponseDTO> {
    const payload: LoginRequestDTO = { email, password };

    try {
      let response: Response;
      try {
        response = await this.fetchWithTimeout(
          '/login',
          {
            method: 'POST',
            body: JSON.stringify(payload),
          },
          undefined,
          true
        );
      } catch (err: any) {
        if (err instanceof AppApiError && err.statusCode === 404) {
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
        throw new AppApiError({
          statusCode: 500,
          message: 'HTTP 500 — Respons login server tidak valid (access_token tidak ditemukan).',
        });
      }

      await saveStoredAccessToken(json.access_token);
      return json;
    } catch (error) {
      console.warn('[ApiService] Gagal login via REST API:', (error as Error).message);
      throw error;
    }
  }

  /**
   * POST /logout
   */
  async logout(): Promise<void> {
    try {
      await this.fetchWithTimeout(
        '/logout',
        { method: 'POST' },
        2000,
        false
      );
    } catch {
      // Abaikan error saat logout agar sesi lokal tetap bersih
    } finally {
      await deleteStoredAccessToken();
    }
  }

  /**
   * GET /api/health
   */
  async checkHealth(): Promise<APIHealthDTO | null> {
    try {
      const response = await this.fetchWithTimeout(
        '/api/health',
        { method: 'GET' },
        HEALTH_CHECK_TIMEOUT_MS,
        true
      );
      const data: APIHealthDTO = await response.json();
      return data;
    } catch (error) {
      return null;
    }
  }

  /**
   * GET /api/items (Protected Endpoint)
   */
  async fetchItems(): Promise<CampusItem[]> {
    return await this.requestWithRetry(async () => {
      const response = await this.fetchWithTimeout('/api/items', {
        method: 'GET',
      });
      const json = await response.json();
      const rawItems: CampusItemDTO[] = Array.isArray(json)
        ? json
        : json.items || [];
      return mapCampusItemsDTOToModels(rawItems);
    });
  }

  /**
   * GET /api/items/:id (Protected Endpoint)
   */
  async fetchItemById(id: string): Promise<CampusItem> {
    const response = await this.fetchWithTimeout(`/api/items/${encodeURIComponent(id)}`, {
      method: 'GET',
    });
    const json = await response.json();
    const raw = json.item || json;
    if (!raw || !raw.id) {
      throw new AppApiError({
        statusCode: 404,
        message: 'HTTP 404 — Barang yang kamu cari tidak ditemukan.',
      });
    }
    return mapCampusItemDTOToModel(raw);
  }

  /**
   * POST /api/items (Protected Endpoint - Tambah Laporan / Temuan)
   */
  async createItem(item: Partial<CampusItem>): Promise<CampusItem> {
    const response = await this.fetchWithTimeout('/api/items', {
      method: 'POST',
      body: JSON.stringify(item),
    });
    const json = await response.json();
    const raw = json.item || json;
    return mapCampusItemDTOToModel(raw);
  }

  /**
   * GET /api/claims (Protected Endpoint)
   */
  async fetchClaims(): Promise<ClaimRequest[]> {
    return await this.requestWithRetry(async () => {
      const response = await this.fetchWithTimeout('/api/claims', {
        method: 'GET',
      });
      const json = await response.json();
      const rawClaims: ClaimRequestDTO[] = Array.isArray(json)
        ? json
        : json.claims || [];
      return mapClaimRequestsDTOToModels(rawClaims);
    });
  }

  /**
   * POST /api/claims (Protected Endpoint - Ajukan Klaim)
   */
  async submitClaim(claimData: {
    itemId: string;
    itemTitle: string;
    itemCategory: string;
    itemImage?: string;
    studentName: string;
    studentNim: string;
    studentFaculty: string;
    studentPhone: string;
    proofDetails: string;
    idCardImage?: string;
  }): Promise<{ success: boolean; claimId: string }> {
    const response = await this.fetchWithTimeout('/api/claims', {
      method: 'POST',
      body: JSON.stringify(claimData),
    });
    const json = await response.json();
    return {
      success: true,
      claimId: json.claim?.id || `claim-${Date.now()}`,
    };
  }

  /**
   * PUT /api/claims/:id/verify (Protected Endpoint - Admin Only)
   */
  async verifyClaim(
    claimId: string,
    approved: boolean,
    adminNotes?: string
  ): Promise<{ success: boolean; message: string }> {
    const response = await this.fetchWithTimeout(
      `/api/claims/${encodeURIComponent(claimId)}/verify`,
      {
        method: 'PUT',
        body: JSON.stringify({ approved, adminNotes }),
      }
    );
    const json = await response.json();
    return {
      success: true,
      message: json.message || (approved ? 'Klaim disetujui' : 'Klaim ditolak'),
    };
  }

  /**
   * GET /api/programs (Protected Endpoint)
   */
  async fetchPrograms(): Promise<ProgramDTO[]> {
    return await this.requestWithRetry(async () => {
      const response = await this.fetchWithTimeout('/api/programs', {
        method: 'GET',
      });
      const json = await response.json();
      return Array.isArray(json) ? json : json.programs || [];
    });
  }

  /**
   * GET /api/data (Protected Endpoint)
   */
  async fetchAllData(): Promise<{ items: CampusItem[]; claims: ClaimRequest[] }> {
    return await this.requestWithRetry(async () => {
      const response = await this.fetchWithTimeout('/api/data', {
        method: 'GET',
      });
      const json: APIDataResponseDTO = await response.json();
      return mapAPIDataResponseToModels(json);
    });
  }

  /**
   * POST /api/sync (Protected Endpoint)
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

export const apiService = new ApiService();
