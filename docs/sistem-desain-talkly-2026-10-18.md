# Sistem desain Talkly (usulan, 18 Oktober 2026)

Tujuan: satu bahasa visual yang membuat Talkly dikenali dalam satu detik di pasar global, dan membuat pencari kerja yang gugup merasa tenang lalu mulai bicara. Dokumen ini usulan, belum ada kode yang diubah. Dasarnya kode dan aset yang sudah ada (src/constants/theme.ts, src/components/talkly-mark.tsx, assets/images/icon.png), ditambah tiga hal yang belum ada: huruf, gerak, dan ilustrasi.

## Temuan penting: identitas Talkly sebenarnya sudah ada, cuma tidak dipakai di layar awal
1. Logo Talkly adalah empat batang gelombang suara yang menaik, dari lavender muda ke ungu #8B7BF0. Ada di ikon aplikasi dan di komponen TalklyMark. Ini elemen khas yang kucari, dan sudah dimiliki.
2. Logo itu hanya muncul di layar Home (header dan layar tunggu). Di layar pembuka, masuk, daftar, lupa password, dan onboarding, logonya tidak ada sama sekali, diganti gelembung sapaan yang tidak berhubungan dengan merek.
3. Tema sesudah login sudah punya sistem: kanvas terang, kartu putih, satu tombol hitam per layar, pastel sebagai kode fitur (lilac untuk interview, ice untuk percakapan, cream untuk progres, pink untuk streak, mint untuk sukses). Layar awal harus memakai sistem yang sama.

Kesimpulannya: pekerjaan utamanya bukan mencipta identitas baru, tapi membawa identitas yang sudah ada ke 60 detik pertama, lalu melengkapinya dengan huruf, gerak, dan ilustrasi.

## 1. Elemen khas: gelombang suara
1. Logo empat batang dipakai di setiap layar awal, kecil di pojok atas (seperti Montek menaruh nama merek di atas).
2. Gelombang yang sama dijadikan hidup: saat pengguna bicara, batang-batangnya bergerak mengikuti suara. Saat AI bicara, batangnya berdenyut pelan. Saat diam, batangnya datar. Ini menjadi tombol mic sekaligus indikator status, dan muncul di halaman pembuka sebagai hal pertama yang dilihat.
3. Aturan: gelombang selalu ungu. Pastel lain tidak boleh dipakai untuk gelombang, supaya ungu dan gelombang menyatu di ingatan orang.

## 2. Warna
1. Dasar: hitam #101014 untuk momen merek (pembuka, hero auth, skor), putih untuk bekerja (formulir, latihan, laporan).
2. Ungu merek #8B7BF0 (dari logo) untuk gelombang, tautan, dan pilihan aktif di kanvas terang. Kontras teks putih di atasnya hanya 3,3 banding 1, jadi untuk tombol di kanvas putih pakai ungu pekat #5B3FD9 (6,7 banding 1), dan di kanvas hitam pakai lavender #C9B6FF dengan teks hitam (10,5 banding 1).
3. Tombol utama tetap hitam di kanvas putih, sesuai sistem sesudah login (satu tombol hitam per layar). Ungu pekat dipakai hanya untuk tombol di layar pembuka dan auth, supaya momen pertama terasa bermerek.
4. Pastel tetap dengan arti yang sudah ada di theme.ts. Di layar awal, pink dipakai untuk menandai kesalahan di contoh jawaban, mint untuk versi yang benar.
5. Teks petunjuk kolom isian naik dari #8B8F98 ke #666B73 (4,6 banding 1).

## 3. Huruf
1. Judul dan tombol: Plus Jakarta Sans, tebal 700 sampai 800, dengan spasi huruf sedikit rapat. Pilihannya karena bentuknya geometris tapi ujungnya lembut, terasa modern dan ramah, bukan kaku seperti font bawaan. Gratis dan tersedia untuk Expo lewat paket @expo-google-fonts/plus-jakarta-sans.
2. Teks isi: Plus Jakarta Sans 400 dan 500, ukuran 15 sampai 16 dengan jarak baris 1,45.
3. Angka besar (skor, hitung mundur): tetap angka tabular supaya rapi.
4. Skala: judul pembuka 38, judul layar 28 sampai 30, subjudul 15, label tombol 16, keterangan 13.

## 4. Gerak (yang paling membedakan app bicara dari app teks)
1. Gelombang suara bergerak: masuk halus saat layar muncul, berdenyut saat AI bicara, mengikuti suara saat pengguna bicara.
2. Perpindahan layar onboarding geser ke kiri, 250 milidetik, dengan garis penanda langkah yang mengisi.
3. Kesalahan yang ditandai muncul satu per satu dengan jeda kecil, supaya mata diarahkan ke koreksi.
4. Semua gerak pakai react-native-reanimated yang sudah terpasang di proyek. Tidak ada pustaka baru.

## 5. Ilustrasi
1. Tidak pakai maskot. Ilustrasi Talkly adalah gelembung percakapan dan gelombang suara, digambar dengan garis dan blok warna pastel, tanpa gradasi rumit.
2. Dipakai di tiga tempat: halaman pembuka (contoh percakapan dengan koreksi), layar kosong (belum ada latihan), dan layar onboarding (ikon posisi pekerjaan).

## 6. Alur 60 detik pertama (struktur dari penilaian sebelumnya)
1. Pembuka: logo, judul, contoh percakapan dengan koreksi, gelombang suara hidup, satu tombol Get started, tautan Sign in.
2. Masuk dan daftar: hero pendek dengan logo dan judul, formulir di kartu putih, tombol ungu pekat, masuk dengan Google, tombol selalu aktif dengan pesan kesalahan di bawah kolom.
3. Onboarding tiga langkah, satu pertanyaan per layar, dengan Maybe later: nama panggilan, posisi interview, bahasa sehari-hari.
4. Lupa password: kirim ulang kode dengan hitung mundur 60 detik, password baru dengan konfirmasi.

## Urutan pengerjaan yang kuusulkan (kalau disetujui)
1. Pasang font dan token warna baru di theme.ts, komponen gelombang suara hidup. Ini fondasi untuk semua layar.
2. Halaman pembuka baru.
3. Layar masuk, daftar, lupa password dengan hero pendek dan formulir baru.
4. Onboarding tiga langkah.
5. Masuk dengan Google (butuh pengaturan Google Cloud darimu).

Belum pasti: apakah Plus Jakarta Sans tampil sama bagusnya di Android lama, karena belum kuuji di perangkat asli. Cara memastikan: pasang fontnya lalu jalankan di HP Android lewat Expo Go.
