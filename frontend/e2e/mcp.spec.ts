import { expect, test, type APIRequestContext } from "@playwright/test";
import { serviceGet, signIn } from "./helpers";

// Trackr's MCP server as an assistant sees it: JSON-RPC over HTTP with a profile token.
async function rpc(request: APIRequestContext, token: string | null, method: string, params: object = {}) {
  const res = await request.post("/api/mcp", {
    headers: {
      Accept: "application/json, text/event-stream",
      "Content-Type": "application/json",
      "MCP-Protocol-Version": "2025-06-18",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    data: { jsonrpc: "2.0", id: 1, method, params },
  });
  const body = await res.text();
  // Streamable HTTP may answer as an SSE stream; the reply is its data line.
  const json = body.startsWith("{") ? body : body.split("\n").find((l) => l.startsWith("data:"))?.slice(5);
  return { status: res.status(), json: json ? JSON.parse(json) : null };
}

const toolText = (r: { json: { result: { content: { text: string }[] } } }) => JSON.parse(r.json.result.content[0].text);

test("an assistant searches, builds a kit and moves the application with a token", async ({ page, request }, info) => {
  test.skip(info.project.name !== "desktop", "one pass is enough");
  const stamp = Date.now();
  const email = `e2e-mcp-${stamp}@test.local`;
  await signIn(page, email);

  await page.goto("/profile");
  const section = page.getByRole("region", { name: "Extension & API tokens" });
  await section.getByLabel("Token name").fill(`Claude ${stamp}`);
  await section.getByRole("button", { name: "Create token" }).click();
  const token = (await section.getByLabel("New token").textContent())!.trim();

  expect((await rpc(request, null, "tools/list")).status).toBe(401);
  const tools = await rpc(request, token, "tools/list");
  expect(tools.json.result.tools.map((t: { name: string }) => t.name).sort()).toEqual(
    ["build_apply_kit", "get_job", "list_applications", "log_application", "search_jobs", "update_status"]
  );

  const found = toolText(await rpc(request, token, "tools/call", { name: "search_jobs", arguments: { query: "Data Analyst" } }));
  const job = found.jobs.find((j: { title: string }) => j.title === "Data Analyst Intern");
  expect(job).toBeTruthy();

  const kit = toolText(await rpc(request, token, "tools/call", { name: "build_apply_kit", arguments: { job_id: job.id } }));
  expect(kit.role).toBe("Data Analyst Intern");
  expect(kit.answers.find((a: { label: string }) => /email/i.test(a.label)).value).toBe(email);

  const moved = toolText(await rpc(request, token, "tools/call", { name: "update_status", arguments: { application_id: kit.application_id, status: "interviewing" } }));
  expect(moved.status).toBe("interviewing");
  const [app] = (await serviceGet(`applications?select=status,applied_at,kit&id=eq.${kit.application_id}`)) as { status: string; applied_at: string | null; kit: object | null }[];
  expect(app.status).toBe("interviewing");
  expect(app.applied_at).not.toBeNull();
  expect(app.kit).not.toBeNull();

  const listed = toolText(await rpc(request, token, "tools/call", { name: "list_applications", arguments: { status: "interviewing" } }));
  expect(listed.map((a: { id: string }) => a.id)).toEqual([kit.application_id]);
});
