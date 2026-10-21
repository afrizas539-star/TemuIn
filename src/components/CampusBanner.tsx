import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

interface CampusBannerProps {
  onPressInfo?: () => void;
}

export const CampusBanner: React.FC<CampusBannerProps> = ({ onPressInfo }) => {
  return (
    <View style={styles.bannerContainer}>
      <View style={styles.gradientDecoration} />
      <View style={styles.contentWrap}>
        <View style={styles.badgeRow}>
          <View style={styles.livePill}>
            <View style={styles.pulseDot} />
            <Text style={styles.liveText}>POSKO KEAMANAN UNIVERSITAS MUHAMMADIYAH MALANG</Text>
          </View>
          <Text style={styles.phoneHint}>Ext. 101</Text>
        </View>

        <Text style={styles.title}>Barang Tertinggal atau Menemukan Barang?</Text>
        <Text style={styles.subtitle}>
          Demi keamanan civitas akademika Universitas Muhammadiyah Malang, seluruh laporan dan serah terima fisik barang berkoordinasi melalui TemuIn dan Pos Satpam resmi.
        </Text>

        <TouchableOpacity
          activeOpacity={0.8}
          style={styles.actionBtn}
          onPress={onPressInfo}
        >
          <Ionicons name="information-circle" size={16} color="#0266B3" />
          <Text style={styles.actionBtnText}>Panduan TemuIn & Pos Satpam</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  bannerContainer: {
    backgroundColor: '#1E293B',
    borderRadius: 18,
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 4,
  },
  gradientDecoration: {
    position: 'absolute',
    top: -30,
    right: -30,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#3B82F6',
    opacity: 0.15,
  },
  contentWrap: {
    position: 'relative',
    zIndex: 1,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 6,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  liveText: {
    color: '#E2E8F0',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  phoneHint: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '600',
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.3,
    marginBottom: 6,
    lineHeight: 22,
  },
  subtitle: {
    fontSize: 12,
    color: '#CBD5E1',
    lineHeight: 18,
    marginBottom: 12,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    alignSelf: 'flex-start',
    gap: 6,
  },
  actionBtnText: {
    color: '#1E293B',
    fontSize: 12,
    fontWeight: '700',
  },
});
