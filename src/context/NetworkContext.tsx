import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { AppState, AppStateStatus } from 'react-native';

import { apiService } from '@/services/api/apiService';

/**
 * 4 Status Koneksi Standar TemuIn:
 * 1. 'connecting'         → Menghubungkan... (pemeriksaan berjalan)
 * 2. 'online'             → Online (perangkat terhubung & backend merespon)
 * 3. 'offline'            → Offline (tidak ada koneksi jaringan perangkat)
 * 4. 'server_unavailable' → Server tidak tersedia (jaringan aktif, tetapi backend gagal dijangkau)
 */
export type ConnectionState =
  | 'connecting'
  | 'online'
  | 'offline'
  | 'server_unavailable';

interface NetworkContextType {
  connectionState: ConnectionState;
  isDeviceConnected: boolean;
  isBackendReachable: boolean;
  lastChecked: Date | null;
  serverUrl: string;
  recheckConnection: () => Promise<void>;
}

const NetworkContext = createContext<NetworkContextType | undefined>(undefined);

// Interval pemeriksaan berkala (30 detik untuk menghemat baterai & data)
const BACKGROUND_PING_INTERVAL_MS = 30000;

export const NetworkProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [connectionState, setConnectionState] =
    useState<ConnectionState>('connecting');
  const [isDeviceConnected, setIsDeviceConnected] = useState<boolean>(true);
  const [isBackendReachable, setIsBackendReachable] = useState<boolean>(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const prevOnlineRef = useRef<boolean>(false);
  const isCheckingRef = useRef<boolean>(false);

  /**
   * Pemeriksaan Status Koneksi Terpadu:
   * 1. Evaluasi konektivitas perangkat via NetInfo
   *    - Jika isConnected === false → OFFLINE
   *    - Jika isConnected === true && isInternetReachable === false → OFFLINE
   *    - Jika isConnected === true && (isInternetReachable === true || null) → Perangkat Ada Jaringan
   * 2. Evaluasi keterjangkauan backend server via apiService.checkHealth()
   *    - Jika backend OK → ONLINE
   *    - Jika backend GAGAL → SERVER TIDAK TERSEDIA (bukan Offline)
   */
  const checkHealthAndNetwork = useCallback(async (stateOverride?: NetInfoState) => {
    if (isCheckingRef.current) return;
    isCheckingRef.current = true;

    try {
      const netState = stateOverride || (await NetInfo.fetch());

      // Evaluasi apakah perangkat memiliki koneksi jaringan
      const isConnected = Boolean(netState.isConnected);
      const isReachable = netState.isInternetReachable;

      // Perangkat offline jika tidak terhubung atau internet terbukti tidak dapat dijangkau
      const deviceHasNetwork =
        isConnected && (isReachable === true || isReachable === null);

      setIsDeviceConnected(deviceHasNetwork);

      if (!deviceHasNetwork) {
        // KASUS 1: Perangkat tidak memiliki koneksi jaringan
        setIsBackendReachable(false);
        setConnectionState('offline');
        prevOnlineRef.current = false;
        setLastChecked(new Date());
        return;
      }

      // KASUS 2: Perangkat memiliki koneksi jaringan, verifikasi ketersediaan backend TemuIn
      setConnectionState('connecting');

      const health = await apiService.checkHealth();
      const backendOk = Boolean(health && health.status === 'ok');

      setIsBackendReachable(backendOk);
      setLastChecked(new Date());

      if (backendOk) {
        // KASUS 2A: Backend merespon dengan baik → ONLINE
        setConnectionState('online');
        if (!prevOnlineRef.current) {
          console.log('[Network] Terhubung ke backend TemuIn, mode ONLINE aktif.');
        }
        prevOnlineRef.current = true;
      } else {
        // KASUS 2B: Jaringan perangkat aktif, tetapi backend gagal dijangkau → SERVER TIDAK TERSEDIA
        setConnectionState('server_unavailable');
        prevOnlineRef.current = false;
      }
    } catch (err) {
      setIsBackendReachable(false);
      setConnectionState('server_unavailable');
      prevOnlineRef.current = false;
    } finally {
      isCheckingRef.current = false;
    }
  }, []);

  useEffect(() => {
    // 1. Jalankan pemeriksaan awal
    checkHealthAndNetwork();

    // 2. Pasang listener konektivitas NetInfo (kompatibel Expo)
    const unsubscribeNetInfo = NetInfo.addEventListener((state: NetInfoState) => {
      checkHealthAndNetwork(state);
    });

    // 3. Interval berkala yang wajar (30 detik)
    const intervalId = setInterval(() => {
      checkHealthAndNetwork();
    }, BACKGROUND_PING_INTERVAL_MS);

    // 4. Listener AppState: periksa koneksi saat pengguna membuka kembali aplikasi
    const subscriptionAppState = AppState.addEventListener(
      'change',
      (nextState: AppStateStatus) => {
        if (nextState === 'active') {
          checkHealthAndNetwork();
        }
      }
    );

    // Bersihkan semua listener saat unmount
    return () => {
      unsubscribeNetInfo();
      clearInterval(intervalId);
      subscriptionAppState.remove();
    };
  }, [checkHealthAndNetwork]);

  return (
    <NetworkContext.Provider
      value={{
        connectionState,
        isDeviceConnected,
        isBackendReachable,
        lastChecked,
        serverUrl: apiService.getBaseUrl(),
        recheckConnection: () => checkHealthAndNetwork(),
      }}
    >
      {children}
    </NetworkContext.Provider>
  );
};

export const useNetwork = (): NetworkContextType => {
  const context = useContext(NetworkContext);
  if (!context) {
    throw new Error('useNetwork harus digunakan di dalam NetworkProvider');
  }
  return context;
};
