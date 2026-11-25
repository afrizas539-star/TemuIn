# TemuIn — Lost & Found Kampus Universitas Muhammadiyah Malang (UMM)

Aplikasi mobile pelaporan dan pencarian barang hilang & temuan di lingkungan Universitas Muhammadiyah Malang, dibangun dengan **Expo SDK 58**, **React Native 19**, **TypeScript**, dan **Supabase Backend (Auth, Database, Storage, Realtime)**.

---

## 🚀 Panduan Setup Backend Supabase

### 1. Konfigurasi Environment Variables
Salin template `.env.example` menjadi `.env` di root project:
```bash
cp .env.example .env
```
Buka file `.env` dan masukkan kredensial project Supabase Anda:
```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### 2. Menjalankan Skema Database di SQL Editor
1. Buka Dashboard Supabase project Anda.
2. Masuk ke menu **SQL Editor**.
3. Buat query baru, salin seluruh isi file [schema.sql](file:///d:/KULIAHHH/SEMESTER%205/PEMROGRAMAN%20MOBILE/project_mobile/supabase/schema.sql) (atau file `supabase/schema.sql` di explorer project) dan jalankan (**Run**).
4. Skema ini otomatis membuat:
   - Tabel `profiles`, `items`, dan `claims` lengkap dengan relasi dan constraints.
   - Trigger `handle_new_user` yang otomatis membuat profil saat Sign Up (role default `'student'`).
   - Fungsi wewenang `is_admin()`.
   - Konfigurasi **Row Level Security (RLS)** untuk keamanan data antar peran.
   - Publikasi **Realtime** pada tabel `items` dan `claims`.
   - Bucket Storage `item-photos` (publik) dan `id-cards` (privat untuk foto KTM).

### 3. Pengaturan Autentikasi di Dashboard Supabase (Penting untuk Demo)
1. Buka menu **Authentication** -> **Providers** -> **Email**.
2. Nonaktifkan opsi **"Confirm email"** agar akun mahasiswa yang didaftarkan dapat langsung masuk tanpa verifikasi link email.
3. Klik **Save**.

### 4. Menyiapkan Akun Petugas / Admin Kampus
1. Buka menu **Authentication** -> **Users** -> **Add user** -> **Create user**.
2. Masukkan email dinas petugas, misalnya `petugas@umm.ac.id` dan kata sandi yang diinginkan.
3. Setelah user dibuat, buka **SQL Editor** dan promosikan akun tersebut menjadi admin:
```sql
UPDATE public.profiles
SET 
  role = 'admin',
  office_location = 'Posko Keamanan Pusat (Gedung Rektorat Lt. 1)'
WHERE email = 'petugas@umm.ac.id';
```

---

## 📱 Menjalankan Aplikasi

1. Pasang dependensi project:
   ```bash
   npm install
   ```
2. Jalankan Expo dev server:
   ```bash
   npx expo start
   ```
3. Pindai QR code via **Expo Go** di Android/iOS, atau jalankan emulator:
   - Android: tekan `a`
   - iOS: tekan `i`
   - Web: tekan `w`

---

## 🔒 Rubrik Penilaian & Arsitektur
1. **Secure Token Storage**: Sesi Supabase disimpan menggunakan `expo-secure-store` melalui custom storage adapter di `src/lib/supabase.ts` (dengan fallback `localStorage` di platform Web).
2. **Supabase Auth Flow**: Mendukung Sign Up (`/register`), Sign In (`/login`), Sign Out, dan loading states terintegrasi.
3. **Global AuthContext & Real-time Session**: `supabase.auth.onAuthStateChange` dengan cleanup subscription murni tanpa resiko deadlock query database.
4. **Route Protection Guards**: Guard terpusat di `src/app/_layout.tsx` menggunakan `<Stack.Protected>` berdasarkan status autentikasi dan role pengguna (`student` vs `admin`).
