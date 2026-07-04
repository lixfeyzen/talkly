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

## ✅ VERIFIKASI LIVE PERTAMA (2026-07-03) — auth beneran hidup

Kredensial diisi user. Ketemu & diperbaiki 1 bug nyata:
**`import "dotenv/config"` cuma baca file bernama persis `.env`, BUKAN
`.env.local`** — dan taruh `dotenv` config SETELAH import lain di file yang
sama juga nggak nolong, karena import ES module di-hoist ke atas SEBELUM
kode lain jalan. Diperbaiki pakai flag native `tsx --env-file=.env.local`.

**Hasil verifikasi nyata terhadap database & AI beneran:**
- `db:migrate` — 4 tabel berhasil dibuat di Neon
- `test:auth` — **8/8 lulus** terhadap database live
- Tes manual `POST /api/auth/register` via curl — user asli dibuat, token asli diterima
- Tes manual `POST /api/conversations` via curl — request BERHASIL sampai ke
  OpenAI, gagal dengan error `429 insufficient_quota` (akun belum ada saldo)
  — **ini bagus**: error-nya ketangkep rapi jadi `ai_service_unavailable`
  sesuai desain, bukan crash. Artinya KODE integrasinya BENAR, tinggal
  **user perlu tambah saldo/billing di platform.openai.com** buat lanjut.

## ✅ 3 bug lagi ketemu & diperbaiki (2026-07-03, saat coba screenshot app-nya)

1. **CORS** — Next.js API routes nggak kirim header CORS secara default.
   Native iOS/Android nggak kena masalah ini, tapi target WEB kena. Ditambah
   `backend/proxy.ts`. Auth pakai Bearer-token (bukan cookie), jadi origin
   permisif aman di sini — risiko "jangan pakai * dengan credentials" itu
   spesifik ke cookie.
2. **`expo-secure-store` nggak ada implementasi WEB beneran** (modul web-nya
   cuma objek kosong) — manggil ini di web bikin HANG DIAM-DIAM (bukan error),
   bikin proses cek-login-saat-app-dibuka nyangkut selamanya tanpa pesan
   error apa pun. `token-storage.ts` sekarang pakai `localStorage` di web,
   keychain asli di native — pola standar Expo buat ini.
3. **Arsitektur navigasi:** `login`/`register`/`conversation` awalnya jadi
   route SEJAJAR sama `index`/`explore` di bawah layout `Tabs+TabSlot` yang
   didesain buat SET TAB TETAP. Di web, ini bikin pindah ke `/login` tetap
   nunjukkin isi tab Home — URL berubah tapi layarnya nggak. Direstruktur
   jadi route group `(tabs)` (index+explore, layout sendiri) + root layout
   ganti ke `Stack` yang nampilin login/register/conversation full-screen DI
   LUAR tab bar — ini juga desain produk yang benar (nggak masuk akal ada tab
   bar Home/Explore muncul pas lagi di layar login).

## ✅ Poles UI + bersih-bersih struktural (2026-07-03)

User kasih feedback jujur: tampilannya belum kerasa "production ready".
Dicek, benar — dan akar masalahnya BUKAN cuma soal warna:

- **Tab "Explore" itu konten scaffold Expo default 100% tidak tersentuh**
  (link dokumentasi generik) — nggak ada hubungannya sama Talkly, tapi
  kelihatan di nav bar tiap user. DIHAPUS total, bareng seluruh sistem
  Tabs+TabSlot (`app-tabs.tsx` dkk) yang memang didesain buat 2-tab demo
  yang produknya sendiri nggak butuh. Root layout sekarang `Stack` polos.
- Rebrand: `app.json` name → "Talkly" (masih "ai-language-practice-mobile"
  sebelumnya), wordmark "TALKLY" di layar auth.
- 1 warna aksen (coral `#FF6B4F`) dipakai KONSISTEN buat semua aksi utama
  (tombol submit, chip skenario/bahasa terpilih, bubble chat user) —
  bukan asal ganti-ganti warna, satu warna konsisten baru kerasa "didesain".
- Input form pakai background terisi (bukan cuma border tipis default).

**Batasan jujur yang BELUM diperbaiki:** splash screen native masih pakai
logo Expo (`expo-logo.png`) — ganti ini butuh aset logo/ikon asli, perlu
didesain dulu atau user yang sediakan, bukan sesuatu yang bisa kubuat
sendiri dari kode doang.

**Verifikasi visual app-nya SENDIRI masih belum bisa kulakukan** — koneksi
ekstensi browser otomatisku terputus & belum konek lagi (di luar
kendaliku). Server backend (`:3001`) & Expo web (`:8081`) tetap hidup.

