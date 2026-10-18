import type { Metadata } from "next";

// Kebijakan privasi (syarat Google Play: tautan di Play Console dan di dalam app).
// Isi disusun dari data yang benar-benar disimpan dan dikirim kode ini; rinciannya
// di docs/kebijakan-privasi-draf-2026-10-19.md. Ubah halaman ini bila itu berubah.
export const metadata: Metadata = { title: "Talkly Privacy Policy" };

const CONTACT_EMAIL = "wiliamyohanes932@gmail.com";

export default function PrivacyPage() {
  return (
    <main style={styles.main}>
      <h1 style={styles.h1}>Talkly Privacy Policy</h1>
      <p style={styles.muted}>Last updated: 19 October 2026</p>
      <p style={styles.p}>
        Talkly helps you practice job interviews and work conversations in English. This policy explains what data
        Talkly collects, why, and how you can delete it.
      </p>

      <h2 style={styles.h2}>Data we collect</h2>
      <ul style={styles.ul}>
        <li>Account data: your email address and a securely hashed password (we never store your password in plain text). Optionally your name, your native language, your interview date and the role you are preparing for.</li>
        <li>Practice data: the messages you type or say in conversations and mock interviews, the corrections and feedback Talkly gives you, interview reports, scores and progress statistics.</li>
        <li>Voice: when you answer by voice, the recording is sent to our AI provider to turn it into text, and replies can be read aloud. Talkly does not store your voice recordings.</li>
        <li>Job posts: if you paste a job post, its text is sent to our AI provider once to create practice questions. The text itself is not stored. The questions and requirements created from it are stored with that interview.</li>
        <li>Technical data: request counters used to prevent abuse, such as limits on sign-in attempts.</li>
      </ul>
      <p style={styles.p}>We do not sell your data and we do not use it for advertising.</p>

      <h2 style={styles.h2}>How we use your data</h2>
      <ul style={styles.ul}>
        <li>To run your account and keep you signed in.</li>
        <li>To give you corrections, feedback, interview reports and progress over time.</li>
        <li>To send a password reset code when you ask for one.</li>
        <li>To protect the service from abuse.</li>
      </ul>

      <h2 style={styles.h2}>Service providers</h2>
      <p style={styles.p}>Talkly uses these providers to run the service. They process data only to provide their service to Talkly.</p>
      <ul style={styles.ul}>
        <li>OpenAI: AI feedback, speech to text and text to speech.</li>
        <li>Neon: database hosting.</li>
        <li>Vercel: server hosting.</li>
        <li>Resend: sending password reset emails.</li>
      </ul>

      <h2 style={styles.h2}>Keeping and deleting your data</h2>
      <p style={styles.p}>
        We keep your data while your account exists. You can delete your account and all of its data at any time in
        the app under Settings, Delete account, or on the web at <a href="/delete-account" style={styles.a}>the account deletion page</a>.
        Deletion is permanent and removes your profile, conversations, reports and progress.
      </p>

      <h2 style={styles.h2}>Children</h2>
      <p style={styles.p}>Talkly is not intended for children under 13.</p>

      <h2 style={styles.h2}>Changes</h2>
      <p style={styles.p}>If this policy changes, we will update the date above.</p>

      <h2 style={styles.h2}>Contact</h2>
      <p style={styles.p}>
        Questions about your data: <a href={`mailto:${CONTACT_EMAIL}`} style={styles.a}>{CONTACT_EMAIL}</a>
      </p>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  main: { maxWidth: 680, margin: "0 auto", padding: "40px 20px 64px", fontFamily: "system-ui, sans-serif", color: "#15141A" },
  h1: { fontSize: 28, lineHeight: 1.2, margin: "0 0 4px" },
  h2: { fontSize: 19, margin: "28px 0 8px" },
  p: { fontSize: 16, lineHeight: 1.6, color: "#3F3E46", margin: "8px 0" },
  ul: { fontSize: 16, lineHeight: 1.6, color: "#3F3E46", paddingLeft: 20, margin: "8px 0" },
  muted: { fontSize: 14, color: "#5F5E66", margin: 0 },
  a: { color: "#5B3FD9" },
};
