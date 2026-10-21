import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  StyleProp,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';

import { ConnectionState, useNetwork } from '@/context/NetworkContext';

interface ConnectionStatusProps {
  showOfflineNotice?: boolean;
  style?: StyleProp<ViewStyle>;
  compact?: boolean;
}

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({
  showOfflineNotice = true,
  style,
  compact = false,
}) => {
  const {
    connectionState,
    isDeviceConnected,
    isBackendReachable,
    recheckConnection,
    serverUrl,
  } = useNetwork();

  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleManualCheck = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    await recheckConnection();
    setIsRefreshing(false);
  };

  const getStatusConfig = () => {
    switch (connectionState) {
      case 'online':
        return {
          dotColor: '#10B981', // Hijau
          textColor: '#065F46',
          bgColor: '#ECFDF5',
          borderColor: '#A7F3D0',
          icon: 'checkmark-circle' as const,
          label: 'Online',
          description: 'Terhubung ke server TemuIn UMM',
        };
      case 'connecting':
        return {
          dotColor: '#F59E0B', // Kuning / Amber
          textColor: '#92400E',
          bgColor: '#FFFBEB',
          borderColor: '#FDE68A',
          icon: 'sync' as const,
          label: 'Menghubungkan...',
          description: 'Memeriksa koneksi ke server backend...',
        };
      case 'server_unavailable':
        return {
          dotColor: '#EA580C', // Oranye
          textColor: '#9A3412',
          bgColor: '#FFF7ED',
          borderColor: '#FFEDD5',
          icon: 'alert-circle' as const,
          label: 'Server tidak tersedia',
          description:
            'Jaringan perangkat aktif, tetapi server TemuIn belum dapat dijangkau.',
        };
      case 'offline':
      default:
        return {
          dotColor: '#EF4444', // Merah
          textColor: '#991B1B',
          bgColor: '#FEF2F2',
          borderColor: '#FECACA',
          icon: 'cloud-offline' as const,
          label: 'Offline',
          description: 'Tidak ada koneksi jaringan (Wi-Fi atau Data Seluler).',
        };
    }
  };

  const config = getStatusConfig();

  // Mode Compact: HANYA me-render pill mini (tanpa banner ekspansif)
  // Ini mencegah layout breaking di header/greeting row
  if (compact) {
    return (
      <TouchableOpacity
        onPress={handleManualCheck}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`Status koneksi: ${config.label}. Ketuk untuk memeriksa ulang.`}
        style={[
          styles.compactPill,
          {
            backgroundColor: config.bgColor,
            borderColor: config.borderColor,
          },
          style,
        ]}
      >
        {connectionState === 'connecting' || isRefreshing ? (
          <ActivityIndicator size={9} color={config.dotColor} style={styles.dot} />
        ) : (
          <View style={[styles.dot, { backgroundColor: config.dotColor }]} />
        )}
        <Text
          style={[styles.compactStatusText, { color: config.textColor }]}
          numberOfLines={1}
        >
          {config.label}
        </Text>
      </TouchableOpacity>
    );
  }

  // Mode Full: Pill + Banner Pemberitahuan jika server tidak tersedia atau offline
  const shouldShowBanner =
    showOfflineNotice &&
    (connectionState === 'offline' || connectionState === 'server_unavailable');

  return (
    <View style={[styles.fullWrapper, style]}>
      {/* Pill Status */}
      <TouchableOpacity
        onPress={handleManualCheck}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`Status koneksi: ${config.label}. Ketuk untuk memeriksa ulang.`}
        style={[
          styles.pill,
          {
            backgroundColor: config.bgColor,
            borderColor: config.borderColor,
          },
        ]}
      >
        <View style={styles.pillLeft}>
          {connectionState === 'connecting' || isRefreshing ? (
            <ActivityIndicator size={11} color={config.dotColor} style={styles.dot} />
          ) : (
            <View style={[styles.dot, { backgroundColor: config.dotColor }]} />
          )}
          <Text style={[styles.statusText, { color: config.textColor }]}>
            {config.label}
          </Text>
        </View>

        <Ionicons
          name="refresh-outline"
          size={13}
          color={config.textColor}
          style={styles.refreshIcon}
        />
      </TouchableOpacity>

      {/* Banner Informasi Gangguan Koneksi */}
      {shouldShowBanner && (
        <View
          style={[
            styles.noticeCard,
            {
              backgroundColor: config.bgColor,
              borderColor: config.borderColor,
            },
          ]}
        >
          <Ionicons
            name={connectionState === 'offline' ? 'wifi-outline' : 'server-outline'}
            size={18}
            color={config.textColor}
            style={styles.noticeIcon}
          />
          <View style={styles.noticeTextWrap}>
            <Text style={[styles.noticeTitle, { color: config.textColor }]}>
              {connectionState === 'offline'
                ? 'Mode Offline Aktif'
                : 'Server Backend Tidak Tersedia'}
            </Text>
            <Text style={[styles.noticeDesc, { color: config.textColor }]}>
              {config.description} Data ditampilkan dari cache lokal.
            </Text>
          </View>
          <TouchableOpacity
            onPress={handleManualCheck}
            style={[styles.retryChip, { backgroundColor: config.dotColor }]}
            activeOpacity={0.8}
          >
            <Text style={styles.retryChipText}>Coba</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  // Compact styles
  compactPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 14,
    borderWidth: 1,
    gap: 5,
    alignSelf: 'flex-start',
    maxWidth: 160,
  },
  compactStatusText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.1,
  },

  // Full styles
  fullWrapper: {
    width: '100%',
    marginVertical: 4,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    alignSelf: 'flex-start',
    gap: 8,
  },
  pillLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  refreshIcon: {
    opacity: 0.7,
    marginLeft: 2,
  },
  noticeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginTop: 8,
    gap: 10,
    width: '100%',
  },
  noticeIcon: {
    marginRight: 2,
  },
  noticeTextWrap: {
    flex: 1,
  },
  noticeTitle: {
    fontSize: 12,
    fontWeight: '700',
  },
  noticeDesc: {
    fontSize: 11,
    lineHeight: 15,
    marginTop: 2,
    opacity: 0.9,
  },
  retryChip: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryChipText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
});
