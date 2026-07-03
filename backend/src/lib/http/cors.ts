import { NextResponse } from "next/server";

// CORS ditangani per-route (bukan via proxy.ts/middleware) karena middleware
// TIDAK jalan di Next 16 + Turbopack dev (manifest middleware kosong walau
// proxy.ts terkompilasi) -- terverifikasi 2026-07-03 lewat curl: header CORS
// tak pernah muncul. Pendekatan per-route ini jalan di dev DAN produksi,
// tanpa gantung ke registrasi middleware.
//
// Origin "*" aman di sini: auth pakai Bearer token (bukan cookie), jadi situs
// jahat tak bisa diam-diam melampirkan token user lain -- risiko CSRF yang
// jadi alasan "jangan pakai * dengan credentials" tidak berlaku untuk API ini.
export const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// Balasan preflight OPTIONS. Diekspor sbg handler OPTIONS di tiap route.
export function corsPreflight(): NextResponse {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

// Pengganti NextResponse.json yang otomatis menyertakan header CORS.
export function jsonCors(
  body: unknown,
  init?: { status?: number },
): NextResponse {
  return NextResponse.json(body, {
    status: init?.status ?? 200,
    headers: CORS_HEADERS,
  });
}
