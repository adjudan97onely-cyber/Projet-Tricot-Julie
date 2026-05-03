const SUPABASE_URL = "https://mxjbwymqkzulgkwdhphk.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im14amJ3eW1xa3p1bGdrd2RocGhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcxMTIyNzMsImV4cCI6MjA5MjY4ODI3M30.ym4lroJzz-YSalZxVX4xTzkGvhSnwaQu7PeMFMIPV_U";
const HEADERS = {
  "Content-Type": "application/json",
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
};
const LOCAL_KEY = "tricot-guest";

function store() {
  try { return typeof window !== "undefined" ? window.localStorage : null; } catch { return null; }
}

export async function validateGuestCode(code: string): Promise<Date | "expired" | "invalid"> {
  if (!code) return "invalid";
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/tricot_access_codes?code=eq.${encodeURIComponent(code.trim().toUpperCase())}&select=expires_at`,
      { headers: HEADERS }
    );
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) return "invalid";
    const expiry = new Date(data[0].expires_at);
    if (isNaN(expiry.getTime())) return "invalid";
    if (expiry < new Date()) return "expired";
    return expiry;
  } catch {
    return "invalid";
  }
}

export async function setGuestAccess(code: string): Promise<Date | "expired" | "invalid"> {
  const result = await validateGuestCode(code);
  if (result instanceof Date) {
    store()?.setItem(LOCAL_KEY, JSON.stringify({
      expiry: result.toISOString(),
      code: code.trim().toUpperCase(),
    }));
  }
  return result;
}

export function hasGuestAccess(): boolean {
  try {
    const raw = store()?.getItem(LOCAL_KEY);
    if (!raw) return false;
    const stored = JSON.parse(raw);
    if (!stored?.expiry) return false;
    return new Date(stored.expiry) >= new Date();
  } catch {
    return false;
  }
}

export function getGuestExpiry(): Date | null {
  try {
    const raw = store()?.getItem(LOCAL_KEY);
    if (!raw) return null;
    const stored = JSON.parse(raw);
    if (!stored?.expiry) return null;
    const d = new Date(stored.expiry);
    return isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
}

export function clearGuestAccess() {
  store()?.removeItem(LOCAL_KEY);
}

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function randomCode() {
  const seg = () => Array.from({ length: 4 }, () =>
    CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]
  ).join("");
  return `${seg()}-${seg()}-${seg()}`;
}

export async function createAccessCode(durationHours: number, label = ""): Promise<string> {
  const code = randomCode();
  const expiresAt = new Date(Date.now() + durationHours * 3600 * 1000).toISOString();
  const res = await fetch(`${SUPABASE_URL}/rest/v1/tricot_access_codes`, {
    method: "POST",
    headers: { ...HEADERS, Prefer: "return=minimal" },
    body: JSON.stringify({ code, expires_at: expiresAt, label }),
  });
  if (!res.ok) throw new Error("Erreur création code");
  return code;
}

export async function fetchActiveCodes(): Promise<any[]> {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/tricot_access_codes?expires_at=gte.${new Date().toISOString()}&select=code,expires_at,label,created_at&order=created_at.desc&limit=20`,
      { headers: HEADERS }
    );
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export async function deleteAccessCode(code: string) {
  await fetch(
    `${SUPABASE_URL}/rest/v1/tricot_access_codes?code=eq.${encodeURIComponent(code)}`,
    { method: "DELETE", headers: HEADERS }
  );
}
