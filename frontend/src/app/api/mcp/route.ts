import { createMcpHandler, withMcpAuth } from "mcp-handler";
import { authenticateApi, userClient } from "@/lib/api-auth";
import { registerTools, type ToolContext } from "@/lib/mcp-tools";

export const runtime = "nodejs";

// Trackr's MCP server. Auth is a personal API token from Profile → Extension & API tokens,
// checked (and rate-limited) once per request; tools then run as the token's owner.
const handler = withMcpAuth(
  async (req) => {
    const ctx = req.auth?.extra?.ctx as ToolContext | undefined;
    return createMcpHandler((server) => registerTools(server, async () => ctx ?? null), {
      serverInfo: { name: "trackr", version: "1.0.0" },
    })(req);
  },
  async (req, token) => {
    if (!token) return undefined;
    const caller = await authenticateApi(req);
    if (caller instanceof Response) return undefined;
    const user = await userClient(caller.db, caller.userId);
    if (!user) return undefined;
    const ctx: ToolContext = { db: user.client, userId: caller.userId, email: user.email };
    return { token, clientId: "trackr-api-token", scopes: [], extra: { ctx } };
  },
  { required: true }
);

export { handler as GET, handler as POST };
