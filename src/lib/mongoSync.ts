import { supabase } from "@/integrations/supabase/client";

/**
 * Best-effort mirror of important user events to MongoDB.
 * Disabled unless `VITE_ENABLE_MONGO_SYNC === "true"` so that missing
 * MongoDB credentials never surface as console errors on deposit/withdrawal
 * or other user-visible actions. Lovable Cloud remains the source of truth.
 */
const ENABLED = import.meta.env.VITE_ENABLE_MONGO_SYNC === "true";

export const mongoSync = async (event: string, payload?: Record<string, unknown>) => {
  if (!ENABLED) return;
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    // Use raw fetch so we bypass supabase-js's built-in `console.error`
    // on non-2xx responses (which would otherwise leak as "Edge function error").
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mongo-sync`;
    await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      },
      body: JSON.stringify({ event, payload }),
    }).catch(() => {});
  } catch {
    /* swallow — best effort */
  }
};