## ✅ Dashboard progres (fitur #5) SELESAI + terverifikasi live (2026-07-03)

Dikerjakan bertahap (opsi A user: bangun dari data yang sudah ada dulu,
grafik-tren-lintas-waktu ditunda ke V2 karena butuh skema per-waktu).
- Backend: `lib/data/dashboard.ts` (top-5 kelemahan dari `user_mistake_stats`,
  hitung sesi/koreksi, terakhir latihan, 5 koreksi terbaru — semua ber-scope
  `userId`), `GET /api/dashboard` (auth-gated, 401 tanpa token).
- **`test-dashboard.mts`: 13/13 lulus terhadap DB live** — agregasi benar,
  ISOLASI antar-user (A tak lihat data B), EMPTY-STATE (user baru → nol, bukan
  crash). Endpoint juga dites via curl: empty-state JSON benar + 401 tanpa auth.
- Mobile: `src/app/dashboard.tsx` (stat tiles, daftar kelemahan + badge jumlah,
  koreksi terbaru original→corrected, empty-state rapi), tombol "Lihat
  progresku" di home.
- Housekeeping: `cleanup-test-users.mts` + `npm run cleanup:test-users` buat
  hapus user throwaway hasil tes manual (biar DB nggak numpuk sampah).

**Status fitur MVP: 3/5 selesai** (#1 roleplay, #2 pelacakan kesalahan, #5
dashboard). Sisa: #3 skenario adaptif, #4 streak+notifikasi.

## ✅ BUG NYATA diperbaiki (2026-07-03): daftar dari browser gagal krn CORS

User lapor "masih nggak bisa daftar akun". Didiagnosa lewat curl (bukan
nebak): web app (`:8081`) panggil API (`:3001`) beda-origin → browser kirim
CORS preflight tiap POST. **Middleware `proxy.ts` yang harusnya jawab itu
TIDAK PERNAH jalan** — Next 16 + Turbopack dev mengompilasi `proxy.ts` jadi
`middleware.js` TAPI `middleware-manifest.json` KOSONG, jadi nggak ada
request yang kena. Terkonfirmasi: GET biasa pun 0 header `Access-Control-*`.
Nama/lokasi/signature file SUDAH sesuai dokumen Next 16 (dicek via context7)
— ini celah registrasi Turbopack-dev, bukan salah config. **KOREKSI catatan
lama: klaim "proxy.ts beresin CORS" (2026-07-03 awal) itu SALAH — nggak
pernah jalan.**

**Fix:** CORS ditangani per-route via helper `lib/http/cors.ts`
(`jsonCors` + `corsPreflight`, tiap route ekspor `OPTIONS`) — jalan di dev
DAN produksi, nggak gantung ke bundler. `proxy.ts` dihapus (mati).
**Terverifikasi live via curl (Origin browser):** preflight 204 + header
CORS; POST daftar cross-origin 201 + header; alur penuh daftar→login→me→
dashboard semua bawa header CORS.

## ✅ ONE-SHOT tanpa saldo OpenAI (2026-07-03): fitur #4 & #3 SELESAI — MVP 5/5 code-complete

Dikerjakan satu sesi atas mandat "go" user (plan: kerjakan semua yang tidak
butuh OpenAI; yang butuh cuma tersisa 1 pass verifikasi saat saldo masuk).

**Fitur #4 — Streak harian + notifikasi (commit `d09d39c`):**
- Tabel `user_streaks` (per-hari kalender **UTC** — timezone per-user = V2;
  `longest_streak` terjaga saat reset). Migrasi 0001 applied ke Neon.
- `recordPractice()` dipanggil tiap giliran `/api/conversations` sukses
  (idempoten per-hari); streak ikut di respons conversations & `/api/dashboard`.
- **`test:streak` 15/15 lulus lawan Neon live** (naik/tetap/reset/bolong/
  longest/isolasi antar-user; tanggal disimulasi via param `now`).
- Mobile: badge 🔥 di home, tile streak di dashboard, toggle reminder harian
  19:00 via `expo-notifications` (native only — **web disembunyikan**, modul
  tak didukung web; bukti notifikasi muncul = butuh HP/emulator, belum dicek).

**Fitur #3 — Skenario adaptif (commit setelahnya):**
- `suggestScenario()` = fungsi MURNI (tanpa DB/AI): stats → 1-2 kategori
  terlemah → skenario yang memaksa pola itu + alasan. 9 kategori terpetakan.
- `GET /api/scenarios/suggested` (auth-gated; user baru → `{suggestion:null}`).
- `focus_categories` disimpan DI SESI (migrasi 0002) — sesi lanjutan pakai
  fokus tersimpan, bukan kiriman client; injeksi ke system prompt hanya
  menambah 1 instruksi "arahkan percakapan secara halus".
