// EVAL TOOL model AI — benchmark niche Talkly (koreksi English interview).
// Memanggil pipeline ASLI app (runConversationTurn), bukan tiruan.
//
//   npm run eval:model                        -> model produksi (gpt-4o-2024-08-06)
//   npm run eval:model -- --model=gpt-4o-mini -> benchmark model lain
//   npm run eval:report                       -> bandingkan semua run tersimpan
//
// 4 dimensi: (A) anti-halusinasi, (B) deteksi error tertanam, (C) ketahanan
// peran, (D) global (note bahasa native). Tiap koreksi juga dinilai
// LLM-JUDGE (kualitas correctedText — pelajaran putaran 2: "I like very"
// lolos checker heuristik). Hasil run disimpan ke eval-runs/*.json supaya
// tiap eksperimen bisa dibandingkan (riwayat benchmark).
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { zodResponseFormat } from "openai/helpers/zod";
import { openai } from "../src/lib/ai/openai";
import { runConversationTurn, type ChatTurn } from "../src/lib/ai/conversation";
import type { MistakeCategory } from "../src/lib/ai/mistake-categories";

const DEFAULT_MODEL = "gpt-4o-2024-08-06";
const JUDGE_MODEL = "gpt-4o-2024-08-06"; // hakim TETAP, walau model uji berganti
const modelArg = process.argv.find((a) => a.startsWith("--model="));
const MODEL = modelArg ? modelArg.split("=")[1] : DEFAULT_MODEL;

type Case = {
  id: string;
  dim: "A-halusinasi" | "B-deteksi" | "C-peran" | "D-global";
  native: string;
  userMessage: string;
  history?: ChatTurn[];
  expect: MistakeCategory[]; // wajib terdeteksi; [] + dim A = wajib NOL mistake
  // Utk error AMBIGU (entri #9 learning log): tiap grup = minimal SATU dari
  // kategori di grup itu harus terdeteksi (dua framing sama-sama valid).
  expectOneOf?: MistakeCategory[][];
  replyMustNotMatch?: RegExp;
  noteMustMatch?: RegExp;
};

const SCENARIO = "Job interview";
const HISTORY_BASE: ChatTurn[] = [
  { role: "assistant", content: "Tell me about yourself and your background." },
];

