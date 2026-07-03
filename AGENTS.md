# Talkly — konteks wajib sebelum kerja

**SELALU baca `docs/PROJECT-NOTES.md` DULU** — itu sumber kebenaran proyek ini:
keputusan produk/market, progres per-fitur, resume point terakhir, dan utang
verifikasi. Jangan mulai kerja dari asumsi.

Ringkas: app mobile (Expo SDK 57 + backend Next.js di `backend/`, Neon
Postgres) untuk latihan percakapan interview kerja bahasa Inggris; target =
non-native professionals global; UI English; AI mengingat pola kesalahan user.

## Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code.

## Konvensi kerja repo ini

- Verifikasi = jalankan test suite backend (`npm run test:*` di `backend/`,
  butuh `.env.local`) + buktikan lewat jalur app (bukan cuma curl).
- Commit email git repo ini SUDAH benar — jangan override dari env.
- Update `docs/PROJECT-NOTES.md` tiap milestone/keputusan, lalu commit.
