/**
 * ============================================================
 * PEKAN 4 — TASK 01: DATA TRANSFER OBJECTS (DTO) & DATA MAPPING
 * ============================================================
 *
 * DTO adalah representasi data mentah yang diterima dari REST API.
 * Fungsi mapper mentransformasi DTO → Application Data Model
 * sehingga perubahan API tidak berdampak langsung ke UI.
 *
 * Skema Mapping:
 *   API Response (DTO)  →  mapper()  →  Application Model (CampusItem / ClaimRequest)
 *
 * Field yang digunakan dari API:
 *   - id (string)
 *   - title (string)
 *   - description (string)
 *   - image (string/URL)
 *   - status (string)
 *   - category (string)
 *   - type ('lost' | 'found')
 *   - location (string)
 *   - faculty (string)
 *   - reporter (string)
 *   - date (string)
 *
 * Field yang DIABAIKAN (tidak dipakai UI):
 *   - created_at / createdAt → hanya disimpan sebagai metadata internal
 *   - updated_at / updatedAt → tidak dipakai sama sekali
 *   - server_id → internal backend
 */

import { STATUS_COLORS } from '@/constants/initialData';
import {
  CampusItem,
  ClaimRequest,
  ClaimStatus,
  FoundItemStatus,
  ItemStatus,
  ItemType,
  LostItemStatus,
  VerificationStatus,
} from '@/types';

// ─────────────────────────────────────────────────────────
// 1. DTO INTERFACES — Bentuk data mentah dari REST API
// ─────────────────────────────────────────────────────────

/**
 * CampusItemDTO — Raw JSON shape dari endpoint GET /api/items
 * Merepresentasikan data barang (hilang/temuan) dari server.
 */
export interface CampusItemDTO {
  id: string;
  title: string;
  category: string;
  type: string; // 'lost' | 'found' (string dari API, perlu di-cast)
  status: string;
  date: string;
  location: string;
  faculty: string;
  description: string;
  image: string;
  reporter: string;
  reward?: string | null;
  userId?: string;

  // Status sub-field (opsional dari API)
  statusColor?: string;
  lostStatus?: string;
  foundStatus?: string;
  verificationStatus?: string;
  foundItemId?: string;
  linkedLostItemId?: string;
  additionalInfo?: string;

  // Field yang DIABAIKAN oleh UI (hanya metadata):
  createdAt?: string;
  created_at?: string;
  updatedAt?: string;
  updated_at?: string;
  server_id?: number;
}

/**
 * ClaimRequestDTO — Raw JSON shape dari endpoint GET /api/claims
 * Merepresentasikan data klaim barang dari server.
 */
export interface ClaimRequestDTO {
  id: string;
  itemId: string;
  itemTitle: string;
  itemCategory: string;
  itemImage?: string;
  userId?: string;
  studentName: string;
  studentNim: string;
  studentFaculty: string;
  studentPhone: string;
  proofDetails: string;
  idCardImage: string;
  status: string;
  adminNotes?: string;
  createdAt: string;
  verifiedAt?: string;
  verifiedBy?: string;

  // Field yang DIABAIKAN oleh UI:
  created_at?: string;
  updated_at?: string;
  server_id?: number;
}

/**
 * APIHealthDTO — Response dari GET /api/health
 */
export interface APIHealthDTO {
  status: string;
  service: string;
  serverTime: string;
  itemsCount: number;
  claimsCount: number;
}

/**
 * APISyncResponseDTO — Response dari POST /api/sync
 */
export interface APISyncResponseDTO {
  success: boolean;
  updatedAt: string;
}

/**
 * APIDataResponseDTO — Response dari GET /api/data (full database state)
 */
export interface APIDataResponseDTO {
  items: CampusItemDTO[];
  claims: ClaimRequestDTO[];
  updatedAt?: string;
}

/**
 * LoginRequestDTO — Payload untuk POST /login & POST /api/login
 */
export interface LoginRequestDTO {
  email: string;
  password: string;
  identifier?: string;
}

/**
 * LoginResponseDTO — Response dari POST /login (JWT access token)
 */