const CASES: Case[] = [
  // ── A. ANTI-HALUSINASI ──
  {
    id: "A1-jawaban-sempurna",
    dim: "A-halusinasi",
    native: "Indonesian",
    userMessage:
      "I have five years of experience as a software engineer, mostly building payment systems for banks in Southeast Asia.",
    expect: [],
  },
  {
    id: "A2-kalimat-kompleks-benar",
    dim: "A-halusinasi",
    native: "Indonesian",
    userMessage:
      "Had I known the deadline would be moved up, I would have prioritized the integration tests differently.",
    expect: [],
  },
  // BARU putaran 5 (unseen): jaga dimensi halusinasi tetap teruji saat
  // prompt makin panjang (makin banyak instruksi deteksi = makin besar
  // godaan mengarang error).
  {
    id: "A3-jawaban-benar-baru",
    dim: "A-halusinasi",
    native: "Indonesian",
    userMessage:
      "I led a team of twelve engineers across three time zones, and we shipped the product two weeks ahead of schedule.",
    expect: [],
  },
  // ── B. DETEKSI ERROR TERTANAM ──
  {
    id: "B1-tense",
    dim: "B-deteksi",
    native: "Indonesian",
    userMessage: "Yesterday I go to the client office and finish the report there.",
    expect: ["tense_usage"],
  },
  {
    id: "B2-preposisi",
    dim: "B-deteksi",
    native: "Indonesian",
    userMessage: "In my last job I was responsible of managing a small team.",
    expect: ["preposition_usage"],
  },
  {
    id: "B3-jamak",
    dim: "B-deteksi",
    native: "Indonesian",
    userMessage: "I have five year experience in mobile development.",
    expect: ["plural_agreement"],
  },
  {
    id: "B4-urutan-kata",
    dim: "B-deteksi",
    native: "Indonesian",
    userMessage: "I know very well this system because I built part of it.",
    expect: ["word_order"],
  },
  {
    id: "B5-konjugasi",
    dim: "B-deteksi",
    native: "Indonesian",
    userMessage: "My manager don't like risky changes, so we moves slowly.",
    expect: ["verb_conjugation"],
  },
  {
    id: "B6-jawaban-berantakan",
    dim: "B-deteksi",
    native: "Indonesian",
    userMessage:
      "Yesterday I go to interview in other company but I am responsible of many project so I have no time prepare.",
    expect: ["tense_usage", "preposition_usage"],
  },
  {
    id: "B7-urutan-kata-baru",
    dim: "B-deteksi",
    native: "Indonesian",
    userMessage: "Always I arrive early to meetings because I hate being late.",
    expect: ["word_order"],
  },
  // BARU putaran 3 (unseen — pagar anti-hafal-soal)
  {
    id: "B8-artikel-baru",
    dim: "B-deteksi",
    native: "Indonesian",
    userMessage: "I am software engineer at big company in Jakarta.",
    expect: ["article_usage"],
  },
  // Entri #13: kalimat awal R5 ("good in Python") ternyata BUKAN error tegas
  // ("good in math" dipakai luas) — model menolak menandai = perilaku benar.
  // Diganti error preposisi yang tak terbantahkan: "depends of" -> "depends on".
  {
    id: "B10-preposisi-baru",
    dim: "B-deteksi",
    native: "Indonesian",
    userMessage: "It depends of the project, but I usually work in two-week sprints.",
    expect: ["preposition_usage"],
  },
  // BARU putaran 4 (unseen): -ed/-ing confusion, error vocab klasik — juga
  // menguji glossary vocabulary_choice PASCA taint dihapus (tes adil).
  {
    id: "B9-vocab-baru",
    dim: "B-deteksi",
    native: "Indonesian",
    userMessage: "I am boring in my current job, so I look for new challenge.",
    expect: ["vocabulary_choice"],
  },
  // ── C. KETAHANAN PERAN ──
  {
    id: "C1-melantur",
    dim: "C-peran",
    native: "Indonesian",
    userMessage: "By the way, what is your favorite football club?",
    expect: [],
  },
  {
    id: "C2-user-pakai-bhs-indo",
    dim: "C-peran",
    native: "Indonesian",
    userMessage: "Maaf, saya bingung harus jawab apa. Bisa ulangi pertanyaannya?",
    replyMustNotMatch: /\b(saya|kamu|tidak|yang|bisa)\b/i,
    expect: [],
  },
  {
    id: "C3-user-frustrasi",
    dim: "C-peran",
    native: "Indonesian",
    userMessage: "This interview is stupid and pointless.",
    expect: [],
  },
  {
    id: "C4-campur-bahasa",
    dim: "C-peran",
    native: "Indonesian",
    userMessage: "I think saya cocok for this position because I have leadership experience.",
    replyMustNotMatch: /\b(saya|kamu|tidak|yang|bisa|cocok)\b/i,
    expect: [],
  },
  // ── D. GLOBAL: note dalam bahasa native ──
  {
    id: "D1-note-indonesia",
    dim: "D-global",
    native: "Indonesian",
    userMessage: "She have many experience in marketing.",
    expect: ["verb_conjugation"],
    noteMustMatch:
      /(kata kerja|seharusnya|bentuk|karena|untuk subjek|harus|menjadi|gunakan|dalam|dengan)/i,
  },
  {
    // "I very like" sah dikoreksi 2 cara: "really like" (vocab) ATAU
    // "like ... very much" (word order) — entri #9: terima keduanya.
    id: "D2-note-vietnam",
    dim: "D-global",
    native: "Vietnamese",
    userMessage: "I very like this company culture.",
    expect: [],
    expectOneOf: [["vocabulary_choice", "word_order"]],
    noteMustMatch: /[ăâđêôơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ]/i,
  },
  {
    id: "D3-note-spanyol",
    dim: "D-global",
    native: "Spanish",
    userMessage: "I am agree with flexible working hours.",
    expect: [],
    noteMustMatch: /(verbo|porque|significa|se dice|correcto|no necesita|no se usa)/i,
  },
  // BARU putaran 4 (unseen): stress-test fix bocor-bahasa-note (entri #7
  // learning log) pada kalimat Vietnam yang BERBEDA dari D2.
  {
    // "I working since 2020": missing auxiliary = sah dibaca tense ATAU
    // konjugasi — entri #9: terima keduanya.
    id: "D5-note-vietnam-2-baru",
    dim: "D-global",
    native: "Vietnamese",
    userMessage: "I working here since 2020.",
    expect: [],
    expectOneOf: [["tense_usage", "verb_conjugation"]],
    noteMustMatch: /[ăâđêôơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ]/i,
  },
  // BARU putaran 3: pasar Brazil (roadmap global)
  {
    id: "D4-note-portugis-baru",
    dim: "D-global",
    native: "Portuguese",
    userMessage: "I am agree with the salary offer.",
    expect: [],
    // Entri #12: "correto" luput menangkap bentuk feminin "correta" (alarm
    // palsu R5) — perluas dgn kata fungsi PT umum.
    noteMustMatch: /(verbo|porque|corret[oa]|se usa|não|em inglês|usar|precisa|frase|\bé\b|\bsem\b)/i,
  },
];

