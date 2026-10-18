# Daftar semua halaman Talkly (18 Oktober 2026, cabang design/ungu-final)

Sumber: semua berkas di src/app (router expo-router, satu berkas = satu halaman), dibaca dari kode, lalu tiap halaman dibuka di app yang menyala (web, ukuran HP 375x812) sebagai pengguna yang sudah masuk (akun uji design-check-1@example.com yang sudah onboarding). Berkas src/app/_layout.tsx bukan halaman, tapi pembungkus semua halaman (memuat font, splash, dan tumpukan layar).

Total: 15 halaman. 14 bisa dibuka pengguna, 1 sedang dimatikan (Weekly challenges).

## Sebelum masuk (5 halaman, semuanya dibuka di app)
1. Pembuka (/welcome). Logo, judul Walk into your interview ready., penjelasan singkat, kartu contoh koreksi (kata salah dicoret, kata benar distabilo, label Tense), tombol Get started menuju Daftar, tautan Sign in menuju Masuk. Muncul otomatis untuk orang yang belum masuk.
2. Daftar (/register). Email, password, tombol Create account, tautan Sign in. Sesudah berhasil menuju Onboarding.
3. Masuk (/login). Email, password dengan tombol lihat, Forgot password?, tombol Sign in, tautan Create account. Sesudah berhasil menuju Home (atau Onboarding kalau belum diisi).
4. Lupa password (/forgot-password). Langkah 1: email lalu Send code. Langkah 2: kode 6 digit, password baru, Reset password, Resend code. Selesai kembali ke Masuk dengan pesan sukses.
5. Onboarding (/onboarding). 2 langkah dengan garis penanda: nama panggilan (bisa Maybe later), lalu pilih bahasa sehari-hari dari 10 bahasa. Tombol Start practicing menuju Home.

## Sesudah masuk (10 halaman)
6. Home (/). Dibuka. Sapaan Hi Rina, ready to practice?, tombol Start interview, kartu Have an interview coming up? (menuju Tanggal interview), pilihan Free chat dan Mock interview, ruang kerja berisi Conversations, Practice feedback, Practice history, Streak, dan menu bawah Home, Progress, Settings. Kalau server tidak terjangkau, tampil layar Try again.
7. Progress (/dashboard). Dibuka. Your progress, keadaan kosong No progress yet dengan tombol Start practicing. Kalau sudah ada data: total aktivitas, fokus koreksi 28 hari, koreksi terakhir, rapor latihan terakhir, tautan ke Riwayat latihan.
8. Percakapan (/conversation). Dibuka. Latihan ngobrol bebas dengan AI: pilihan skenario (About yourself, Salary talk, Networking, Small talk, Client meeting), kotak pesan, mode suara, koreksi langsung saat ngobrol.
9. Riwayat percakapan (/conversations). Dibuka. Daftar sesi lama, ketuk untuk melihat transkrip penuh. Kosong: No conversations yet dengan tombol Start practicing.
10. Mock interview (/interview). Dibuka. Breathe, penjelasan cara kerja (5 pertanyaan, tanpa koreksi selama interview, umpan balik di akhir), pilih role (Software Engineer, Marketing, Sales, Finance, Designer, General), tombol Start interview.
11. Tanggal interview (/interview-date). Dibuka. When is your interview?, pilih role, pilihan cepat (3 hari, 1 minggu, 2 minggu, 1 bulan) atau tanggal pasti, tombol Start my countdown.
12. Rapor interview (/interview-report). Dibuka tanpa sesi, tampil Missing interview session. dan Back (benar, halaman ini butuh sesi interview yang sudah selesai). Isi saat ada sesi (dari kode): skor latihan, nilai per dimensi (grammar, structure, content, confidence), perbaikan teratas, Answer upgrade, tombol coba mock lagi.
13. Riwayat latihan (/trajectory). Dibuka. Your practice history, catatan latihan, grafik skor dari waktu ke waktu, koreksi tercatat 14 hari terakhir dibanding 14 hari sebelumnya.
14. Settings (/settings). Dibuka. Nama, email, ganti nama, bahasa sehari-hari, Change password (menuju Lupa password), pengingat latihan harian (hanya di HP), Sign out, versi app.
15. Weekly challenges (/weekly-challenge). Dibuka, tapi langsung kembali ke Home karena fitur dimatikan lewat saklar WEEKLY_CHALLENGE_ENABLED di src/lib/features/v1. Tombol menuju halaman ini di Progress juga ikut tersembunyi, jadi pengguna tidak bisa sampai ke sini.

## Temuan saat inventaris
1. Halaman Weekly challenges (dimatikan) masih memanggil server lewat alamat tetap http://localhost:3001 di fungsi handleStart, bukan lewat klien API yang dipakai halaman lain. Kalau fitur ini dinyalakan lagi di HP atau produksi, tombol mulainya tidak akan jalan. Belum kuubah karena fiturnya sedang mati.
2. Hanya 5 halaman sebelum masuk yang sudah memakai desain ungu baru. 10 halaman sesudah masuk masih memakai desain lama (kanvas terang dengan hero hitam dan pastel).
3. Isi Rapor interview saat ada sesi dan grafik Riwayat latihan saat sudah ada data hanya kubaca dari kode, belum kulihat dengan data sungguhan, karena akun uji belum pernah menyelesaikan mock interview.
