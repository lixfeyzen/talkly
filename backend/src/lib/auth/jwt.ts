import jwt from "jsonwebtoken";

const JWT_SECRET: string =
  process.env.JWT_SECRET ??
  (() => {
    throw new Error("JWT_SECRET is not set");
  })();

const EXPIRES_IN: jwt.SignOptions["expiresIn"] = "30d";

export type AuthTokenPayload = {
  userId: string;
  email: string;
  authVersion?: number;
};

export function signAuthToken(payload: AuthTokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: EXPIRES_IN });
}

export function verifyAuthToken(token: string): AuthTokenPayload | null {
  try {
    const payload = jwt.verify(token, JWT_SECRET, { algorithms: ["HS256"] });
    if (typeof payload === "string" || typeof payload.userId !== "string" || !payload.userId
      || typeof payload.email !== "string"
      || (payload.authVersion !== undefined && (!Number.isInteger(payload.authVersion) || payload.authVersion < 0))) return null;
    return payload as AuthTokenPayload;
  } catch {
    return null;
  }
}