// ── LLM-JUDGE: nilai kualitas tiap correctedText (pelajaran putaran 2) ──
const judgeSchema = z.object({
  ok: z.boolean().describe("true jika correctedText adalah English yang benar & natural"),
  reason: z.string().describe("alasan singkat 1 kalimat"),
});

async function judgeCorrection(
  original: string,
  corrected: string,
  fullSentence: string, // entri #10: tanpa konteks kalimat, judge pedantic
): Promise<{ ok: boolean; reason: string }> {
  const completion = await openai.chat.completions.parse({
    model: JUDGE_MODEL,
    messages: [
      {
        role: "system",
        content:
          "You are a strict English copy editor. Judge ONLY whether the proposed correction is correct, natural English as a replacement for the original fragment WITHIN the given full sentence. Use the full sentence as context (e.g. \"doesn't\" replacing \"don't\" is correct when the sentence subject is third-person singular). If the correction is ungrammatical or unnatural in that context, it fails.",
      },
      {
        role: "user",
        content: `Full sentence written by the user: "${fullSentence}"\nOriginal fragment: "${original}"\nProposed correction of that fragment: "${corrected}"\nIs the proposed correction correct and natural English in the context of that sentence?`,
      },
    ],
    response_format: zodResponseFormat(judgeSchema, "judge_verdict"),
  });
  const parsed = completion.choices[0]?.message.parsed;
  return parsed ?? { ok: false, reason: "judge tidak membalas" };
}

type CaseRecord = {
  id: string;
  dim: string;
  verdict: "PASS" | "FAIL" | "ERROR";
  ms: number;
  problems: string[];
  mistakes: { category: string; original: string; corrected: string; note: string; judgeOk: boolean; judgeReason: string }[];
  reply: string;
};

let pass = 0;
let fail = 0;
let judgeTotal = 0;
let judgeOk = 0;
const records: CaseRecord[] = [];

console.log(`MODEL DIUJI : ${MODEL}`);
console.log(`JUDGE       : ${JUDGE_MODEL} (tetap)`);

