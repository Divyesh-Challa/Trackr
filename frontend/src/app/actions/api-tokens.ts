"use server";

import { createClient } from "@/lib/supabase/server";
import { hashToken, newToken } from "@/lib/api-auth";

export type ApiToken = { id: string; name: string; created_at: string; last_used_at: string | null };

export async function listApiTokens(): Promise<ApiToken[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("api_tokens").select("id, name, created_at, last_used_at").order("created_at", { ascending: false });
  return data ?? [];
}

/** Returns the token itself exactly once; only its hash is stored. */
export async function createApiToken(name: string): Promise<{ ok: true; token: string } | { ok: false; error: string }> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false, error: "Sign in first." };
  const { count } = await supabase.from("api_tokens").select("id", { count: "exact", head: true });
  if ((count ?? 0) >= 10) return { ok: false, error: "You have 10 tokens. Revoke one first." };
  const token = newToken();
  const { error } = await supabase.from("api_tokens").insert({ name: name.trim().slice(0, 60) || "Chrome extension", token_hash: hashToken(token) });
  if (error) return { ok: false, error: "Couldn't create the token. Try again." };
  return { ok: true, token };
}

export async function revokeApiToken(id: string): Promise<void> {
  const supabase = await createClient();
  await supabase.from("api_tokens").delete().eq("id", id);
}
