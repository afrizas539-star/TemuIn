import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/context/AuthContext';

interface AdminHeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
}

export const AdminHeader: React.FC<AdminHeaderProps> = ({
  title,
  subtitle,
  showBack = false,
}) => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { adminProfile } = useAuth();

  return (
    <View
      style={[
        styles.headerContainer,
        {
          paddingTop: Math.max(insets.top, Platform.OS === 'android' ? 24 : 12),
        },
      ]}
    >
      <View style={styles.topRow}>
        <View style={styles.leftGroup}>
          {showBack && (
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backButton}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          )}
          <View>
            <View style={styles.badgeRow}>
              <View style={styles.adminPill}>
                <Ionicons name="shield" size={12} color="#818CF8" />
                <Text style={styles.adminPillText}>PETUGAS TEMUIN • UMM</Text>
              </View>
            </View>
            <Text style={styles.titleText}>{title}</Text>
            <Text style={styles.subtitleText}>
              {subtitle || 'Universitas Muhammadiyah Malang'}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.studentModeBtn}
          activeOpacity={0.8}
          onPress={() => router.push('/home')}
        >
          <Ionicons name="eye-outline" size={15} color="#CBD5E1" />
          <Text style={styles.studentModeText}>Mode Mhs</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  adminPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 4,
  },
  adminPillText: {
    color: '#A5B4FC',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  titleText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.4,
  },
  subtitleText: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 1,
  },
  studentModeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 5,
    borderWidth: 1,
    borderColor: '#334155',
  },
  studentModeText: {
    color: '#E2E8F0',
    fontSize: 11,
    fontWeight: '600',
  },
});
