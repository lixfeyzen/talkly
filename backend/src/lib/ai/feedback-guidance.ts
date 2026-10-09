// Curated design guidance, not institutional endorsement or validation of Talkly.
// Runtime prompts use only the short rules below; no web text or retrieval is executed.
// v3 (2026-10-07): live v2 test still flagged correct English (4 unneeded fixes) and the report
// invented experience. Fix is structural, not more wording: severity label + server filter,
// and answer upgrades that declare added facts are dropped. Held-out test phrases are NOT copied here.
export const FEEDBACK_GUIDANCE_VERSION = "feedback-guidance-v3";
export const FEEDBACK_GUIDANCE_SOURCES = [
  { id: "british-council-present-simple", url: "https://learnenglish.britishcouncil.org/free-resources/grammar/a1-a2/present-simple?page=1", version: "Publication date not displayed; accessed 2026-10-05", checkedOn: "2026-10-05", sections: "grammar explanation: regular actions and general truths", limit: "Grammar reference supports tense use, not accuracy of AI correction or learning benefit." },
  { id: "purdue-hyphens", url: "https://owl.purdue.edu/owl/general_writing/punctuation/hyphen_use.html", version: "Publication date not displayed; accessed 2026-10-05", checkedOn: "2026-10-05", sections: "compound modifiers", limit: "Hyphen conventions depend on context; this is not validation of every candidate phrase." },
  { id: "cefr-2020", url: "https://rm.coe.int/common-european-framework-of-reference-for-languages-learning-teaching/16809ea0d4", version: "2020 Companion Volume", checkedOn: "2026-10-05", sections: "pp.41-43,70,132,139-141", limit: "Language descriptors are references, not validation of Talkly scores or CEFR levels." },
  { id: "ets-speaking-rubrics", url: "https://www.ets.org/pdfs/toefl/toefl-ibt-speaking-rubrics.pdf", version: "Undated independent/integrated task rubrics", checkedOn: "2026-10-05", sections: "delivery, language use, topic development", limit: "Historical task rubric; audio delivery requires audio. No TOEFL score equivalence." },
  { id: "van-beuningen-2008", url: "https://pure.uva.nl/ws/files/806416/74795_323875.pdf", version: "2008", checkedOn: "2026-10-05", sections: "methods pp.283-287; results pp.289-292", limit: "62 adolescent Dutch L2 writers; does not establish AI feedback quality or interview benefit." },
  { id: "roshan-2021", url: "https://openrepository.aut.ac.nz/server/api/core/bitstreams/3bc7e8a0-cadc-44a8-b8a4-2ca0750322b4/content", version: "2021", checkedOn: "2026-10-05", sections: "methods pp.439-443; results pp.445-448", limit: "English passive in structured written tasks; extra revision did not show a significant advantage." },
  { id: "anthropic-evals", url: "https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents", version: "2026-01-09", checkedOn: "2026-10-05", sections: "evaluation structure, grader types, steps 2-6", limit: "Engineering guidance; AI review is not human calibration or learning evidence." },
  { id: "openai-evals", url: "https://developers.openai.com/api/docs/guides/evaluation-best-practices", version: "Publication date not displayed; accessed 2026-10-05", checkedOn: "2026-10-05", sections: "task-specific criteria, held-out and adversarial cases", limit: "Documentation examples do not set valid thresholds for Talkly." },
  { id: "mt-bench-2023", url: "https://proceedings.neurips.cc/paper_files/paper/2023/file/91f18a1287b398d378ef22505bf41832-Paper-Datasets_and_Benchmarks.pdf", version: "NeurIPS 2023", checkedOn: "2026-10-05", sections: "3.1-3.4; tables 2-4", limit: "Historical judge bias experiments; not an evaluation of the current Talkly model." },
  { id: "facts-grounding-2024", url: "https://storage.googleapis.com/deepmind-media/FACTS/FACTS_grounding_paper.pdf", version: "2024-12-17", checkedOn: "2026-10-05", sections: "2-3; tables 2-4", limit: "Document grounding separates relevance and source support; does not verify candidate facts externally." },
] as const;

