import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

type CookieToSet = { name: string; value: string; options: CookieOptions };
import {
  SUPABASE_ANON_KEY,
  SUPABASE_URL,
  isSupabaseConfigured,
} from "@/lib/config";

/** Assurance level from the Supabase JWT: aal1 = password only, aal2 = MFA. */
export type Aal = "aal1" | "aal2" | null;

export interface SessionState {
  response: NextResponse;
  isAuthenticated: boolean;
  aal: Aal;
}

/**
 * Refreshes the Supabase session on every request and reports auth + MFA state
 * so middleware can gate routes. In demo mode it reports "not authenticated"
 * and lets public pages render.
 *
 * `requestHeaders` carries the per-request CSP nonce (see security.ts) so the
 * `NextResponse.next` responses forward it to the app render — Next.js reads
 * the nonce from the request `Content-Security-Policy` header and stamps its
 * own scripts with it.
 */
export async function updateSession(
  request: NextRequest,
  requestHeaders: Headers,
): Promise<SessionState> {
  let response = NextResponse.next({ request: { headers: requestHeaders } });

  if (!isSupabaseConfigured()) {
    return { response, isAuthenticated: false, aal: null };
  }

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: CookieToSet[]) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        response = NextResponse.next({ request: { headers: requestHeaders } });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  // getUser() revalidates the token against Supabase (do not trust getSession
  // alone in middleware).
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let aal: Aal = null;
  if (user) {
    const { data } =
      await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    aal = (data?.currentLevel as Aal) ?? "aal1";
  }

  return { response, isAuthenticated: Boolean(user), aal };
}
