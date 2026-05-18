import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNotifications } from "./useNotifications";
import { toast } from "sonner";

const SEEN_KEY = "seen_withdrawal_approvals";
const getSeen = (): string[] => { try { return JSON.parse(localStorage.getItem(SEEN_KEY) || "[]"); } catch { return []; } };
const markSeen = (id: string) => {
  const list = getSeen();
  if (!list.includes(id)) { list.push(id); localStorage.setItem(SEEN_KEY, JSON.stringify(list.slice(-200))); }
};

/**
 * Balance is now debited by a DB trigger when an admin approves a withdrawal.
 * This hook only surfaces a toast/notification once per approval.
 */
export const useWithdrawalDebits = () => {
  const { addNotification } = useNotifications();

  useEffect(() => {
    let cancelled = false;

    const sync = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data } = await supabase
        .from("withdrawal_requests")
        .select("id, amount_usd, crypto, status, created_at")
        .eq("user_id", session.user.id)
        .eq("status", "approved")
        .order("created_at", { ascending: true });
      if (cancelled || !data) return;
      const seen = getSeen();
      data.forEach((row) => {
        if (seen.includes(row.id)) return;
        markSeen(row.id);
        addNotification("withdrawal", "Withdrawal approved ✅", `$${Number(row.amount_usd).toFixed(2)} (${row.crypto}) deducted from your wallet.`);
        toast.success(`Withdrawal approved: -$${Number(row.amount_usd).toFixed(2)}`);
      });
    };

    sync();
    const ch = supabase
      .channel("user_withdrawal_debits")
      .on("postgres_changes", { event: "*", schema: "public", table: "withdrawal_requests" }, () => sync())
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
};
