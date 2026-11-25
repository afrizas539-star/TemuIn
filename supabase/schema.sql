-- ==============================================================================
-- SKEMA DATABASE TEMUIN (LOST & FOUND KAMPUS UMM)
-- Jalankan file ini di Supabase SQL Editor
-- ==============================================================================

-- 1. TABEL PROFILES (Menggantikan koleksi 'users' dan 'admins')
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  nim TEXT,
  faculty TEXT,
  photo TEXT,
  office_location TEXT,
  role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'admin', 'super_admin')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. TABEL ITEMS (Menggantikan koleksi 'items')
CREATE TABLE IF NOT EXISTS public.items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('lost', 'found')),
  status TEXT NOT NULL,
  status_color TEXT NOT NULL DEFAULT '#64748B',
  date TEXT NOT NULL,
  location TEXT NOT NULL,
  location_detail JSONB,
  faculty TEXT NOT NULL DEFAULT 'Umum',
  description TEXT NOT NULL DEFAULT '',
  reward TEXT,
  reporter TEXT NOT NULL,
  image TEXT NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  lost_status TEXT,
  found_status TEXT,
  verification_status TEXT DEFAULT 'Menunggu Verifikasi',
  found_item_id TEXT,
  linked_lost_item_id TEXT,
  additional_info TEXT,
  is_resolved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. TABEL CLAIMS (Menggantikan koleksi 'claims')
CREATE TABLE IF NOT EXISTS public.claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  item_title TEXT NOT NULL,
  item_category TEXT NOT NULL,
  item_image TEXT,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  student_name TEXT NOT NULL,
  student_nim TEXT NOT NULL,
  student_faculty TEXT NOT NULL,
  student_phone TEXT NOT NULL,
  proof_details TEXT NOT NULL,
  id_card_image TEXT NOT NULL, -- Path atau URI foto KTM/KTP
  status TEXT NOT NULL DEFAULT 'Menunggu Verifikasi',
  admin_notes TEXT,
  verified_at TIMESTAMPTZ,
  verified_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ==============================================================================
-- 4. FUNGSI DAN TRIGGER KELOLA USER BARU
-- Menolak pendaftaran jika bukan email @webmail.umm.ac.id
-- Role pendaftaran otomatis diset ke 'student'
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_email TEXT;
  user_name TEXT;
  user_nim TEXT;
BEGIN
  user_email := LOWER(TRIM(NEW.email));

  -- Validasi ketat domain mahasiswa
  IF NOT (user_email LIKE '%@webmail.umm.ac.id') THEN
    RAISE EXCEPTION 'Pendaftaran hanya diizinkan untuk mahasiswa UMM (@webmail.umm.ac.id)';
  END IF;

  user_name := COALESCE(NEW.raw_user_meta_data->>'name', split_part(user_email, '@', 1));
  -- Gunakan NIM dari form register jika ada, fallback ke angka awal email
  user_nim := COALESCE(
    NULLIF(TRIM(NEW.raw_user_meta_data->>'nim'), ''),
    substring(user_email from '^[0-9]+')
  );

  INSERT INTO public.profiles (
    id,
    name,
    email,
    phone,
    nim,
    faculty,
    role,
    is_active
  ) VALUES (
    NEW.id,
    user_name,
    user_email,
    NEW.raw_user_meta_data->>'phone',
    user_nim,
    NEW.raw_user_meta_data->>'faculty',
    'student', -- Selalu 'student' untuk sign up publik
    true
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ==============================================================================
-- 5. HELPER FUNCTION: is_admin()
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin')
      AND is_active = true
  );
$$;

-- ==============================================================================
-- 6. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

-- A. RLS TABEL PROFILES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profil dapat dibaca oleh pengguna login"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Pengguna hanya dapat mengubah profilnya sendiri (tanpa mengubah role)"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id AND
    role = (SELECT role FROM public.profiles WHERE id = auth.uid())
  );

-- B. RLS TABEL ITEMS
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Semua barang dapat dibaca oleh pengguna login"
  ON public.items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Mahasiswa dapat melaporkan barang hilang"
  ON public.items FOR INSERT
  TO authenticated
  WITH CHECK (
    (type = 'lost' AND auth.uid() = user_id) OR
    public.is_admin()
  );

CREATE POLICY "Pemilik laporan atau Admin dapat memperbarui item"
  ON public.items FOR UPDATE
  TO authenticated
  USING (
    (auth.uid() = user_id) OR
    public.is_admin()
  );

CREATE POLICY "Hanya Admin atau Pemilik Laporan yang dapat menghapus item"
  ON public.items FOR DELETE
  TO authenticated
  USING (
    (auth.uid() = user_id) OR
    public.is_admin()
  );

-- C. RLS TABEL CLAIMS
ALTER TABLE public.claims ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin dapat melihat seluruh klaim, Mahasiswa hanya melihat klaim miliknya"
  ON public.claims FOR SELECT
  TO authenticated
  USING (
    (auth.uid() = user_id) OR
    public.is_admin()
  );

CREATE POLICY "Mahasiswa dapat mengajukan klaim atas barang"
  ON public.claims FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
  );

CREATE POLICY "Admin berwenang memverifikasi klaim"
  ON public.claims FOR UPDATE
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admin berwenang menghapus klaim"
  ON public.claims FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- ==============================================================================
-- 7. SUPABASE REALTIME CONFIGURATION
-- ==============================================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.items, public.claims;

-- ==============================================================================
-- 8. STORAGE BUCKETS & POLICIES
-- ==============================================================================
-- Catatan: Jalankan query ini untuk memasukkan konfigurasi bucket default jika belum dibuat di dashboard:
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('item-photos', 'item-photos', true),
  ('id-cards', 'id-cards', false)
ON CONFLICT (id) DO NOTHING;

-- Policy Storage: item-photos (Publik untuk dibaca)
CREATE POLICY "Foto barang publik dapat dibaca siapa saja"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'item-photos');

CREATE POLICY "Pengguna login dapat mengunggah foto barang"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'item-photos');

CREATE POLICY "Pemilik foto atau admin dapat menghapus foto barang"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'item-photos');

-- Policy Storage: id-cards (Privat untuk dokumen KTM)
CREATE POLICY "Hanya pemilik atau Admin yang dapat membaca foto KTM"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'id-cards' AND (
      (storage.foldername(name))[1] = auth.uid()::text OR
      public.is_admin()
    )
  );

CREATE POLICY "Pengguna login dapat mengunggah foto KTM miliknya"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'id-cards' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- ==============================================================================
-- 9. CONTOH SQL PROMOSI ADMIN / PETUGAS KAMPUS
-- (Setelah akun petugas didaftarkan atau dibuat di dashboard auth)
-- ==============================================================================
-- UPDATE public.profiles
-- SET 
--   role = 'admin',
--   office_location = 'Posko Keamanan Pusat (Gedung Rektorat Lt. 1)'
-- WHERE email = 'petugas@umm.ac.id';
