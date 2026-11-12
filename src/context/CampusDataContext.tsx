import React, { createContext, useContext, useEffect, useState } from 'react';

import { apiService } from '@/services/api/apiService';
import { campusRepository } from '@/services/repository/campusRepository';
import { CampusItem, ClaimRequest, ItemStatus } from '@/types';

interface CampusDataContextType {
  items: CampusItem[];
  claims: ClaimRequest[];
  isLoading: boolean;
  isBackendConnected: boolean;
  addItem: (item: Omit<CampusItem, 'id' | 'createdAt'>) => Promise<CampusItem>;
  reportLostItem: (data: {
    title: string;
    category: string;
    description: string;
    location: string;
    date: string;
    image?: string;
    additionalInfo?: string;
    userId: string;
    reporter: string;
    faculty?: string;
  }) => Promise<CampusItem>;
  verifyLostReport: (
    itemId: string,
    approved: boolean,
    adminNotes?: string
  ) => Promise<{ success: boolean; message: string }>;
  addFoundItem: (data: {
    title: string;
    category: string;
    description: string;
    location: string;
    date: string;
    image: string;
    reporter: string;
    faculty?: string;
  }) => Promise<CampusItem>;
  linkLostWithFound: (
    lostItemId: string,
    foundItemId: string
  ) => Promise<{ success: boolean; message: string }>;
  updateItemStatus: (itemId: string, newStatus: ItemStatus) => Promise<void>;
  updateItem: (itemId: string, updatedFields: Partial<CampusItem>) => Promise<void>;
  deleteItem: (itemId: string) => Promise<void>;
  submitClaim: (claim: {
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
  }) => Promise<{ success: boolean; claimId?: string; message?: string }>;
  verifyClaim: (
    claimId: string,
    approved: boolean,
    adminNotes?: string,
    adminName?: string
  ) => Promise<{ success: boolean; message?: string }>;
  getItemById: (id: string) => CampusItem | undefined;
  getClaimById: (id: string) => ClaimRequest | undefined;
  refreshData: () => Promise<void>;
}

const CampusDataContext = createContext<CampusDataContextType | undefined>(undefined);

export const CampusDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CampusItem[]>([]);
  const [claims, setClaims] = useState<ClaimRequest[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isBackendConnected, setIsBackendConnected] = useState<boolean>(false);

  useEffect(() => {
    // Subscribe ke Firestore realtime via campusRepository
    const unsubscribe = campusRepository.subscribe((state) => {
      setItems(state.items);
      setClaims(state.claims);
      setIsLoading(false);
    });

    // Jalankan fetch awal dari Firestore
    campusRepository.refreshData().finally(() => {
      setIsLoading(false);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Backwards-compatible addItem
  const addItem = async (itemData: Omit<CampusItem, 'id' | 'createdAt'>): Promise<CampusItem> => {
    if (itemData.type === 'lost') {
      return await campusRepository.reportLostItem({
        title: itemData.title,
        category: itemData.category,
        description: itemData.description,
        location: itemData.location,
        date: itemData.date,
        image: itemData.image,
        additionalInfo: itemData.additionalInfo,
        userId: itemData.userId || 'admin-1',
        reporter: itemData.reporter,
        faculty: itemData.faculty,
      });
    } else {
      return await campusRepository.addFoundItem({
        title: itemData.title,
        category: itemData.category,
        description: itemData.description,
        location: itemData.location,
        date: itemData.date,
        image: itemData.image,
        reporter: itemData.reporter,
        faculty: itemData.faculty,
      });
    }
  };

  const reportLostItem = async (data: Parameters<CampusDataContextType['reportLostItem']>[0]) => {
    return await campusRepository.reportLostItem(data);
  };

  const verifyLostReport = async (itemId: string, approved: boolean, adminNotes?: string) => {
    return await campusRepository.verifyLostReport(itemId, approved, adminNotes);
  };

  const addFoundItem = async (data: Parameters<CampusDataContextType['addFoundItem']>[0]) => {
    return await campusRepository.addFoundItem(data);
  };

  const linkLostWithFound = async (lostItemId: string, foundItemId: string) => {
    return await campusRepository.linkLostWithFound(lostItemId, foundItemId);
  };

  const updateItemStatus = async (itemId: string, newStatus: ItemStatus) => {
    await campusRepository.updateItemStatus(itemId, newStatus);
  };

  const updateItem = async (itemId: string, updatedFields: Partial<CampusItem>) => {
    await campusRepository.updateItem(itemId, updatedFields);
  };

  const deleteItem = async (itemId: string) => {
    try {
      await apiService.deleteItem(itemId);
    } catch (apiErr) {
      console.warn('[CampusData] REST API delete error:', apiErr);
    }
    await campusRepository.deleteItem(itemId);
  };

  const submitClaim = async (claim: Parameters<CampusDataContextType['submitClaim']>[0]) => {
    return await campusRepository.submitClaim(claim);
  };

  const verifyClaim = async (
    claimId: string,
    approved: boolean,
    adminNotes?: string,
    adminName?: string
  ) => {
    return await campusRepository.verifyClaim(claimId, approved, adminNotes, adminName);
  };

  const getItemById = (id: string) => {
    return items.find((item) => item.id === id);
  };

  const getClaimById = (id: string) => {
    return claims.find((c) => c.id === id);
  };

  const refreshData = async () => {
    setIsLoading(true);
    await campusRepository.refreshData();
    setIsLoading(false);
  };

  return (
    <CampusDataContext.Provider
      value={{
        items,
        claims,
        isLoading,
        isBackendConnected,
        addItem,
        reportLostItem,
        verifyLostReport,
        addFoundItem,
        linkLostWithFound,
        updateItemStatus,
        updateItem,
        deleteItem,
        submitClaim,
        verifyClaim,
        getItemById,
        getClaimById,
        refreshData,
      }}
    >
      {children}
    </CampusDataContext.Provider>
  );
};

export const useCampusData = () => {
  const context = useContext(CampusDataContext);
  if (!context) {
    throw new Error('useCampusData must be used within a CampusDataProvider');
  }
  return context;
};
