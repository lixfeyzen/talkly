# Audit alur per halaman dan kecocokan fitur Talkly (18 Oktober 2026)

Dasar penilaian: pengguna Talkly adalah profesional non-penutur asli yang mau interview kerja dalam bahasa Inggris. Yang mereka butuhkan, berurutan: tahu app ini untuk apa, langsung latihan bicara untuk posisi yang dilamar, dapat koreksi yang jelas, dan merasa makin siap sampai hari interview. Bukti diambil dari 15 halaman yang dibuka di app (docs/daftar-halaman-talkly-2026-10-18.md) dan dari kode src/app.

## Kesimpulan
Fitur intinya sudah tepat, tapi alurnya belum. Semua bahan untuk tujuan pengguna sudah ada (mock interview berbasis suara per role, koreksi, rapor per dimensi, perbaikan jawaban, hitung mundur ke tanggal interview, riwayat). Masalahnya ada di urutan dan jumlah pintu, bukan di fitur yang hilang. Satu fitur yang memang belum ada dan umum di kompetitor: latihan berdasarkan lowongan yang ditempel.

## Yang sudah benar
1. Mock interview memakai suara sebagai mode utama (voiceFirst di src/app/conversation.tsx) dan tidak memotong saat menjawab, umpan baliknya di akhir. Ini sesuai janji di layar pembuka (practice out loud).
2. Ada rapor per dimensi dan contoh jawaban yang lebih baik, ini nilai inti untuk orang yang gugup.
3. Tanggal interview memberi hitung mundur dan tugas harian, cocok dengan tujuan siap di hari H.
4. Layar pembuka sampai onboarding sudah satu alur yang jelas.

## Yang belum benar (urut dari dampak terbesar)
1. Onboarding tidak menanyakan hal terpenting: posisi dan tanggal interview. Keduanya baru ditanyakan lewat kartu di Home (halaman Tanggal interview terpisah), padahal hitung mundur dan latihan per role bergantung padanya. Usulan: jadikan langkah ketiga onboarding (posisi dan tanggal, bisa dilewati).
2. Pengguna baru mendarat di Home dengan terlalu banyak pintu: Start interview, kartu tanggal interview, Free chat, Mock interview, dan 4 baris Workspace. Usulan: sesudah onboarding langsung tawarkan satu aksi, mulai mock interview pertama.
3. Ada tombol ganda: Start interview dan Mock interview di Home memanggil fungsi yang sama (openInterview di src/app/index.tsx baris 197 dan 275). Usulan: hapus chip Mock interview.
4. Kemajuan tersebar di 3 tempat: tab Progress, Practice history (Riwayat latihan), dan Practice feedback. Usulan: satukan di tab Progress, Home cukup menampilkan ringkasan.
5. Free chat di Home dan Percakapan terasa fitur terpisah dari interview. Usulan: beri label yang menjelaskan manfaatnya, misalnya latihan bebas di antara mock interview.

## Fitur yang belum ada
1. Latihan dari lowongan yang ditempel. Banyak app sejenis sudah menawarkannya: Mocky (https://apps.apple.com/us/app/mocky/id6758603897), Careerflow (https://help.careerflow.ai/en/articles/12631590-using-the-ai-mock-interview-tool), Mock Interviewer AI (https://www.neura.market/ai-tools-directory/workflow-productivity/mockinterviewer-ai). Tanpa ini, pertanyaan Talkly hanya per role umum.
2. Pembeda Talkly tetap jelas dan tidak dimiliki app di atas: fokus ke penutur non-asli dan mengingat pola kesalahan bahasa. Jadi fitur lowongan sebaiknya menambah, bukan mengganti.

## Status perbaikan (19 Oktober 2026)
Poin 1 sampai 4 di bagian Yang belum benar sudah dikerjakan di cabang design/ungu-final: onboarding langkah 3 (posisi dan tanggal, bisa dilewati), sesudahnya langsung ke mock interview dengan role terpilih, chip Mock interview dihapus, dan 3 baris kemajuan di Home disatukan jadi satu baris Your progress yang menuju tab Progress.

## Temuan baru saat menguji
Hitung mundur memakai tanggal UTC di server (todayIso di backend/src/app/api/interview-plan/route.ts) dan di app. Untuk pengguna WIB antara tengah malam dan jam 7 pagi, tanggal UTC masih kemarin, jadi pilihan In 1 week tampil 8 hari. Perbaikan yang benar: app mengirim tanggal lokal hari ini, server memakainya. Belum dikerjakan karena mengubah API.

Belum pasti: apakah pengguna sungguhan merasa onboarding tiga langkah lebih baik daripada langsung ke Home. Cara memastikan: uji dengan 5 orang target dan hitung berapa yang menyelesaikan mock interview pertama.
