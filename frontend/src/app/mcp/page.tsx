import type { Metadata } from "next";
import Link from "next/link";
import LegalPage from "@/components/LegalPage";
import { CopyButton } from "../guide/CopyButton";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Use Trackr from Claude and other AI assistants | Trackr",
  description:
    "Trackr's MCP server lets Claude, Cursor and other assistants search Canadian tech internships, build apply kits and update your tracker, with your own API token.",
  alternates: { canonical: "/mcp" },
};

const COMMAND = `claude mcp add --transport http trackr ${SITE_URL}/api/mcp --header "Authorization: Bearer YOUR_TOKEN"`;
const CONFIG = JSON.stringify({ mcpServers: { trackr: { url: `${SITE_URL}/api/mcp`, headers: { Authorization: "Bearer YOUR_TOKEN" } } } }, null, 2);

const TOOLS: [string, string][] = [
  ["search_jobs", "Search the feed by keywords, province, work mode, job type, term and recency, sorted by your match."],
  ["get_job", "Read one posting in full, with whether it's still open."],
  ["build_apply_kit", "Track a job and answer its application form from your saved profile. Open-ended questions are left for you."],
  ["log_application", "Add a job you found somewhere else."],
  ["list_applications", "See your tracker, optionally by status."],
  ["update_status", "Move an application, e.g. to Interviewing."],
];

export default function McpPage() {
  return (
    <LegalPage title="Use Trackr from your AI assistant" updated="November 2026">
      <p>
        Trackr runs a <a href="https://modelcontextprotocol.io">Model Context Protocol</a> server, so Claude, Cursor and
        other assistants can search jobs and keep your tracker up to date while you talk to them. They act as you, with
        a token you can revoke at any time. Nothing ever submits an application: you do that yourself on the
        employer&apos;s site.
      </p>

      <h2>1. Create a token</h2>
      <p>
        On your <Link href="/profile">profile</Link>, under <strong>Extension &amp; API tokens</strong>, create a token
        and copy it. It&apos;s shown once. The same token works for the Chrome extension.
      </p>

      <h2>2. Add Trackr to your assistant</h2>
      <p>In Claude Code, run this with your token in place of YOUR_TOKEN:</p>
      <pre className="overflow-x-auto rounded-xl bg-slate-100 p-3 text-[13px]"><code>{COMMAND}</code></pre>
      <CopyButton text={COMMAND} />
      <p>For clients that take a JSON config (Claude Desktop, Cursor and others):</p>
      <pre className="overflow-x-auto rounded-xl bg-slate-100 p-3 text-[13px]"><code>{CONFIG}</code></pre>
      <CopyButton text={CONFIG} />

      <h2>3. What it can do</h2>
      <ul>
        {TOOLS.map(([name, what]) => (
          <li key={name}><code>{name}</code>: {what}</li>
        ))}
      </ul>
      <p>
        Try: &quot;Find remote summer 2027 backend internships that match my resume, and build an apply kit for the best
        one.&quot;
      </p>

      <h2>Limits and privacy</h2>
      <ul>
        <li>Each token can make 300 requests an hour.</li>
        <li>Your assistant sees what the tools return: job postings, your tracker and your saved application answers. Self-identification answers are included only when a form asks for them.</li>
        <li>Revoke a token on your profile and it stops working immediately.</li>
      </ul>
    </LegalPage>
  );
}
