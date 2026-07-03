import { apiFetch } from '@/lib/api/client';
import { saveToken, clearToken } from '@/lib/auth/token-storage';

type AuthUser = { id: string; email: string };
type AuthResponse = { token: string; user: AuthUser };

export async function register(email: string, password: string): Promise<AuthUser> {
  const res = await apiFetch<AuthResponse>('/api/auth/register', {
    method: 'POST',
    body: { email, password },
  });
  await saveToken(res.token);
  return res.user;
}

export async function login(email: string, password: string): Promise<AuthUser> {
  const res = await apiFetch<AuthResponse>('/api/auth/login', {
    method: 'POST',
    body: { email, password },
  });
  await saveToken(res.token);
  return res.user;
}

export async function fetchCurrentUser(): Promise<AuthUser | null> {
  try {
    const res = await apiFetch<{ user: AuthUser }>('/api/auth/me', { auth: true });
    return res.user;
  } catch {
    return null;
  }
}

export async function logout(): Promise<void> {
  await clearToken();
}

// Respons selalu { ok: true } apa pun emailnya (anti email-enumeration di
// sisi server) -- UI cukup tampilkan "kalau email terdaftar, kode terkirim".
export async function forgotPassword(email: string): Promise<void> {
  await apiFetch('/api/auth/forgot-password', {
    method: 'POST',
    body: { email },
  });
}

export async function resetPassword(
  email: string,
  code: string,
  newPassword: string,
): Promise<void> {
  await apiFetch('/api/auth/reset-password', {
    method: 'POST',
    body: { email, code, newPassword },
  });
}
