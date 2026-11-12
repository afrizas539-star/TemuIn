---
name: desain-ui-natural
description: Gunakan saat membuat atau merapikan tampilan layar, komponen, atau halaman kamera di Temuin. Menghasilkan UI React Native yang elegan, khas, dan tidak terlihat seperti template buatan AI.
---

# Skill: Desain UI Natural (React Native / Expo)

## Kapan dipakai
Setiap kali diminta mendesain, mempercantik, atau merombak tampilan.

## Langkah kerja
1. **Audit**: baca layar yang dimaksud dan daftar ciri generik yang ada (warna slate/biru-indigo,
   kartu seragam, ikon pastel, panel kaca, teks klise).
2. **Arah desain**: tulis singkat — suasana (mis. "kantor layanan kampus yang hangat dan rapi"),
   2 warna inti, pasangan font, dan satu elemen yang jadi pusat perhatian.
3. **Token**: perbarui `src/constants/theme.ts` (warna, spasi, radius, tipografi), lalu pakai token
   itu di semua file. Jangan menulis hex di layar.
4. **Terapkan** per layar mulai dari yang paling sering dilihat: login → home → detail barang →
   laporan → kamera. Ubah seperlunya.
5. **Kondisi**: pastikan state loading, kosong, error, offline punya desain dan teks khas.
6. **Cek akhir**: bandingkan dengan `.agent/rules/desain-ui-natural.md` bagian 2. Laporkan apa yang
   diubah dan apa yang sengaja dihindari.

## Resep palet (contoh titik awal, sesuaikan dengan logo)
- Latar: #FAF7F2 (kertas hangat) · Permukaan: #FFFFFF · Garis: #E6E0D6
- Teks utama: #1F2A2E · Teks sekunder: #6B6F68
- Aksen: satu warna dari logo (mis. biru tua/teal #0F4C5C) · Peringatan: #B4532A
- Sukses: #2F6B4F

## Resep tipografi
- Judul: serif atau grotesk berkarakter (mis. Fraunces / Newsreader / Space Grotesk).
- Isi: font bersih (mis. Inter atau Plus Jakarta Sans), muat lewat `expo-font`.
- Skala: 12 / 14 / 16 / 20 / 28; judul layar 28 dengan line-height rapat.

## Contoh tulisan antarmuka
- Buruk: "Selamat datang di Temuin! Temukan barang Anda dengan mudah dan cepat."
- Baik: "Barang hilang di kampus? Cek dulu daftar temuan hari ini."
- Buruk: "Terjadi kesalahan. Silakan coba lagi."
- Baik: "Tidak tersambung ke server. Periksa Wi-Fi, lalu coba lagi."

## Kamera
Ikuti bagian 4 pada rules: pratinjau penuh, kontrol minimal, ikon polos, bingkai sudut tipis.