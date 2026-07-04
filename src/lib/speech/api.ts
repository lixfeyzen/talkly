import { Platform } from 'react-native';
import { API_BASE_URL, ApiError, NetworkError, AI_TIMEOUT_MS } from '@/lib/api/client';
import { getToken } from '@/lib/auth/token-storage';

// apiFetch tak dipakai di file ini: transcribe butuh multipart (bukan JSON)
// dan TTS balikannya binary audio (bukan JSON).

// Kirim rekaman ke Whisper via backend. `uri` = file lokal hasil expo-audio
// (native) ATAU blob URL (web).
export async function transcribeAudio(uri: string, mimeType: string): Promise<string> {
  const token = await getToken();
  const form = new FormData();

  if (Platform.OS === 'web') {
    const blob = await fetch(uri).then((r) => r.blob());
    form.append('audio', new File([blob], 'recording.webm', { type: blob.type || mimeType }));
  } else {
    // React Native FormData menerima descriptor {uri, name, type}.
    form.append('audio', { uri, name: 'recording.m4a', type: mimeType } as unknown as Blob);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}/api/speech/transcribe`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      body: form,
      signal: controller.signal,
    });
  } catch (err) {
    throw new NetworkError(err);
  } finally {
    clearTimeout(timer);
  }

  const data = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, data);
  return (data as { text: string }).text;
}

// Ambil audio TTS untuk sebuah teks; balikin URI yang bisa diputar player.
// Web: blob URL. Native: file mp3 di cache (expo-audio butuh file/URL nyata).
export async function fetchTtsAudioUri(text: string): Promise<string> {
  const token = await getToken();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}/api/speech/tts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ text }),
      signal: controller.signal,
    });
  } catch (err) {
    throw new NetworkError(err);
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new ApiError(res.status, data);
  }

  if (Platform.OS === 'web') {
    const blob = await res.blob();
    return URL.createObjectURL(blob);
  }

  // Native: tulis ke cache sbg base64 -> file mp3.
  const { File, Paths } = await import('expo-file-system');
  const bytes = new Uint8Array(await res.arrayBuffer());
  const file = new File(Paths.cache, `tts-${Date.now()}.mp3`);
  file.write(bytes);
  return file.uri;
}
