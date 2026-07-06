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

Riwayat angka: R1 10/14 (71%) → R2 15/16 (94%) → R3 17/18 (94%, judge 19/19)
→ R4 16/20 (80%; benchmark jadi jujur) → R5 20/22 → R6 22/22 (100% di bar
lama) → **BAR DINAIKKAN: +9 kasus gelombang E** (halus/panjang/idiom/
false-friend) → R7 28/31 → R8 30/31 → R9 21/31 (REGRESI dari fix hakimku
sendiri — entri #17) → R10 30/31 (judge pulih 32/32) → R11 28/31 (jitter
pindah kasus) → R12 29/31 (94%; A/B/C/D SEMUA penuh; sisa 2 = jitter model
murni di gelombang E). Bar berikutnya: tangani nondeterminisme (bukan prompt
lagi) + uji model murah (--model=gpt-4o-mini).
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

### #7 — note bocor ke bahasa lain (R3, kasus D2) — TUTUP
- **Gejala:** user native Vietnamese, note keluar berbahasa INDONESIA
  ("Kata 'very' tidak digunakan..."). R2 note-nya benar Vietnam → regresi
  nondeterministik.
- **Dugaan akar:** instruksi bahasa note satu kalimat pendek tanpa penegasan;
  kemungkinan interferensi karena mayoritas konteks/kasus berbahasa Indonesia.
- **Fix (R4):** instruksi dipertegas "MUST be written in {native} and ONLY in
  {native} — never any other language, regardless of what language appears in
  the conversation".
- **Bukti:** R4 — note D2 dan D5 (kalimat Vietnam BERBEDA, unseen) dua-duanya
  keluar dalam bahasa Vietnam.

### #8 — TAINT: contoh prompt = kalimat uji (R3, meta) — TUTUP
- **Gejala:** glossary kategori memakai kalimat uji D2 verbatim
  ("I very like" → "I really like") = mengajari soal ujian; kelulusan
  kategori D2 di R3 tidak sepenuhnya adil.