- **`test:adaptive` 15/15 lulus** (9 unit murni + 6 live: urutan by count,
  isolasi, persist di sesi, empty-state).
- Mobile: kartu "🎯 Latihan terarah buatmu" di home (scenario+focus via route
  params → conversation), chip skenario adaptif muncul di layar pilih.
- Alat dev: `npm run dev:seed-stats -- <email>` (seed kelemahan buat uji
  manual latihan terarah tanpa saldo OpenAI).

**Verifikasi one-shot (semua output nyata, 2026-07-03):**
- tsc + eslint 0 error di KEDUA proyek.
- Semua suite lawan Neon live: validations 11 + auth 8 + dashboard 13 +
  streak 15 + adaptive 15 = **62/62 lulus**.
- Endpoint live via curl (server :3001): register 201 → suggested user baru
  `{suggestion:null}` → tanpa auth 401 → dashboard ber-field streak →
  setelah seed kelemahan: suggested balikin skenario preposisi+word_order
  dengan reason ber-angka, header CORS lengkap. User test dibersihkan.
- **BELUM terverifikasi (jujur):** percakapan AI end-to-end (tetap butuh
  saldo OpenAI — kini SATU-SATUNYA utang bukti); notifikasi muncul di HP
  fisik/emulator; tampilan visual layar baru (badge/kartu/tile) belum
  di-screenshot.

## ✅ AKAR daftar/login "selalu bermasalah" KETEMU & FIX + forgot-password (2026-07-03, commit `c978d21`)

**Akar masalah register/login dari app:** `src/lib/api/client.ts` default ke
`http://localhost:3000` padahal backend di **3001** — request dari app TIDAK
PERNAH sampai server (verifikasi curl sebelumnya lolos karena langsung ke
3001, bukan lewat app). Fix: default → 3001 (override `EXPO_PUBLIC_API_URL`
tetap ada). Plus: timeout request (AbortController manual — `AbortSignal.timeout`
tak dijamin ada di Hermes), `NetworkError` kelas terpisah → layar auth kini
bilang "Tidak bisa terhubung ke server" (bukan pesan generik menyesatkan);
panggilan AI diberi timeout 60 dtk.

**Forgot password end-to-end (aman):** tabel `password_reset_codes` (migrasi
0003) — yang disimpan HANYA sha256 hash kode; kode 6 digit dari `crypto.randomInt`
(CSPRNG); kedaluwarsa 15 mnt; single-use; **kunci brute-force 5 percobaan
(dihitung DI DB**, tahan restart); cooldown kirim-ulang 60 dtk; respons
forgot-password SELALU `{ok:true}` & reset gagal selalu `invalid_or_expired`
(anti email-enumeration / info-leak). Email via **Resend** kalau
`RESEND_API_KEY` di-set (+`EMAIL_FROM`); tanpa itu = **DEV fallback: kode
dicetak ke console server berlabel jelas** (bisa uji alur tanpa akun email).
Mobile: layar `/forgot-password` 2 langkah (email → kode+password baru), link
"Lupa password?" + banner sukses di login.

**Bug ditemukan test & diperbaiki:** cooldown membandingkan `now` app dengan
`createdAt` versi jam server DB (defaultNow) → clock skew bikin salah;
`createdAt` kini ditulis eksplisit dari jam yang sama.

**Bukti (2026-07-03):** `test:reset` **15/15 lawan Neon live** (anti-enum,
hash-at-rest, cooldown, brute-force lock, single-use, expiry, pw lama ditolak/
baru diterima). Total suite kini **77/77**. E2E HTTP nyata: register 201 →
forgot `{ok:true}` (identik utk email hantu) → kode dari dev-fallback → kode
salah 400 → benar 200 → login pw lama 401 / baru 200 → reuse 400. Bundle web
Metro diperiksa: hanya berisi `localhost:3001`. **Belum:** kirim email
sungguhan (butuh RESEND_API_KEY user), tampilan visual layar forgot-password.

## ✅ Redesign layar auth (2026-07-03, commit `99c3828`) + bukti daftar via UI

