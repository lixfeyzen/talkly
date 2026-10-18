# Audit nilai fitur Talkly untuk bisnis (19 Oktober 2026)

Penilaian saja, belum ada fitur yang diubah atau dihapus. Lihat bagian Revisi: dua dari tiga usulan awal ditarik sesudah diuji ulang.

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

### Revisi sesudah diuji ulang (19 Oktober 2026, atas pertanyaan "apakah anda yakin 100%")
Versi pertama dokumen ini mengusulkan membuang Weekly challenge, memangkas Free chat, dan menyatukan dua layar kemajuan. Sesudah catatan proyek dan kode diperiksa ulang, dua usulan pertama kutarik:

1. Free chat dan Streak tetap. Yohanes sudah membatalkan usulan membuang keduanya pada 7 Oktober 2026, karena Home adalah rancangan yang sudah disetujui dan alasannya hanya dugaan (docs/PROJECT-NOTES.md baris 313, docs/RENCANA-VALIDASI-BISNIS.md butir 4). Hari ini tidak ada bukti baru, jadi usulan yang sama tidak diajukan lagi. Satu-satunya akun bukan uji yang pernah berlatih justru memakai Free chat (3 sesi), walau itu kemungkinan akun Yohanes sendiri.
2. Weekly challenge tetap seperti sekarang: ditunda, kode dipertahankan, sesuai keputusan yang tercatat (PROJECT-NOTES baris 391 dan 776). Alasan beban rawat dan keamanan juga ternyata lemah, karena kelima rutenya sudah dikunci di server lewat WEEKLY_CHALLENGE_ENABLED (backend/src/lib/features/v1.ts) dan app tidak bisa membukanya.
3. Yang tetap diusulkan: menyatukan Progress (dashboard.tsx) dan Practice history (trajectory.tsx) jadi satu layar. Ini sejalan dengan bedah fitur 7 Oktober yang menilai grafik tren jangka panjang tidak perlu. Karena keduanya layar yang sudah disetujui, langkah pertamanya mockup, bukan kode.

## Yang belum pasti
Belum pasti: fitur mana yang benar-benar dipakai, karena belum ada pengguna sungguhan. Cara memastikan: 5 orang target memakai app selama seminggu, lalu hitung siapa yang menyelesaikan mock interview pertama, membuka rapor, dan kembali di hari lain.
