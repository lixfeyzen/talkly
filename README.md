# Talkly

**AI conversation practice partner for language learners who know the grammar but freeze up in real conversation.**

## The problem

Apps like Duolingo are excellent at building vocabulary and grammar knowledge through bite-sized drills — but drilling isn't the same skill as constructing a sentence yourself, in real time, under a bit of social pressure. Plenty of learners can pass every lesson and still blank out the first time they actually have to order coffee in the language they've been "learning" for months. There's no low-stakes, always-available way to practice the *use* of a language before you're forced to use it for real.

Talkly is built specifically for that gap: learners who already have the book knowledge and need the conversational reflex.

## How it works

1. Pick a target language and a real-life scenario (ordering coffee, a job interview, asking for directions, casual small talk).
2. Have a text conversation with an AI playing that scenario, in-character, in the target language.
3. Mistakes in your messages are detected and corrected inline, tagged by category (verb conjugation, tense, gender agreement, word order, etc.) — not just flagged, but *tracked*.
4. Over multiple sessions, the app builds a picture of which patterns you actually struggle with, so future practice can target them instead of drilling things you've already mastered.

This is deliberately **not** a wrapper around a single ChatGPT prompt. The value is in the parts a raw chat interface doesn't give you for free: a persistent record of your mistakes across sessions, and a system built to act on that record (adaptive scenario selection, spaced practice) rather than just answer one question at a time.

## Status

This is an active portfolio project, not a finished product. Honest breakdown of what's built vs. planned:

| Feature | Status |
|---|---|
| Auth (register/login, JWT) | Built, pending live verification |
| Roleplay conversation with an AI partner | Built, pending live verification |
| Structured mistake detection & persistent tracking | Built, pending live verification |
| Adaptive scenario selection based on weak points | Not started |
| Daily streak + practice reminders | Not started |
| Progress dashboard | Not started |

## Stack

- **Mobile:** React Native + Expo (Expo Router), TypeScript
- **Backend:** Next.js API routes, deployed independently from the mobile client
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
