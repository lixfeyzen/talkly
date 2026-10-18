# Rancangan: latihan mock interview dari lowongan yang ditempel (19 Oktober 2026)

Rancangan saja, belum ada kode yang diubah.

## Siapa dan untuk apa
Pengguna: profesional non-penutur asli yang sudah punya lowongan yang dilamar. Hasil yang dia mau: berlatih menjawab pertanyaan yang kemungkinan besar keluar untuk lowongan itu, dalam bahasa Inggris, dengan koreksi dan rapor seperti mock interview biasa.

Selesai berarti: pengguna menempel teks lowongan nyata, dalam kurang dari 10 detik melihat 3 pertanyaan yang jelas berhubungan dengan lowongan itu, lalu menjalani mock interview 5 pertanyaan sampai rapor, tanpa ada yang rusak di mock interview biasa.

## Cara kerja sekarang (dibaca dari kode)
Mock interview selalu 5 pertanyaan dari bank yang dikurasi (backend/src/lib/ai/interview.ts): pembuka Tell me about yourself, 2 pertanyaan perilaku dari 12 pilihan, 1 pertanyaan khusus role dari 4 pilihan, dan penutup Why should we hire you. Pilihan dikunci per sesi lewat sessionId. AI hanya memparafrasekan, tidak mengarang pertanyaan, supaya mutunya konsisten.

## Rancangan
1. Kerangka 5 pertanyaan tetap. Pembuka dan penutup tetap dari bank. 3 pertanyaan di tengah diganti pertanyaan dari lowongan. Penghitung jawaban, rapor, dan alur selesai tidak berubah.
2. Satu panggilan AI saat pengguna menekan Build my interview: lowongan masuk, keluar maksimal 3 pertanyaan (format terstruktur seperti fitur koreksi yang sudah ada), ditambah 3 sampai 5 kebutuhan utama lowongan untuk ditampilkan.
3. Pertanyaan disimpan di sesi (kolom baru di conversation_sessions), bukan dibuat ulang tiap giliran, supaya stabil dan hanya membayar AI sekali.
4. Layar: di Mock interview ada pilihan baru Practice for a specific job. Isinya kotak tempel lowongan, tombol Build my interview, lalu pratinjau 3 pertanyaan dan kebutuhan utama, lalu Start interview. Role tetap dipilih supaya pertanyaan penutup dan rapor punya konteks.

## Pengaman
1. Teks lowongan adalah data dari pengguna, bukan perintah. Pakai pola yang sudah ada di conversation.ts (teks bebas ditandai sebagai DATA dan perintah di dalamnya diabaikan).
2. Batas panjang lowongan 6.000 huruf. Hanya tempel teks, tidak mengambil dari tautan (menghindari server mengunduh halaman orang lain).
3. Pertanyaan hasil AI dicek: maksimal 3, masing-masing di bawah 200 huruf dan berbentuk pertanyaan. Kalau gagal, jatuh ke bank pertanyaan biasa dan pengguna diberi tahu.
4. Kuota: panggilan pembuatan pertanyaan memakai batas percobaan yang sama dengan percakapan AI.

## Yang sengaja tidak dibangun dulu
1. Unggah CV. Menambah privasi, penyimpanan berkas, dan biaya. Bisa jadi tahap 2.
2. Ambil lowongan dari tautan.
3. Riset perusahaan otomatis.

## Cara menguji
1. Tes otomatis untuk validasi keluaran AI dan jalur cadangan.
2. 10 lowongan nyata dari berbagai role: pertanyaan dinilai relevan atau tidak.
3. Lowongan berisi perintah jahat (misalnya abaikan instruksi sebelumnya): perilaku interviewer tidak berubah.
4. Mock interview biasa tetap lulus tes interview yang sudah ada (test:interview).

## Perkiraan berkas yang disentuh
Backend: lib/ai/interview.ts (sumber pertanyaan), route baru untuk membuat pertanyaan, skema dan migrasi satu kolom, tes baru. App: layar interview.tsx (pilihan baru), satu layar tempel lowongan, klien API.
