import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  StyleProp,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';

import { formatApiError } from '@/services/api/httpErrors';

export interface ApiErrorMessageProps {
  error: unknown;
  onRetry?: () => void;
  onDismiss?: () => void;
  compact?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
}

export const ApiErrorMessage: React.FC<ApiErrorMessageProps> = ({
  error,
  onRetry,
  onDismiss,
  compact = false,
  containerStyle,
}) => {
  const [showDevDetails, setShowDevDetails] = useState(false);

  if (!error) return null;

  const formatted = formatApiError(error);

  const isNetworkOrTimeout =
    formatted.badge === 'Koneksi Gagal' || formatted.badge === 'Request Timeout';

  const isWarningCode =
    formatted.statusCode === 404 ||
    formatted.statusCode === 429 ||
    formatted.statusCode === 408;

  const badgeColor = isNetworkOrTimeout
    ? '#EA580C' // Orange
    : isWarningCode
    ? '#D97706' // Amber
    : '#DC2626'; // Red

  const badgeBg = isNetworkOrTimeout
    ? '#FFF7ED'
    : isWarningCode
    ? '#FFFBEB'
    : '#FEF2F2';

  const badgeBorder = isNetworkOrTimeout
    ? '#FFEDD5'
    : isWarningCode
    ? '#FDE68A'
    : '#FECACA';

  if (compact) {
    return (
      <View style={[styles.compactContainer, { borderColor: badgeBorder, backgroundColor: badgeBg }, containerStyle]}>
        <View style={styles.compactRow}>
          <Ionicons
            name={isNetworkOrTimeout ? 'cloud-offline-outline' : 'alert-circle'}
            size={18}
            color={badgeColor}
          />
          <View style={styles.compactTextWrap}>
            <Text style={[styles.compactBadge, { color: badgeColor }]}>
              {formatted.badge}: {formatted.message}
            </Text>
          </View>
          {onRetry && (
            <TouchableOpacity
              onPress={onRetry}
              style={styles.compactRetryBtn}
              activeOpacity={0.7}
            >
              <Ionicons name="refresh" size={14} color="#2563EB" />
              <Text style={styles.compactRetryText}>Coba Lagi</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.card, { borderColor: badgeBorder, backgroundColor: badgeBg }, containerStyle]}>
      {/* Top Header Row with Badge & Dismiss */}
      <View style={styles.headerRow}>
        <View style={[styles.badgePill, { backgroundColor: badgeColor }]}>
          <Ionicons
            name={isNetworkOrTimeout ? 'wifi-outline' : 'alert-circle-outline'}
            size={13}
            color="#FFFFFF"
          />
          <Text style={styles.badgeText}>{formatted.badge}</Text>
        </View>

        {onDismiss && (
          <TouchableOpacity
            onPress={onDismiss}
            style={styles.dismissBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close" size={18} color="#64748B" />
          </TouchableOpacity>
        )}
      </View>

      {/* Title & Message */}
      <View style={styles.bodyWrap}>
        <Text style={styles.titleText}>{formatted.title}</Text>
        <Text style={styles.messageText}>{formatted.message}</Text>
      </View>

      {/* Dev Details Accordion (Only in Development) */}
      {Boolean(__DEV__ && formatted.devDetails) && (
        <View style={styles.devSection}>
          <TouchableOpacity
            style={styles.devToggle}
            onPress={() => setShowDevDetails((prev) => !prev)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={showDevDetails ? 'chevron-up' : 'chevron-down'}
              size={14}
              color="#64748B"
            />
            <Text style={styles.devToggleText}>Detail Debug (Mode Pengembang)</Text>
          </TouchableOpacity>

          {showDevDetails && (
            <View style={styles.devBox}>
              <Text style={styles.devCodeText}>{formatted.devDetails}</Text>
            </View>
          )}
        </View>
      )}

      {/* Action Buttons Row */}
      {Boolean(onRetry) && (
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={onRetry}
            activeOpacity={0.8}
          >
            <Ionicons name="reload" size={15} color="#FFFFFF" />
            <Text style={styles.retryBtnText}>Coba Lagi</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 14,
    marginVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 8,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  dismissBtn: {
    padding: 2,
  },
  bodyWrap: {
    marginBottom: 10,
  },
  titleText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 3,
  },
  messageText: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 19,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginTop: 4,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#2563EB',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  devSection: {
    marginVertical: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.06)',
    paddingTop: 6,
  },
  devToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  devToggleText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  devBox: {
    backgroundColor: 'rgba(15, 23, 42, 0.05)',
    borderRadius: 6,
    padding: 8,
    marginTop: 6,
  },
  devCodeText: {
    fontFamily: 'monospace',
    fontSize: 11,
    color: '#334155',
  },
  compactContainer: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginVertical: 6,
  },
  compactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  compactTextWrap: {
    flex: 1,
  },
  compactBadge: {
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
  },
  compactRetryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  compactRetryText: {
    fontSize: 11,
    color: '#2563EB',
    fontWeight: '700',
  },
});