export interface LoginResponseDTO {
  success: boolean;
  access_token: string;
  token_type?: string;
  expires_in?: number;
  user: {
    id: string;
    name: string;
    email: string;
    role: 'student' | 'admin';
    phone?: string;
    nim?: string;
    faculty?: string;
    photo?: string;
  };
  error?: string;
  message?: string;
}

/**
 * ProgramDTO — Bentuk data program / info pengembalian dari GET /api/programs
 */
export interface ProgramDTO {
  id: string;
  title: string;
  description: string;
  category: string;
  status: string;
}

// ─────────────────────────────────────────────────────────
// 2. MAPPER / TRANSFORMER FUNCTIONS — DTO → Application Model
// ─────────────────────────────────────────────────────────

/**
 * Placeholder/default image jika API tidak mengirim image URL.
 */
const DEFAULT_ITEM_IMAGE =
  'https://images.unsplash.com/photo-1594980596870-8aa52a78d8cd?q=80&w=600&auto=format&fit=crop';

/**
 * Validasi dan cast string menjadi ItemType.
 * Jika tipe tidak dikenal, default ke 'found'.
 */
function parseItemType(raw: string): ItemType {
  if (raw === 'lost' || raw === 'found') return raw;
  return 'found';
}

/**
 * Validasi dan cast string menjadi ItemStatus.
 * Mapping status dari API ke format yang dikenali aplikasi.
 */
function parseItemStatus(raw: string): ItemStatus {
  const validStatuses: ItemStatus[] = [
    'DALAM PENCARIAN',
    'BARANG DITEMUKAN',
    'TERSEDIA',
    'DIAMBIL / SELESAI',
    'SELESAI',
    'Selesai',
    'Menunggu Verifikasi',
    'Disetujui',
    'Ditolak',
    'Barang Ditemukan',
    'Menunggu Klaim',
    'Proses Klaim',
    'Terverifikasi',
    'Sudah Diambil',
    'Dalam Pencarian',
    'Klaim Ditolak',
  ];

  const found = validStatuses.find(
    (s) => s.toLowerCase() === raw.toLowerCase()
  );
  return found || (raw as ItemStatus);
}

/**
 * Parse string menjadi VerificationStatus jika ada.
 */
function parseVerificationStatus(
  raw?: string
): VerificationStatus | undefined {
  if (!raw) return undefined;
  const valid: VerificationStatus[] = [
    'Menunggu Verifikasi',
    'Disetujui',
    'Ditolak',
  ];
  return valid.find((v) => v.toLowerCase() === raw.toLowerCase());
}

/**
 * Parse string menjadi LostItemStatus jika ada.
 */
function parseLostStatus(raw?: string): LostItemStatus | undefined {
  if (!raw) return undefined;
  const valid: LostItemStatus[] = [
    'DALAM PENCARIAN',
    'BARANG DITEMUKAN',
    'SELESAI',
  ];
  return valid.find((v) => v === raw);
}

/**
 * Parse string menjadi FoundItemStatus jika ada.
 */
function parseFoundStatus(raw?: string): FoundItemStatus | undefined {
  if (!raw) return undefined;
  const valid: FoundItemStatus[] = ['TERSEDIA', 'DIAMBIL / SELESAI'];
  return valid.find((v) => v === raw);
}

/**
 * Parse string menjadi ClaimStatus.
 */
function parseClaimStatus(raw: string): ClaimStatus {
  const valid: ClaimStatus[] = [
    'Menunggu Verifikasi',
    'Terverifikasi',
    'Klaim Ditolak',
  ];
  return valid.find((v) => v.toLowerCase() === raw.toLowerCase()) || 'Menunggu Verifikasi';
}

/**
 * Resolve warna status berdasarkan STATUS_COLORS constants.
 */
function resolveStatusColor(status: ItemStatus): string {
  return STATUS_COLORS[status]?.text || '#64748B';
}

// ─────────────────────────────────────────────────────────
// 3. PUBLIC MAPPER FUNCTIONS
// ─────────────────────────────────────────────────────────

