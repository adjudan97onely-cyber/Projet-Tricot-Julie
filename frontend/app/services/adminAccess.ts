const ADMIN_KEY = "tricot-admin";
const GUEST_KEY = "tricot-guest";
const TOKEN_KEY = "tricot-admin-token";
const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

function store() {
  try { return typeof window !== "undefined" ? window.localStorage : null; } catch { return null; }
}

export function isAdmin(): boolean {
  return store()?.getItem(ADMIN_KEY) === "true" && !!getAdminToken();
}

export function getAdminToken(): string | null {
  return store()?.getItem(TOKEN_KEY) ?? null;
}

export async function unlockAdmin(password: string): Promise<boolean> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/admin/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    if (!data.token) return false;
    store()?.setItem(ADMIN_KEY, "true");
    store()?.setItem(TOKEN_KEY, data.token);
    // Admin a automatiquement accès premium permanent
    const permanentExpiry = new Date(Date.now() + 100 * 365 * 24 * 3600 * 1000).toISOString();
    store()?.setItem(GUEST_KEY, JSON.stringify({ expiry: permanentExpiry, code: "ADMIN" }));
    return true;
  } catch {
    return false;
  }
}

export function lockAdmin() {
  store()?.removeItem(ADMIN_KEY);
  store()?.removeItem(GUEST_KEY);
  store()?.removeItem(TOKEN_KEY);
}

/**
 * Wrapper around fetch that automatically adds the admin JWT token.
 * Use this for all admin-only API calls (POST/PUT/DELETE on protected routes).
 */
export function adminFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = getAdminToken();
  const headers = new Headers(options.headers || {});
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  return fetch(url, { ...options, headers });
}
