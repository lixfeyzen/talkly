# Audit nilai fitur Talkly untuk bisnis (19 Oktober 2026)

Penilaian saja, belum ada fitur yang diubah atau dihapus. Keputusan buang atau sembunyikan menunggu Yohanes.

## Dasar penilaian
1. Pengguna sasaran: profesional non-penutur asli yang sedang menyiapkan interview kerja berbahasa Inggris (docs/PROJECT-NOTES.md).
2. Janji di layar pembuka: berlatih pertanyaan interview sungguhan dengan suara, Talkly memperbaiki ucapanmu dan mengingat titik lemahmu (src/app/welcome.tsx).
3. Ukuran bisnis: membawa pengguna baru ke mock interview pertama (aktivasi), membuat dia kembali sampai hari interview (retensi), biaya AI per pengguna, dan fokus produk.
4. Data pemakaian nyata: belum ada. Di database ada 3 akun bukan akun uji, dan hanya 1 yang pernah berlatih (3 sesi free chat, 0 rapor). Jadi putusan di bawah memakai penalaran dan pola kompetitor, bukan data pemakaian. Ini perlu diuji ulang dengan pengguna sungguhan.
5. Kompetitor latihan interview (Final Round AI, Yoodli, Google Interview Warmup) berpusat pada mock interview, umpan balik per jawaban, dan pertanyaan per role. Ngobrol bebas adalah wilayah app bahasa seperti Speak dan Praktika. Sumber: https://fast.io/resources/best-ai-interview-prep-tools-2026/ dan https://otio.ai/blog/best-ai-mock-interview-tools-job-seekers (blog pihak ketiga, bukan situs resmi).

## Putusan per fitur

### Pertahankan, inti produk
1. Mock interview 5 pertanyaan per role dengan suara. Ini janji utama app.
2. Rapor interview (skor per dimensi, jawaban terkuat dan terlemah, Answer upgrade). Inilah yang dibayar orang di kompetitor.
3. Latihan ulang jawaban dan Guided application (answer_practice dan criterion_transfer). Ini lingkaran belajar: rapor, perbaiki satu jawaban, terapkan di pertanyaan baru. Tanpa ini rapor hanya angka.
4. Latihan dari lowongan. Fitur umum di kompetitor, dan sudah diuji dengan 7 lowongan nyata.
5. Tanggal interview dan hitung mundur dengan tugas harian. Pemicu kembali yang paling cocok untuk orang yang punya tenggat.
6. Ingatan pola kesalahan dan bahasa asal pengguna (dipakai di prompt AI). Ini pembeda Talkly dari app interview umum.
7. Pengingat harian (notifikasi lokal, tanpa biaya server).

### Sederhanakan
1. Free chat. Skenario Networking, Small talk, dan Client meeting adalah bahasa Inggris kerja sesudah diterima, bukan persiapan interview, dan bersaing langsung dengan app bahasa yang jauh lebih besar. Usul: tetap ada sebagai pemanasan, tapi skenarionya hanya yang dekat dengan interview (About yourself, Salary talk), atau ganti jadi latihan satu pertanyaan bebas. Biaya AI-nya sama dengan mock interview per giliran.
2. Dua layar kemajuan. Progress (dashboard) dan Practice history (trajectory) sama-sama menampilkan kemajuan. Usul: satukan jadi satu layar Progress.
3. Streak. Murah dan tidak berbiaya AI, tapi untuk orang dengan tenggat interview, hitung mundur lebih bermakna daripada rangkaian hari. Usul: tetap ada sebagai angka kecil, jangan dijadikan pusat.

### Buang
1. Weekly challenge. Sudah dimatikan di app, tapi kodenya masih ada: 1 layar, 5 rute server (backend/src/app/api/challenges), 1 tabel, dan tombol tersembunyi di Progress. Kode mati menambah beban rawat dan permukaan serangan tanpa manfaat bagi pengguna. Usul: hapus kode dan rutenya. Tabelnya dibiarkan dulu (menghapus data perlu izin terpisah).

## Yang belum pasti
Belum pasti: fitur mana yang benar-benar dipakai, karena belum ada pengguna sungguhan. Cara memastikan: 5 orang target memakai app selama seminggu, lalu hitung siapa yang menyelesaikan mock interview pertama, membuka rapor, dan kembali di hari lain.
