# Talkly — backend

Next.js API backend for [Talkly](../README.md). Serves the mobile client — no browser-facing pages of its own.

## Setup

```bash
npm install
cp .env.local.example .env.local
```

Fill in `.env.local`:
- `DATABASE_URL` — Neon (Postgres) connection string
- `JWT_SECRET` — random string, e.g. `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
- `OPENAI_API_KEY` — from platform.openai.com/api-keys

```bash
npm run db:generate   # generate a migration from the current schema
npm run db:migrate    # apply migrations to the DB in DATABASE_URL
npm run dev            # http://localhost:3000
```

## API

All endpoints return JSON. Protected endpoints expect `Authorization: Bearer <token>`.

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | — | Create an account, returns `{ token, user }` |
| POST | `/api/auth/login` | — | Returns `{ token, user }` |
| GET | `/api/auth/me` | ✓ | Returns the current user |
| POST | `/api/conversations` | ✓ | Send a message in a scenario. Omit `sessionId` + include `scenario`/`targetLanguage` to start a new session; include `sessionId` to continue one. Returns `{ sessionId, reply, mistakes[] }` |

## Design notes

- **Password hashing:** bcrypt, 10 salt rounds.
- **JWT:** 30-day expiry, HMAC-signed. No refresh-token rotation — a deliberate simplification for a portfolio-scale project, not an oversight; revisit if this ever needs to support account compromise / forced logout.
- **Mistake detection:** one OpenAI call per turn returns both the in-character reply and a structured list of detected mistakes (`lib/ai/conversation.ts`), using `zodResponseFormat` so the response is typed instead of free-text that needs parsing.
- **Conversation history sent to the model is capped at the last 20 turns** — full history is still persisted, but resending an unbounded transcript on every turn would grow cost and latency without limit as a session gets long.
- **`user_mistake_stats` has a unique constraint on `(user_id, category)`** — required for the upsert in `lib/data/conversations.ts` to be valid at the database level, not just type-check.

## Tests

```bash
npm run test:validations   # input validation schemas — no external services needed
npm run test:auth          # full auth flow against the live DB in DATABASE_URL
```
