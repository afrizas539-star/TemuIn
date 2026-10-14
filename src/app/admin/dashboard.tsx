import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AdminBottomNav } from "@/components/AdminBottomNav";
import { AdminHeader } from "@/components/AdminHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { useAuth } from "@/context/AuthContext";
import { useCampusData } from "@/context/CampusDataContext";

export default function AdminDashboardScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isAdminAuthenticated, adminProfile, isLoadingAuth } = useAuth();
  const { items, claims } = useCampusData();

  // Route protection
  useEffect(() => {
    if (!isLoadingAuth && !isAdminAuthenticated) {
      router.replace("/admin/login");
    }
  }, [isAdminAuthenticated, isLoadingAuth]);

  // Statistics calculation
  const totalLost = items.filter((i) => i.type === "lost").length;
  const totalFound = items.filter((i) => i.type === "found").length;
  const totalUnclaimed = items.filter(
    (i) =>
      i.type === "found" &&
      (i.status === "Barang Ditemukan" || i.status === "Menunggu Klaim"),
  ).length;
  const totalClaimedOrDone = items.filter(
    (i) =>
      i.status === "Terverifikasi" ||
      i.status === "Sudah Diambil" ||
      i.status === "Selesai",
  ).length;
  const pendingClaims = claims.filter(
    (c) => c.status === "Menunggu Verifikasi",
  );
  const pendingLostReports = items.filter(
    (i) => i.type === "lost" && i.verificationStatus === "Menunggu Verifikasi",
  );

  const recentItems = items.slice(0, 5);

  if (isLoadingAuth || !isAdminAuthenticated) {
    return null;
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <AdminHeader
        title="Dashboard Petugas"
        subtitle={`Halo, ${adminProfile.name.split(",")[0]}`}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Admin Announcement Banner */}
        <View style={styles.adminBanner}>
          <View style={styles.bannerHeader}>
            <View style={styles.urgentDot} />
            <Text style={styles.bannerTag}>PENGUMUMAN RESMI SISTEM</Text>
          </View>
          <Text style={styles.bannerTitle}>
            SOP Serah Terima Barang & Identifikasi KTM
          </Text>
          <Text style={styles.bannerBody}>
            Pastikan fisik barang temuan dicocokkan dengan identitas KTM/KTP
            mahasiswa yang terlampir pada menu Klaim Masuk sebelum barang
            diserahkan.
          </Text>
        </View>

        {/* Quick Actions Bar */}
        <Text style={styles.sectionTitle}>Aksi Cepat</Text>
        <View style={styles.actionGrid}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: "#44cd5b" }]}
            activeOpacity={0.8}
            onPress={() => router.push("/admin/create")}
          >
            <Ionicons name="add-circle" size={22} color="#efeaea" />
            <Text style={styles.actionBtnText}>Input Temuan</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: "#dd382f" }]}
            activeOpacity={0.8}
            onPress={() => router.push("/admin/reports" as any)}
          >
            <Ionicons name="shield" size={22} color="#fdfcfc" />
            <Text style={styles.actionBtnText}>Verif Hilang</Text>
            {pendingLostReports.length > 0 && (
              <View style={styles.actionBadge}>
                <Text style={styles.actionBadgeText}>
                  {pendingLostReports.length}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: "#5167d7" }]}
            activeOpacity={0.8}
            onPress={() => router.push("/admin/items")}
          >
            <Ionicons name="list" size={22} color="#FFFFFF" />
            <Text style={styles.actionBtnText}>Daftar Barang</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: "#059669" }]}
            activeOpacity={0.8}
            onPress={() => router.push("/admin/claims")}
          >
            <Ionicons name="shield-checkmark" size={22} color="#FFFFFF" />
            <Text style={styles.actionBtnText}>Klaim Masuk</Text>
            {pendingClaims.length > 0 && (
              <View style={styles.actionBadge}>
                <Text style={styles.actionBadgeText}>
                  {pendingClaims.length}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Statistics Cards */}
        <Text style={styles.sectionTitle}>Statistik Laporan Kampus</Text>
        <View style={styles.statsGrid}>
          {/* Card 1: Barang Ditemukan */}
          <View style={styles.statCard}>
            <View
              style={[styles.statIconCircle, { backgroundColor: "#DCFCE7" }]}
            >
              <Ionicons name="archive" size={20} color="#15803D" />
            </View>
            <Text style={styles.statValue}>{totalFound}</Text>
            <Text style={styles.statLabel}>Barang Ditemukan</Text>
          </View>

          {/* Card 2: Barang Hilang */}
          <View style={styles.statCard}>
            <View
              style={[styles.statIconCircle, { backgroundColor: "#FEE2E2" }]}
            >
              <Ionicons name="alert-circle" size={20} color="#DC2626" />
            </View>
            <Text style={styles.statValue}>{totalLost}</Text>
            <Text style={styles.statLabel}>Laporan Hilang</Text>
          </View>

          {/* Card 3: Belum Diklaim */}
          <View style={styles.statCard}>
            <View
              style={[styles.statIconCircle, { backgroundColor: "#FEF3C7" }]}
            >
              <Ionicons name="time" size={20} color="#B45309" />
            </View>
            <Text style={styles.statValue}>{totalUnclaimed}</Text>
            <Text style={styles.statLabel}>Belum Diklaim</Text>
          </View>

          {/* Card 4: Sudah Diklaim / Selesai */}
          <View style={styles.statCard}>
            <View
              style={[styles.statIconCircle, { backgroundColor: "#E0E7FF" }]}
            >
              <Ionicons name="checkmark-done" size={20} color="#4338CA" />
            </View>
            <Text style={styles.statValue}>{totalClaimedOrDone}</Text>
            <Text style={styles.statLabel}>Selesai / Diambil</Text>
          </View>
        </View>

        {/* Pending Claims Alert Card */}
        {pendingClaims.length > 0 && (
          <TouchableOpacity
            style={styles.pendingAlertCard}
            activeOpacity={0.85}
            onPress={() => router.push("/admin/claims")}
          >
            <View style={styles.pendingAlertIcon}>
              <Ionicons name="notifications" size={22} color="#FFFFFF" />
            </View>
            <View style={styles.pendingAlertContent}>
              <Text style={styles.pendingAlertTitle}>
                {pendingClaims.length} Pengajuan Klaim Menunggu Verifikasi
              </Text>
              <Text style={styles.pendingAlertSub}>
                Periksa data mahasiswa dan foto KTM/KTP untuk serah terima
                barang.
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#D97706" />
          </TouchableOpacity>
        )}

        {/* Pending Lost Reports Alert Card (Prioritas 7) */}
        {pendingLostReports.length > 0 && (
          <TouchableOpacity
            style={[
              styles.pendingAlertCard,
              { backgroundColor: "#78350F", marginTop: 8 },
            ]}
            activeOpacity={0.85}
            onPress={() => router.push("/admin/reports" as any)}
          >
            <View
              style={[styles.pendingAlertIcon, { backgroundColor: "#B45309" }]}
            >
              <Ionicons name="shield-outline" size={22} color="#FFFFFF" />
            </View>
            <View style={styles.pendingAlertContent}>
              <Text style={styles.pendingAlertTitle}>
                {pendingLostReports.length} Laporan Kehilangan Baru Menunggu
                Verifikasi
              </Text>
              <Text style={styles.pendingAlertSub}>
                Periksa laporan mahasiswa dan terbitkan ke katalog resmi kampus.
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#FDE68A" />
          </TouchableOpacity>
        )}

        {/* Recent Reports List */}
        <View style={styles.recentSectionHeader}>
          <Text style={styles.sectionTitle}>Laporan Terbaru</Text>
          <TouchableOpacity onPress={() => router.push("/admin/items")}>
            <Text style={styles.seeAllText}>Lihat Semua ({items.length})</Text>
          </TouchableOpacity>
        </View>

        {recentItems.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={styles.recentItemCard}
            activeOpacity={0.8}
            onPress={() => router.push(`/item/${item.id}` as any)}
          >
            <View style={styles.recentItemLeft}>
              <View
                style={[
                  styles.itemTypeIndicator,
                  {
                    backgroundColor:
                      item.type === "lost" ? "#DC2626" : "#16A34A",
                  },
                ]}
              />
              <View style={styles.recentItemInfo}>
                <Text style={styles.recentItemTitle} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={styles.recentItemLocation} numberOfLines={1}>
                  📍 {item.location} • {item.date}
                </Text>
              </View>
            </View>

            <StatusBadge status={item.status} size="small" />
          </TouchableOpacity>
        ))}
      </ScrollView>

      <AdminBottomNav activeTab="dashboard" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 24,
  },
  adminBanner: {
    backgroundColor: "#1E293B",
    borderRadius: 16,
    padding: 16,
    marginBottom: 18,
    borderLeftWidth: 4,
    borderLeftColor: "#818CF8",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  bannerHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },
  urgentDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#818CF8",
  },
  bannerTag: {
    color: "#A5B4FC",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  bannerTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  bannerBody: {
    fontSize: 11,
    color: "#CBD5E1",
    lineHeight: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 10,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  actionGrid: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 18,
  },
  actionBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderRadius: 14,
    gap: 6,
    position: "relative",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionBtnText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
    textAlign: "center",
  },
  actionBadge: {
    position: "absolute",
    top: 6,
    right: 6,
    backgroundColor: "#EF4444",
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  actionBadgeText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "800",
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 18,
  },
  statCard: {
    width: "48%",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 2,
  },
  statIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  statValue: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
    fontWeight: "600",
  },
  pendingAlertCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFBEB",
    borderWidth: 1,
    borderColor: "#FDE68A",
    borderRadius: 14,
    padding: 12,
    marginBottom: 18,
    gap: 12,
  },
  pendingAlertIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#D97706",
    alignItems: "center",
    justifyContent: "center",
  },
  pendingAlertContent: {
    flex: 1,
  },
  pendingAlertTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#92400E",
  },
  pendingAlertSub: {
    fontSize: 11,
    color: "#B45309",
    marginTop: 2,
    lineHeight: 15,
  },
  recentSectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  seeAllText: {
    fontSize: 12,
    color: "#4F46E5",
    fontWeight: "700",
  },
  recentItemCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  recentItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
    marginRight: 10,
  },
  itemTypeIndicator: {
    width: 4,
    height: 36,
    borderRadius: 2,
  },
  recentItemInfo: {
    flex: 1,
  },
  recentItemTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
  },
  recentItemLocation: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
  },
});