for (const c of CASES) {
  console.log("\n" + "=".repeat(72));
  console.log(`KASUS ${c.id}  [${c.dim}]  native=${c.native}`);
  console.log(`USER : ${c.userMessage}`);
  const t0 = Date.now();
  try {
    const r = await runConversationTurn(
      SCENARIO,
      "English",
      c.history ?? HISTORY_BASE,
      c.userMessage,
      [],
      c.native,
      undefined,
      MODEL,
    );
    const ms = Date.now() - t0;
    console.log(`AI   : ${r.reply}`);

    const problems: string[] = [];
    const mistakeRecords: CaseRecord["mistakes"] = [];
    if (r.mistakes.length === 0) {
      console.log("KOREKSI: (tidak ada)");
    } else {
      for (const m of r.mistakes) {
        console.log(`KOREKSI [${m.category}] "${m.originalText}" -> "${m.correctedText}"`);
        console.log(`   note: ${m.note}`);
        judgeTotal++;
        const jv = await judgeCorrection(m.originalText, m.correctedText, c.userMessage);
        if (jv.ok) judgeOk++;
        else problems.push(`JUDGE menolak koreksi "${m.correctedText}": ${jv.reason}`);
        console.log(`   judge: ${jv.ok ? "OK" : "BAD"} — ${jv.reason}`);
        mistakeRecords.push({
          category: m.category,
          original: m.originalText,
          corrected: m.correctedText,
          note: m.note,
          judgeOk: jv.ok,
          judgeReason: jv.reason,
        });
      }
    }

    const gotCats = r.mistakes.map((m) => m.category);
    if (c.expect.length === 0 && c.dim === "A-halusinasi" && gotCats.length > 0) {
      problems.push(`HALUSINASI: menandai ${gotCats.length} mistake pada kalimat benar`);
    }
    for (const want of c.expect) {
      if (!gotCats.includes(want)) problems.push(`kategori ${want} TIDAK terdeteksi`);
    }
    for (const group of c.expectOneOf ?? []) {
      if (!group.some((g) => gotCats.includes(g))) {
        problems.push(`tak satu pun dari [${group.join("|")}] terdeteksi`);
      }
    }
    if (c.replyMustNotMatch && c.replyMustNotMatch.test(r.reply)) {
      problems.push("reply keluar dari bahasa target");
    }
    if (c.noteMustMatch) {
      const note = r.mistakes[0]?.note ?? "";
      if (!c.noteMustMatch.test(note)) {
        problems.push(`note tidak cocok pola bahasa native (${c.native}): "${note.slice(0, 60)}"`);
      }
    }

    const verdict = problems.length === 0 ? "PASS" : "FAIL";
    if (verdict === "PASS") pass++;
    else fail++;
    console.log(`>> ${verdict} (${ms}ms)${problems.length ? " — " + problems.join("; ") : ""}`);
    records.push({ id: c.id, dim: c.dim, verdict, ms, problems, mistakes: mistakeRecords, reply: r.reply });
  } catch (err) {
    fail++;
    const msg = err instanceof Error ? err.message : String(err);
    console.log(`>> ERROR: ${msg.slice(0, 120)}`);
    records.push({ id: c.id, dim: c.dim, verdict: "ERROR", ms: Date.now() - t0, problems: [msg.slice(0, 120)], mistakes: [], reply: "" });
  }
}

// ── ringkasan + simpan riwayat run ──
const byDim: Record<string, { pass: number; total: number }> = {};
for (const rec of records) {
  byDim[rec.dim] ??= { pass: 0, total: 0 };
  byDim[rec.dim].total++;
  if (rec.verdict === "PASS") byDim[rec.dim].pass++;
}

console.log("\n" + "=".repeat(72));
console.log("RINGKASAN EVAL:");
for (const rec of records) {
  console.log(`  ${rec.verdict}  ${rec.id} (${rec.ms}ms)${rec.problems.length ? " — " + rec.problems.join("; ") : ""}`);
}
console.log("\nPER DIMENSI:");
for (const [dim, s] of Object.entries(byDim)) console.log(`  ${dim}: ${s.pass}/${s.total}`);
console.log(`JUDGE kualitas koreksi: ${judgeOk}/${judgeTotal} OK`);
console.log(`\nTOTAL: ${pass} PASS, ${fail} FAIL dari ${CASES.length} kasus`);

const runRecord = {
  runAt: new Date().toISOString(),
  model: MODEL,
  judgeModel: JUDGE_MODEL,
  totals: { pass, fail, cases: CASES.length, judgeOk, judgeTotal },
  byDim,
  cases: records,
};
const dir = path.join(process.cwd(), "eval-runs");
await mkdir(dir, { recursive: true });
const file = path.join(dir, `run-${Date.now()}-${MODEL.replace(/[^a-z0-9.-]/gi, "_")}.json`);
await writeFile(file, JSON.stringify(runRecord, null, 2));
console.log(`\nRun tersimpan: ${path.relative(process.cwd(), file)} (bandingkan: npm run eval:report)`);
process.exit(fail > 0 ? 1 : 0);
