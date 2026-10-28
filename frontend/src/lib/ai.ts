import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { ApiError, FinishReason, GoogleGenAI, ThinkingLevel } from "@google/genai";
import { z } from "zod";
import { createClient } from "./supabase/server";
import { createAdminClient } from "./supabase/admin";

type Provider = "anthropic" | "gemini";

// USD per million tokens (input, output) for cost logging and the daily budget breaker.
// Gemini's figure is its paid-tier price; free-tier calls are logged at it too, so the
// budget breaker behaves the same once billing is on.
const MODELS: Record<Provider, { model: string; price: { input: number; output: number } }> = {
  anthropic: { model: "claude-sonnet-5-5", price: { input: 2, output: 10 } },
  gemini: { model: process.env.GEMINI_MODEL ?? "gemini-3.6-flash", price: { input: 0.5, output: 3 } },
};

export type AiFeature = "tailor" | "cover_letter" | "interview_question" | "interview_feedback";

/** Monthly calls included with Pro, per feature. */
export const MONTHLY_LIMITS: Record<AiFeature, number> = {
  tailor: 30,
  cover_letter: 30,
  interview_question: 150,
  interview_feedback: 150,
};

const DAILY_BUDGET_USD = Number(process.env.AI_DAILY_BUDGET_USD ?? 5);

// Gemini is opt-in (AI_PROVIDER=gemini): its free tier may use prompts for training,
// which the privacy page rules out, so it's only for local testing until billing is on.
function provider(): Provider | null {
  if (process.env.AI_PROVIDER === "gemini") return process.env.GEMINI_API_KEY ? "gemini" : null;
  return process.env.ANTHROPIC_API_KEY ? "anthropic" : null;
}

// Usage is logged with the service role (users can't write their own usage rows).
export function aiConfigured(): boolean {
  return Boolean(provider() && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export type AiResult<T> = { ok: true; data: T } | { ok: false; error: string; code?: "not_pro" | "quota" | "budget" | "off" };

type CallOptions<S extends z.ZodType> = {
  system: string;
  prompt: string;
  schema: S;
  effort: "low" | "medium" | "high";
  maxTokens: number;
};

/** What one model call produced, whichever provider ran it. */
type ModelReply<T> = {
  model: string;
  inputTokens: number;
  outputTokens: number;
  outcome: { kind: "ok"; data: T } | { kind: "refusal" } | { kind: "cut_off" } | { kind: "bad_shape" };
};

class BusyError extends Error {}
class ServiceError extends Error {
  constructor(readonly status: number) {
    super(`AI service error ${status}`);
  }
}

let anthropic: Anthropic | null = null;

async function callAnthropic<S extends z.ZodType>(o: CallOptions<S>): Promise<ModelReply<z.infer<S>>> {
  anthropic ??= new Anthropic();
  try {
    const response = await anthropic.beta.messages.parse({
      model: MODELS.anthropic.model,
      max_tokens: o.maxTokens,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: o.effort, format: betaZodOutputFormat(o.schema) },
      system: o.system,
      messages: [{ role: "user", content: o.prompt }],
    });
    const { input_tokens, output_tokens } = response.usage;
    const reply = { model: response.model, inputTokens: input_tokens, outputTokens: output_tokens };
    if (response.stop_reason === "refusal") return { ...reply, outcome: { kind: "refusal" } };
    if (response.stop_reason === "max_tokens" || !response.parsed_output) return { ...reply, outcome: { kind: "cut_off" } };
    return { ...reply, outcome: { kind: "ok", data: response.parsed_output as z.infer<S> } };
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) throw new BusyError();
    if (err instanceof Anthropic.APIError) throw new ServiceError(err.status ?? 500);
    throw err;
  }
}

let gemini: GoogleGenAI | null = null;
const GEMINI_THINKING = { low: ThinkingLevel.LOW, medium: ThinkingLevel.MEDIUM, high: ThinkingLevel.HIGH };
const GEMINI_BLOCKED = new Set<string>([
  FinishReason.SAFETY,
  FinishReason.RECITATION,
  FinishReason.BLOCKLIST,
  FinishReason.PROHIBITED_CONTENT,
  FinishReason.SPII,
]);

