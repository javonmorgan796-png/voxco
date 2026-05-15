import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface UserVipBet {
  id: string;
  prediction_id: string;
  stake: number;
  odds: number;
  potential_payout: number;
  status: "pending" | "approved" | "rejected" | "won" | "lost";
  created_at: string;
}

export const useUserVipBets = () => {
  const [bets, setBets] = useState<UserVipBet[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBets = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setBets([]); setLoading(false); return; }
    const { data } = await supabase
      .from("vip_bets")
      .select("id, prediction_id, stake, odds, potential_payout, status, created_at")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false });
    setBets((data as UserVipBet[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchBets(); }, [fetchBets]);

  useEffect(() => {
    const ch = supabase
      .channel("user_vip_bets")
      .on("postgres_changes", { event: "*", schema: "public", table: "vip_bets" }, () => fetchBets())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [fetchBets]);

  const placeBet = async (predictionId: string, stake: number, odds: number) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return { error: new Error("Not signed in") };
    const { error } = await supabase.from("vip_bets").insert({
      user_id: session.user.id,
      prediction_id: predictionId,
      stake,
      odds,
      potential_payout: Math.round(stake * odds * 100) / 100,
      status: "pending",
    });
    if (!error) await fetchBets();
    return { error };
  };

  const statusFor = (predictionId: string): UserVipBet | undefined =>
    bets.find((b) => b.prediction_id === predictionId);

  return { bets, loading, refresh: fetchBets, placeBet, statusFor };
};
