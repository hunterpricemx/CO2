/**
 * Game Session — httpOnly cookie with HMAC-SHA256 signature
 *
 * Sessions are stored entirely client-side in a signed httpOnly cookie.
 * The signature uses HMAC-SHA256 with GAME_SESSION_SECRET from env.
 *
 * No database lookups are needed to verify a session — the signature
 * guarantees integrity. To invalidate all sessions, rotate the secret.
 *
 * @module lib/session
 */

import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

const COOKIE_NAME = "game_session";
const MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export interface GameSessionData {
  uid: number;      // accounts.EntityID
  username: string; // accounts.Username
  email: string;    // accounts.Email
  version?: 1 | 2;
}

function getSecret(): string {
  const s = process.env.GAME_SESSION_SECRET;
  if (!s) throw new Error("GAME_SESSION_SECRET is not set in environment");
  return s;
}

function sign(payload: string): string {
  return createHmac("sha256", getSecret()).update(payload).digest("base64url");
}

function buildToken(data: GameSessionData): string {
  const payload = Buffer.from(
    JSON.stringify({ ...data, exp: Date.now() + MAX_AGE * 1000 }),
  ).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

function verifyToken(token: string): GameSessionData | null {
  const dot = token.lastIndexOf(".");
  if (dot === -1) return null;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);

  const expected = sign(payload);
  try {
    const eBuf = Buffer.from(expected, "base64url");
    const sBuf = Buffer.from(sig, "base64url");
    if (eBuf.length !== sBuf.length || !timingSafeEqual(eBuf, sBuf)) return null;
  } catch {
    return null;
  }

  let data: GameSessionData & { exp: number };
  try {
    data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    return null;
  }

  if (!data.exp || data.exp < Date.now()) return null;
  return { uid: data.uid, username: data.username, email: data.email, version: data.version };
}

/** Read and verify the game session from the request cookie. */
export async function getGameSession(): Promise<GameSessionData | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

/** Write a new signed game session cookie. */
export async function setGameSession(data: GameSessionData): Promise<void> {
  const cookieStore = await cookies();
  const envSecure = process.env.GAME_SESSION_SECURE_COOKIE;
  const secureCookie =
    envSecure === "true"
      ? true
      : envSecure === "false"
        ? false
        : process.env.NODE_ENV === "production";

  cookieStore.set(COOKIE_NAME, buildToken(data), {
    httpOnly: true,
    secure: secureCookie,
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}

/** Delete the game session cookie (logout). */
export async function clearGameSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}
