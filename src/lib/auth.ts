import { createClient } from "@/lib/supabase/server";

const ADMIN_ROLES = new Set(["owner", "admin"]);

export interface ViewerContext {
  userId: string | null;
  role: string | null;
  aal: "aal1" | "aal2" | null;
  /** True only for owner|admin at AAL2 — gates inline editing (§4, §11). */
  isEditor: boolean;
}

/**
 * Resolve the current viewer's role + assurance level on the server. Used to
 * decide whether admin-only affordances (e.g. inline text editing) are
 * rendered AT ALL — never rendered-then-hidden with CSS (guidelines §4, §12).
 * Returns a non-editor context in demo mode.
 */
export async function getViewerContext(): Promise<ViewerContext> {
  const supabase = await createClient();
  if (!supabase) {
    return { userId: null, role: null, aal: null, isEditor: false };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { userId: null, role: null, aal: null, isEditor: false };
  }

  const { data: aalData } =
    await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  const aal = (aalData?.currentLevel as "aal1" | "aal2" | null) ?? "aal1";

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const role = profile?.role ?? null;
  const isEditor = aal === "aal2" && role !== null && ADMIN_ROLES.has(role);

  return { userId: user.id, role, aal, isEditor };
}
