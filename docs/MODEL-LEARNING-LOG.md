# MODEL LEARNING LOG — Talkly

Buku besar kegagalan model & cara memperbaikinya. **Tiap kegagalan eval WAJIB
dicatat di sini** dengan format tetap, supaya tiap putaran kita belajar dan
punya data penyempurnaan (bukan mengulang kesalahan yang sama).

## Workflow (dikunci 2026-07-06)

```
eval:model → ada FAIL? → catat GEJALA → cari AKAR PENYEBAB → rancang FIX
→ terapkan → eval ulang (BUKTI) → catat status TUTUP/TERBUKA
```

Aturan main:
1. **Tiap putaran tambah kasus unseen baru** — lulus karena paham, bukan hafal soal.
2. **Skor tidak boleh regresi** — kasus yang pernah lulus wajib tetap lulus
   (`eval:report` mendeteksi otomatis).
3. **Bedakan bug MODEL vs bug ALAT UKUR (harness)** — dua-duanya dicatat,
   fixnya beda tempat.
4. **Contoh di prompt TIDAK BOLEH memakai kalimat kasus eval** (taint =
   mengajari soal ujian).
5. Benchmark = 100% pass di set yang terus tumbuh + halusinasi selalu 0 +
   judge selalu OK. "Sempurna" mutlak tidak ada — bar terus dinaikkan.

Riwayat angka: R1 10/14 (71%) → R2 15/16 (94%) → R3 17/18 (94%, judge 19/19).
Data mentah tiap run: `backend/eval-runs/*.json` (bandingkan: `npm run eval:report`).

---

## Entri

### #1 — word_order tidak terdeteksi (R1, kasus B4) — TUTUP
- **Gejala:** "I know very well this system" dibiarkan tanpa koreksi.
- **Akar:** prompt tidak menyebut word-order eksplisit; model fokus ke error
  morfologis (tense/konjugasi) dan melewatkan urutan kata.
- **Fix:** tambah instruksi deteksi word-order di system prompt, dengan contoh
  yang BERBEDA dari kalimat uji.
- **Bukti:** R2 B4 PASS + B7 (varian unseen "Always I arrive") ikut PASS =
  generalisasi, bukan hafalan.

### #2 — multi-error digabung 1 kategori (R1, kasus B6) — TUTUP
- **Gejala:** "responsible of many project" dikoreksi benar tapi 1 entri
  kategori `plural_agreement` padahal ada error preposisi juga.
- **Akar:** prompt tak melarang bundling; model merangkum demi ringkas.
- **Dampak produk:** statistik kelemahan preposisi undercount → latihan
  terarah salah sasaran (fitur inti terganggu).
- **Fix:** instruksi "satu mistake = satu error = satu kategori; pecah jadi
  entri terpisah".
- **Bukti:** R2/R3 B6 keluar 4 entri terpisah, semua kategori benar.

### #3 — reply ikut bahasa user (R1, kasus C2) — TUTUP
- **Gejala:** user menulis Indonesia → AI membalas dalam Indonesia (latihan
  English bubar).
- **Akar:** "Reply ONLY in English" tidak punya klausa untuk input
  non-English; model mengikuti norma percakapan (balas sebahasa).
- **Fix:** "This rule has NO exceptions: even if the user writes in another
  language, keep replying in {target} and gently encourage them".
- **Bukti:** R2 & R3 C2 PASS; C4 (campur bahasa dalam 1 kalimat, unseen)
  ikut PASS bahkan menandai frasa Indonesia sebagai mistake.

### #4 — alarm palsu note Indonesia (R1, kasus D1) — TUTUP (bug HARNESS)
- **Gejala:** note valid berbahasa Indonesia divonis FAIL.
- **Akar:** bug ALAT UKUR, bukan model — regex heuristik terlalu sempit
  (tak memuat kata "harus/menjadi/dikonjugasikan").
- **Fix:** perluas regex kata fungsi Indonesia.
- **Pelajaran:** selalu tanya "yang salah modelnya atau alat ukurnya?"
  sebelum menyalahkan model.

### #5 — kategori goyah antar-run (R2, kasus B3) — TUTUP (awasi)
- **Gejala:** "five year" → "five years" benar dikoreksi, tapi kategorinya
  `plural_agreement` di R1 lalu `other` di R2 (nondeterminisme).
- **Akar:** batas antar-kategori tak terdefinisi di prompt; model menebak.
- **Dampak produk:** kelemahan bocor ke ember "other" → statistik kabur.
- **Fix:** glossary kategori di prompt ("pick the MOST SPECIFIC; other ONLY
  when nothing else fits" + definisi kategori yang rawan tertukar).
- **Bukti:** R3 B3 PASS. Catatan: jitter bisa kambuh — pantau via eval:report.

### #6 — koreksi berbahasa salah LOLOS checker (R2, kasus D2) — TUTUP (sisi alat ukur)
- **Gejala:** correctedText "I like very" (English salah) dinyatakan PASS.
- **Akar:** harness hanya cek kategori + bahasa note; TIDAK menilai kualitas
  English teks koreksi. Ditangkap review manual.
- **Fix:** tambah LLM-JUDGE (model tetap, terpisah dari model uji) yang
  menilai tiap correctedText "benar & natural?".
- **Bukti:** R3 judge 19/19; koreksi D2 kini "I really like" (benar).
- **Pelajaran:** checker heuristik murah tapi buta kualitas — kualitas bahasa
  butuh hakim bahasa.

### #7 — note bocor ke bahasa lain (R3, kasus D2) — TERBUKA (target R4)
- **Gejala:** user native Vietnamese, note keluar berbahasa INDONESIA
  ("Kata 'very' tidak digunakan..."). R2 note-nya benar Vietnam → regresi
  nondeterministik.
- **Dugaan akar:** instruksi bahasa note satu kalimat pendek tanpa penegasan;
  kemungkinan interferensi karena mayoritas konteks/kasus berbahasa Indonesia.
- **Rencana fix:** pertegas "The note MUST be written in {native} — never any
  other language", posisikan dekat skema output.

### #8 — TAINT: contoh prompt = kalimat uji (R3, meta) — TERBUKA (target R4)
- **Gejala:** glossary kategori memakai kalimat uji D2 verbatim
  ("I very like" → "I really like") = mengajari soal ujian; kelulusan
  kategori D2 di R3 tidak sepenuhnya adil.
- **Akar:** kelalaian saat menulis prompt (aturan "contoh ≠ kasus uji" sudah
  dipakai di fix #1 tapi tidak diterapkan konsisten).
- **Rencana fix:** ganti contoh glossary ke kalimat lain (mis. "I much enjoy"
  → "I really enjoy"); jadikan aturan main #4 di atas.
