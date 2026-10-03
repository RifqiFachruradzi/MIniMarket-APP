import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "mm_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 12; // 12 jam

export type SessionPayload = { userId: number; name: string; email: string; role: "admin" | "kasir" };

function secretKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret && process.env.NODE_ENV === "production") {
    throw new Error("AUTH_SECRET wajib diisi pada environment production.");
  }
  return new TextEncoder().encode(secret ?? "dev-only-secret-minimarket-app-change-me");
}

export async function signSession(payload: SessionPayload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(secretKey());
}

export async function verifySession(token: string | undefined): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: ["HS256"] });
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}
