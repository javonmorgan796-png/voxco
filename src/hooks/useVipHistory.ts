import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface VipHistoryRow {
  id: string;
  plan_id: string;
  plan_label: string;
  months: number;
  price: number;
  action: "joined" | "extended";
  previous_expires_at: string | null;
  new_expires_at: string;
  created_at: string;
}

export const useVipHistory = () => {
  const [history, setHistory] = useState<VipHistoryRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { if (!cancelled) setLoading(false); return; }
      const { data } = await supabase
        .from("vip_history")
        .select("*")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false });
      if (!cancelled) {
        setHistory((data || []) as VipHistoryRow[]);
        setLoading(false);
      }
    };
    load();
    const ch = supabase
      .channel("vip_history_user")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "vip_history" }, () => load())
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(ch); };
  }, []);

  return { history, loading };
};
