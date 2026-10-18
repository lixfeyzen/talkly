# Penilaian desain layar awal, daftar, dan masuk Talkly (18 Oktober 2026)

Penilaian saja, tidak ada kode yang diubah. Layar Talkly kupotret langsung di web ukuran HP (375x812). Kedua referensi kulihat langsung dari talkly/referensi-desain (nesz.png dan montek.png), dan kontras tombolnya kuukur dari piksel gambar.

## Kesimpulan (direvisi sesudah melihat gambar aslinya)
Secara keseluruhan Nesz lebih cocok untuk Talkly. Ambil satu hal dari Montek: halaman pembukanya (judul besar di atas gambar produk).

Versi pertama penilaian ini memilih arah Montek berdasarkan deskripsi tanpa melihat gambar. Sesudah gambarnya kulihat, putusannya kubalik karena tiga bukti baru. Pertama, hampir semua layar yang Talkly perlukan (masuk, daftar, lupa password, pilihan minat) polanya ada di Nesz dan lebih ringan. Kedua, alur Montek berat karena kebutuhan aplikasi keuangan (nomor HP, PIN, Face ID), dan semua itu tidak perlu untuk app latihan interview. Ketiga, tombol Nesz kontrasnya 8,3 banding 1 (aman), sedangkan tombol nonaktif Montek cuma 2,0 banding 1, lebih buruk dari Talkly.

Alasannya dari dasar: 60 detik pertama harus membuat pencari kerja yang gugup percaya bahwa lima menit di sini memperbaiki interview-nya, lalu membawanya ke latihan pertama dengan langkah sesedikit mungkin. Halaman pembuka Montek paling kuat untuk bagian percaya. Alur Nesz paling ringan untuk bagian sampai ke latihan.

## Yang kulihat di Talkly sekarang (terukur)
1. Tidak ada halaman pembuka. App langsung membuka layar masuk, jadi orang baru tidak diberi alasan untuk mendaftar. Kedua referensi punya layar pembuka sebelum login.
2. Layar masuk, daftar, dan lupa password memakai hero yang sama (gelembung sapaan Hello, Let's talk, You got this, Hey) yang memakan sekitar 60 persen tinggi layar. Kolom isian pertama baru muncul di sekitar 60 persen dari atas. Gelembungnya tidak menunjukkan produk, dan tidak ada logo Talkly di layar auth.
3. Onboarding terang dan polos (dua pertanyaan di satu layar, tanpa logo, tanpa penunjuk langkah), sedangkan layar auth gelap.
4. Kontras kurang: teks petunjuk kolom isian 2,9 banding 1, tombol nonaktif 2,6 banding 1 (batas aman 4,5). Tombol aktif sudah bagus (18,9 banding 1).
5. Tidak ada masuk dengan Google. Kedua referensi punya.
6. Tombol Resend code di lupa password tidak memberi tahu jeda 60 detik di server. Kalau ditekan dalam 60 detik, kodenya diam-diam tidak dikirim. Nesz menampilkan hitung mundur (Wait for 00:53, Send Again).

## Perbandingan per faktor (dari gambar asli)
1. Kesan pertama: Montek menang. Judul besar dan tegas di atas gambar produk dengan satu tombol. Nesz hanya daftar fitur dengan ikon, jelas tapi datar.
2. Pintu masuk: Nesz lebih ringkas, karena masuk, Apple, Google, dan tautan daftar ada di satu layar. Montek memisahkan pilihan di lembar bawah, rapi tapi menambah satu ketukan.
3. Daftar akun: Nesz menang. Satu formulir dengan konfirmasi password dan persetujuan syarat. Montek memecahnya jadi nomor HP, kode OTP, profil, PIN, Face ID, dan izin notifikasi.
4. Personalisasi: keduanya setara. Nesz pakai kotak pilihan minat dengan tombol Maybe later, Montek daftar tujuan pemakaian. Pola Nesz paling mirip pilihan bahasa di onboarding Talkly.
5. Lupa password: Nesz lengkap (email, kode OTP dengan hitung mundur, password baru dengan konfirmasi). Talkly sudah setara kecuali hitung mundur dan konfirmasi password.
6. Kontras dan keterbacaan: Nesz menang (8,3 banding 1). Montek biru dengan teks putih 5,7 banding 1 (aman), tapi tombol nonaktifnya 2,0 banding 1.
7. Kerapian teks: keduanya ada salah ketik (Nesz: Aggree, Forget Password, Metavers. Montek: Enter you phone number). Tiru strukturnya, bukan kata-katanya.
8. Usaha di Expo: pola Nesz murni UI tanpa pustaka baru, kecuali masuk dengan Google.

## Usulan (urut dari dampak terbesar)
1. Tambah satu halaman pembuka gaya Montek: judul besar (contoh: Ace your next English interview) di atas contoh nyata produk, yaitu satu pertanyaan interviewer dan satu jawaban dengan kesalahan yang ditandai. Satu tombol Get started.
2. Pangkas hero di layar auth jadi sekitar 30 persen layar dengan logo Talkly, ganti gelembung sapaan.
3. Pakai pola formulir Nesz: tambah konfirmasi password di daftar dan di password baru, tombol selalu aktif dengan pesan kesalahan di bawah kolom, teks petunjuk minimal 4,5 banding 1.
4. Hitung mundur 60 detik di tombol kirim ulang kode, supaya cocok dengan jeda di server.
5. Samakan gaya onboarding dengan layar auth, pisahkan jadi dua langkah, dan beri pilihan lewati seperti Maybe later di Nesz.
6. Masuk dengan Google, paling berat karena perlu pengaturan Google Cloud. Taruh paling akhir.

Yang sengaja tidak kuusulkan: nomor HP, PIN, Face ID, dan izin notifikasi di awal (pola Montek). Itu kebutuhan aplikasi keuangan dan hanya menambah langkah untuk Talkly.

Keputusan yang cuma kamu yang bisa ambil: palet. Rekomendasiku tetap gelap dan pastel (sudah dibuat, kontras tinggi, beda dari kompetitor). Hijau Nesz atau biru Montek hanya perubahan warna dan murah kalau kamu lebih suka.