Gaya baru dari referensi user: **hero gelap + titik pastel melayang + bubble
sapaan beda bahasa (pengganti karakter 3D referensi — tak bisa dibuat dari
kode) + sheet putih membulat + tombol pill hitam**. Komponen bersama
`src/components/auth/auth-layout.tsx` (AuthLayout/AuthInput/AuthPasswordInput/
AuthButton, palet TETAP — sengaja tak ikut dark/light theme). 3 layar
(login/register/forgot) pindah ke layout ini, logika tak berubah;
PasswordInput lama dihapus (yatim). **Terverifikasi VISUAL via browser** (3
layar dirender benar, sheet sampai dasar — band hitam di screenshot pertama
= artefak capture) dan **register E2E LEWAT UI ASLI: akun dibuat → redirect
home login** (bukti final fix akar port 3000→3001). Catatan: (1) home/
dashboard/conversation masih gaya lama — belum diselaraskan ke bahasa desain
baru; (2) quirk web: Chrome autofill mengisi field tanpa mengisi state React
→ tombol tetap disabled sampai user mengetik (perilaku Android native beda);
(3) user menyebut tujuan baru: dipakai rekruiter + **bibit startup**.

## ✅ Onboarding bahasa native (2026-07-03, commit `a606c7e`) — inti produk global-ready

Keputusan produk: yang ditanya **bahasa sehari-hari**, BUKAN negara asal
(negara = proxy yang bisa salah + data pribadi tak terpakai). Ditaruh sebagai
**onboarding satu layar SETELAH daftar** (bukan field di form register —
jaga conversion signup 2-field), gerbang di `index.tsx` saat `nativeLanguage`
null; bisa diubah nanti via endpoint yang sama (layar pengaturan belum ada).
- Backend: `users.native_language` (migrasi 0004), `POST /api/profile`
  (allowlist 10 bahasa — nilai TIDAK pernah teks bebas masuk prompt),
  `/api/auth/me` kini baca DB (+401 kalau user sudah dihapus).
- AI: prompt tahu bahasa native (pola kesalahan khas penutur X) + field
  **`note`** baru per-koreksi — penjelasan 1 kalimat DALAM BAHASA USER,
  tampil di bawah koreksi di chat (`conversation.tsx`); transkrip lama tanpa
  note tetap kompatibel (optional).
- **Bukti:** validations 14/14; HTTP E2E (me null → set Spanish → me
  Spanish → Klingon 400 → tanpa token 401); alur UI penuh daftar →
  onboarding → pilih bahasa → home (screenshot; akun uji dibersihkan).
- **Belum:** kualitas isi `note` dari AI beneran (butuh saldo OpenAI); i18n
  UI penuh SENGAJA ditunda sampai ada user non-Indonesia.

## ✅ KEPUTUSAN MARKET + English-first UI (2026-07-03, commit `96712f4`)

**Target market DIKUNCI user (founder):** non-native professionals & job
seekers global (level menengah B1-B2, ~20-35 th; Indonesia/India/Vietnam/
Brazil dst) yang menyiapkan **interview kerja & percakapan kantor dalam
bahasa Inggris**. Positioning: *"AI practice partner for English job
interviews — it remembers your weak spots."* UI English = lingua franca
segmen ini (mereka post-beginner, bisa baca English); pembeda = koreksi
dijelaskan dalam BAHASA NATIVE masing-masing (field note). BUKAN menyasar
penutur asli Inggris.
- Semua string UI mobile → English (84+ replacement: auth/home/onboarding/
  dashboard/conversation/notifikasi/label kategori/a11y).
- Skenario chips di-retarget karier: Job interview · Small talk with a
  colleague · Order a coffee · Ask for directions.
- Skenario adaptif + reason + system prompt AI → English; fallback bahasa
  native prompt Indonesian → **English**.
- Bukti: 80/80 test hijau (validations 14/adaptive 15/streak 15/reset 15/
  dashboard 13/auth 8), login English diverifikasi visual di browser.
- Catatan: komentar kode masih Indonesia (internal, tak berdampak user).

## ✅ Audit market-fit fitur (2026-07-03, commit `a8a69a5`)

Cross-check semua fitur vs ICP terkunci. **3 kontradiksi dibuang:**
(1) picker bahasa target Spanish/French/Japanese DIHAPUS dari UI —
`TARGET_LANGUAGE='English'` (kolom DB `target_language` TETAP; ekspansi
multi-bahasa nanti = hidupkan lagi picker); (2) skenario turis (pesan kopi,
tanya arah) → set karier: Job interview · Tell me about yourself · Salary
negotiation · Small talk with a colleague · Client meeting Q&A · Networking
event; (3) peta skenario adaptif di-rekontekstualisasi ke situasi kerja
(pola grammar tetap dipaksa — mis. tense = "last project vs next role").
Minor: bubble auth Hola/Bonjour → frasa kerja English; judul register →
"Ace your next English interview!". **Tetap (selaras):** mistake tracking,
dashboard, streak+reminder, onboarding bahasa native; kategori
`gender_agreement` dibiarkan (tak merusak, jarang kepilih utk English).
Bukti: 80/80 suite hijau + register & scenario picker diverifikasi visual.

