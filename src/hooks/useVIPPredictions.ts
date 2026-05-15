import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type VIPSection = "A" | "B" | "C" | "E";
export type VIPSelection = "home" | "draw" | "away";

export interface VIPPredictionRow {
  id: string;
  section: VIPSection;
  home_team: string;
  away_team: string;
  league: string;
  kickoff: string;
  prediction: string;
  selection: VIPSelection;
  odds: number;
  confidence: number;
  analysis: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface VIPPredictionInput {
  section: VIPSection;
  home_team: string;
  away_team: string;
  league: string;
  kickoff: string; // ISO
  prediction: string;
  selection: VIPSelection;
  odds: number;
  confidence: number;
  analysis?: string;
  is_active?: boolean;
}

const VIP_BET_STATUS_KEY = "vip_bet_status";

export type VIPBetStatus = "won" | "lost" | "placed";
type StatusMap = Record<string, VIPBetStatus>;

const loadStatuses = (): StatusMap => {
  try { return JSON.parse(localStorage.getItem(VIP_BET_STATUS_KEY) || "{}"); } catch { return {}; }
};
const saveStatuses = (m: StatusMap) => localStorage.setItem(VIP_BET_STATUS_KEY, JSON.stringify(m));

export const useVIPPredictions = () => {
  const [predictions, setPredictions] = useState<VIPPredictionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [statuses, setStatuses] = useState<StatusMap>({});

  useEffect(() => { setStatuses(loadStatuses()); }, []);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("vip_predictions")
      .select("*")
      .order("section", { ascending: true })
      .order("kickoff", { ascending: true });
    if (!error && data) setPredictions(data as VIPPredictionRow[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Realtime updates
  useEffect(() => {
    const channel = supabase
      .channel("vip_predictions_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "vip_predictions" }, () => fetchAll())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchAll]);

  const create = async (input: VIPPredictionInput) => {
    const { data, error } = await supabase.from("vip_predictions").insert(input).select().single();
    if (!error && data) await fetchAll();
    return { data, error };
  };

  const update = async (id: string, patch: Partial<VIPPredictionInput>) => {
    const { data, error } = await supabase.from("vip_predictions").update(patch).eq("id", id).select().single();
    if (!error) await fetchAll();
    return { data, error };
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("vip_predictions").delete().eq("id", id);
    if (!error) await fetchAll();
    return { error };
  };

  const markBetStatus = useCallback((id: string, status: VIPBetStatus) => {
    setStatuses((prev) => {
      const next = { ...prev, [id]: status };
      saveStatuses(next);
      return next;
    });
  }, []);

  const getDerivedStatus = (p: VIPPredictionRow, isVIP: boolean): {
    label: string;
    tone: "locked" | "unlocked" | "placed" | "won" | "lost" | "started";
  } => {
    if (!isVIP) return { label: "Locked", tone: "locked" };
    const placed = statuses[p.id];
    if (placed === "won") return { label: "Won", tone: "won" };
    if (placed === "lost") return { label: "Lost", tone: "lost" };
    if (placed === "placed") return { label: "Bet Placed", tone: "placed" };
    if (new Date(p.kickoff).getTime() <= Date.now()) return { label: "Match Started", tone: "started" };
    return { label: "Available", tone: "unlocked" };
  };

  return {
    predictions,
    loading,
    statuses,
    refresh: fetchAll,
    create,
    update,
    remove,
    markBetStatus,
    getDerivedStatus,
    bySection: (s: VIPSection) => predictions.filter((p) => p.section === s && p.is_active),
  };
};
