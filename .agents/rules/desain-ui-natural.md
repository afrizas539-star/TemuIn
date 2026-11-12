---
trigger: always_on
description: Aturan desain UI Temuin agar terlihat dirancang manusia, bukan hasil AI generik.
---

# Aturan Desain UI — Temuin

Berlaku untuk SEMUA perubahan UI (layar, komponen, kamera). Baca juga skill `desain-ui-natural`.

## 1. Identitas dulu, baru komponen
- Ambil warna utama dari logo (`assets/images/logo-temuin.png`), jangan dari palet bawaan Tailwind.
- Seluruh warna, radius, spasi, dan font HARUS lewat satu file token: `src/constants/theme.ts`.
  Dilarang menulis hex baru langsung di file layar. Hapus warna acak bawaan template
  (#434a9b, #751212, #1c8461, dst.) dan ganti dengan token nyata.
- Maksimal 1 warna aksen + 1 warna semantik (sukses/bahaya). Netral memakai off-white hangat dan
  abu kecokelatan, bukan slate-biru dingin (#0F172A, #64748B, #F8FAFC, dst.).

## 2. Daftar larangan (ciri khas tampilan AI)
- Tanpa gradien ungu→biru, tanpa efek glow/neon, tanpa glassmorphism berlebihan.
- Tanpa kartu seragam berderet dengan radius besar + bayangan lembut yang sama di mana-mana.
- Tanpa ikon dalam lingkaran berwarna pastel di atas setiap judul.
- Tanpa emoji sebagai ikon, tanpa badge/pill di setiap elemen.
- Tanpa teks tengah-rata pada semua layar; tanpa hero banner generik.
- Tanpa copywriting klise: "Selamat datang di...", "Solusi cerdas", "Pengalaman terbaik",
  "Mudah, cepat, dan aman". Tulis kalimat spesifik dan pendek, seperti petugas kampus yang bicara.
- Tanpa pengulangan pola yang sama persis lebih dari 3 kali berurutan.

## 3. Yang dilakukan (ciri khas buatan manusia)
- Hierarki tegas: satu elemen paling dominan per layar; sisanya diam.
- Tipografi: satu keluarga font untuk isi + satu untuk judul (muat lewat expo-font), ukuran
  mengikuti skala tetap (12/14/16/20/28). Letter-spacing dan line-height dipilih sengaja.
- Spasi berirama (kelipatan 4), tidak semua jarak sama. Kelompokkan elemen terkait lebih rapat.
- Radius konsisten: 2 nilai saja (kecil untuk input/tombol, sedang untuk kartu). Bukan 20–34 di semua.
- Bayangan dipakai hemat; utamakan garis tipis (hairline border) dan perbedaan warna latar.
- Ikon satu set saja, ukuran dan ketebalan seragam, dipakai hanya bila menambah makna.
- Boleh sedikit asimetris (rata kiri, judul besar, angka/data diberi ruang) — hindari tata letak
  template.
- Kondisi nyata dirancang: loading, kosong, error, offline. Isinya spesifik, bukan placeholder.
- Gerak: durasi 150–250 ms, easing standar, hanya untuk memberi tahu perubahan status.

## 4. Layar kamera (src/app/camera.tsx)
- Pratinjau kamera memenuhi layar; kontrol minimal di tepi bawah. Hapus panel info kaca
  (rgba gelap + border putih transparan) dan panel statistik sensor dari tampilan utama
  (log tetap di console).
- Tombol rana: lingkaran putih solid dengan cincin tipis; tombol lain berupa ikon polos tanpa
  latar kotak.
- Bingkai pemandu tipis (sudut saja) bila perlu menjepret barang; teks panduan satu baris.
- Halaman izin kamera: kalimat langsung ("Temuin butuh kamera untuk memotret barang.") + satu tombol.

## 5. Proses kerja
- Sebelum mengubah UI, tulis 3–5 baris keputusan desain (warna, font, tata letak) lalu terapkan.
- Setelah selesai, cek diri sendiri terhadap bagian 2: sebutkan apa yang sengaja dihindari.
- Ubah secukupnya; jangan menulis ulang layar yang tidak diminta.