import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { AdminBottomNav } from "@/components/AdminBottomNav";
import { AdminHeader } from "@/components/AdminHeader";
import { ImagePickerButton } from "@/components/ImagePickerButton";
import { useAuth } from "@/context/AuthContext";

export default function AdminProfileScreen() {
  const router = useRouter();
  const {
    adminProfile,
    updateProfile,
    logout,
    isAdminAuthenticated,
    isLoadingAuth,
  } = useAuth();

  useEffect(() => {
    if (!isLoadingAuth && !isAdminAuthenticated) {
      router.replace("/admin/login");
    }
  }, [isAdminAuthenticated, isLoadingAuth]);

  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(adminProfile.name);
  const [email, setEmail] = useState(adminProfile.email);
  const [phone, setPhone] = useState(adminProfile.phone);
  const [password, setPassword] = useState(adminProfile.password || "");
  const [avatarUri, setAvatarUri] = useState(adminProfile.avatarUri || "");
  const [officeLocation, setOfficeLocation] = useState(
    adminProfile.officeLocation,
  );
  const [showPassword, setShowPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setName(adminProfile.name);
    setEmail(adminProfile.email);
    setPhone(adminProfile.phone);
    setPassword(adminProfile.password || "");
    setAvatarUri(adminProfile.avatarUri || "");
    setOfficeLocation(adminProfile.officeLocation);
  }, [adminProfile]);

  const handleSaveProfile = async () => {
    if (!name.trim()) {
      Alert.alert("Validasi", "Nama petugas tidak boleh kosong.");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      Alert.alert("Validasi", "Akun Gmail tidak valid.");
      return;
    }
    if (!phone.trim()) {
      Alert.alert("Validasi", "Nomor HP tidak boleh kosong.");
      return;
    }
    if (password && password.length < 6) {
      Alert.alert("Validasi", "Password minimal 6 karakter.");
      return;
    }

    try {
      setIsSaving(true);
      const res = await updateProfile({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        password: password || adminProfile.password,
        avatarUri,
        officeLocation: officeLocation.trim(),
      });

      if (res.success) {
        Alert.alert(
          "Berhasil",
          "Profil petugas dan akun login berhasil disimpan!",
        );
        setIsEditing(false);
      } else {
        Alert.alert("Gagal", res.message || "Gagal menyimpan profil.");
      }
    } catch (e) {
      Alert.alert("Error", "Terjadi kesalahan saat menyimpan.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      "Konfirmasi Logout",
      "Apakah Anda yakin ingin keluar dari akun Admin?",
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

  if (isLoadingAuth || !isAdminAuthenticated) {
    return null;
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.container}
    >
      <StatusBar style="light" />

      <AdminHeader
        title="Profil Petugas"
        subtitle="Kelola identitas dan akun akses sistem"
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Profile Card Header */}
        <View style={styles.profileCardHeader}>
          <View style={styles.avatarWrap}>
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Ionicons name="person" size={36} color="#818CF8" />
              </View>
            )}
            <View style={styles.roleBadge}>
              <Ionicons name="shield" size={10} color="#FFFFFF" />
              <Text style={styles.roleBadgeText}>ADMIN</Text>
            </View>
          </View>

          <Text style={styles.profileName}>{adminProfile.name}</Text>
          <Text style={styles.profileEmail}>{adminProfile.email}</Text>
          <Text style={styles.profileRole}>{adminProfile.role}</Text>
        </View>

        {/* Edit or Display Form */}
        <View style={styles.formContainer}>
          <View style={styles.formHeaderRow}>
            <Text style={styles.formHeaderTitle}>
              {isEditing
                ? "Ubah Informasi Petugas"
                : "Detail Informasi Petugas"}
            </Text>
            {!isEditing ? (
              <TouchableOpacity
                style={styles.editToggleBtn}
                onPress={() => setIsEditing(true)}
              >
                <Ionicons name="create-outline" size={15} color="#4F46E5" />
                <Text style={styles.editToggleText}>Edit Profil</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.cancelToggleBtn}
                onPress={() => {
                  setIsEditing(false);
                  setName(adminProfile.name);
                  setEmail(adminProfile.email);
                  setPhone(adminProfile.phone);
                  setPassword(adminProfile.password || "");
                }}
              >
                <Text style={styles.cancelToggleText}>Batal</Text>
              </TouchableOpacity>
            )}
          </View>

          {isEditing && (
            <View style={styles.avatarPickerSection}>
              <Text style={styles.fieldLabel}>Foto Profil Petugas</Text>
              <ImagePickerButton
                imageUri={avatarUri}
                onImageSelected={(uri) => setAvatarUri(uri)}
                onImageRemoved={() => setAvatarUri("")}
                title="Ganti Foto Profil"
                subtitle="Pilih foto formal dari galeri HP Anda"
                aspect={[1, 1]}
              />
            </View>
          )}

          {/* 1. Nama Petugas */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Nama Lengkap & Gelar</Text>
            {isEditing ? (
              <TextInput
                style={styles.textInput}
                value={name}
                onChangeText={setName}
                placeholder="Nama Petugas"
                placeholderTextColor="#2a4e81"
              />
            ) : (
              <View style={styles.readOnlyBox}>
                <Ionicons name="person-outline" size={16} color="#64748B" />
                <Text style={styles.readOnlyText}>{adminProfile.name}</Text>
              </View>
            )}
          </View>

          {/* 2. Akun Gmail */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Akun Gmail (Akun Login)</Text>
            {isEditing ? (
              <TextInput
                style={styles.textInput}
                value={email}
                onChangeText={setEmail}
                placeholder="petugas@gmail.com"
                placeholderTextColor="#3a5f93"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            ) : (
              <View style={styles.readOnlyBox}>
                <Ionicons name="mail-outline" size={16} color="#64748B" />
                <Text style={styles.readOnlyText}>{adminProfile.email}</Text>
              </View>
            )}
          </View>

          {/* 3. Nomor HP */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Nomor WhatsApp / HP</Text>
            {isEditing ? (
              <TextInput
                style={styles.textInput}
                value={phone}
                onChangeText={setPhone}
                placeholder="0812xxxxxxxx"
                placeholderTextColor="#94A3B8"
                keyboardType="phone-pad"
              />
            ) : (
              <View style={styles.readOnlyBox}>
                <Ionicons name="call-outline" size={16} color="#64748B" />
                <Text style={styles.readOnlyText}>{adminProfile.phone}</Text>
              </View>
            )}
          </View>

          {/* 4. Password */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Password Akun</Text>
            {isEditing ? (
              <View style={styles.passwordWrapper}>
                <TextInput
                  style={[styles.textInput, { flex: 1, borderWidth: 0 }]}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Ganti password (min. 6 karakter)"
                  placeholderTextColor="#94A3B8"
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={{ padding: 10 }}
                >
                  <Ionicons
                    name={showPassword ? "eye-off-outline" : "eye-outline"}
                    size={18}
                    color="#64748B"
                  />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.readOnlyBox}>
                <Ionicons name="key-outline" size={16} color="#64748B" />
                <Text style={styles.readOnlyText}>••••••••••••</Text>
              </View>
            )}
          </View>

          {/* 5. Lokasi Posko */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Posko Penempatan</Text>
            {isEditing ? (
              <TextInput
                style={styles.textInput}
                value={officeLocation}
                onChangeText={setOfficeLocation}
                placeholder="Posko Penempatan"
                placeholderTextColor="#94A3B8"
              />
            ) : (
              <View style={styles.readOnlyBox}>
                <Ionicons name="location-outline" size={16} color="#64748B" />
                <Text style={styles.readOnlyText}>
                  {adminProfile.officeLocation}
                </Text>
              </View>
            )}
          </View>

          {/* Simpan Button */}
          {isEditing && (
            <TouchableOpacity
              style={[styles.saveBtn, isSaving && { opacity: 0.6 }]}
              onPress={handleSaveProfile}
              disabled={isSaving}
              activeOpacity={0.8}
            >
              <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
              <Text style={styles.saveBtnText}>
                {isSaving ? "Menyimpan..." : "Simpan Perubahan Profil"}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Logout Button */}
        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={handleLogout}
          activeOpacity={0.8}
        >
          <Ionicons name="log-out-outline" size={20} color="#DC2626" />
          <Text style={styles.logoutBtnText}>Keluar dari Akun Petugas</Text>
        </TouchableOpacity>
      </ScrollView>

      <AdminBottomNav activeTab="profile" />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 30,
  },
  profileCardHeader: {
    backgroundColor: "#c3c4d5",
    borderRadius: 20,
    padding: 20,
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  avatarWrap: {
    position: "relative",
    marginBottom: 12,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#F1F5F9",
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
  },
  roleBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#4F46E5",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 3,
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  roleBadgeText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  profileName: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0F172A",
  },
  profileEmail: {
    fontSize: 12,
    color: "#4F46E5",
    fontWeight: "600",
    marginTop: 2,
  },
  profileRole: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 4,
    textAlign: "center",
  },
  formContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 16,
  },
  formHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  formHeaderTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
  },
  editToggleBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  editToggleText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#4F46E5",
  },
  cancelToggleBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  cancelToggleText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#DC2626",
  },
  avatarPickerSection: {
    marginBottom: 14,
  },
  fieldGroup: {
    marginBottom: 14,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#334155",
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: "#0F172A",
  },
  passwordWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 10,
  },
  readOnlyBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  readOnlyText: {
    fontSize: 13,
    color: "#334155",
    fontWeight: "600",
  },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#4F46E5",
    borderRadius: 12,
    paddingVertical: 13,
    gap: 8,
    marginTop: 10,
  },
  saveBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FEF2F2",
    borderRadius: 14,
    paddingVertical: 14,
    gap: 8,
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  logoutBtnText: {
    color: "#DC2626",
    fontSize: 14,
    fontWeight: "700",
  },
});