type GuidanceStage = "correction" | "report" | "revision" | "task_selection" | "transfer";
const LEARNER_TEXT_GUIDANCE = "Follow the current mode's field-language rules. Keep JSON schema keys unchanged, but never mention internal field names, task-bank labels, affordance text, IDs or guidance versions in learner-facing prose. Use ordinary words to explain the required change. Keep exact evidence quotations in their original language. One response does not establish learning, retention or hiring readiness.";
const GUIDANCE: Record<GuidanceStage, string> = {
  correction: "PRECISION FIRST: a wrong correction teaches the learner something false, so it costs more than a missed one. Report only errors you are certain a careful English editor would mark as wrong in this context; when unsure, omit the entry. Label every entry's severity honestly: blocks_understanding, grammar_error, or style_preference for anything that is acceptable English but could be phrased differently (style_preference entries are discarded, so never relabel a preference as an error to keep it). Judge the LAST answer using its temporal/factual cues and the immediately preceding interviewer or partner question in history, not a tense imposed by older answers. Present simple can correctly express habits, methods and current facts. A numeral can determine a singular noun; do not replace it with an article merely because the noun is singular. Optional hyphenation or a less common but valid wording is not itself a vocabulary error. Distinguish tense_usage for an incorrect time reference from verb_conjugation for subject agreement. If there is no supported reason the original is wrong in context, omit the entry; do not require a correction. Treat optional style or valid English variants as alternatives, not mistakes. Each entry quotes an exact nonempty fragment of the LAST user message and fixes one genuine error; use the smallest sufficient fragment so unrelated errors do not share a category. Keep meaning, negation, actor (we versus I), numbers and factual status: a plan, hypothetical or denied event must not become a completed achievement. Accept new facts the user explicitly supplies. correctedText must differ from originalText. In the user's native language, explain the actual change and why it is needed; do not substitute generic praise. If English is correct, mistakes is empty even when content needs work. This appendix governs structured corrections, not the conversational role or reply language.",
  report: "An upgraded answer may only reorder, clarify and correct what the candidate actually said. Every action, tool, method, number and result in it must already appear in the candidate's original answer. Where more detail would help, write a bracketed placeholder for the candidate to fill in, e.g. [add one real example of ...], instead of supplying the detail. Set addsNewFacts true if the upgrade contains any fact not stated by the candidate (such upgrades are discarded). Assess each dimension separately against the existing practice anchors, using the whole answer and its actual question. Grammar accuracy does not establish relevant content; length, polished style or a confident tone do not supply missing evidence. Preserve negation, actor, time, quantities and uncertainty in summaries/upgrades. For a supported improvement, connect an original phrase, the missing requirement and one action the learner can take using their own facts. A target's successCriterion must describe observable evidence, not vague improvement. Missing personal detail calls for a request for that detail, not an invented example. No supported target means null, not a compulsory weakness.",
  revision: "Judge the whole revised answer, including clauses that qualify or contradict the quoted phrase. Explain whether the selected requirement is evidenced and name the one missing part when assessable. Separate a genuine language error from a content gap; correct grammar may need content feedback with mistakes empty. Help the learner produce their own revision; do not replace it with a full model answer. A successful revision is not evidence of retention or success on another task.",
  task_selection: "First identify every required part of instruction and successCriterion, then check whether the task question directly asks for those parts. The task's broad topic or dimension is insufficient. Never silently weaken a criterion to fit the bank. Explain the match or return null when no task elicits the full requirement. Selection is guided practice design, not proof of equal difficulty or learning.",
  transfer: "Read the entire LAST answer with the frozen question and full successCriterion. observed requires evidence for every required part and an explanation of how the quote supports it; literal quote presence alone is insufficient. Use not_observed for a clear unmet requirement, not_assessable for insufficient or ambiguous evidence. Do not approve or reject from isolated tense words, pronouns or answer length. For completed personal experience, a future plan, denied action, hypothetical action or someone else's quoted action is not proof of completion. Mixed answers may still contain a genuine completed action: assess that evidence and any contradiction. A team statement alone does not show the candidate's specific action, but a stated personal contribution within teamwork can. For the explicitly hypothetical polite-request task, a proposed utterance can be the required evidence; it is not a claimed personal achievement. Correct grammar and fulfilled content are separate judgements. Explain the decision in the user's native language and preserve uncertainty when evidence is inadequate.",
};

export function renderFeedbackGuidance(stage: GuidanceStage): string {
  const learnerText = stage === "correction" || stage === "report" ? ` ${LEARNER_TEXT_GUIDANCE}` : "";
  return `[${FEEDBACK_GUIDANCE_VERSION}:${stage}] ${GUIDANCE[stage]}${learnerText}`;
}

type Correction = { category: string; originalText: string; correctedText: string; note: string; severity?: string };

const sameIgnoringHyphens = (a: string, b: string) => a.replace(/[\s-]+/g, " ").trim() === b.replace(/[\s-]+/g, " ").trim();
// ponytail: spelling heuristic for a vowel sound; misses silent h ("an hour") and "um-" words. Upgrade = pronunciation lexicon.
const VOWEL_SOUND = /^(a|i|e(?!u|we)|o(?!ne\b|nce\b)|un(?!i|an))/i;
// "an unfamiliar" -> "a unfamiliar" (live v3) makes correct English wrong.
function breaksAnArticle(original: string, corrected: string): boolean {
  const match = /\ban\s+([a-z]+)/i.exec(original);
  return !!match && VOWEL_SOUND.test(match[1]) && corrected === original.replace(/\ban(\s+)/i, (word, space) => (word[0] === "A" ? "A" : "a") + space);
}

// Provenance/shape + self-declared severity: this cannot prove a correction is needed or preserves meaning.
// Entries without severity (pre-v3 data, test doubles) are kept so older behaviour is unchanged.
export function filterGroundedCorrections<T extends Correction>(mistakes: T[], lastUserMessage: string): T[] {
  const seen = new Set<string>();
  return mistakes.filter(mistake => {
    if (mistake.severity === "style_preference") return false;
    if (!mistake.originalText.trim() || !lastUserMessage.includes(mistake.originalText)
      || !mistake.correctedText.trim() || !mistake.note.trim()
      || sameIgnoringHyphens(mistake.originalText, mistake.correctedText)
      || breaksAnArticle(mistake.originalText, mistake.correctedText)) return false;
    const identity = JSON.stringify([mistake.category, mistake.originalText, mistake.correctedText]);
    if (seen.has(identity)) return false;
    seen.add(identity);
    return true;
  });
}