async function callGemini<S extends z.ZodType>(o: CallOptions<S>): Promise<ModelReply<z.infer<S>>> {
  // The SDK's default is five retries with up to 60s waits, which outlasts a server action.
  gemini ??= new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: { timeout: 90_000, retryOptions: { attempts: 2, maxDelay: 5 } },
  });
  try {
    const response = await gemini.models.generateContent({
      model: MODELS.gemini.model,
      contents: o.prompt,
      config: {
        systemInstruction: o.system,
        responseMimeType: "application/json",
        responseJsonSchema: z.toJSONSchema(o.schema),
        maxOutputTokens: o.maxTokens,
        thinkingConfig: { thinkingLevel: GEMINI_THINKING[o.effort] },
      },
    });
    const usage = response.usageMetadata;
    const reply = {
      model: response.modelVersion ?? MODELS.gemini.model,
      inputTokens: usage?.promptTokenCount ?? 0,
      // Thinking tokens are billed as output.
      outputTokens: (usage?.candidatesTokenCount ?? 0) + (usage?.thoughtsTokenCount ?? 0),
    };
    const finish = response.candidates?.[0]?.finishReason;
    if (response.promptFeedback?.blockReason || (finish && GEMINI_BLOCKED.has(finish))) return { ...reply, outcome: { kind: "refusal" } };
    if (finish === FinishReason.MAX_TOKENS) return { ...reply, outcome: { kind: "cut_off" } };
    // Gemini's schema support is looser than zod's, so validate what comes back.
    let json: unknown;
    try {
      json = JSON.parse(response.text ?? "");
    } catch {
      return { ...reply, outcome: { kind: "bad_shape" } };
    }
    const parsed = o.schema.safeParse(json);
    return { ...reply, outcome: parsed.success ? { kind: "ok", data: parsed.data } : { kind: "bad_shape" } };
  } catch (err) {
    if (err instanceof ApiError && (err.status === 429 || err.status === 503)) throw new BusyError();
    if (err instanceof ApiError) throw new ServiceError(err.status);
    throw err;
  }
}

/**
 * One structured model call for the signed-in Pro user: checks quota first, records
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
  const which = provider();
  if (!which || !aiConfigured()) return { ok: false, code: "off", error: "AI tools aren't switched on yet." };

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

  const call = { system: opts.system, prompt: opts.prompt, schema: opts.schema, effort: opts.effort ?? "medium", maxTokens: opts.maxTokens ?? 8000 };
  let reply: ModelReply<z.infer<S>>;
  try {
    reply = which === "gemini" ? await callGemini(call) : await callAnthropic(call);
  } catch (err) {
    if (err instanceof BusyError) return { ok: false, error: "AI tools are busy. Try again in a minute." };
    if (err instanceof ServiceError) return { ok: false, error: `The AI service returned an error (${err.status}). Try again.` };
    throw err;
  }

  const { price } = MODELS[which];
  const cost = (reply.inputTokens * price.input + reply.outputTokens * price.output) / 1_000_000;
  await admin.rpc("ai_record", {
    p_user: auth.user.id,
    p_feature: opts.feature,
    p_model: reply.model,
    p_input_tokens: reply.inputTokens,
    p_output_tokens: reply.outputTokens,
    p_cost_usd: Number(cost.toFixed(5)),
  });

  switch (reply.outcome.kind) {
    case "ok":
      return { ok: true, data: reply.outcome.data };
    case "refusal":
      return { ok: false, error: "The AI couldn't help with this one. Try rephrasing or editing the job description." };
    case "cut_off":
      return { ok: false, error: "The AI's answer was cut off. Please try again." };
    case "bad_shape":
      return { ok: false, error: "The AI's answer came back garbled. Please try again." };
  }
}
