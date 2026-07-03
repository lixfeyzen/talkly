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

## Progres

- ✅ **Fase 1 SELESAI (2026-07-03) — Scaffold.** Expo SDK 57 + TypeScript +
  Expo Router (`npx create-expo-app@latest`, template default). **Terbukti:**
  `npx tsc --noEmit` 0 error, `npm run lint` 0 error, `npx expo start --web`
  jalan & server merespons HTTP 200 di localhost:8081 (dicek via curl).
  1 bug bawaan template diperbaiki: `src/hooks/use-color-scheme.web.ts`
  melanggar rule `react-hooks/set-state-in-effect` (setState langsung di body
  effect) — diganti ke `useSyncExternalStore` (pola resmi React buat nilai yang
  beda sebelum/sesudah hydration), bukan cuma di-suppress.
- ⚠️ **Catatan git penting:** folder ini AWALNYA nggak dikasih `.git` sendiri
  oleh scaffold (ada prompt "existing Git repository" yang otomatis ke-skip
  karena non-interactive) — ternyata **seluruh drive `D:\` adalah 1 repo git**
  (`D:\.git`, tanpa remote, cuma lokal). Ini kemungkinan besar nggak disengaja
  dan mencakup file kuliah pribadi (folder "ALL ABOUT UMN") juga. Sudah
  di-mitigasi buat proyek ini dengan `git init` MANDIRI di dalam folder proyek
  (persis kayak pola Vale/gym) — repo proyek ini AMAN & terpisah dari repo D:\
  raksasa itu (git otomatis berhenti nge-track begitu ketemu `.git` bersarang).
  **Belum ditangani:** repo `D:\.git` itu sendiri masih ada, bisa jadi masalah
  kalau suatu saat ada yang nggak sengaja `git add` skala besar dari situ.
- 🟡 **Fase 2 SEBAGIAN (2026-07-03) — Backend auth.** Backend Next.js
  diletakkan di `backend/` (subfolder DALAM repo yang sama, bukan repo
  terpisah — monorepo satu proyek). Dibangun: skema Drizzle (`users`: email +
  hash password bcrypt), koneksi Neon (`neon-http`), helper JWT sign/verify
  (`backend/src/lib/auth/jwt.ts`), logika createUser/verifyCredentials
  (bcrypt), 3 endpoint (`POST /api/auth/register`, `POST /api/auth/login`,
  `GET /api/auth/me` — pola Bearer-token buat mobile, BEDA dari cookie-session
  Auth.js versi Vale). Skrip `scripts/test-auth.mts` (pola sama kayak test
  Vale) sudah ditulis tapi **BELUM dijalankan** — butuh `DATABASE_URL` dari
  project Neon baru milik user (belum dikasih ke sesi ini, sesuai instruksi
  keamanan — user isi sendiri di `.env.local`, bukan lewat chat).
  **Terbukti (tanpa DB):** `npx tsc --noEmit` 0 error project-wide, `npm run
  lint` 0 error project-wide. **Bug type di `jwt.ts`** (overload `jwt.sign`/
  `jwt.verify` nggak ke-resolve krn closure narrowing gagal) diperbaiki dengan
  eksplisit tipe `string` (bukan `string | undefined`) — bukan di-suppress.
  **BELUM diverifikasi:** `npm run build` (production build) — sempat dicoba
  tapi dibatalkan user, belum diulang. `npm run db:migrate` + `npm run
  test:auth` — BUTUH `DATABASE_URL` asli, belum bisa jalan.
- ✅ **Mobile auth screens SELESAI (2026-07-03).** `register.tsx`, `login.tsx`
  (form email+password, ke backend), `src/lib/auth/token-storage.ts` (JWT
  disimpan di keychain HP via `expo-secure-store`, BUKAN AsyncStorage biasa),
  `src/lib/api/client.ts` (fetch wrapper + Bearer token). `index.tsx` sekarang
  cek status login on-load, redirect ke `/login` kalau belum, tampilkan email +
  tombol keluar kalau sudah. Nama app dikunci **"Talkly"** (dipakai juga jadi
  nama project Neon). **Bug ditemukan & diperbaiki:** tsconfig root proyek
  mobile ikut nge-scan folder `backend/` (proyek TS terpisah) dan bikin 10
  error palsu — diperbaiki dengan `exclude: ["backend"]`.
- ✅ **Fitur AI inti SELESAI ditulis (2026-07-03) — BELUM diverifikasi
  hidup.** `lib/ai/conversation.ts`: panggilan OpenAI pakai *structured
  output* (`zodResponseFormat`, API dicek langsung ke source SDK v6.45,
  bukan tebakan) — hasil balik `{ reply, mistakes[] }` dalam SATU panggilan,
  reply = balasan roleplay dalam bahasa target, mistakes = daftar kesalahan
  terkategori. `lib/ai/mistake-categories.ts`: 9 kategori tetap (verb
  conjugation, tense, gender agreement, dst) supaya bisa diagregasi, bukan
  teks bebas. `lib/data/conversations.ts`: simpan sesi + transkrip (JSON,
  bukan tabel per-pesan — cukup buat percakapan pendek) + catat kesalahan +
  upsert statistik agregat per (user, kategori). `POST /api/conversations`:
  endpoint auth-gated yang gabungin semua ini. **Bug ditemukan & diperbaiki
  SEBELUM dicoba jalan:** `userMistakeStats` awalnya nggak punya unique
  constraint di (userId, category) padahal kode upsert-nya
  (`onConflictDoUpdate`) BUTUH itu di level database — kalau nggak
  ditambahkan, bakal error saat runtime walau tsc lolos. Ditambahkan
  `unique().on(table.userId, table.category)` di skema.
- ✅ **Hardening `/api/conversations` (2026-07-03, audit sendiri):** riwayat
  yang dikirim ke OpenAI di-cap 20 giliran terakhir (riwayat penuh tetap
  disimpan di DB) supaya biaya/latency nggak membengkak tanpa batas di sesi
  panjang; try/catch di sekitar panggilan AI (502 `ai_service_unavailable`
  kalau OpenAI down/error, bukan 500 generik).
- ✅ **Test validasi input — BENERAN DIJALANKAN, bukan cuma tsc/lint statis
  (2026-07-03).** `scripts/test-validations.mts` (`npm run
  test:validations`): 11 test buat skema register/login/conversation, NGGAK
  butuh database/API key sama sekali (murni fungsi). **Hasil nyata: 11 lulus,
  0 gagal.**
- ✅ **Layar percakapan/roleplay SELESAI (2026-07-03) — potongan besar
  terakhir yang belum ada.** `src/app/conversation.tsx`: pilih
  bahasa+skenario → chat bubble UI, koreksi kesalahan ditampilkan LANGSUNG di
  bawah pesan user yang salah, indikator "AI sedang mengetik", pesan error
  kalau AI service down. `src/lib/conversations/api.ts`: client buat
  `POST /api/conversations`. Tombol "Mulai latihan" di halaman utama. **Ini
  melengkapi alur produk end-to-end secara KODE** (daftar → login → pilih
  skenario → latihan → lihat koreksi) — tapi alur ini SENDIRI belum pernah
  dicoba jalan beneran.
- ⏳ **BLOCKER GANDA** sebelum verifikasi hidup: (1) `DATABASE_URL` (Neon
  project "Talkly" — user konfirmasi sudah dibuat, belum dikonfirmasi
  filenya sudah diisi), (2) `OPENAI_API_KEY` (platform.openai.com/api-keys,
  berbayar). Dua-duanya tinggal ditempel ke `backend/.env.local` (sudah
  disiapkan filenya + `JWT_SECRET` auto-generate).
- **Koreksi jujur soal status fitur MVP — JANGAN overclaim:** dari 5 fitur
  MVP yang dikunci, **cuma #1 (roleplay) & #2 (pelacakan kesalahan) yang
  BENERAN selesai** (fondasi data + UI-nya ada). **#3 (skenario adaptif),
  #4 (streak+notifikasi), #5 (dashboard progres) BELUM dibangun sama
  sekali** — baru fondasi datanya ada (`user_mistake_stats`), tapi belum
  ada LOGIKA milih skenario berdasar kelemahan, belum ada notifikasi Expo,
  belum ada layar dashboard. Sempat salah tulis "5/5 selesai" di catatan
  ini sebelumnya — itu KELIRU, sudah diperbaiki di sini.

## Next step (arah ke depan)

Begitu `DATABASE_URL` + `OPENAI_API_KEY` terisi: jalankan migrasi
(`db:migrate`) + `test:auth` + `test:validations` ulang buat pastikan semua
tetap hijau + tes manual alur penuh (daftar → login → ngobrol → cek koreksi
tersimpan). Setelah itu baru masuk fase polish: aksi notifikasi (Expo
Notifications, streak harian), dashboard progres (agregat dari
`user_mistake_stats`), lalu demo/deploy.
