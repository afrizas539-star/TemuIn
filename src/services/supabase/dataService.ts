import { RealtimeChannel } from '@supabase/supabase-js';

import { supabase } from '@/lib/supabase';
import { CampusItem, ClaimRequest, ClaimStatus, ItemStatus, ItemType } from '@/types';

/**
 * Pemetaan Data: Supabase (snake_case) <--> Aplikasi TemuIn (camelCase)
 */

export function rowToItem(row: any): CampusItem {
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    type: row.type as ItemType,
    status: row.status as ItemStatus,
    statusColor: row.status_color || '#64748B',
    date: row.date,
    location: row.location,
    locationDetail: row.location_detail || undefined,
    faculty: row.faculty || 'Umum',
    description: row.description || '',
    reward: row.reward || null,
    reporter: row.reporter,
    image: row.image,
    createdAt: row.created_at,
    userId: row.user_id || undefined,
    lostStatus: row.lost_status || undefined,
    foundStatus: row.found_status || undefined,
    verificationStatus: row.verification_status || undefined,
    foundItemId: row.found_item_id || undefined,
    linkedLostItemId: row.linked_lost_item_id || undefined,
    additionalInfo: row.additional_info || undefined,
    isResolved: !!row.is_resolved,
  };
}

export function itemToRow(item: Partial<CampusItem>): Record<string, any> {
  const row: Record<string, any> = {};
  if (item.title !== undefined) row.title = item.title;
  if (item.category !== undefined) row.category = item.category;
  if (item.type !== undefined) row.type = item.type;
  if (item.status !== undefined) row.status = item.status;
  if (item.statusColor !== undefined) row.status_color = item.statusColor;
  if (item.date !== undefined) row.date = item.date;
  if (item.location !== undefined) row.location = item.location;
  if (item.locationDetail !== undefined) row.location_detail = item.locationDetail;
  if (item.faculty !== undefined) row.faculty = item.faculty;
  if (item.description !== undefined) row.description = item.description;
  if (item.reward !== undefined) row.reward = item.reward;
  if (item.reporter !== undefined) row.reporter = item.reporter;
  if (item.image !== undefined) row.image = item.image;
  if (item.userId !== undefined) row.user_id = item.userId;
  if (item.lostStatus !== undefined) row.lost_status = item.lostStatus;
  if (item.foundStatus !== undefined) row.found_status = item.foundStatus;
  if (item.verificationStatus !== undefined) row.verification_status = item.verificationStatus;
  if (item.foundItemId !== undefined) row.found_item_id = item.foundItemId;
  if (item.linkedLostItemId !== undefined) row.linked_lost_item_id = item.linkedLostItemId;
  if (item.additionalInfo !== undefined) row.additional_info = item.additionalInfo;
  if (item.isResolved !== undefined) row.is_resolved = item.isResolved;
  return row;
}

export function rowToClaim(row: any): ClaimRequest {
  return {
    id: row.id,
    itemId: row.item_id,
    itemTitle: row.item_title,
    itemCategory: row.item_category,
    itemImage: row.item_image || undefined,
    userId: row.user_id || undefined,
    studentName: row.student_name,
    studentNim: row.student_nim,
    studentFaculty: row.student_faculty,
    studentPhone: row.student_phone,
    proofDetails: row.proof_details,
    idCardImage: row.id_card_image,
    status: row.status as ClaimStatus,
    adminNotes: row.admin_notes || undefined,
    createdAt: row.created_at,
    verifiedAt: row.verified_at || undefined,
    verifiedBy: row.verified_by || undefined,
  };
}

export function claimToRow(claim: Partial<ClaimRequest>): Record<string, any> {
  const row: Record<string, any> = {};
  if (claim.itemId !== undefined) row.item_id = claim.itemId;
  if (claim.itemTitle !== undefined) row.item_title = claim.itemTitle;
  if (claim.itemCategory !== undefined) row.item_category = claim.itemCategory;
  if (claim.itemImage !== undefined) row.item_image = claim.itemImage;
  if (claim.userId !== undefined) row.user_id = claim.userId;
  if (claim.studentName !== undefined) row.student_name = claim.studentName;
  if (claim.studentNim !== undefined) row.student_nim = claim.studentNim;
  if (claim.studentFaculty !== undefined) row.student_faculty = claim.studentFaculty;
  if (claim.studentPhone !== undefined) row.student_phone = claim.studentPhone;
  if (claim.proofDetails !== undefined) row.proof_details = claim.proofDetails;
  if (claim.idCardImage !== undefined) row.id_card_image = claim.idCardImage;
  if (claim.status !== undefined) row.status = claim.status;
  if (claim.adminNotes !== undefined) row.admin_notes = claim.adminNotes;
  if (claim.verifiedAt !== undefined) row.verified_at = claim.verifiedAt;
  if (claim.verifiedBy !== undefined) row.verified_by = claim.verifiedBy;
  return row;
}