## ✅ Audit fitur #5 + fix presisi + layar Settings (2026-07-03, `57e63d8` + `77889bd`)

Audit teliti dashboard: data layer & layar SOLID (13/13, selalu fresh saat
dibuka krn di-push→remount), TAPI ketemu & FIX 2 cacat: (1) "Last practiced"
dihitung jendela 24-jam, kini HARI KALENDER lokal; (2) badge streak + kartu
saran di HOME basi setelah latihan (home tak remount saat back) → kini
refresh tiap fokus via `useFocusEffect`. +2 error lint `no-unescaped-entities`
yang sebelumnya TERSEMBUNYI karena output lint di-`tail` (pelajaran: jangan
truncate output verifikasi). **Gap visi #5 tetap V2 sadar:** dashboard =
akumulasi kelemahan, belum lintasan perbaikan lintas-waktu (butuh skema
per-window). **Layar Settings SELESAI+terverifikasi** (`/settings`): ganti
bahasa native (tap chip → optimistic+rollback, bukti DB: me balikin nilai
baru), Change password → alur kode-email yang sudah teruji (tanpa endpoint
baru), Log out pindah ke sini (home → link Settings). CATATAN OPS: IP LAN
BERUBAH saat ganti Wi-Fi (192.168.0.110→192.168.40.229) — sempat bikin
redirect-login palsu (bundle nembak IP lama); kalau app "can't reach server",
cek `ipconfig` dulu.

## ✅ FITUR #6 "Interview Readiness" SELESAI (2026-07-03, `1fce713` + `acfbe02`)

Keputusan founder: MVP kurang "dominan" → tambah fitur yang menjawab pain
inti ICP: **"Am I ready?"** Mock interview 5 pertanyaan + Readiness Report.
- **Backend:** `mode`/`interview_role` di sessions + tabel `interview_reports`
  (migrasi 0005). Bank pertanyaan TERKURASI per-role (6 role; opener + 2
  behavioral + 1 role-specific + closer), pemilihan deterministik per
  sessionId (stabil antar-giliran). Prompt interviewer: bereaksi + tanya
  berikutnya, TANPA koreksi saat interview (realisme) — kesalahan tetap
  tercatat diam-diam ke pipeline pelacak kelemahan. `POST/GET
  /api/interviews/[sessionId]/report`: rapor terstruktur (skor 0-100, 3
  dimensi, jawaban terkuat/terlemah, top fixes dlm bahasa native, answer
  upgrades STAR dlm English) — **idempoten** (rapor ada → tak panggil AI lagi).
- **Mobile:** `/interview` (role picker) → conversation mode interview
  (intro+opener client-side tanpa AI, header Question x/5, koreksi live
  disembunyikan, selesai → tombol rapor) → `/interview-report` (skor, bar
  dimensi, fixes, original-vs-upgraded). Dashboard: kartu "Latest interview
  readiness" → rapor. Bonus: label "Kirim" yang lolos English-ifikasi → "Send".
- **Bukti:** `test:interview` **22/22** lawan Neon (determinisme bank soal,
  progress, prompt, roundtrip/replace/isolasi rapor, dashboard); 6 guard
  HTTP live: 409 finished / 400 unfinished / 400 non-interview / 404 / 502-
  sampai-OpenAI / 401; VISUAL: layar start, mode interview (bubble intro +
  Q1/5 + jawaban terkirim + 502 rapi), layar rapor render penuh dari data DB
  (68/100), kartu dashboard. Suite total **102/102**. Catatan dev: route
  dinamis baru saat `next dev` jalan → crash "Jest worker" → restart server.
- **Utang bukti sama:** percakapan interview + kualitas rapor AI asli
  menunggu saldo OpenAI. Alat dev: `npm run dev:seed-interview -- <email>`.

## ✅ Redesign "Coursely" seluruh app (2026-07-03, `d02687d`)

User beri referensi UI kit Coursely (LMS) → diadopsi sbg SATU bahasa desain
app-wide: **gradient lavender + kartu putih membulat ber-bayangan lembut +
aksen UNGU `#6C5CE7`** (menggantikan coral; auth gelap ikut di-reskin —
tak ada lagi dua kepribadian visual). Token pusat di `constants/theme.ts`
(BrandGradient, CardShadow, palet light; dark = mirror light DISENGAJA,
`userInterfaceStyle: light`); komponen `GradientBackground`; splash lavender.
Trik teknis: grouping ThemedView dibuat transparan via style override
(style prop menang atas warna type — tanpa bedah JSX). **Terverifikasi
visual di viewport mobile 363×687:** login, home (greeting+streak pill+
kartu aksi), dashboard (stat cards+badge ungu), readiness report (bar ungu).
Belum di-screenshot (pola sama, tsc+lint 0): conversation, interview start,
settings, onboarding, register/forgot.

