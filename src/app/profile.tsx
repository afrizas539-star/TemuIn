import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  Alert,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { StudentBottomNav } from "@/components/StudentBottomNav";
import { useAuth } from "@/context/AuthContext";

export default function StudentProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, isAdminAuthenticated, logout } = useAuth();

  const handleLogout = () => {
    Alert.alert(
      "Konfirmasi Logout",
      "Apakah Anda yakin ingin keluar dari akun mahasiswa?",
      [
        { text: "Batal", style: "cancel" },
        {
          text: "Keluar",
          style: "destructive",
          onPress: async () => {
            await logout();
            router.replace("/login");
          },
        },
      ],
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      {/* Header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: Math.max(
              insets.top,
              Platform.OS === "android" ? 24 : 12,
            ),
          },
        ]}
      >
        <Text style={styles.headerTitle}>Profil & Informasi TemuIn</Text>
        <Text style={styles.headerSubtitle}>
          Universitas Muhammadiyah Malang
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Civitas / Student Profile Card */}
        <View style={styles.civitasCard}>
          <View style={styles.civitasIconCircle}>
            <Ionicons name="person" size={24} color="#2563EB" />
          </View>
          <View style={styles.civitasInfo}>
            <Text style={styles.civitasTitle}>
              {user?.name || "Mahasiswa Kampus"}
            </Text>
            <Text style={styles.civitasMeta}>
              {user?.nim ? `NIM: ${user.nim}` : "Mahasiswa Terdaftar"}
            </Text>
            <Text style={styles.civitasDesc}>
              {user?.email || "mahasiswa@kampus.ac.id"}
            </Text>
          </View>
        </View>

        {/* SOP Kampus Section */}
        <Text style={styles.sectionHeading}>Alur & Prosedur Kampus</Text>

        <View style={styles.sopCard}>
          <View style={styles.sopStep}>
            <View style={styles.sopNum}>
              <Text style={styles.sopNumText}>1</Text>
            </View>
            <View style={styles.sopDetails}>
              <Text style={styles.sopStepTitle}>Kehilangan Barang?</Text>
              <Text style={styles.sopStepDesc}>
                Cari barang di katalog aplikasi. Jika terdaftar, buka detail dan
                tekan tombol klaim. Jika belum terdaftar, datangi Pos Satpam
                terdekat untuk membuat laporan fisik.
              </Text>
            </View>
          </View>

          <View style={styles.sopDivider} />

          <View style={styles.sopStep}>
            <View style={styles.sopNum}>
              <Text style={styles.sopNumText}>2</Text>
            </View>
            <View style={styles.sopDetails}>
              <Text style={styles.sopStepTitle}>Menemukan Barang?</Text>
              <Text style={styles.sopStepDesc}>
                Serahkan langsung ke Pos Satpam atau Petugas TU Fakultas.
                Petugas berwenang yang akan menginput data dan memfoto barang ke
                sistem.
              </Text>
            </View>
          </View>

          <View style={styles.sopDivider} />

          <View style={styles.sopStep}>
            <View style={styles.sopNum}>
              <Text style={styles.sopNumText}>3</Text>
            </View>
            <View style={styles.sopDetails}>
              <Text style={styles.sopStepTitle}>Verifikasi & Pengambilan</Text>
              <Text style={styles.sopStepDesc}>
                Setelah klaim diverifikasi oleh petugas, datangi Pos Keamanan
                Kampus dengan membawa KTM/KTP fisik asli untuk serah terima
                barang.
              </Text>
            </View>
          </View>
        </View>

        {/* Lokasi Posko Satpam */}
        <Text style={styles.sectionHeading}>Posko Keamanan & Pelayanan</Text>
        <View style={styles.poskoListCard}>
          <View style={styles.poskoItem}>
            <Ionicons name="shield" size={18} color="#2563EB" />
            <View style={{ flex: 1 }}>
              <Text style={styles.poskoName}>Pos Satpam Gerbang Utama</Text>
              <Text style={styles.poskoNote}>
                Layanan 24 Jam • Pusat Loker Barang Temuan
              </Text>
            </View>
          </View>

          <View style={styles.poskoDivider} />

          <View style={styles.poskoItem}>
            <Ionicons name="book" size={18} color="#059669" />
            <View style={{ flex: 1 }}>
              <Text style={styles.poskoName}>
                Meja Resepsionis Perpustakaan Pusat
              </Text>
              <Text style={styles.poskoNote}>
                Senin - Jumat: 08.00 - 17.00 WIB
              </Text>
            </View>
          </View>

          <View style={styles.poskoDivider} />

          <View style={styles.poskoItem}>
            <Ionicons name="business" size={18} color="#D97706" />
            <View style={{ flex: 1 }}>
              <Text style={styles.poskoName}>
                Tata Usaha Gedung Kuliah Bersama (GKB)
              </Text>
              <Text style={styles.poskoNote}>Lantai 1 Ruang Informasi</Text>
            </View>
          </View>
        </View>

        {/* Informasi Aplikasi TemuIn */}
        <Text style={styles.sectionHeading}>Informasi Aplikasi</Text>
        <View style={styles.appInfoCard}>
          <View style={styles.appInfoLogoWrap}>
            <Image
              source={require('@/assets/images/logo-temuin.png')}
              style={styles.appInfoLogo}
              resizeMode="contain"
            />
          </View>
          <View style={styles.appInfoDetails}>
            <Text style={styles.appInfoTitle}>TemuIn Mobile</Text>
            <Text style={styles.appInfoTagline}>“Temukan • Laporkan • Bertemu”</Text>
            <Text style={styles.appInfoUniversity}>Universitas Muhammadiyah Malang</Text>
            <View style={styles.appInfoBadgeRow}>
              <View style={styles.versionBadge}>
                <Text style={styles.versionText}>v1.0.0 Resmi</Text>
              </View>
              <View style={styles.verifiedBadge}>
                <Ionicons name="checkmark-circle" size={12} color="#059669" />
                <Text style={styles.verifiedText}>Terverifikasi</Text>
              </View>
            </View>
          </View>
        </View>



        {/* Logout Button */}
        <TouchableOpacity
          activeOpacity={0.8}
          style={styles.logoutBtn}
          onPress={handleLogout}
        >
          <Ionicons name="log-out-outline" size={20} color="#DC2626" />
          <Text style={styles.logoutBtnText}>Keluar dari Akun Mahasiswa</Text>
        </TouchableOpacity>
      </ScrollView>

      <StudentBottomNav activeTab="profile" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  header: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.4,
  },
  headerSubtitle: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 30,
  },
  civitasCard: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    gap: 14,
  },
  civitasIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
  },
  civitasInfo: {
    flex: 1,
  },
  civitasTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
  },
  civitasDesc: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 4,
    lineHeight: 17,
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 10,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  sopCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  sopStep: {
    flexDirection: "row",
    gap: 12,
  },
  sopNum: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  sopNumText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  sopDetails: {
    flex: 1,
  },
  sopStepTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 3,
  },
  sopStepDesc: {
    fontSize: 12,
    color: "#475569",
    lineHeight: 18,
  },
  sopDivider: {
    height: 1,
    backgroundColor: "#F1F5F9",
    marginVertical: 12,
  },
  poskoListCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  poskoItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  poskoName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
  },
  poskoNote: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
  },
  poskoDivider: {
    height: 1,
    backgroundColor: "#F1F5F9",
    marginVertical: 12,
  },
  adminAccessCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0F172A",
    borderRadius: 16,
    padding: 16,
    gap: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  adminIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "rgba(99, 102, 241, 0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  adminAccessTextWrap: {
    flex: 1,
  },
  adminAccessTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  adminAccessDesc: {
    fontSize: 11,
    color: "#94A3B8",
    marginTop: 3,
    lineHeight: 16,
  },
  civitasMeta: {
    fontSize: 12,
    fontWeight: "700",
    color: "#2563EB",
    marginTop: 2,
  },
  appInfoCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    gap: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    marginBottom: 8,
  },
  appInfoLogoWrap: {
    width: 68,
    height: 68,
    borderRadius: 14,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  appInfoLogo: {
    width: "100%",
    height: "100%",
  },
  appInfoDetails: {
    flex: 1,
  },
  appInfoTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.3,
  },
  appInfoTagline: {
    fontSize: 11,
    color: "#F58220",
    fontWeight: "700",
    marginTop: 2,
  },
  appInfoUniversity: {
    fontSize: 12,
    color: "#0266B3",
    fontWeight: "600",
    marginTop: 2,
  },
  appInfoBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
  },
  versionBadge: {
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  versionText: {
    fontSize: 10,
    color: "#0266B3",
    fontWeight: "700",
  },
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  verifiedText: {
    fontSize: 10,
    color: "#065F46",
    fontWeight: "700",
  },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FEE2E2",
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
    marginTop: 18,
    borderWidth: 1,
    borderColor: "#FECDD3",
  },
  logoutBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#DC2626",
  },
});
