import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "./supabase/admin";
import type { Database } from "./supabase/database.types";

export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");
export const newToken = () => `trk_${randomBytes(32).toString("base64url")}`;

export type ApiCaller = { db: SupabaseClient<Database>; userId: string };

/**
 * Checks an `Authorization: Bearer trk_…` header and spends one request from the user's 'api'
 * rate limit. The client it returns bypasses RLS, so every query must filter by `userId`.
 */
export async function authenticateApi(req: Request): Promise<ApiCaller | Response> {
  const token = req.headers.get("authorization")?.match(/^Bearer (trk_[A-Za-z0-9_-]{20,100})$/)?.[1];
  if (!token) return Response.json({ error: "Missing or malformed API token." }, { status: 401 });
  const db = createAdminClient();
  if (!db) return Response.json({ error: "The API isn't configured on this server." }, { status: 503 });
  const { data, error } = await db.rpc("api_authenticate", { p_token_hash: hashToken(token) });
  if (error) return Response.json({ error: "Couldn't check the token. Try again." }, { status: 500 });
  const row = data?.[0];
  if (!row) return Response.json({ error: "That API token was revoked or never existed." }, { status: 401 });
  if (!row.allowed) return Response.json({ error: "Too many requests. Try again in an hour." }, { status: 429 });
  return { db, userId: row.uid };
}

// Per-instance cache of short-lived user sessions, keyed by user id.
const sessions = new Map<string, { accessToken: string; expiresAt: number; email: string }>();
const noPersist = { auth: { persistSession: false, autoRefreshToken: false } };

/**
 * A client that acts as the user, so RLS and auth.uid() apply (the feed's match % needs it).
 * It mints a session server-side: a magic-link token from the admin API, verified at once and
 * never emailed. shortcut: one session per user per instance per hour; switch to signing JWTs
 * with Supabase's signing keys if auth rate limits bite.
 */
export async function userClient(db: SupabaseClient<Database>, userId: string): Promise<{ client: SupabaseClient<Database>; email: string } | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
  let session = sessions.get(userId);
  if (!session || session.expiresAt - 300 < Date.now() / 1000) {
    const { data: user } = await db.auth.admin.getUserById(userId);
    const email = user.user?.email;
    if (!email) return null;
    const { data: link, error } = await db.auth.admin.generateLink({ type: "magiclink", email });
    if (error) return null;
    const { data: verified } = await createClient(url, key, noPersist).auth.verifyOtp({ token_hash: link.properties.hashed_token, type: "magiclink" });
    if (!verified.session) return null;
    session = { accessToken: verified.session.access_token, expiresAt: verified.session.expires_at ?? Date.now() / 1000 + 3600, email };
    sessions.set(userId, session);
  }
  return {
    client: createClient<Database>(url, key, { ...noPersist, global: { headers: { Authorization: `Bearer ${session.accessToken}` } } }),
    email: session.email,
  };
}
