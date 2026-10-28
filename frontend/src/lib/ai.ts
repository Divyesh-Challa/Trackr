import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { z } from "zod";
import { createClient } from "./supabase/server";
import { createAdminClient } from "./supabase/admin";

export const AI_MODEL = "claude-sonnet-5-5";
// USD per million tokens (input, output) for cost logging and the daily budget breaker.
const PRICE = { input: 2, output: 10 };

export type AiFeature = "tailor" | "cover_letter" | "interview_question" | "interview_feedback";

/** Monthly calls included with Pro, per feature. */
export const MONTHLY_LIMITS: Record<AiFeature, number> = {
  tailor: 30,
  cover_letter: 30,
  interview_question: 150,
  interview_feedback: 150,
};

const DAILY_BUDGET_USD = Number(process.env.AI_DAILY_BUDGET_USD ?? 5);

// Usage is logged with the service role (users can't write their own usage rows).
export function aiConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export type AiResult<T> = { ok: true; data: T } | { ok: false; error: string; code?: "not_pro" | "quota" | "budget" | "off" };

let client: Anthropic | null = null;

/**
 * One structured Claude call for the signed-in Pro user: checks quota first, records
 * usage after. Never falls back to canned text; failures come back as honest errors.
 */
export async function runStructured<S extends z.ZodType>(opts: {
  feature: AiFeature;
  system: string;
  prompt: string;
  schema: S;
  effort?: "low" | "medium" | "high";
  maxTokens?: number;
}): Promise<AiResult<z.infer<S>>> {
  if (!aiConfigured()) return { ok: false, code: "off", error: "AI tools aren't switched on yet." };

  const supabase = await createClient();
  const admin = createAdminClient()!;
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false, code: "not_pro", error: "Sign in first." };
  const { data: status, error: checkError } = await supabase.rpc("ai_check", {
    p_feature: opts.feature,
    p_monthly_limit: MONTHLY_LIMITS[opts.feature],
    p_daily_budget_usd: DAILY_BUDGET_USD,
  });
  if (checkError) return { ok: false, error: "Couldn't check your AI allowance. Try again." };
  if (status === "not_pro") return { ok: false, code: "not_pro", error: "AI tools are part of Pro." };
  if (status === "quota") return { ok: false, code: "quota", error: "You've used this month's allowance for this tool. It resets on the 1st." };
  if (status === "budget") return { ok: false, code: "budget", error: "AI tools are busy right now. Please try again tomorrow." };

  client ??= new Anthropic();
  try {
    const response = await client.beta.messages.parse({
      model: AI_MODEL,
      max_tokens: opts.maxTokens ?? 8000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: opts.effort ?? "medium", format: betaZodOutputFormat(opts.schema) },
      system: opts.system,
      messages: [{ role: "user", content: opts.prompt }],
    });

    const usage = response.usage;
    const cost = (usage.input_tokens * PRICE.input + usage.output_tokens * PRICE.output) / 1_000_000;
    await admin.rpc("ai_record", {
      p_user: auth.user.id,
      p_feature: opts.feature,
      p_model: response.model,
      p_input_tokens: usage.input_tokens,
      p_output_tokens: usage.output_tokens,
      p_cost_usd: Number(cost.toFixed(5)),
    });

    if (response.stop_reason === "refusal") {
      return { ok: false, error: "The AI couldn't help with this one. Try rephrasing or editing the job description." };
    }
    if (response.stop_reason === "max_tokens" || !response.parsed_output) {
      return { ok: false, error: "The AI's answer was cut off. Please try again." };
    }
    return { ok: true, data: response.parsed_output as z.infer<S> };
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) return { ok: false, error: "AI tools are busy. Try again in a minute." };
    if (err instanceof Anthropic.APIError) return { ok: false, error: `The AI service returned an error (${err.status}). Try again.` };
    throw err;
  }
}
