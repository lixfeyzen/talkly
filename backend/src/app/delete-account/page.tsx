'use client';

import { useState, type FormEvent } from "react";

// Halaman web hapus akun (syarat Google Play: hapus akun tanpa harus membuka app).
// Sama dengan tombol Delete account di Settings: masuk dulu, lalu DELETE /api/auth/me
// dengan password. Semua data akun ikut terhapus lewat ON DELETE CASCADE.
export default function DeleteAccountPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [state, setState] = useState<"idle" | "working" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (state === "working") return;
    if (!email.trim() || !password) {
      setError("Enter your account email and password.");
      return;
    }
    setError(null);
    setState("working");
    try {
      const login = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      if (login.status === 429) throw new Error("Too many attempts. Please wait a minute and try again.");
      if (!login.ok) throw new Error("That email and password don't match a Talkly account.");
      const { token } = (await login.json()) as { token: string };
      const del = await fetch("/api/auth/me", {
        method: "DELETE",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ password }),
      });
      if (!del.ok) throw new Error("Couldn't delete your account. Please try again.");
      setState("done");
      setPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't delete your account. Please try again.");
      setState("idle");
    }
  }

  return (
    <main style={styles.main}>
      <h1 style={styles.h1}>Delete your Talkly account</h1>
      {state === "done" ? (
        <p style={styles.p}>Your account and all of its data have been deleted.</p>
      ) : (
        <>
          <p style={styles.p}>
            This permanently deletes your Talkly account and everything linked to it: your profile,
            conversations, interview reports, progress and practice history. It can&apos;t be undone.
            You can also do this in the app under Settings, Delete account.
          </p>
          <form onSubmit={handleSubmit} style={styles.form}>
            <label style={styles.label}>
              Email
              <input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} style={styles.input} />
            </label>
            <label style={styles.label}>
              Password
              <input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} style={styles.input} />
            </label>
            {error && <p role="alert" style={styles.error}>{error}</p>}
            <button type="submit" disabled={state === "working"} style={styles.button}>
              {state === "working" ? "Deleting..." : "Delete my account"}
            </button>
          </form>
          <p style={styles.small}>Forgot your password? Reset it in the app first, then come back here.</p>
        </>
      )}
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  main: { maxWidth: 440, margin: "0 auto", padding: "48px 20px", fontFamily: "system-ui, sans-serif", color: "#15141A" },
  h1: { fontSize: 26, lineHeight: 1.2, margin: "0 0 12px" },
  p: { fontSize: 16, lineHeight: 1.5, color: "#3F3E46" },
  form: { display: "flex", flexDirection: "column", gap: 14, marginTop: 20 },
  label: { display: "flex", flexDirection: "column", gap: 6, fontSize: 14, fontWeight: 600 },
  input: { height: 46, padding: "0 12px", fontSize: 16, border: "1px solid #D9D8DE", borderRadius: 12 },
  error: { color: "#B42318", fontSize: 14, margin: 0 },
  button: { height: 48, border: 0, borderRadius: 12, background: "#D92D20", color: "#FFFFFF", fontSize: 16, fontWeight: 700, cursor: "pointer" },
  small: { fontSize: 14, color: "#5F5E66", marginTop: 20 },
};
