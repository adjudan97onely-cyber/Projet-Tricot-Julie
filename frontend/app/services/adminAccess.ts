const ADMIN_KEY = "tricot-admin";
const GUEST_KEY = "tricot-guest";
const ADMIN_PASSWORD = "Buithidam972@";

function store() {
  try { return typeof window !== "undefined" ? window.localStorage : null; } catch { return null; }
}

export function isAdmin(): boolean {
  return store()?.getItem(ADMIN_KEY) === "true";
}

export function unlockAdmin(password: string): boolean {
  if (password === ADMIN_PASSWORD) {
    store()?.setItem(ADMIN_KEY, "true");
    // Admin a automatiquement accès premium permanent
    const permanentExpiry = new Date(Date.now() + 100 * 365 * 24 * 3600 * 1000).toISOString();
    store()?.setItem(GUEST_KEY, JSON.stringify({ expiry: permanentExpiry, code: "ADMIN" }));
    return true;
  }
  return false;
}

export function lockAdmin() {
  store()?.removeItem(ADMIN_KEY);
  store()?.removeItem(GUEST_KEY);
}