/**
 * mapCampusItemDTOToModel
 *
 * Mengubah 1 CampusItemDTO (dari API) menjadi CampusItem (model aplikasi).
 * Filter/ignore field: created_at, updated_at, server_id
 * Mapping: statusColor dikomputasi dari status, image di-default jika kosong.
 */
export function mapCampusItemDTOToModel(dto: CampusItemDTO): CampusItem {
  const type = parseItemType(dto.type);
  const status = parseItemStatus(dto.status);

  return {
    // ── Field yang digunakan (sesuai spesifikasi Pekan 4) ──
    id: String(dto.id),
    title: dto.title || 'Tanpa Judul',
    category: dto.category || 'Lainnya',
    type,
    status,
    statusColor: dto.statusColor || resolveStatusColor(status),
    date: dto.date || '',
    location: dto.location || '',
    faculty: dto.faculty || 'Semua Fakultas',
    description: dto.description || '',
    image: dto.image || DEFAULT_ITEM_IMAGE,
    reporter: dto.reporter || '',
    reward: dto.reward ?? null,

    // ── Field opsional ──
    userId: dto.userId,
    lostStatus: parseLostStatus(dto.lostStatus),
    foundStatus: parseFoundStatus(dto.foundStatus),
    verificationStatus: parseVerificationStatus(dto.verificationStatus),
    foundItemId: dto.foundItemId,
    linkedLostItemId: dto.linkedLostItemId,
    additionalInfo: dto.additionalInfo,

    // ── createdAt disimpan internal, bukan ditampilkan di UI ──
    createdAt: dto.createdAt || dto.created_at || new Date().toISOString(),

    // ── DIABAIKAN: updated_at, server_id → tidak masuk model ──
  };
}

/**
 * mapClaimRequestDTOToModel
 *
 * Mengubah 1 ClaimRequestDTO (dari API) menjadi ClaimRequest (model aplikasi).
 */
export function mapClaimRequestDTOToModel(
  dto: ClaimRequestDTO
): ClaimRequest {
  return {
    id: String(dto.id),
    itemId: dto.itemId,
    itemTitle: dto.itemTitle || '',
    itemCategory: dto.itemCategory || '',
    itemImage: dto.itemImage,
    userId: dto.userId,
    studentName: dto.studentName || '',
    studentNim: dto.studentNim || '',
    studentFaculty: dto.studentFaculty || '',
    studentPhone: dto.studentPhone || '',
    proofDetails: dto.proofDetails || '',
    idCardImage: dto.idCardImage || '',
    status: parseClaimStatus(dto.status),
    adminNotes: dto.adminNotes,
    createdAt: dto.createdAt || dto.created_at || '',
    verifiedAt: dto.verifiedAt,
    verifiedBy: dto.verifiedBy,

    // ── DIABAIKAN: updated_at, server_id → tidak masuk model ──
  };
}

/**
 * mapCampusItemsDTOToModels
 *
 * Batch mapping: Array CampusItemDTO[] → CampusItem[]
 * Filter item yang tidak valid (tanpa id).
 */
export function mapCampusItemsDTOToModels(
  dtos: CampusItemDTO[]
): CampusItem[] {
  if (!Array.isArray(dtos)) return [];
  return dtos
    .filter((dto) => dto && dto.id != null)
    .map(mapCampusItemDTOToModel);
}

/**
 * mapClaimRequestsDTOToModels
 *
 * Batch mapping: Array ClaimRequestDTO[] → ClaimRequest[]
 */
export function mapClaimRequestsDTOToModels(
  dtos: ClaimRequestDTO[]
): ClaimRequest[] {
  if (!Array.isArray(dtos)) return [];
  return dtos
    .filter((dto) => dto && dto.id != null)
    .map(mapClaimRequestDTOToModel);
}

/**
 * mapAPIDataResponseToModels
 *
 * Mapping lengkap dari response GET /api/data ke model aplikasi.
 */
export function mapAPIDataResponseToModels(response: APIDataResponseDTO): {
  items: CampusItem[];
  claims: ClaimRequest[];
} {
  return {
    items: mapCampusItemsDTOToModels(response.items || []),
    claims: mapClaimRequestsDTOToModels(response.claims || []),
  };
}
