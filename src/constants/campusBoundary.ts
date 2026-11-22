/**
 * KONFIGURASI BATAS WILAYAH & LANDMARK KAMPUS III UNIVERSITAS MUHAMMADIYAH MALANG (UMM)
 *
 * Alamat Resmi:
 * Jl. Raya Tlogomas No. 246, Babatan, Tegalgondo, Kec. Lowokwaru, Kota Malang, Jawa Timur 65144
 *
 * Catatan Verifikasi:
 * Koordinat batas kampus ini disusun berdasarkan data resmi Kemendikdasmen, OpenStreetMap,
 * dan titik landmark utama Kampus III UMM. Polygon ini dapat diperbarui sewaktu-waktu jika
 * ada pemekaran area fisik kampus baru.
 */

export interface Coordinate {
  latitude: number;
  longitude: number;
}

export interface CampusLandmark {
  id: string;
  name: string;
  description: string;
  coordinate: Coordinate;
}

export const UMM_CAMPUS_NAME = 'Universitas Muhammadiyah Malang (UMM), Kampus III';
export const UMM_CAMPUS_ADDRESS = 'Jl. Raya Tlogomas No. 246, Malang, Jawa Timur, Indonesia';

/**
 * Titik Pusat Kampus III UMM (Area Gedung Rektorat / Helipad)
 */
export const UMM_CAMPUS_CENTER: Coordinate = {
  latitude: -7.921546,
  longitude: 112.597351,
};

/**
 * Koordinat Bounding Box & Polygon Batas Area Kampus III UMM
 * Mencakup dari Jl. Raya Tlogomas, UMM Dome, GKB 1, 2, 3, 4, Helipad,
 * Danau Kampus, Lapangan Olahraga, hingga batas sempadan Sungai Brantas.
 */
export const UMM_CAMPUS_POLYGON: Coordinate[] = [
  { latitude: -7.9195, longitude: 112.5948 }, // Gerbang Barat Laut / UMM Dome
  { latitude: -7.9180, longitude: 112.5965 }, // Sisi Utara Stadion & Fasilitas Olahraga
  { latitude: -7.9175, longitude: 112.5990 }, // Sisi Utara Rusunawa
  { latitude: -7.9182, longitude: 112.6025 }, // Sisi Timur Laut / GKB 4 & Pascasarjana
  { latitude: -7.9205, longitude: 112.6035 }, // Batas Timur / Danau & Area Terbuka
  { latitude: -7.9230, longitude: 112.6020 }, // Batas Tenggara / Bantaran Sungai Brantas
  { latitude: -7.9242, longitude: 112.5985 }, // Batas Selatan / GKB 1 & Jembatan Gantung
  { latitude: -7.9232, longitude: 112.5955 }, // Gerbang Selatan / SPBU UMM
  { latitude: -7.9218, longitude: 112.5950 }, // Gerbang Utama / Masjid AR Fachruddin
];

/**
 * Landmark Populer di Lingkungan Kampus III UMM
 * Digunakan untuk reverse-geocoding kontekstual dan quick-picker
 */
export const UMM_LANDMARKS: CampusLandmark[] = [
  {
    id: 'rektorat',
    name: 'Gedung Rektorat & Kantor Pusat',
    description: 'Pusat administrasi rektorat, ruang pelayanan mahasiswa, dan ICT',
    coordinate: { latitude: -7.921546, longitude: 112.597351 },
  },
  {
    id: 'helipad',
    name: 'Helipad UMM',
    description: 'Plaza sentral lapangan upacara dan ruang terbuka kampus',
    coordinate: { latitude: -7.921555, longitude: 112.597296 },
  },
  {
    id: 'gkb1',
    name: 'Gedung Kuliah Bersama (GKB) 1',
    description: 'Gedung perkuliahan sisi selatan dekat danau buatan UMM',
    coordinate: { latitude: -7.9224, longitude: 112.5975 },
  },
  {
    id: 'gkb2',
    name: 'Gedung Kuliah Bersama (GKB) 2',
    description: 'Gedung perkuliahan Fakultas Teknik & Ilmu Komputer',
    coordinate: { latitude: -7.9212, longitude: 112.5982 },
  },
  {
    id: 'gkb3',
    name: 'Gedung Kuliah Bersama (GKB) 3',
    description: 'Gedung perkuliahan sisi tengah-timur kampus',
    coordinate: { latitude: -7.9205, longitude: 112.5988 },
  },
  {
    id: 'gkb4',
    name: 'Gedung Kuliah Bersama (GKB) 4 / Pascasarjana',
    description: 'Gedung perkuliahan pascasarjana dan laboratorium terpadu',
    coordinate: { latitude: -7.9192, longitude: 112.5995 },
  },
  {
    id: 'dome',
    name: 'UMM Dome',
    description: 'Gedung aula serbaguna dan expo kampus',
    coordinate: { latitude: -7.9203, longitude: 112.5955 },
  },
  {
    id: 'masjid',
    name: 'Masjid AR Fachruddin',
    description: 'Masjid megah 5 lantai di gerbang utama Kampus III',
    coordinate: { latitude: -7.9211, longitude: 112.5958 },
  },
  {
    id: 'perpus',
    name: 'Perpustakaan Pusat UMM',
    description: 'Pusat sumber belajar dan perpustakaan digital',
    coordinate: { latitude: -7.9218, longitude: 112.5968 },
  },
  {
    id: 'danau',
    name: 'Danau & Jembatan Gantung UMM',
    description: 'Area danau rekreasi dan jembatan ikonik UMM',
    coordinate: { latitude: -7.9220, longitude: 112.5988 },
  },
  {
    id: 'stadion',
    name: 'Lapangan Olahraga & Stadion UMM',
    description: 'Fasilitas olahraga mahasiswa sisi utara kampus',
    coordinate: { latitude: -7.9188, longitude: 112.5978 },
  },
  {
    id: 'posko_satpam',
    name: 'Posko Keamanan Pusat (Satpam)',
    description: 'Posko keamanan terpadu gerbang utama UMM',
    coordinate: { latitude: -7.9214, longitude: 112.5962 },
  },
];

