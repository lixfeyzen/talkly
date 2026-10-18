# Draf kebijakan privasi Talkly (19 Oktober 2026)

Status: sudah jadi halaman web `backend/src/app/privacy/page.tsx` (/privacy) dengan kontak dari Yohanes, ditautkan dari Settings; tayang saat versi kerja digabung dan dideploy. Google Play mewajibkan tautan kebijakan privasi di Play Console dan di dalam app, juga untuk app yang tidak memakai data sensitif (https://support.google.com/googleplay/android-developer/answer/10144311).

Isinya diambil dari kode, bukan dikarang:
1. Data akun: tabel users di backend/src/lib/db/schema.ts (email, password_hash, name, native_language, interview_date, interview_plan_role).
2. Percakapan dan rapor: conversation_sessions, interview_reports, mistake_patterns, user_streaks, user_mistake_stats.
3. Suara: backend/src/app/api/speech/transcribe (whisper-1) dan tts (tts-1). Server tidak menyimpan rekaman.
4. Penyedia: OpenAI (AI), Neon (database), Vercel (server), Resend (email reset password).
5. Pengingat harian adalah notifikasi lokal di HP (src/lib/notifications.ts), tidak dikirim lewat server.
6. Hapus akun: Settings, Delete account di app, atau halaman web /delete-account. Semua tabel terhapus berantai (ON DELETE CASCADE).

---

# Talkly Privacy Policy

Last updated: [publication date]

Talkly helps you practice job interviews and work conversations in English. This policy explains what data Talkly collects, why, and how you can delete it.

## Data we collect
- Account data: your email address and a securely hashed password (we never store your password in plain text). Optionally your name, your native language, your interview date and the role you are preparing for.
- Practice data: the messages you type or say in conversations and mock interviews, the corrections and feedback Talkly gives you, interview reports, scores and progress statistics.
- Voice: when you answer by voice, the recording is sent to our AI provider to turn it into text, and replies can be read aloud. Talkly does not store your voice recordings.
- Job posts: if you paste a job post, its text is sent to our AI provider once to create practice questions. The text itself is not stored. The questions and requirements created from it are stored with that interview.
- Technical data: request counters used to prevent abuse (for example, limits on sign-in attempts).

We do not sell your data and we do not use it for advertising.

## How we use your data
- To run your account and keep you signed in.
- To give you corrections, feedback, interview reports and progress over time.
- To send a password reset code when you ask for one.
- To protect the service from abuse.

## Service providers
Talkly uses these providers to run the service. They process data only to provide their service to Talkly.
- OpenAI: AI feedback, speech to text and text to speech.
- Neon: database hosting.
- Vercel: server hosting.
- Resend: sending password reset emails.

## Keeping and deleting your data
We keep your data while your account exists. You can delete your account and all of its data at any time:
- In the app: Settings, then Delete account.
- On the web: [https://talkly-api.vercel.app/delete-account]
Deletion is permanent and removes your profile, conversations, reports and progress.

## Children
Talkly is not intended for children under 13.

## Changes
If this policy changes, we will update the date above and show the new version in the app.

## Contact
wiliamyohanes932@gmail.com
