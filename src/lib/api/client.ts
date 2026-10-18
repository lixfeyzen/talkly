import { Platform } from 'react-native';
import { getToken } from '@/lib/auth/token-storage';

// Backend Next.js jalan di port 3001 (lihat backend/: `next dev -p 3001`).
// WEB: alamat API DITURUNKAN dari host halaman (localhost -> localhost:3001,
// buka via IP LAN -> IP itu juga) -- kebal terhadap IP Wi-Fi yang berubah,
// kelas bug yang sudah dua kali menggigit. Env hanya menang bila menunjuk
// URL non-lokal (produksi).
// NATIVE (Expo Go/APK dev): tak ada window -- pakai EXPO_PUBLIC_API_URL.
function resolveBaseUrl(): string {
  const env = process.env.EXPO_PUBLIC_API_URL;
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const envIsLocalNetwork = !env || /localhost|127\.0\.0\.1|192\.168\.|10\.|172\./.test(env);
    if (envIsLocalNetwork) {
      return `${window.location.protocol}//${window.location.hostname}:3001`;
    }
  }
  return env ?? 'http://localhost:3001';
}

export const API_BASE_URL = resolveBaseUrl();

// Batas tunggu request -- tanpa ini, server yang hang bikin UI muter selamanya.
const DEFAULT_TIMEOUT_MS = 15_000;
// Panggilan AI (conversation) butuh lebih lama dari CRUD biasa.
export const AI_TIMEOUT_MS = 60_000;

export class ApiError extends Error {
  status: number;
  body: unknown;

  constructor(status: number, body: unknown) {
    super(`API request failed with status ${status}`);
    this.status = status;
    this.body = body;
  }
}

// Server tidak tercapai / timeout -- beda dari ApiError (server MENJAWAB
// dengan status error). UI bisa kasih pesan "tidak bisa terhubung".
export class NetworkError extends Error {
  constructor(cause?: unknown) {
    super('Cannot reach API server');
    this.cause = cause;
  }
}

// 429 dari backend (rate limit) -> pesan yang menyebut kapan boleh coba lagi.
// null = bukan 429, pemanggil pakai pesan error biasanya.
export function rateLimitMessage(err: unknown): string | null {
  if (!(err instanceof ApiError) || err.status !== 429) return null;
  const sec = (err.body as { retryAfterSec?: unknown } | null)?.retryAfterSec;
  if (typeof sec !== 'number' || !Number.isFinite(sec) || sec <= 0) {
    return 'Too many attempts. Please wait a moment and try again.';
  }
  const wait = sec < 120 ? `${Math.ceil(sec)} seconds` : `${Math.ceil(sec / 60)} minutes`;
  return `Too many attempts. Try again in ${wait}.`;
}

export async function apiFetch<T>(
  path: string,
  options: { method?: string; body?: unknown; auth?: boolean; timeoutMs?: number } = {},
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (options.auth) {
    const token = await getToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }

  // AbortController manual, bukan AbortSignal.timeout() -- yang terakhir
  // belum tentu tersedia di Hermes (React Native).
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? DEFAULT_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      method: options.method ?? 'GET',
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    });
  } catch (err) {
    // fetch melempar (bukan balikin status) saat koneksi gagal/timeout.
    throw new NetworkError(err);
  } finally {
    clearTimeout(timer);
  }

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw new ApiError(res.status, data);
  }

  return data as T;
}
