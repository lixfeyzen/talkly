# PROJECT NOTES — AI Language Practice Partner (AKTIF, dikunci 2026-07-03)

> Status: **DIKUNCI, siap masuk fase development.** Nama folder SEMENTARA —
> bebas diganti nanti (jangan biarkan nama memblok build).
> Konteks lengkap & perbandingan ide lain: `D:\projek\portfolio-idea-research\IDEA-TIERS.md`.
> Ide sebelumnya (expense-tracker) disimpan di `D:\projek\subscription-ai-mobile\`.

## Bukti pasar (Tier S — fresh-verified 2026-07-03)

**Duolingo** (NASDAQ: DUOL, perusahaan publik) — data resmi SEC filing Q1 2026:
- Revenue **$292 juta/kuartal** (naik 27% YoY)
- **12,5 juta subscriber berbayar** (naik 21% YoY)
- Net income **$43,5 juta** — profitable, bukan cuma revenue gede
- Ini bukti kelas audit tertinggi yang mungkin ada buat kategori app konsumen —
  langsung dari filing resmi perusahaan publik, bukan estimasi blog.

## Target user

Pembelajar bahasa dewasa yang **SUDAH lewat tahap dasar** (sudah beberapa bulan
pakai Duolingo/kelas/buku, tahu grammar & vocab dasar) tapi **freeze/panik pas
harus beneran ngobrol** — mau kerja/pindah ke luar negeri, ketemu keluarga
pasangan, atau traveling. BUKAN "siapa aja yang mau belajar bahasa" (itu pasar
Duolingo) — spesifik orang yang sudah punya "pengetahuan buku" tapi belum punya
"refleks ngobrol".

## Problem yang diselesaikan

Orang belajar grammar & vocab berbulan-bulan pakai app kayak Duolingo, tapi
begitu dihadapkan percakapan NYATA mereka nge-blank. Drilling pasif (pilih
jawaban dari 4 opsi) beda kemampuan sama nyusun kalimat SENDIRI real-time di
bawah sedikit tekanan sosial. Nggak ada cara aman & murah buat latihan BENERAN
sebelum ketemu orang sungguhan — tutor manusia mahal & harus dijadwalkan,
partner tukar bahasa ribet koordinasi + ada rasa malu kalau salah.

**Kenapa AI:** selalu ada, sabar tanpa batas, nggak menghakimi, DAN bisa didesain
inget pola kesalahan spesifik & atur latihan berikutnya sekitar itu — sesuatu
yang partner manusia acak nggak lakuin secara sistematis.

**Kenapa orang mau bayar TERUS-MENERUS:** belajar bahasa itu perjalanan
berbulan-bulan, nilai app-nya NAIK makin lama dipakai (makin banyak sesi, makin
akurat AI ngerti pola lemahmu, makin personal skenarionya) — alasan ekonomi yang
sama kenapa model subscription Duolingo sendiri berhasil.

## Batasan jujur (JANGAN overclaim)

MVP ini fokus ke **kefasihan menyusun kalimat real-time** (reflex berpikir &
merangkai bahasa dalam teks), BUKAN pelafalan/kepercayaan diri ngomong pakai
suara — itu baru masuk kalau mode suara (fitur stretch #6) ditambah nanti.

## Fitur MVP (5 core, tiap satu lolos test "bukan cuma chat GPT")

1. **Roleplay skenario nyata** — pilih skenario (pesan kopi, interview kerja,
   tanya arah, ngobrol basa-basi), AI jadi karakter, ngobrol natural. Fondasi —
   diperkuat fitur 2-3, bukan berdiri sendiri.
2. **Pelacakan pola kesalahan PERSISTEN** *(pembeda utama)* — tiap AI koreksi
   kesalahan, dicatat jenisnya spesifik (konjugasi kata kerja, gender kata benda,
   preposisi, dst) ke profil user, terakumulasi lintas sesi. ChatGPT biasa nggak
   inget ini dari chat minggu lalu — di sini datanya nempel permanen.
3. **Skenario adaptif** — AI generate skenario berikutnya sengaja diarahkan buat
   maksa pakai pola yang masih lemah (butuh data dari fitur 2, logika software
   asli bukan satu prompt sekali jalan).
4. **Streak harian + notifikasi ASLI di HP** — reminder nyata via Expo
   Notifications, muncul walau app belum dibuka.
5. **Dashboard progres / "skor kepercayaan diri" dari waktu ke waktu** —
   lintasan perbaikan konkret ("3 minggu lalu 60% kalimatmu salah past tense,
   sekarang 20%"). Butuh riwayat data terstruktur, bukan satu jawaban sekali chat.

## Fitur stretch (V2 — JANGAN dikerjakan sebelum 5 core jalan)

6. Mode suara (STT/TTS) — sengaja ditunda dari MVP sesuai preferensi user
   "cukup GPT teks dulu".
7. Skenario tantangan mingguan (lebih susah, unlock tiap minggu).

## Stack teknis (konsisten dengan keputusan proyek mobile sebelumnya)

- **Frontend:** React Native + Expo
- **Backend:** Next.js API + Drizzle + Neon Postgres (pola SAMA kayak proyek
  "Vale" yang sudah terbukti jalan)
- **AI:** OpenAI GPT via backend (JANGAN panggil API key langsung dari app
  mobile — bisa dicuri dari file aplikasinya)
- **Notifikasi:** Expo Notifications API (reminder streak harian)
- **Auth:** JWT-based (beda dari pola Auth.js cookie-session versi web Vale)

## Kenapa ini dipilih dibanding ide expense-tracker yang disimpan

Cuma butuh 1 API luar (OpenAI) — nggak ada Plaid, nggak ada data finansial,
nggak ada isu keamanan finansial tingkat tinggi. Data model lebih simpel
(riwayat chat + catatan progres, bukan data transaksi). Level kesulitan: EASY,
cocok buat proyek mobile PERTAMA sebelum balik ke ide expense-tracker sebagai
proyek kedua.

## Next step

Definisi produk & fitur SUDAH DIKUNCI. Tinggal susun fase development (mirror
pola: scaffold → auth → data model → integrasi AI → aksi notifikasi →
polish/demo) — belum dimulai, tunggu konfirmasi "go" dari user.
