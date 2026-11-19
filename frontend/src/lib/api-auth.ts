import "server-only";
import { createHash, randomBytes } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
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
