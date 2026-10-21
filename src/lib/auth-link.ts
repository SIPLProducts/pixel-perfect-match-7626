export type AuthLinkKind = "invite" | "recovery";
export type AuthLink = { kind: AuthLinkKind | null; error: string | null };

/** Reads Supabase email-link parameters from the URL hash and query string. */
export function parseAuthLink(hash: string, search: string): AuthLink {
  const params = new URLSearchParams(hash.replace(/^#/, ""));
  new URLSearchParams(search.replace(/^\?/, "")).forEach((v, k) => { if (!params.has(k)) params.set(k, v); });
  const type = params.get("type");
  const kind: AuthLinkKind | null = type === "invite" ? "invite" : type === "recovery" ? "recovery" : null;
  const error = params.get("error_code") || params.get("error") ? (params.get("error_description") || "This link is invalid or has expired").replace(/\+/g, " ") : null;
  return { kind, error };
}

/** The password form is allowed only for a valid invite/recovery link that produced a real session. */
export function canSetPassword(link: AuthLink, hasSession: boolean): boolean {
  return !link.error && link.kind !== null && hasSession;
}