- **Akar:** kelalaian saat menulis prompt (aturan "contoh ≠ kasus uji" sudah
  dipakai di fix #1 tapi tidak diterapkan konsisten).
- **Fix (R4):** contoh diganti "I much enjoy" → "I really enjoy".
- **Bukti + temuan:** tanpa contoh verbatim, D2 langsung pindah kategori ke
  word_order (koreksinya tetap benar: "I like this company culture very
  much") — MEMBUKTIKAN kelulusan kategori D2 di R3 memang taint-assisted.
  Konsekuensinya jadi entri #9.

### #9 — ekspektasi kategori terlalu kaku utk error ambigu (R4, D2 & D5) — TUTUP
- **Gejala:** D2 & D5 divonis FAIL padahal koreksinya BENAR & judge OK —
  yang beda cuma framing kategori ("I very like": vocabulary_choice ATAU
  word_order sama-sama valid; "I working since 2020": tense_usage ATAU
  verb_conjugation sama-sama bisa dibela).
- **Akar:** desain EVAL — expect satu kategori tunggal utk error yang
  memang punya >1 framing valid.
- **Fix (R5):** harness dukung `expectOneOf` (grup kategori valid, minimal
  satu terdeteksi); glossary + batas tense ("missing auxiliary utk perfect
  tense = tense_usage", contoh non-uji).
- **Bukti:** R5/R6 D2 & D5 PASS.
- **Catatan produk:** jitter kategori antar-run utk error ambigu tetap
  nyata utk statistik kelemahan — mitigasi jangka panjang: kategori induk
  atau normalisasi saat agregasi.

### #10 — judge pedantic tanpa konteks kalimat (R4, B5) — TUTUP
- **Gejala:** judge MENOLAK koreksi benar "don't"→"doesn't" ("not correct
  without further context") — fragmen pendek dinilai tanpa kalimat asalnya.
- **Akar:** bug ALAT UKUR — prompt judge hanya diberi fragmen, tidak diberi
  kalimat penuh user.
- **Fix (R5):** kalimat penuh user disertakan di prompt judge + instruksi
  menilai fragmen DALAM konteks kalimat itu.
- **Bukti:** R5/R6 B5 PASS ("don't"->"doesn't" kini diterima judge).

### #11 — koreksi fragmen kadang tak lengkap (R4, B6) — TUTUP
- **Gejala:** model mengoreksi "Yesterday I go to interview" → "Yesterday I
  went to interview" (hilang "an"; di R3 lengkap "went to an interview") —
  judge MENANGKAP dengan benar (hakim bekerja sesuai desain).
- **Akar:** nondeterminisme model dalam kelengkapan koreksi fragmen.
- **Fix (R5):** instruksi prompt "correctedText must be the FULLY corrected
  version of the quoted fragment: fix every error inside it, including
  articles and prepositions".
- **Bukti:** R5/R6 B6 PASS, judge OK semua fragmen.

### #12 — alarm palsu regex bahasa KAMBUH (R5, D4 Portuguese) — TUTUP
- **Gejala:** note valid Portuguese ("A frase correta é ... sem 'am'")
  divonis FAIL — regex memuat "correto" tapi note pakai "correta" (feminin).
- **Akar:** pola kegagalan BERULANG dari entri #4 — deteksi bahasa via
  regex kata-kunci itu rapuh (morfologi bahasa Latin: -o/-a).
- **Fix (R6):** perluas ke `corret[oa]` + kata fungsi PT (frase/é/sem).
- **Bukti:** R6 D4 PASS.
- **Catatan jangka panjang:** kalau alarm palsu bahasa kambuh lagi (3×),
  pindahkan cek bahasa-note ke LLM-judge, bukan regex.

### #13 — soal eval sendiri bukan error tegas (R5, B10) — TUTUP
- **Gejala:** "I am good in Python" tidak ditandai model → FAIL. Padahal
  "good in <bidang>" dipakai luas & bisa dibela — model MENOLAK menandai
  justru perilaku yang benar (tidak nitpick usage yang sah).
- **Akar:** desain EVAL — error tertanam wajib TAK TERBANTAHKAN salah;
  aku menanam soal ambigu.
- **Fix (R6):** kalimat diganti error preposisi tegas "It depends of the
  project" -> "depends on".
- **Bukti:** R6 B10 PASS.
- **Aturan main baru #6:** seeded error harus unambiguously wrong —
  kalau native speaker bisa membela kalimatnya, itu bukan soal eval.


### #14 — koreksi uncountable salah (R7, E2) — TUTUP
- **Gejala:** "many progresses" dikoreksi jadi "many progress" (masih salah;
  judge menolak — hakim bekerja).
- **Fix (R8):** glossary: uncountable nouns tak memakai "many"/jamak
  ("many feedbacks" -> "a lot of feedback"; contoh non-uji).
- **Bukti:** R8+ E2 PASS ("a lot of progress").

### #15 — word_order jadi keranjang sampah (R7, E3) — TUTUP
- **Gejala:** buang "about" (discussed about) dilabeli word_order padahal
  tak ada kata pindah posisi.
- **Fix (R8):** definisi batas: word_order HANYA utk kata salah posisi;
  extra/missing preposition = preposition_usage.
- **Bukti:** R8+ E3 PASS.

### #16 — B6 kasus terflaky: gagal 3 cara berbeda (R4/R7/R10) — TUTUP (awasi)
- **Gejala:** kalimat run-on 4-error gagal bergantian: koreksi tak lengkap
  (R4), bundling salah label (R7), error preposisi terlewat (R10).
- **Fix:** contoh pecah-kategori konkret non-uji + instruksi "report EVERY
  mistake -- do not stop after the first few".
- **Bukti:** R11/R12 PASS. Catatan: kasus flaky butuh REPEAT-RUN utk bukti
  kuat, single pass = sampel 1.

### #17 — hakim salah vonis fragmen pendek + fix-ku sendiri bikin REGRESI (R8-R10) — TUTUP
- **Gejala:** judge menolak "am agree"->"agree" yang benar (menilai fragmen
  telanjang). **Fix v1 (substitusi + nilai kalimat utuh) = BENCANA R9:
  21/31, judge 18/34** — kalimat multi-error ditolak gara-gara error LAIN
  yang ditangani entri terpisah.
- **Fix v2 (R10):** hakim fragmen-TERSKOP: kalimat hasil substitusi jadi
  konteks, tapi yang dinilai HANYA penggantian fragmen itu; error lain
  diabaikan eksplisit.
- **Bukti:** R10 judge 32/32; R12 hakim MENANGKAP fragmen tak-presisi E6
  ('to work with'->'working with' = hilang "to") — vonis yang penilaian
  fragmen-telanjang pasti lolos. Sistem hakim terbukti.
- **Pelajaran:** fix alat ukur juga bisa regresi — uji dampaknya ke kasus
  multi-error sebelum dipakai; alarm regresi eval:report menyelamatkan.

### #18 — cek bahasa note pindah regex -> LLM (R11) — TUTUP
- **Gejala:** alarm palsu regex ke-3 (ES "se usa" tak terdaftar; sebelumnya
  ID R1, PT R5) DAN leak asli kambuh (note Indonesia utk user Portuguese).
- **Akar:** regex kata-kunci rapuh (morfologi -o/-a, frasa tak terdaftar)
  dan tak bisa mendeteksi leak.
- **Fix (R12):** `judgeNoteLanguage` — LLM ditanya "teks ini bahasa X?";
  kutipan English di dalam note tak mengubah vonis.
- **Bukti:** R12 dimensi D 5/5.

### #19 — SISA TERBUKA: jitter nondeterminisme di gelombang E (R12)
- **Gejala:** (a) E4 s-v agreement kadang dilabeli vocabulary_choice walau
  glossary sudah mendefinisikan verb_conjugation; (b) E6 pemilihan BATAS
  fragmen kadang tak presisi ('to work with'->'working with').
- **Akar:** nondeterminisme model (temperature default) — instruksi menekan
  frekuensi, tidak memusnahkan. BUKAN lubang instruksi lagi.
- **Opsi lanjut (bukan prompt):** (1) turunkan temperature panggilan (trade-
  off: reply roleplay jadi kurang hidup — keputusan produk); (2) repeat-run
  majority di eval utk kasus flaky; (3) statistik flakiness per-kasus di
  eval:report (data sudah ada di eval-runs/); (4) pecah deteksi-mistake ke
  panggilan terpisah dari reply (2x biaya).
