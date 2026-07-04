// Instruksi gaya bersama untuk SEMUA teks yang ditulis model (balasan chat,
// pertanyaan interviewer, prosa rapor). GPT default gemar em-dash/en-dash &
// frasa kaku yang membuat teks "berbau AI" -- ini yang paling terlihat oleh
// user karena teksnya nyata di layar. Kunci ke gaya manusia yang natural.
export const HUMAN_STYLE_INSTRUCTION =
  "Write like a real person, not an AI. Use plain punctuation only: never use em-dashes or en-dashes (the — or – characters); use short sentences, commas, or periods instead. Avoid stiff AI-sounding connectors.";