## ✅ Redesign final: "Lumina" dark utk layar dalam (2026-07-03, `db79244`+`5d9b7c7`)

Perjalanan desain hari ini: Coursely lavender-terang (`d02687d`) → user
minta AUTH dikembalikan ke dark-hero yang sudah di-approve (`db79244`,
pelajaran: layar approved = beku) → user beri referensi kedua "Lumina"
(AI assistant GELAP) utk layar dalam → diadopsi `5d9b7c7`. Hasil akhir:
**seluruh app satu kepribadian GELAP** (auth dark-hero + inner Lumina).
- Token: bg `#0F0E15`, kartu `#1C1A26`, teks `#F4F2FA`, muted `#9B97B0`,
  aksen tetap ungu `#6C5CE7`; BrandGradient gelap; status colors terang
  (`#34C88A`/`#FF7A70`); userInterfaceStyle+splash dark.
- Home = replika komponen Lumina: wordmark ✦ Talkly + avatar inisial,
  greeting SERIF tengah, chip aksi pill (Free chat / Mock interview /
  Targeted ungu), section "Workspace" (rows: ikon tile berwarna +
  Conversations N sessions / Interview readiness skor / Streak N days),
  "Recent corrections", bottom bar Home·Progress·Settings.
- Toggle reminder pindah home → Settings (section Reminder).
- Verifikasi visual mobile viewport: home (sangat mirip referensi),
  dashboard, report. Insiden kecil: 1× NetworkError transien saat dev
  server kompilasi route pertama kali — endpoint diverifikasi 200/0.24s.

## ✅ Brand mark & app icons (2026-07-03, `04f9913`)

Logo dirancang USER di Claude design (proyek "Talkly AI logomark",
id faa0c7f3-...): **speech bubble + spark 4-titik negative-space** =
"intelligence inside the conversation"; gradient Iris→Periwinkle
(#6C5CE7→#8B7BF0) di atas Obsidian #0F0E15; sistem lengkap (4 varian,
safe area 66%, min 24px). Aset di-render dari PATH SVG ASLI via sharp
(scratchpad `iconsgen/gen-icons.mjs`): icon 1024, adaptive
foreground/background/monochrome, splash 512, favicon; app.json
adaptiveIcon bg → #0F0E15. **Template Expo terakhir (icon/splash) LENYAP
— app siap tampil bermerek di home screen & boot.** Verifikasi: icon &
splash dilihat mata; monochrome/foreground via statistik alpha.

## ✅ BACKEND LIVE DI PRODUCTION (Vercel, 2026-07-03)

Deploy backend Next.js ke Vercel — **`https://talkly-api.vercel.app`**
(project `talkly-api`, akun `wiliams-projects-acd6d5f0`/lixfeyzen). Env
di Vercel: DATABASE_URL + JWT_SECRET + OPENAI_API_KEY (Encrypted,
Preview+Production; user isi manual via dashboard). Build lokal lulus
lebih dulu (11 route API). **Terbukti live:** `/api/auth/me` 401,
register via curl → user asli + token asli (DB Neon tersambung dari
cloud); user probe dibersihkan. `.env.local` mobile → URL publik ini
(tak pernah basi walau IP Wi-Fi berubah). **Kini backend TIDAK numpang
laptop** — jalan buat siapa pun, di mana pun. Sisa jalur APK: EAS build.
Catatan: Neon free-tier bisa cold-start (200-500ms) request pertama.

## ▶ RESUME POINT (jeda 2026-07-03 sore)

Berhenti saat mencoba lihat app di HP Android (Xiaomi/MIUI):
- Expo Go Play Store menolak proyek (SDK 57 lebih baru dari Expo Go rilis).
- APK dari expo.dev/go 2× "App not installed" — belum tuntas; kemungkinan
  besar Expo Go lama belum ter-uninstall penuh (cek Settings→Apps) atau
  blokir MIUI.
- **Keputusan menggantung (tanya user saat resume): jalur EAS Build —
  (A) deploy backend ke Vercel dulu → APK shareable ke siapa pun
  (REKOMENDASI, selaras tujuan rekruter/startup), atau (B) APK lokal
  ber-IP-LAN dulu.** Prasyarat user: akun expo.dev (gratis) + login
  `npx eas-cli login`; `.env.local` (gitignored) berisi
  `EXPO_PUBLIC_API_URL=http://192.168.0.110:3001` — IP bisa berubah, dan
  utk EAS env harus lewat `eas.json` (bukan .env.local, tak terupload).
