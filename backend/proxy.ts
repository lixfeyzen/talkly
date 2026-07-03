import { NextResponse, type NextRequest } from "next/server";

// CORS for /api/*. Native iOS/Android don't enforce CORS at all -- this is
// purely for the web target (Expo's web build + local dev in a browser).
// Allow-listing "*" is acceptable here because auth is Bearer-token based,
// not cookies -- a malicious site can't silently attach another user's
// token the way it could auto-send a cookie, so the usual CSRF risk behind
// "never use * with credentials" doesn't apply to this API.
export function proxy(req: NextRequest) {
  if (req.method === "OPTIONS") {
    return new NextResponse(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  const res = NextResponse.next();
  res.headers.set("Access-Control-Allow-Origin", "*");
  return res;
}

export const config = {
  matcher: "/api/:path*",
};
