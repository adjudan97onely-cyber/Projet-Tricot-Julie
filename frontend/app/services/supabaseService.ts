const SUPABASE_URL = "https://mxjbwymqkzulgkwdhphk.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im14amJ3eW1xa3p1bGdrd2RocGhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcxMTIyNzMsImV4cCI6MjA5MjY4ODI3M30.ym4lroJzz-YSalZxVX4xTzkGvhSnwaQu7PeMFMIPV_U";
const HEADERS = {
  "Content-Type": "application/json",
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
};

export async function registerBetaUser({ prenom, contact }: { prenom: string; contact: string }) {
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/tricot_beta_users`, {
      method: "POST",
      headers: HEADERS,
      body: JSON.stringify({ prenom, contact }),
    });
  } catch {}
}

export async function submitFeedback({ patternId, type, comment }: { patternId: string; type?: string | null; comment?: string | null }) {
  await fetch(`${SUPABASE_URL}/rest/v1/tricot_feedback`, {
    method: "POST",
    headers: HEADERS,
    body: JSON.stringify({ pattern_id: patternId, type: type ?? null, comment: comment ?? null }),
  });
}

export async function getFeedbackCounts(patternId: string): Promise<{ likes: number; dislikes: number }> {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/tricot_feedback?pattern_id=eq.${patternId}&select=type`,
      { headers: HEADERS }
    );
    const data = await res.json();
    if (!Array.isArray(data)) return { likes: 0, dislikes: 0 };
    return {
      likes: data.filter((d: any) => d.type === "like").length,
      dislikes: data.filter((d: any) => d.type === "dislike").length,
    };
  } catch {
    return { likes: 0, dislikes: 0 };
  }
}

export async function getComments(patternId: string): Promise<{ comment: string; created_at: string }[]> {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/tricot_feedback?pattern_id=eq.${patternId}&comment=not.is.null&type=is.null&select=comment,created_at&order=created_at.desc&limit=20`,
      { headers: HEADERS }
    );
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export async function getAllFeedback(): Promise<any[]> {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/tricot_feedback?select=*&order=created_at.desc&limit=200`,
      { headers: HEADERS }
    );
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export async function getBetaUserCount(): Promise<number> {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/tricot_beta_users?select=id`,
      { headers: { ...HEADERS, Prefer: "count=exact" } }
    );
    const countHeader = res.headers.get("content-range");
    if (countHeader) {
      const total = countHeader.split("/")[1];
      return parseInt(total) || 0;
    }
    const data = await res.json();
    return Array.isArray(data) ? data.length : 0;
  } catch {
    return 0;
  }
}
