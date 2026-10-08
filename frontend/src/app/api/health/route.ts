import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const GATEWAY_URL = process.env.API_GATEWAY_URL || "https://trackr-gateway.onrender.com";

export async function GET() {
  const start = Date.now();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    const res = await fetch(`${GATEWAY_URL}/health`, {
      signal: controller.signal,
      cache: "no-store",
      headers: {
        Accept: "application/json",
      },
    });

    clearTimeout(timeout);
    const latencyMs = Date.now() - start;

    if (!res.ok) {
      return NextResponse.json(
        {
          status: "waking",
          message: "Render free-tier gateway spinning up",
          http_status: res.status,
          latency_ms: latencyMs,
          service: "trackr-gateway",
          gateway_url: GATEWAY_URL,
        },
        { status: 503 }
      );
    }

    const data = await res.json();
    return NextResponse.json({
      ...data,
      status: "healthy",
      latency_ms: latencyMs,
      gateway_url: GATEWAY_URL,
    });
  } catch (err: any) {
    const latencyMs = Date.now() - start;
    const isTimeout = err.name === "AbortError";
    return NextResponse.json(
      {
        status: isTimeout ? "waking" : "offline",
        message: isTimeout
          ? "Backend is spinning up from cold boot (Render free tier, takes ~30s)"
          : err.message || "Failed to reach gateway",
        is_cold_start: isTimeout,
        latency_ms: latencyMs,
        service: "trackr-gateway",
        gateway_url: GATEWAY_URL,
      },
      { status: 503 }
    );
  }
}