// ─── ITEMS CRUD ─────────────────────────────────────────────────────────────

export async function getAllItemsFromDatabase(): Promise<CampusItem[]> {
  try {
    const { data, error } = await supabase
      .from('items')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[dataService] getAllItems error:', error.message);
      return [];
    }

    return (data || []).map(rowToItem);
  } catch (err) {
    console.error('[dataService] getAllItems exception:', err);
    return [];
  }
}
// Alias untuk backwards compatibility
export const getAllItemsFromFirestore = getAllItemsFromDatabase;

export async function addItemToDatabase(
  item: Omit<CampusItem, 'id'>,
  customId?: string
): Promise<CampusItem> {
  const payload = itemToRow(item);
  if (customId) {
    payload.id = customId;
  }

  const { data, error } = await supabase
    .from('items')
    .insert([payload])
    .select()
    .single();

  if (error) {
    console.error('[dataService] addItem error:', error.message);
    throw new Error(`Gagal menyimpan data barang ke database: ${error.message}`);
  }

  return rowToItem(data);
}
export const addItemToFirestore = addItemToDatabase;

export async function updateItemInDatabase(
  itemId: string,
  updatedFields: Partial<CampusItem>
): Promise<void> {
  const payload = itemToRow(updatedFields);
  const { error } = await supabase
    .from('items')
    .update(payload)
    .eq('id', itemId);

  if (error) {
    console.error('[dataService] updateItem error:', error.message);
    throw new Error(`Gagal memperbarui barang: ${error.message}`);
  }
}
export const updateItemInFirestore = updateItemInDatabase;

export async function deleteItemFromDatabase(itemId: string): Promise<void> {
  const { error } = await supabase
    .from('items')
    .delete()
    .eq('id', itemId);

  if (error) {
    console.error('[dataService] deleteItem error:', error.message);
    throw new Error(`Gagal menghapus barang: ${error.message}`);
  }
}
export const deleteItemFromFirestore = deleteItemFromDatabase;

export function subscribeToItems(onUpdate: (items: CampusItem[]) => void): () => void {
  // Ambil fetch awal
  getAllItemsFromDatabase().then((items) => {
    onUpdate(items);
  });

  // Saluran realtime Postgres Changes
  const channel: RealtimeChannel = supabase
    .channel('public:items')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'items' },
      async () => {
        const freshItems = await getAllItemsFromDatabase();
        onUpdate(freshItems);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

// ─── CLAIMS CRUD ────────────────────────────────────────────────────────────

export async function getAllClaimsFromDatabase(): Promise<ClaimRequest[]> {
  try {
    const { data, error } = await supabase
      .from('claims')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[dataService] getAllClaims error:', error.message);
      return [];
    }

    return (data || []).map(rowToClaim);
  } catch (err) {
    console.error('[dataService] getAllClaims exception:', err);
    return [];
  }
}
export const getAllClaimsFromFirestore = getAllClaimsFromDatabase;

export async function addClaimToDatabase(
  claim: Omit<ClaimRequest, 'id' | 'createdAt'>
): Promise<ClaimRequest> {
  const payload = claimToRow(claim);
  const { data, error } = await supabase
    .from('claims')
    .insert([payload])
    .select()
    .single();

  if (error) {
    console.error('[dataService] addClaim error:', error.message);
    throw new Error(`Gagal mengajukan klaim barang: ${error.message}`);
  }

  return rowToClaim(data);
}
export const addClaimToFirestore = addClaimToDatabase;

export async function updateClaimInDatabase(
  claimId: string,
  updatedFields: Partial<ClaimRequest>
): Promise<void> {
  const payload = claimToRow(updatedFields);
  const { error } = await supabase
    .from('claims')
    .update(payload)
    .eq('id', claimId);

  if (error) {
    console.error('[dataService] updateClaim error:', error.message);
    throw new Error(`Gagal memperbarui status klaim: ${error.message}`);
  }
}
export const updateClaimInFirestore = updateClaimInDatabase;

export function subscribeToClaims(onUpdate: (claims: ClaimRequest[]) => void): () => void {
  getAllClaimsFromDatabase().then((claims) => {
    onUpdate(claims);
  });

  const channel: RealtimeChannel = supabase
    .channel('public:claims')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'claims' },
      async () => {
        const freshClaims = await getAllClaimsFromDatabase();
        onUpdate(freshClaims);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
