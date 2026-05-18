import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNotifications } from "./useNotifications";
import { toast } from "sonner";

const SEEN_KEY = "seen_deposit_approvals";
const getSeen = (): string[] => { try { return JSON.parse(localStorage.getItem(SEEN_KEY) || "[]"); } catch { return []; } };
const markSeen = (id: string) => {
  const list = getSeen();
  if (!list.includes(id)) { list.push(id); localStorage.setItem(SEEN_KEY, JSON.stringify(list.slice(-200))); }
};

/**
 * Balance is now credited by a DB trigger when an admin approves a deposit.
 * This hook only surfaces a toast/notification once per approval — it no
 * longer mutates the local balance.
 */
export const useDepositCredits = () => {
  const { addNotification } = useNotifications();

  useEffect(() => {
    let cancelled = false;

    const sync = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data } = await supabase
        .from("deposit_requests")
        .select("id, amount_usd, crypto, status, credited_at")
        .eq("user_id", session.user.id)
        .eq("status", "approved")
        .order("created_at", { ascending: true });
      if (cancelled || !data) return;
      const seen = getSeen();
      data.forEach((row) => {
        if (seen.includes(row.id)) return;
        markSeen(row.id);
        addNotification("deposit", "Deposit approved ✅", `$${Number(row.amount_usd).toFixed(2)} (${row.crypto}) credited to your wallet.`);
        toast.success(`Deposit approved: +$${Number(row.amount_usd).toFixed(2)}`);
      });
    };

    sync();
    const ch = supabase
      .channel("user_deposit_credits")
      .on("postgres_changes", { event: "*", schema: "public", table: "deposit_requests" }, () => sync())
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
};
