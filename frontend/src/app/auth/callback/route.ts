import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/safe-redirect";

// Handles both the OAuth (?code=) and magic-link PKCE redirects.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = safeNextPath(searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // First sign-in: set up the application profile before anything else.
      const { data: setup } = await supabase.from("application_profiles").select("onboarded_at").maybeSingle();
      if (!setup?.onboarded_at && !next.startsWith("/onboarding")) {
        return NextResponse.redirect(`${origin}/onboarding?next=${encodeURIComponent(next)}`);
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
