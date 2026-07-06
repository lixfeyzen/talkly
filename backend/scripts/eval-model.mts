// EVAL HARNESS model AI — memanggil pipeline ASLI app (runConversationTurn),
// bukan tiruan. Jalankan: npm run eval:model (butuh OPENAI_API_KEY di .env.local).
// 4 dimensi: (A) anti-halusinasi, (B) deteksi error tertanam, (C) ketahanan
// peran, (D) kesiapan global (note dalam bahasa native user).
// Output: transkrip penuh per kasus + PASS/FAIL heuristik + ringkasan.
import { runConversationTurn, type ChatTurn } from "../src/lib/ai/conversation";
import type { MistakeCategory } from "../src/lib/ai/mistake-categories";

type Case = {
  id: string;
  dim: "A-halusinasi" | "B-deteksi" | "C-peran" | "D-global";
  native: string;
  userMessage: string;
  history?: ChatTurn[];
  // kategori yang WAJIB terdeteksi (subset); [] = wajib NOL mistake
  expect: MistakeCategory[];
  // cek tambahan pada reply (heuristik, opsional)
  replyMustNotMatch?: RegExp;
  noteMustMatch?: RegExp; // dicek pada note mistake pertama
};

const SCENARIO = "Job interview";
const HISTORY_BASE: ChatTurn[] = [
  { role: "assistant", content: "Tell me about yourself and your background." },
];

const CASES: Case[] = [
  // ── A. ANTI-HALUSINASI: jawaban benar → WAJIB nol mistake ──
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
  // ── B. DETEKSI ERROR TERTANAM (kunci jawaban diketahui) ──
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
  // ── C. KETAHANAN PERAN (reply tetap in-character & English) ──
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
    // reply WAJIB tetap English (target language), bukan ikut Indonesia
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
  // ── D. KESIAPAN GLOBAL: note WAJIB dalam bahasa native user ──
  {
    id: "D1-note-indonesia",
    dim: "D-global",
    native: "Indonesian",
    userMessage: "She have many experience in marketing.",
    expect: ["verb_conjugation"],
    noteMustMatch: /(kata kerja|seharusnya|bentuk|karena|untuk subjek)/i,
  },
  {
    id: "D2-note-vietnam",
    dim: "D-global",
    native: "Vietnamese",
    userMessage: "I very like this company culture.",
    expect: [],
    noteMustMatch: /[ăâđêôơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ]/i,
  },
  {
    id: "D3-note-spanyol",
    dim: "D-global",
    native: "Spanish",
    userMessage: "I am agree with flexible working hours.",
    expect: [],
    noteMustMatch: /(verbo|porque|significa|se dice|correcto|no necesita)/i,
  },
];

let pass = 0;
let fail = 0;
const rows: string[] = [];

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
    );
    const ms = Date.now() - t0;
    console.log(`AI   : ${r.reply}`);
    if (r.mistakes.length === 0) {
      console.log("KOREKSI: (tidak ada)");
    } else {
      for (const m of r.mistakes) {
        console.log(`KOREKSI [${m.category}] "${m.originalText}" -> "${m.correctedText}"`);
        console.log(`   note: ${m.note}`);
      }
    }

    const gotCats = r.mistakes.map((m) => m.category);
    const problems: string[] = [];
    if (c.expect.length === 0 && c.dim === "A-halusinasi" && gotCats.length > 0) {
      problems.push(`HALUSINASI: menandai ${gotCats.length} mistake pada kalimat benar`);
    }
    for (const want of c.expect) {
      if (!gotCats.includes(want)) problems.push(`kategori ${want} TIDAK terdeteksi`);
    }
    if (c.replyMustNotMatch && c.replyMustNotMatch.test(r.reply)) {
      problems.push("reply keluar dari bahasa target (mengandung kata Indonesia)");
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
    rows.push(`${verdict}  ${c.id} (${ms}ms)${problems.length ? " — " + problems.join("; ") : ""}`);
  } catch (err) {
    fail++;
    const msg = err instanceof Error ? err.message : String(err);
    console.log(`>> ERROR: ${msg.slice(0, 120)}`);
    rows.push(`ERROR ${c.id} — ${msg.slice(0, 80)}`);
  }
}

console.log("\n" + "=".repeat(72));
console.log("RINGKASAN EVAL:");
for (const r of rows) console.log("  " + r);
console.log(`\nTOTAL: ${pass} PASS, ${fail} FAIL dari ${CASES.length} kasus`);
process.exit(fail > 0 ? 1 : 0);
