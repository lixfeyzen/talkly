# Temuan login, register, lupa password (18 Oktober 2026)

Pemeriksaan saja, belum ada kode yang diubah. Diuji di backend lokal (port 3001, database Neon dari backend/.env.local) dan di web Expo (port 8082) dengan ukuran layar HP.

## Status (diperbarui 18 Oktober 2026, sesudah perbaikan)
Poin 2 sampai 5 sudah diperbaiki dan diuji. Poin 1: email reset terkirim dengan Resend, tetapi hanya ke email akun Resend sendiri sampai domain pengirim diverifikasi (batasan Resend). Poin 6 (login 9 detik) belum terulang dan belum diselidiki.

## Yang sudah jalan
- Register lewat layar berhasil, lalu masuk ke onboarding.
- Login dengan password benar berhasil. Password salah memunculkan pesan Wrong email or password.
- Email tidak peka huruf besar dan spasi di awal atau akhir. Email yang sudah dipakai ditolak dengan pesan yang jelas.
- Password kurang dari 8 huruf ditolak. Kode reset yang salah ditolak.

## Yang belum sempurna (urut dari yang paling terasa)
1. Lupa password tidak mengirim email. RESEND_API_KEY tidak ada di backend/.env.local, jadi kodenya hanya muncul di log server ([DEV EMAIL FALLBACK]). Pengguna tidak pernah menerima kodenya. Di produksi (NODE_ENV=production) tanpa kunci itu, pengiriman gagal diam-diam dan layar tetap bilang kode terkirim (backend/src/lib/email/send-reset-code.ts, backend/src/app/api/auth/forgot-password/route.ts).
   Usulan: pasang RESEND_API_KEY dan EMAIL_FROM. Selama belum ada, tampilkan di layar bahwa reset lewat email belum tersedia.
2. Tombol Enter tidak mengirim form. Di login dan register, menekan Enter atau tombol Go di keyboard HP tidak melakukan apa-apa (tidak ada onSubmitEditing di src/app/login.tsx dan src/app/register.tsx).
   Usulan: Enter di kolom password menjalankan handleSubmit, dan Enter di kolom email pindah ke kolom password.
3. Kena batas percobaan, pesannya membingungkan. Backend membalas 429 rate_limited, tetapi layar hanya bilang Sign-in failed, try again atau Sign-up failed, try again. Batas register (5 per menit, 20 per hari per IP) juga ikut terhitung untuk percobaan yang salah ketik, karena kuota diambil sebelum input diperiksa (backend/src/app/api/auth/register/route.ts).
   Usulan: tangani 429 di layar dengan pesan coba lagi dalam N detik (pakai retryAfterSec), dan ambil kuota register sesudah input lolos validasi.
4. Cek login saat aplikasi dibuka menganggap semua error sebagai belum login. fetchCurrentUser mengembalikan null untuk error jaringan dan error server juga (src/lib/auth/api.ts), jadi pengguna yang sudah login dilempar ke layar login saat server lambat atau sinyal putus (src/app/index.tsx, src/app/settings.tsx).
   Usulan: hanya 401 yang berarti ke login. Error lain menampilkan tidak bisa terhubung beserta tombol coba lagi.
5. Password berisi 8 spasi diterima saat register (backend/src/lib/validations/auth.ts). Register juga tidak punya kolom ulangi password, jadi salah ketik membuat akun tidak bisa dibuka lagi. Ini terasa sekali karena lupa password belum bisa mengirim email (poin 1).
   Usulan: tolak password yang isinya hanya spasi, dan tambahkan kolom ulangi password atau andalkan tombol mata yang sudah ada.
6. Satu kali login salah butuh 9 detik dengan tombol terus berputar (log server: POST /api/auth/login 401 in 9.0s). Percobaan lain hanya 0,2 sampai 0,6 detik.
   Belum pasti: penyebabnya, dugaannya koneksi database Neon yang bangun dari tidur. Cara memastikan: ukur login pertama sesudah server diam lebih dari 5 menit.

## Catatan kecil
- Tombol Sign in dan Create account terbaca sebagai elemen biasa, bukan tombol, bagi pembaca layar (aksesibilitas).
- Akun uji yang tercipta di database selama pemeriksaan ini: authcheck-1792333129@example.com, yauthcheck-1792333129@example.com, uiauthcheck-1@example.com. Belum dihapus. Skrip npm run cleanup:test-users menghapus SEMUA akun @example.com, termasuk akun QA lain kalau ada.