/**
 * Hitung jarak antara 2 koordinat (Haversine Formula dalam meter)
 */
export function calculateDistanceMeters(
  coord1: Coordinate,
  coord2: Coordinate
): number {
  const R = 6371000; // Radius Bumi dalam meter
  const dLat = ((coord2.latitude - coord1.latitude) * Math.PI) / 180;
  const dLng = ((coord2.longitude - coord1.longitude) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((coord1.latitude * Math.PI) / 180) *
      Math.cos((coord2.latitude * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Validasi apakah suatu titik (latitude, longitude) berada di dalam area Kampus III UMM
 * Menggunakan Ray-Casting Algorithm pada Polygon Batas Kampus
 * dengan toleransi buffer cerdas untuk area tepi kampus.
 */
export function isPointInUMMCampus(
  point: Coordinate,
  polygon: Coordinate[] = UMM_CAMPUS_POLYGON
): boolean {
  const { latitude, longitude } = point;

  // 1. Cek polygon ray-casting
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].longitude;
    const yi = polygon[i].latitude;
    const xj = polygon[j].longitude;
    const yj = polygon[j].latitude;

    const intersect =
      yi > latitude !== yj > latitude &&
      longitude < ((xj - xi) * (latitude - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }

  if (inside) return true;

  // 2. Buffer verifikasi tambahan: jika jarak titik ke salah satu landmark UMM < 90 meter,
  // maka titik tetap diakui sebagai bagian sah dari Kampus III UMM
  for (const lm of UMM_LANDMARKS) {
    const dist = calculateDistanceMeters(point, lm.coordinate);
    if (dist <= 90) {
      return true;
    }
  }

  return false;
}

/**
 * Cari landmark terdekat dari koordinat yang dipilih
 */
export function getNearestLandmark(
  point: Coordinate
): { landmark: CampusLandmark; distance: number } {
  let nearest = UMM_LANDMARKS[0];
  let minDistance = calculateDistanceMeters(point, nearest.coordinate);

  for (let i = 1; i < UMM_LANDMARKS.length; i++) {
    const d = calculateDistanceMeters(point, UMM_LANDMARKS[i].coordinate);
    if (d < minDistance) {
      minDistance = d;
      nearest = UMM_LANDMARKS[i];
    }
  }

  return { landmark: nearest, distance: minDistance };
}

/**
 * Reverse Geocoding lokal + online untuk Kampus III UMM
 * Menghasilkan deskripsi alamat yang sangat jelas dan akurat
 */
export async function reverseGeocodeUMM(point: Coordinate): Promise<string> {
  const { landmark, distance } = getNearestLandmark(point);
  const isValid = isPointInUMMCampus(point);

  // Jika dekat dengan landmark kampus (< 75 meter)
  if (distance <= 75) {
    return `${landmark.name}, Kampus III UMM (Jl. Raya Tlogomas No. 246, Malang)`;
  }

  // Jika dalam radius 150 meter dari landmark
  if (distance <= 150) {
    return `Sekitar ${landmark.name} (~${Math.round(distance)}m), Kampus III UMM`;
  }

  if (isValid) {
    return `Lingkungan Kampus III UMM, Jl. Raya Tlogomas No. 246, Malang (${point.latitude.toFixed(6)}, ${point.longitude.toFixed(6)})`;
  }

  return `Di Luar Area Kampus UMM (${point.latitude.toFixed(6)}, ${point.longitude.toFixed(6)})`;
}
