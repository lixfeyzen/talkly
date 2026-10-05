# Talkly — current v1 design brief

Use this brief for the interview-first product. It supersedes the earlier broad conversation
and readiness brief. Preserve the existing auth-screen identity and useful tokens below;
do not add features because an older mockup contains them.

## Purpose and audience

English interview practice for non-native professionals. Candidates use their own facts,
revise one answer, then try a different question with the same saved criterion when available.
Target English level and actual user benefit still need validation.
UI labels are English; AI correction notes, instructions and feedback explanations use the
user's native language. Practice scores are not hiring, confidence or anxiety measurements.

## Current evidence

B1–B3 have local/browser evidence with simulated AI and accounts. B4 covers navigation,
role, recent correction focus and Weekly gating; current acceptance is tracked in
[PROJECT-NOTES](PROJECT-NOTES.md). Current-source Android, voice/reminders, real-model
semantic quality and target-user benefit are separate open checks.

## The existing language to MATCH (from the auth screens)
A **dark near-black hero** at the top with white text and soft glowing **pastel
bubbles/dots** carrying short phrases ("Hello!", "Let's talk", "You got this"),
above a **white rounded sheet** (32px top corners) that holds the content.
Primary buttons are **solid black pills** with white text. Reuse this identity:
- The **pastel-bubble + floating-dots motif is the brand signature** — bring it
  back as the decorative moment in hero headers and empty states (not on every
  screen; use it where a screen needs warmth or is empty).
- Dark hero band for the top of key screens; white sheet for the body.

## Design system — use these EXACT tokens (from the live auth code)

**Surfaces**
- Screen background / sheet: `#FFFFFF`. Muted surface / input / subtle fill: `#F2F3F5`.
- Dark hero band (headers, score reveal, key moments): `#101014`, white text on it.
- Hairline card border on white: `#ECEDEF` (1px). Soft shadow on white: `rgba(17,17,20,0.06)`, y+6, blur 16.
- Radius: sheets / large cards 24–32, standard cards 20, inputs 16, buttons & chips pill (999), pastel tiles 20.

**Text**
- Primary `#111114`, secondary `#60646C`, placeholder `#8B8F98`.
- On dark hero: white primary, `rgba(255,255,255,0.7)` secondary.
- Font: clean friendly sans (system / Inter / DM Sans). Headings bold **700–800**,
  labels 500, body 400. Scale 12 / 14 / 16 / 20 / 28 / 34, line-height 1.4.
- **Tabular figures** for every number (scores, streaks, counts, dates).

**Primary action**
- One primary CTA per screen: solid black `#111114` pill, white text, weight 700.
  Disabled opacity 0.4; loading = white spinner. Secondary = ghost/text button in `#111114`.

**Pastel accent system** (functional color-coding, one per feature — consistent
everywhere; each with dark readable text on top):
- Ice `#D8EFF6` (text `#23404B`) → Conversations
- Lilac `#E6DCF8` (deep plum text) → Interview / practice feedback
- Cream `#F7EDC9` (dark text) → Trajectory / progress
- Pink `#F9D9E0` (text `#3D2A31`) → Streak
- Mint `#CDEEDB` (text `#1F4433`) → success / "strongest" highlights

**Semantic:** error `#D92D20`, success `#067647`. Always pair color with icon or text.

## Craft rules (what makes it premium on white, not generic)
- SVG line icons only (Feather / Lucide), 1.5–2px stroke, consistent size. **Never emoji.**
- Separation via hairline `#ECEDEF` border or soft shadow — never heavy boxes.
- Use clear numbers for individual practice scores/activity; the next useful action remains primary.
- One primary CTA per screen; everything else visually subordinate.
- Short, human microcopy. No em-dashes/en-dashes. No centered-everything layouts.
- Generous whitespace and a clear 4/8pt rhythm. Touch targets ≥44pt; respect safe areas; content clears the bottom nav.
- Press feedback (opacity / scale 0.97, 150–250ms). Every data screen has 3 states:
  loading (skeleton shimmer), empty (pastel-bubble motif + friendly line + next action), error (message + retry).

---

## Screens and required states

| Screen | Current v1 behavior |
|---|---|
| Home | One primary **Start interview** action. Forward a valid saved role. Countdown is optional; mock keeps that role, generic practice carries scenario/focus and an explicit return-to-interview role. Free chat remains secondary. Failed reads are visible and retryable; they never present old tasks as fresh or failures as empty history. |
| Interview | Validate the optional role against the six existing roles. Late route params can set a default; a user's manual choice takes precedence. Start five questions and receive practice feedback. |
| Conversation | Keep ordinary chat, mock interview, source-bound answer revision and guided application distinct. A revision shows the real original question/answer, one improvement and criterion. Guided application shows the frozen new question/instruction/criterion; hide old/model answers before the new response. Use another real example when available, or say none is available; the polite-request task is explicitly hypothetical. |
| Practice report | Individual score and Grammar/Structure/Content/Answer wording feedback. Fixes/upgrades may be empty and the linked target nullable. **Revise this answer** uses a valid source reference; old/null reports clearly offer general practice. Preserve archived rubrics. Never invent facts or force a STAR example. |
| Interview date | Save a valid role and date. Countdown uses recent correction focus: more than three days practice; two/three days mock; one day review; day zero light review; expired dates offer a new date. |
| Dashboard | Historical session/correction totals and activity streak. Label correction focus **last 28 days** and correction examples **latest corrections**. Practice report/history remain accessible. No Weekly card or automatic Weekly request. |
| Trajectory | Raw practice scores for individual attempts and correction activity. No score delta or role/rubric match presented as proof of learning or equivalent tasks. Link guided-practice History. |
| History | Preserve interview, revision and new-question sessions with their source links. AI feedback keeps status, exact quoted evidence and native explanation. Unverified/copy/no-answer results remain neutral. Old Weekly sessions are readable, labelled deferred, and have no practice-again action. |
| Settings | Retain existing native-language, password, notification and sign-out controls. No new account or monetization flow in this stage. |

## Product limits in the flow

Guided application visibly provides the criterion. Describe it as **AI feedback**,
not mastery or an independent test. Selection may be absent with a usable reason;
do not manufacture a task. Literal evidence supports traceability, not certified meaning.
Use plain user-facing explanations; do not show request IDs, schemas or validation machinery.

Weekly Challenge has no v1 entry or execution, including direct links. Keep its deferred
implementation and historical data; do not redesign or finish that feature in this brief.

## Deliverables

Create portrait 390×844 mockups for the screen/state map above, with loading, empty,
error/retry and source-bound practice states where relevant. Include a small component sheet:
black primary/ghost buttons, chips, pastel icon tiles, cards, inputs, message bubbles,
correction notes, score rows, status/evidence cards, bottom nav and empty-state motifs.
Keep the visual tokens consistent; show one practical next action clearly.
