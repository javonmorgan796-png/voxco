import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWallet } from "./useWallet";
import { useNotifications } from "./useNotifications";
import { toast } from "sonner";

const DEBITED_KEY = "debited_withdrawal_ids";

const getDebited = (): string[] => {
  try { return JSON.parse(localStorage.getItem(DEBITED_KEY) || "[]"); } catch { return []; }
};
const markDebited = (id: string) => {
  const list = getDebited();
  if (!list.includes(id)) {
    list.push(id);
    localStorage.setItem(DEBITED_KEY, JSON.stringify(list.slice(-200)));
  }
};

/**
 * Watches the user's withdrawal requests and debits the local wallet
 * whenever an admin-approved withdrawal hasn't yet been applied locally.
 * Mirrors useDepositCredits but for withdrawals.
 */
export const useWithdrawalDebits = () => {
  const { withdraw, balance } = useWallet();
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
      const debited = getDebited();
      data.forEach((row) => {
        if (debited.includes(row.id)) return;
        const amt = Number(row.amount_usd);
        // Always mark as debited so we don't loop, even if balance is short.
        const tx = withdraw(amt);
        markDebited(row.id);
        if (tx) {
          addNotification("withdrawal", "Withdrawal approved ✅", `$${amt.toFixed(2)} (${row.crypto}) deducted from your wallet.`);
          toast.success(`Withdrawal approved: -$${amt.toFixed(2)}`);
        } else {
          addNotification("withdrawal", "Withdrawal approved", `$${amt.toFixed(2)} (${row.crypto}) processed.`);
        }
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
