// Gate internal functions to service-role callers (cron / server).
// verify_jwt (platform) already checks the signature; we additionally require
// the role claim to be service_role so a leaked anon token can't trigger jobs.

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const part = token.split(".")[1];
  if (!part) return null;
  try {
    const b64 = part.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(part.length / 4) * 4, "=");
    return JSON.parse(atob(b64));
  } catch {
    return null;
  }
}

export function isServiceRole(req: Request): boolean {
  const m = (req.headers.get("Authorization") ?? "").match(/^Bearer\s+(.+)$/i);
  if (!m) return false;
  return decodeJwtPayload(m[1])?.role === "service_role";
}
