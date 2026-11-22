import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ImageResizeMode,
  ImageStyle,
  StyleProp,
  StyleSheet,
  View,
} from 'react-native';

export const DEFAULT_LOST_IMAGE_PLACEHOLDER =
  'https://images.unsplash.com/photo-1594980596870-8aa52a78d8cd?q=80&w=600&auto=format&fit=crop';
export const DEFAULT_FOUND_IMAGE_PLACEHOLDER =
  'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?q=80&w=600&auto=format&fit=crop';

interface SafeImageProps {
  uri?: string | null;
  fallbackType?: 'lost' | 'found' | 'general';
  style?: StyleProp<ImageStyle>;
  resizeMode?: ImageResizeMode;
  accessibilityLabel?: string;
}

/**
 * Komponen SafeImage:
 * - Menangani URI lokal (file://) dari HP lain dengan fallback otomatis ke placeholder resmi
 * - Menampilkan loading spinner (ActivityIndicator) saat gambar sedang diunduh
 * - Menangani error jaringan atau gambar korup (onError) dengan fallback aman
 * - Menjamin tidak ada tampilan kotak putih kosong / broken image
 */
export const SafeImage: React.FC<SafeImageProps> = ({
  uri,
  fallbackType = 'lost',
  style,
  resizeMode = 'cover',
  accessibilityLabel,
}) => {
  const defaultPlaceholder =
    fallbackType === 'found'
      ? DEFAULT_FOUND_IMAGE_PLACEHOLDER
      : DEFAULT_LOST_IMAGE_PLACEHOLDER;

  // Jika URI kosong atau berupa URI file:// lokal (dari HP lain), langsung gunakan placeholder resmi
  const isLocalFileUri = typeof uri === 'string' && (uri.startsWith('file://') || uri.startsWith('content://'));
  const initialUri = uri && !isLocalFileUri ? uri : defaultPlaceholder;

  const [currentUri, setCurrentUri] = useState<string>(initialUri);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [hasError, setHasError] = useState<boolean>(false);

  // Perbarui currentUri jika prop uri berubah dari luar
  React.useEffect(() => {
    const isLocal = typeof uri === 'string' && (uri.startsWith('file://') || uri.startsWith('content://'));
    if (!uri || isLocal) {
      setCurrentUri(defaultPlaceholder);
      setHasError(false);
    } else {
      setCurrentUri(uri);
      setHasError(false);
    }
  }, [uri, defaultPlaceholder]);

  const handleError = () => {
    if (!hasError) {
      setHasError(true);
      setCurrentUri(defaultPlaceholder);
    }
    setIsLoading(false);
  };

  return (
    <View style={[styles.container, style]}>
      <Image
        source={{ uri: currentUri }}
        style={[StyleSheet.absoluteFill, style]}
        resizeMode={resizeMode}
        onLoadStart={() => setIsLoading(true)}
        onLoadEnd={() => setIsLoading(false)}
        onError={handleError}
        accessibilityLabel={accessibilityLabel}
      />

      {/* Loading Indicator saat gambar sedang diunduh dari internet / Firebase Storage */}
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="small" color="#0266B3" />
        </View>
      )}

      {/* Indikator visual jika gambar menggunakan placeholder default */}
      {(hasError || isLocalFileUri || !uri) && (
        <View style={styles.placeholderBadge}>
          <Ionicons
            name={fallbackType === 'found' ? 'gift-outline' : 'search-outline'}
            size={12}
            color="#FFFFFF"
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F1F5F9',
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(241, 245, 249, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderBadge: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
});
