# Talkly

English job-interview practice for non-native professionals.

The problem being tested is practical: candidates need to explain their own experience
clearly in English and respond to a different question without memorizing an AI script.
Talkly's usefulness to target users has not yet been established.

## Current v1 flow

1. Start a five-question English interview with your chosen role.
2. Read practice feedback and corrections explained in your native language.
3. When a report has a valid linked target, revise that original answer in your own words.
4. Try a saved new question with the same criterion, when the AI suggests a supported task.
5. Read AI feedback with evidence from your new answer; reopen all three sessions in History.

Original interviews, answer revisions and guided applications stay separate.
Targets and task selections may be absent. Older reports remain readable with an explicit
general-practice fallback; they are not regenerated to invent missing links.

Home starts the interview flow and preserves a valid saved role. Generic targeted practice
is a secondary option. Its correction focus and the countdown use the same last-28-days rule;
Dashboard labels recent focus separately from historical activity totals.
Weekly Challenge and monetization are deferred. Weekly entry and execution are disabled
for v1; its code and read-only historical conversations are retained.

## Evidence and limits

B1–B3 passed local and real-browser checks using fabricated accounts, answers and AI responses.
Navigation/recent-focus/Weekly changes belong to B4; consult
[PROJECT-NOTES](docs/PROJECT-NOTES.md) for the current milestone and exact evidence.

Typed model output and a verified literal quote do not certify that the advice is correct.
Visible criteria make the new-question task guided practice, not an independent learning test.
Scores describe individual practice answers. Higher scores, correction counts and streaks
do not establish mastery, anxiety relief, speaking ability or hiring readiness.

Real-model quality/cost, production release, the current Android build, voice/reminders
on a target device, and benefit to target users still need separate acceptance.
The older APK/emulator checks do not cover this current source.

## Stack

- **Mobile:** React Native + Expo (Expo Router), TypeScript
- **Backend:** Next.js API routes, deployable independently from the mobile client
- **Database:** Neon (serverless Postgres) + Drizzle ORM
- **AI:** OpenAI, structured outputs (`zodResponseFormat`) so the model returns a typed `{ reply, mistakes[] }` shape in one call instead of free-text that has to be parsed and hoped for
- **Auth:** JWT (Bearer token), not cookie sessions — mobile clients don't get a browser's cookie jar, so this is the standard pattern rather than a workaround

Backend and mobile client are separate deployable units living in one repo (`backend/` + the Expo app at the root) so the whole project reads as one coherent product, not two disconnected halves.

## Running it locally

**Backend** (`backend/`):
```bash
npm install
cp .env.local.example .env.local   # fill in DATABASE_URL, JWT_SECRET, OPENAI_API_KEY
npm run db:migrate
npm run dev
```

**Mobile** (project root):
```bash
npm install
npx expo start
```

Point the mobile app at your local backend via `EXPO_PUBLIC_API_URL`.
