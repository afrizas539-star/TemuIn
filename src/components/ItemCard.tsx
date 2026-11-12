import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import {
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { StatusBadge } from './StatusBadge';

import { AppRadius, Colors, Typography } from '@/constants/theme';
import { CampusItem } from '@/types';

interface ItemCardProps {
  item: CampusItem;
  onPress?: () => void;
  isAdmin?: boolean;
}

export const ItemCard: React.FC<ItemCardProps> = ({ item, onPress, isAdmin = false }) => {
  const router = useRouter();
  const theme = Colors.light;

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      router.push(`/item/${item.id}` as any);
    }
  };

  const isLost = item.type === 'lost';

  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={handlePress}
      style={styles.cardContainer}
      accessibilityRole="button"
      accessibilityLabel={`Buka detail barang: ${item.title}`}
    >
      <View style={styles.imageWrapper}>
        <Image source={{ uri: item.image }} style={styles.image} resizeMode="cover" />
        <View
          style={[
            styles.typePill,
            { backgroundColor: isLost ? theme.danger : theme.success },
          ]}
        >
          <Text style={styles.typePillText}>{isLost ? 'BARANG HILANG' : 'BARANG TEMUAN'}</Text>
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.statusRow}>
          <StatusBadge status={item.status} size="small" />
          <Text style={styles.categoryLabel}>{item.category}</Text>
        </View>

        <Text style={styles.title} numberOfLines={2}>
          {item.title}
        </Text>

        <View style={styles.metaRow}>
          <Ionicons name="location-outline" size={13} color={theme.textSecondary} />
          <Text style={styles.locationText} numberOfLines={1}>
            {item.location}
          </Text>
        </View>

        <View style={styles.footerRow}>
          <View style={styles.dateWrap}>
            <Ionicons name="time-outline" size={12} color={theme.textMuted} />
            <Text style={styles.dateText}>{item.date}</Text>
          </View>

          <View style={styles.openDetailHint}>
            <Text style={styles.openDetailText}>{isAdmin ? 'Kelola' : 'Lihat Detail'}</Text>
            <Ionicons name="chevron-forward" size={14} color={theme.primary} />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: Colors.light.surface,
    borderRadius: AppRadius.medium,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.light.border,
    overflow: 'hidden',
  },
  imageWrapper: {
    width: '100%',
    height: 150,
    backgroundColor: Colors.light.surfaceMuted,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  typePill: {
    position: 'absolute',
    top: 10,
    left: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: AppRadius.small,
  },
  typePillText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  content: {
    padding: 12,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  categoryLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.light.textSecondary,
    backgroundColor: Colors.light.surfaceMuted,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: AppRadius.small,
    borderWidth: 1,
    borderColor: Colors.light.borderMuted,
  },
  title: {
    fontSize: Typography.size.subtitle,
    lineHeight: Typography.lineHeight.subtitle,
    fontWeight: '800',
    color: Colors.light.text,
    letterSpacing: -0.2,
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 4,
  },
  locationText: {
    fontSize: Typography.size.caption,
    color: Colors.light.textSecondary,
    flex: 1,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.light.borderMuted,
  },
  dateWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateText: {
    fontSize: 11,
    color: Colors.light.textMuted,
  },
  openDetailHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  openDetailText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.light.primary,
  },
});