- Nyalakan ulang dev: `npx expo start --port 8081` (root) + `npx next
  dev -p 3001` (backend/). Utang bukti lama tetap: saldo OpenAI.

## 🗺️ ROADMAP DOMINASI (dikunci user 2026-07-03, dari analisis kompetitor)

Riset kompetitor (Speak/TalkPal/ELSA; Yoodli/Huru/SmallTalk2Me/Big
Interview; Google Interview Warmup TUTUP Apr 2026): per-fitur kita
menengah, TAPI tak ada satu pun pesaing yang punya LOOP utuh
"kelemahan persisten → latihan terarah → skor kesiapan". Tesis: menang
dengan memperdalam loop itu, bukan menambah lebar fitur. Urutan SETELAH
verifikasi produk hidup (Vercel→APK→AI):
1. **Voice mode** (Whisper STT → pipeline kesalahan yg sudah ada) —
   prasyarat kredibilitas kategori interview, bukan pembeda.
2. **Readiness Trajectory** — grafik skor & kelemahan lintas-waktu
   ("3 minggu lalu 52 → sekarang 74") = jawaban "apakah aku makin
   siap?" + alasan retensi langganan. Butuh skema mistake-rate
   per-window (naik dari parkiran V2).
3. **Interview-day countdown** — user set tanggal interview asli →
   rencana latihan mundur dari hari-H (mock H-3 & H-1). Tak ada
   pesaing yg berorientasi tanggal interview nyata user.
4. **Bahasa native sbg strategi pasar per-negara** — "app interview
   English terbaik utk orang Indonesia" dulu (penjelasan + konteks
   budaya interview lokal), baru negara berikutnya.
Prinsip: JANGAN bangun #1-#4 sebelum ada user nyata memakai loop yg ada.

## Next step (arah ke depan)

1. **User buka `http://localhost:8081`**: daftar/login, lihat layar baru
   (badge streak, kartu Latihan Terarah — pakai `dev:seed-stats` biar muncul,
   tile streak di dashboard).
2. **Tambah saldo OpenAI** (platform.openai.com → "Add credits") →
   verifikasi ONE-SHOT penuh: ngobrol → koreksi → stats keisi → dashboard →
   saran adaptif dari data nyata → streak naik. Lulus = 5/5 TERBUKTI hidup.
3. Uji notifikasi di HP/emulator Android (Expo Go / dev build).
4. Deploy publik (Vercel backend + Expo) → link hidup buat portfolio.
5. (V2) grafik tren perbaikan lintas-waktu; timezone per-user buat streak.

## ✅ VOICE MODE + INTERVIEW-DAY COUNTDOWN (2026-07-04)

**Voice mode (`b345a04`)** — roadmap #1, prasyarat kredibilitas kategori:
- Backend: `POST /api/speech/transcribe` (whisper-1, guard auth/2MB/type) +
  `POST /api/speech/tts` (tts-1 alloy, pagar 1000 char, cacheable).
- Mobile: tombol 🎤 di chat (rekam via expo-audio → transkrip masuk kotak
  input, BUKAN auto-kirim — user koreksi dulu sebelum bayar 1 call GPT);
  "🔊 Listen" di bubble AI (TTS, di-cache per pesan).
- TERBUKTI live: round-trip TTS→Whisper balikin kalimat persis. Biaya ~$0.01.
- BELUM: uji mic di HP nyata (butuh rebuild APK — expo-audio native module).

**Interview-Day Countdown (`fbfcf58`)** — roadmap #3 dipromosikan di atas #2
(trajectory kosong utk user baru; countdown bernilai di 60 detik pertama):
- `users.interview_date` + `interview_plan_role` (migrasi 0006, applied Neon).
- Logika murni `lib/interview-plan/plan.ts`: rencana mundur dari hari-H —
  latihan terarah (>3 hari, pakai mesin adaptif), full mock (H-3/H-2),
  review ringan (H-1), pesan hari-H. NOL biaya AI.
- API GET/POST/DELETE `/api/interview-plan` (tanggal lampau/`>90 hari`/
  kalender ngaco → 400). Mobile: kartu countdown di home (deep-link per jenis
  tugas) + layar `interview-date.tsx` (chip role + quick date).
- Tes 15/15 vs Neon live + semua cabang HTTP dibuktikan curl.

**Sisa utk fitur ini hidup di produksi:** deploy backend ke Vercel (route
speech + interview-plan belum ada di production) + rebuild APK via EAS
(expo-audio = native module, APK lama tak punya) + uji mic/TTS di HP.

