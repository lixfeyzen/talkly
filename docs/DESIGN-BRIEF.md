# Talkly — Design Brief / Prompt (after-login screens)

> Paste everything under the line into Claude (design mode) or any capable
> design-generation AI. Produce high-fidelity mobile screen mockups (portrait,
> 390×844) a developer implements 1:1 in React Native.
>
> This brief is derived from Talkly's EXISTING login/register screens so the whole
> app feels like ONE product. Language = **dark hero + white sheet + pastel
> accents + black CTA**, warm and high-contrast. NOT a dark purple "pro tool".
>
> Tip: if the tool struggles to render all 8 screens at once, generate one screen
> per request in the order listed — the design system section stays the same each time.

---

You are a senior product designer. Redesign the **after-login screens** of
**Talkly**, a React Native (iOS/Android) app that helps non-native English
speakers rehearse **job interviews and workplace conversations** with an AI
partner. The login/register screens already exist and set the visual language —
your job is to extend that SAME language to every screen after login, so the app
feels like one coherent product. Deliver hi-fi mockups (portrait, 390×844) for
the 8 screens below plus a small component sheet.

## Creative north star
Warm, human, confident — the calm before a big interview, not a gamified toy.
Think the **boldness of Cash App / Monzo** (black type, big numbers, one strong
CTA) meeting the **warmth of Headspace** (soft pastel, rounded, encouraging), on
a **clean white canvas** with generous whitespace. Friendly, grown-up, and
distinctly NOT a generic AI-made template.

## Who it's for
Adult job seekers and early-career professionals worldwide, English level B1–B2,
anxious about freezing when they *speak* English in real interviews. They want to
feel prepared and reassured.

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
- Lilac `#E6DCF8` (deep plum text) → Interview / readiness
- Cream `#F7EDC9` (dark text) → Trajectory / progress
- Pink `#F9D9E0` (text `#3D2A31`) → Streak
- Mint `#CDEEDB` (text `#1F4433`) → success / "strongest" highlights

**Semantic:** error `#D92D20`, success `#067647`. Always pair color with icon or text.

## Craft rules (what makes it premium on white, not generic)
- SVG line icons only (Feather / Lucide), 1.5–2px stroke, consistent size. **Never emoji.**
- Separation via hairline `#ECEDEF` border or soft shadow — never heavy boxes.
- Big, bold display numbers for scores/streaks; pastel tiles carry the color, black carries the action.
- One primary CTA per screen; everything else visually subordinate.
- Short, human microcopy. No em-dashes/en-dashes. No centered-everything layouts.
- Generous whitespace and a clear 4/8pt rhythm. Touch targets ≥44pt; respect safe areas; content clears the bottom nav.
- Press feedback (opacity / scale 0.97, 150–250ms). Every data screen has 3 states:
  loading (skeleton shimmer), empty (pastel-bubble motif + friendly line + next action), error (message + retry).

---

## Screens (after login)

### 1. Home
Top: "Talkly" wordmark + circular avatar with the user's initial (tap → Settings).
Warm greeting "Hi {name}, ready to practice?" + one-line subtitle.
**Hero card = Interview-Day Countdown** (the single focal card; lilac or dark hero
with a soft glow): "{N} days until your {Role} interview" / "Today: {task}" / one
line of description. Variants: not-set ("Have an interview coming up? Set the
date") and expired ("Your interview date has passed").
Quick-action chips (pill, icon + label): Free chat · Mock interview · Targeted practice.
Section "Workspace" → 4 white list rows, each = pastel icon tile + title + right
value + chevron: Conversations ({n} sessions, ice) · Interview readiness
({score}/100 or "not tested", lilac) · Am I getting better? (trends, cream) ·
Streak ({n} days, pink). Optional recent-corrections rows.
Bottom nav (3 tabs, icon + label, active = black): Home · Progress · Settings.

### 2. Conversation (chat practice)
Pre-start: "What do you want to practice?" + scenario chips (Job interview, Tell
me about yourself, Salary negotiation, Small talk with a colleague, Client meeting
Q&A, Networking event).
Chat: header shows scenario (or "Mock interview · {Role} · Question 3/5"). User
bubble right = black `#111114` (white text); AI bubble left = `#F2F3F5` (dark
text). Under a user bubble, inline mistake note: `original → corrected` + one line
in the user's native language. AI bubble has a small "Listen" speaker action.
Typing indicator while AI thinks. Input bar: mic button + text field (`#F2F3F5`) +
black send button. When interview ends: black "View my readiness report" button.

### 3. Interview (start a mock)
Explainer ("5 questions, like a real English interview. No corrections mid-way;
you get a readiness report at the end."). Role chips: Software Engineer, Marketing,
Sales, Finance, Designer, General. Black "Start interview" button.

### 4. Interview Readiness Report
Hero **score 0–100** — big tabular number on a dark hero band or lilac tile — plus
a one-line verdict. Dimension rows (Clarity / Structure / Confidence / Language):
label + mini bar + short comment (native language). "Strongest answer" card (mint)
and "Needs the most work" card (pink): question + why. "Top fixes" (1–3). "Answer
upgrades": original summary → stronger STAR version (English). Back-to-home.

### 5. Interview Date (set countdown)
"When is your interview?" + subtitle. Role chips. Date quick-chips (In 3 days / 1
week / 2 weeks / 1 month) + manual date field (`#F2F3F5`). Inline errors (past date
/ too far). Black "Start my countdown" button (loading state).

### 6. Progress (dashboard)
"Your progress". 3 stat tiles (Streak / Sessions / Corrections) — big tabular
numbers, each a pastel tile. "Last practiced" card. "Latest interview readiness
{score}/100" card. "Am I getting better?" entry card. "Top weaknesses" list
(category + count badge). "Recent corrections" list. Empty state (bubble motif).

### 7. Trajectory ("Am I getting better?")
Insight card: one confident sentence ("Readiness up 22 points since your first
mock. Tense mistakes down 60%."). **Readiness score line chart** over time, fixed
0–100 y-axis (honest scale), black or accent line + points, date labels; empty
state before first mock. "Mistake trends (last 2 weeks vs before)" rows: category
+ change, green (down / improving) / red (up / worsening) / neutral, words not just arrows.

### 8. Settings
Native language (editable). Change password. Notifications toggle. Sign out
(separated, danger red). Version footer.

## Deliverables
1. Hi-fi mockup of each of the 8 screens (390×844), matching the auth language.
2. Component sheet: primary (black) + secondary button, chip, list row with pastel
   icon tile, card (default + hero), input (default / focus / error), message
   bubble (user black / AI grey), stat tile, trend row, bottom nav, section label — with states.
3. Notes on font, icon set, spacing, and the pastel-to-feature mapping so a React
   Native dev can implement it 1:1 with the tokens above.
