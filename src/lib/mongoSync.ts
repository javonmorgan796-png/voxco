import { supabase } from "@/integrations/supabase/client";

/**
 * Best-effort mirror of important user events to MongoDB.
 * Failures are logged and silently swallowed — Lovable Cloud remains the source of truth.
 */
export const mongoSync = async (event: string, payload?: Record<string, unknown>) => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    await supabase.functions.invoke("mongo-sync", { body: { event, payload } });
  } catch (err) {
    console.warn("[mongoSync] failed", event, err);
  }
};