## ✅ READINESS TRAJECTORY (2026-07-04, `8c2cc45`) — roadmap #2 BERES

- Logika murni `lib/trajectory/trajectory.ts`: skor mock kronologis + hitung
  kesalahan per-kategori di 2 jendela 14-hari bersebelahan (negatif=membaik)
  + insight 1 kalimat deterministik. NOL biaya AI.
- `GET /api/trajectory` (user baru → empty-state jujur). Mobile: layar
  `/trajectory` (line chart SVG skala tetap 0-100, tren ▼hijau/▲merah) +
  kartu masuk di home & dashboard. `categoryLabel` diekspor dari
  adaptive-scenario (reuse).
- Tes 13/13 vs Neon live; guard HTTP + empty-state dibuktikan curl.
- **Backend produksi Vercel SUDAH berisi SEMUA route (14+trajectory=15).**
- Roadmap #1-#3 SELESAI SEMUA. APK final (voice+countdown+trajectory) =
  build EAS `c961208c` (yg `07a3491c`/skWIdcSW... = interim, tanpa trajectory).
- CTO call: SETELAH ini STOP nambah fitur — gap berikutnya user nyata +
  monetisasi (tugas founder, bukan kode).

## ✅ REDESIGN AFTER-LOGIN (2026-07-04, `51cfb00`) — light+pastel+black dari Claude Design

- **Sumber:** mockup Claude Design `Talkly After-Login.dc.html` (project id
  7c1b120a..., diimpor via MCP DesignSync). Bahasa visual diturunkan dari layar
  AUTH (dark hero + sheet PUTIH + pastel + tombol HITAM) supaya after-login satu
  nafas dengan login/register. BUKAN rebrand — presentasi saja, semua logika utuh.
- **theme.ts** dibalik ke sistem TERANG (kanvas putih, tinta hitam #111114 utk
  aksi, pastel per-fitur ice/lilac/cream/pink/mint, hairline #ECEDEF, angka
  tabular). Nama token lama dipertahankan → ThemedText/ThemedView ikut terbalik.
- **UI kit baru** `src/components/ui.tsx`: Card, PrimaryButton, GhostButton, Chip,
  ListRow, StatTile, PastelTile, SectionLabel, MessageBubble, BottomNav.
- **9 layar diport** (Home + Conversation manual sbg referensi; interview,
  interview-report, interview-date, dashboard, trajectory, settings via workflow
  multi-agen 12 agen terverifikasi; onboarding dilebur). Font = SISTEM +
  fontWeight (DM Sans = follow-up opsional, belum dimuat). Brief lengkap:
  `docs/DESIGN-BRIEF.md`.
- **Verifikasi:** tsc 0 error, eslint 0, Metro web bundle 200 (1075 modul), nol
  dark-hex/emoji/em-dash sisa. **BELUM diverifikasi mata di sesi login nyata** —
  Metro jalan di :8090 utk preview.

## ✅ REDESIGN PASS 2 — reconcile 1:1 ke mockup (2026-07-04, `3480fc9`)
- Dibaca HTML mockup PENUH (`Talkly After-Login.dc.html`, 1337 baris) + component
  sheet + handoff notes (via MCP DesignSync), bukan ringkasan. Kit disetel ke
  angka PERSIS sheet; tiap layar direkonstruksi dari section HTML-nya.
- Kit: chip default abu tanpa border, ghost button ber-border, list row r20/tile44,
  bubble r18 asimetris, section-label tracking 0.5 + HeroCard(pastel+glow+radial),
  MiniBar, Toggle, ListenPill, TypingDots, EmptyState/ErrorState(motif bubble),
  BottomNav bar-penuh.
- Home + Conversation rebuild manual (dark-hero+white-sheet, countdown lilac,
  correction card X/check/globe). 6 layar lain via 6 subagen dari section eksak.
- Verifikasi: tsc 0, eslint 0, Metro bundle 200, nol dark-hex/emoji/em-dash.
- **Delta jujur tersisa (kebanyakan batas DATA, bukan gaya):** rapor STAR tak
  dipecah (field `upgraded` 1 string), 3 dimensi bukan 4, tak ada badge delta
  skor / "Today 9:12·topic" / filter "30 days" (tak ada datanya) — sengaja TAK
  dipalsukan. Visual kecil: tinggi CTA 50 vs 54, chart trajectory tanpa hiasan
  +delta/target-line, label pastel beda ~1 shade. Font = SISTEM (di-sahkan
  handoff notes "System/DM Sans/Inter"). **BELUM diverifikasi mata sesi login.**
