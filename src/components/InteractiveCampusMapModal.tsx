import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';

import {
  CampusLandmark,
  Coordinate,
  isPointInUMMCampus,
  reverseGeocodeUMM,
  UMM_CAMPUS_ADDRESS,
  UMM_CAMPUS_CENTER,
  UMM_CAMPUS_NAME,
  UMM_CAMPUS_POLYGON,
  UMM_LANDMARKS,
} from '@/constants/campusBoundary';
import { CampusLocation } from '@/types';

interface InteractiveCampusMapModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirmLocation: (location: CampusLocation) => void;
  initialCoordinate?: Coordinate;
}

export const InteractiveCampusMapModal: React.FC<InteractiveCampusMapModalProps> = ({
  visible,
  onClose,
  onConfirmLocation,
  initialCoordinate,
}) => {
  const insets = useSafeAreaInsets();
  const webViewRef = useRef<any>(null);
  const MapWebView: any = WebView;

  const [selectedPoint, setSelectedPoint] = useState<Coordinate>(
    initialCoordinate || UMM_CAMPUS_CENTER
  );
  const [address, setAddress] = useState<string>('');
  const [isValidCampus, setIsValidCampus] = useState<boolean>(true);
  const [isLoadingAddress, setIsLoadingAddress] = useState<boolean>(false);
  const [isGpsLoading, setIsGpsLoading] = useState<boolean>(false);

  useEffect(() => {
    if (visible) {
      const point = initialCoordinate || UMM_CAMPUS_CENTER;
      updatePoint(point);
    }
  }, [visible, initialCoordinate]);

  const updatePoint = async (point: Coordinate) => {
    setSelectedPoint(point);
    const valid = isPointInUMMCampus(point);
    setIsValidCampus(valid);

    setIsLoadingAddress(true);
    try {
      const addr = await reverseGeocodeUMM(point);
      setAddress(addr);
    } catch {
      setAddress(`${UMM_CAMPUS_NAME} (${point.latitude.toFixed(6)}, ${point.longitude.toFixed(6)})`);
    } finally {
      setIsLoadingAddress(false);
    }
  };

  /**
   * Gunakan GPS pengguna
   */
  const handleUseCurrentLocation = async () => {
    try {
      setIsGpsLoading(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Izin Lokasi Diperlukan',
          'Mohon izinkan akses lokasi (GPS) untuk mendeteksi posisi Anda saat ini di sekitar kampus.'
        );
        return;
      }

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const userCoord: Coordinate = {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      };

      await updatePoint(userCoord);

      // Beritahu WebView untuk mengarahkan peta ke koordinat baru
      const jsCode = `if (window.setMarkerLocation) { window.setMarkerLocation(${userCoord.latitude}, ${userCoord.longitude}); }`;
      webViewRef.current?.injectJavaScript(jsCode);

      if (!isPointInUMMCampus(userCoord)) {
        Alert.alert(
          'Perhatian',
          'Posisi GPS Anda saat ini berada di luar area Kampus III UMM. Anda dapat menggeser peta atau memilih titik di dalam kampus.'
        );
      }
    } catch (err: any) {
      Alert.alert('Gagal Mendapatkan Lokasi', err?.message || 'Pastikan GPS perangkat Anda aktif.');
    } finally {
      setIsGpsLoading(false);
    }
  };

  /**
   * Pilih Landmark Populer Kampus
   */
  const handleSelectLandmark = (landmark: CampusLandmark) => {
    updatePoint(landmark.coordinate);
    const jsCode = `if (window.setMarkerLocation) { window.setMarkerLocation(${landmark.coordinate.latitude}, ${landmark.coordinate.longitude}); }`;
    webViewRef.current?.injectJavaScript(jsCode);
  };

  /**
   * Konfirmasi pilihan lokasi
   */
  const handleConfirm = () => {
    if (!isValidCampus) {
      Alert.alert(
        'Lokasi di Luar Kampus',
        'Titik yang dipilih berada di luar batas area Kampus III Universitas Muhammadiyah Malang. Sesuai kebijakan aplikasi TemuIn, pelaporan dibatasi hanya di dalam lingkungan kampus UMM.',
        [{ text: 'Pilih Titik Ulang' }]
      );
      return;
    }

    onConfirmLocation({
      latitude: selectedPoint.latitude,
      longitude: selectedPoint.longitude,
      address: address || UMM_CAMPUS_ADDRESS,
      campus: UMM_CAMPUS_NAME,
    });
    onClose();
  };

  /**
   * Handle pesan dari WebView Leaflet (saat pengguna tap peta)
   */
  const handleWebViewMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data && data.type === 'MAP_CLICK') {
        updatePoint({
          latitude: data.latitude,
          longitude: data.longitude,
        });
      }
    } catch (e) {
      console.warn('Gagal membaca event peta:', e);
    }
  };

  // Generate HTML Leaflet Interaktif
  const polygonJson = JSON.stringify(
    UMM_CAMPUS_POLYGON.map((p) => [p.latitude, p.longitude])
  );
  const landmarksJson = JSON.stringify(
    UMM_LANDMARKS.map((lm) => ({
      name: lm.name,
      lat: lm.coordinate.latitude,
      lng: lm.coordinate.longitude,
    }))
  );

  const leafletHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <style>
          html, body, #map {
            width: 100%;
            height: 100%;
            margin: 0;
            padding: 0;
            background-color: #f1f5f9;
          }
          .custom-popup .leaflet-popup-content-wrapper {
            background: #ffffff;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            font-size: 12px;
          }
          .campus-boundary-legend {
            position: absolute;
            bottom: 24px;
            left: 10px;
            z-index: 1000;
            background: rgba(255, 255, 255, 0.95);
            padding: 6px 10px;
            border-radius: 8px;
            font-family: sans-serif;
            font-size: 11px;
            font-weight: 600;
            color: #0266B3;
            box-shadow: 0 2px 6px rgba(0,0,0,0.12);
            border: 1px solid #bfdbfe;
          }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <div class="campus-boundary-legend">
          🏛️ Area Kampus III UMM (Jl. Raya Tlogomas)
        </div>
        <script>
          var defaultLat = ${selectedPoint.latitude};
          var defaultLng = ${selectedPoint.longitude};
          var polygonCoords = ${polygonJson};
          var landmarks = ${landmarksJson};

          var map = L.map('map', {
            zoomControl: true,
            attributionControl: false
          }).setView([defaultLat, defaultLng], 17);

          // Tile layer OpenStreetMap
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19
          }).addTo(map);

          // Gambarkan polygon batas kampus UMM
          var campusPolygon = L.polygon(polygonCoords, {
            color: '#0266B3',
            fillColor: '#38bdf8',
            fillOpacity: 0.22,
            weight: 2.5,
            dashArray: '4, 4'
          }).addTo(map);

          // Marker lokasi yang dipilih
          var mainMarker = L.marker([defaultLat, defaultLng], {
            draggable: true
          }).addTo(map);

          mainMarker.bindPopup("<b>Titik Terpilih</b><br>Geser marker atau ketuk peta.").openPopup();

          function notifyApp(lat, lng) {
            var msg = JSON.stringify({ type: 'MAP_CLICK', latitude: lat, longitude: lng });
            if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
              window.ReactNativeWebView.postMessage(msg);
            } else if (window.parent) {
              window.parent.postMessage(msg, '*');
            }
          }

          // Event drag marker
          mainMarker.on('dragend', function(e) {
            var position = mainMarker.getLatLng();
            notifyApp(position.lat, position.lng);
          });

          // Event klik di sembarang titik peta
          map.on('click', function(e) {
            mainMarker.setLatLng(e.latlng);
            mainMarker.openPopup();
            notifyApp(e.latlng.lat, e.latlng.lng);
          });

          // Helper function yang dapat dipanggil dari luar (injected JS)
          window.setMarkerLocation = function(lat, lng) {
            mainMarker.setLatLng([lat, lng]);
            map.setView([lat, lng], 17, { animate: true });
            mainMarker.openPopup();
          };

          // Tampilkan landmark kecil sebagai referensi
          landmarks.forEach(function(lm) {
            var circle = L.circleMarker([lm.lat, lm.lng], {
              radius: 5,
              color: '#d97706',
              fillColor: '#fbbf24',
              fillOpacity: 0.9,
              weight: 1.5
            }).addTo(map);
            circle.bindTooltip(lm.name, { direction: 'top', offset: [0, -5] });
          });
        </script>
      </body>
    </html>
  `;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {/* Header Modal */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.headerBackBtn}
            onPress={onClose}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={22} color="#0F172A" />
          </TouchableOpacity>
          <View style={styles.headerTitleWrap}>
            <Text style={styles.headerTitle}>Pilih Titik Lokasi Kampus</Text>
            <Text style={styles.headerSubtitle}>
              Khusus Kampus III Universitas Muhammadiyah Malang
            </Text>
          </View>
        </View>

        {/* Quick Landmark Chips */}
        <View style={styles.chipScrollWrap}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipContainer}
          >
            {UMM_LANDMARKS.slice(0, 8).map((lm) => (
              <TouchableOpacity
                key={lm.id}
                style={styles.landmarkChip}
                onPress={() => handleSelectLandmark(lm)}
                activeOpacity={0.7}
              >
                <Ionicons name="location-outline" size={13} color="#0266B3" />
                <Text style={styles.landmarkChipText} numberOfLines={1}>
                  {lm.name.replace('Gedung Kuliah Bersama (GKB)', 'GKB')}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Map View Area */}
        <View style={styles.mapArea}>
          {Platform.OS === 'web' ? (
            <iframe
              srcDoc={leafletHtml}
              style={{ width: '100%', height: '100%', border: 'none' }}
              title="UMM Campus Map"
            />
          ) : (
            <MapWebView
              ref={webViewRef}
              originWhitelist={['*']}
              source={{ html: leafletHtml }}
              style={styles.webView}
              onMessage={handleWebViewMessage}
              javaScriptEnabled={true}
              domStorageEnabled={true}
              startInLoadingState={true}
              renderLoading={() => (
                <View style={styles.mapLoading}>
                  <ActivityIndicator size="large" color="#0266B3" />
                  <Text style={styles.loadingText}>Memuat Peta Kampus III UMM...</Text>
                </View>
              )}
            />
          )}

          {/* Floating GPS Button */}
          <TouchableOpacity
            style={styles.gpsFab}
            onPress={handleUseCurrentLocation}
            disabled={isGpsLoading}
            activeOpacity={0.8}
          >
            {isGpsLoading ? (
              <ActivityIndicator size="small" color="#0266B3" />
            ) : (
              <>
                <Ionicons name="locate" size={20} color="#0266B3" />
                <Text style={styles.gpsFabText}>Gunakan Lokasi Saya</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Bottom Details & Confirmation Panel */}
        <View
          style={[
            styles.bottomPanel,
            { paddingBottom: Math.max(insets.bottom + 12, 20) },
          ]}
        >
          {/* Status Validasi Area */}
          <View
            style={[
              styles.validationBadge,
              isValidCampus ? styles.validBadge : styles.invalidBadge,
            ]}
          >
            <Ionicons
              name={isValidCampus ? 'checkmark-circle' : 'alert-circle'}
              size={18}
              color={isValidCampus ? '#15803D' : '#DC2626'}
            />
            <Text
              style={[
                styles.validationText,
                isValidCampus ? styles.validText : styles.invalidText,
              ]}
            >
              {isValidCampus
                ? 'Area Valid: Berada di lingkungan Kampus III UMM'
                : 'Di Luar Area Kampus UMM (Tidak dapat dikonfirmasi)'}
            </Text>
          </View>

          {/* Alamat & Koordinat */}
          <View style={styles.addressBox}>
            <View style={styles.addressIconWrap}>
              <Ionicons name="pin" size={18} color="#0266B3" />
            </View>
            <View style={styles.addressInfoWrap}>
              <Text style={styles.addressLabel}>Alamat Lokasi Terpilih:</Text>
              {isLoadingAddress ? (
                <ActivityIndicator size="small" color="#0266B3" style={{ alignSelf: 'flex-start', marginVertical: 2 }} />
              ) : (
                <Text style={styles.addressValue} numberOfLines={2}>
                  {address || 'Menentukan alamat lokasi...'}
                </Text>
              )}
              <Text style={styles.coordValue}>
                Koordinat: {selectedPoint.latitude.toFixed(6)}, {selectedPoint.longitude.toFixed(6)}
              </Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.btnRow}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelBtnText}>Kembali</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.confirmBtn,
                !isValidCampus && styles.confirmBtnDisabled,
              ]}
              onPress={handleConfirm}
              disabled={!isValidCampus}
              activeOpacity={0.8}
            >
              <Ionicons name="checkmark-done" size={18} color="#FFFFFF" />
              <Text style={styles.confirmBtnText}>Konfirmasi Lokasi</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  headerBackBtn: {
    padding: 6,
    marginRight: 8,
  },
  headerTitleWrap: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748B',
  },
  chipScrollWrap: {
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingVertical: 8,
  },
  chipContainer: {
    paddingHorizontal: 16,
    gap: 8,
  },
  landmarkChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 5,
  },
  landmarkChipText: {
    fontSize: 12,
    color: '#334155',
    fontWeight: '600',
  },
  mapArea: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#E2E8F0',
  },
  webView: {
    flex: 1,
  },
  mapLoading: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '500',
  },
  gpsFab: {
    position: 'absolute',
    top: 14,
    right: 14,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 24,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  gpsFabText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0266B3',
  },
  bottomPanel: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingHorizontal: 16,
    paddingTop: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 5,
  },
  validationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 8,
    marginBottom: 10,
  },
  validBadge: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  invalidBadge: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  validationText: {
    fontSize: 12,
    fontWeight: '700',
    flex: 1,
  },
  validText: {
    color: '#15803D',
  },
  invalidText: {
    color: '#DC2626',
  },
  addressBox: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 10,
    gap: 10,
    marginBottom: 14,
  },
  addressIconWrap: {
    marginTop: 2,
  },
  addressInfoWrap: {
    flex: 1,
  },
  addressLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
    marginBottom: 2,
  },
  addressValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
    lineHeight: 18,
  },
  coordValue: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 3,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  btnRow: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  confirmBtn: {
    flex: 2,
    backgroundColor: '#0266B3',
    borderRadius: 10,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  confirmBtnDisabled: {
    backgroundColor: '#94A3B8',
  },
  confirmBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
