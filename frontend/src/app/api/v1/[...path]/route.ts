import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const GATEWAY_URL =
  process.env.API_GATEWAY_URL || "https://trackr-gateway.onrender.com";

async function proxyRequest(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const resolvedParams = await params;
  const path = resolvedParams.path ? resolvedParams.path.join("/") : "";
  const search = req.nextUrl.search;
  const targetUrl = `${GATEWAY_URL}/api/v1/${path}${search}`;

  const headers: Record<string, string> = {};
  req.headers.forEach((value, key) => {
    // Exclude host header to prevent SSL SNI mismatches with Render
    if (key.toLowerCase() !== "host" && key.toLowerCase() !== "connection") {
      headers[key] = value;
    }
  });

  try {
    const fetchOptions: RequestInit = {
      method: req.method,
      headers,
      cache: "no-store",
    };

    if (req.method !== "GET" && req.method !== "HEAD") {
      const body = await req.arrayBuffer();
      if (body.byteLength > 0) {
        fetchOptions.body = body;
      }
    }

    const res = await fetch(targetUrl, fetchOptions);
    const contentType = res.headers.get("content-type") || "application/json";

    // Handle Server-Sent Events (SSE) streaming for interview simulator
    if (contentType.includes("text/event-stream")) {
      return new Response(res.body, {
        status: res.status,
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache, no-transform",
          Connection: "keep-alive",
        },
      });
    }

    const resData = await res.arrayBuffer();
    const responseHeaders: Record<string, string> = {
      "Content-Type": contentType,
      "Access-Control-Allow-Origin": "*",
    };

    return new NextResponse(resData, {
      status: res.status,
      headers: responseHeaders,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        error: "Gateway proxy failure",
        details: err.message,
        target_url: targetUrl,
      },
      { status: 502 }
    );
  }
}

export const GET = proxyRequest;
export const POST = proxyRequest;
export const PUT = proxyRequest;
export const PATCH = proxyRequest;
export const DELETE = proxyRequest;
export const HEAD = proxyRequest;
export const OPTIONS = proxyRequest;
