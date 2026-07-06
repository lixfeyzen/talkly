// EVAL REPORT — bandingkan semua run benchmark tersimpan (eval-runs/*.json).
// Jalankan: npm run eval:report. Tanpa API/DB — murni baca file.
// Menampilkan: skor per run (kronologis), rincian per dimensi, kualitas judge,
// dan REGRESI (kasus yang lulus di run sebelumnya tapi gagal di run terbaru).
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

type CaseRecord = { id: string; dim: string; verdict: string; problems: string[] };
type Run = {
  runAt: string;
  model: string;
  totals: { pass: number; fail: number; cases: number; judgeOk: number; judgeTotal: number };
  byDim: Record<string, { pass: number; total: number }>;
  cases: CaseRecord[];
};

const dir = path.join(process.cwd(), "eval-runs");
let files: string[] = [];
try {
  files = (await readdir(dir)).filter((f) => f.endsWith(".json")).sort();
} catch {
  console.log("Belum ada run tersimpan. Jalankan dulu: npm run eval:model");
  process.exit(0);
}
if (files.length === 0) {
  console.log("Belum ada run tersimpan. Jalankan dulu: npm run eval:model");
  process.exit(0);
}

const runs: Run[] = [];
for (const f of files) {
  runs.push(JSON.parse(await readFile(path.join(dir, f), "utf8")) as Run);
}
runs.sort((a, b) => a.runAt.localeCompare(b.runAt));

console.log("BENCHMARK TALKLY — riwayat eksperimen model\n");
console.log("RUN | WAKTU (lokal)      | MODEL                | SKOR   | %    | JUDGE");
console.log("-".repeat(78));
runs.forEach((r, i) => {
  const t = new Date(r.runAt);
  const stamp = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")} ${String(t.getHours()).padStart(2, "0")}:${String(t.getMinutes()).padStart(2, "0")}`;
  const pct = Math.round((r.totals.pass / r.totals.cases) * 100);
  const judge = r.totals.judgeTotal ? `${r.totals.judgeOk}/${r.totals.judgeTotal}` : "-";
  console.log(
    `#${String(i + 1).padEnd(2)} | ${stamp} | ${r.model.padEnd(20)} | ${`${r.totals.pass}/${r.totals.cases}`.padEnd(6)} | ${String(pct).padStart(3)}% | ${judge}`,
  );
});

const last = runs[runs.length - 1];
console.log("\nPER DIMENSI (run terbaru):");
for (const [dim, s] of Object.entries(last.byDim)) {
  console.log(`  ${dim.padEnd(14)} ${s.pass}/${s.total}`);
}

if (runs.length >= 2) {
  const prev = runs[runs.length - 2];
  const prevPass = new Set(prev.cases.filter((c) => c.verdict === "PASS").map((c) => c.id));
  const regressions = last.cases.filter((c) => c.verdict !== "PASS" && prevPass.has(c.id));
  console.log("\nREGRESI vs run sebelumnya:");
  if (regressions.length === 0) {
    console.log("  (tidak ada — tak ada kasus yang tadinya lulus jadi gagal)");
  } else {
    for (const c of regressions) console.log(`  ⚠ ${c.id} — ${c.problems.join("; ")}`);
  }
}

console.log("\nKasus gagal di run terbaru:");
const fails = last.cases.filter((c) => c.verdict !== "PASS");
if (fails.length === 0) console.log("  (tidak ada — semua lulus)");
else for (const c of fails) console.log(`  ${c.id} — ${c.problems.join("; ")}`);
