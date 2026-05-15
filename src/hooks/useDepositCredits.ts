import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWallet } from "./useWallet";
import { useNotifications } from "./useNotifications";
import { toast } from "sonner";

const CREDITED_KEY = "credited_deposit_ids";

const getCredited = (): string[] => {
  try { return JSON.parse(localStorage.getItem(CREDITED_KEY) || "[]"); } catch { return []; }
};
const markCredited = (id: string) => {
  const list = getCredited();
  if (!list.includes(id)) {
    list.push(id);
    localStorage.setItem(CREDITED_KEY, JSON.stringify(list.slice(-200)));
  }
};

/**
 * Watches the user's deposit requests and credits the local wallet
 * whenever an approved deposit hasn't yet been applied locally.
 */
export const useDepositCredits = () => {
  const { deposit } = useWallet();
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
        .not("credited_at", "is", null)
        .order("credited_at", { ascending: true });
      if (cancelled || !data) return;
      const credited = getCredited();
      data.forEach((row) => {
        if (credited.includes(row.id)) return;
        const tx = deposit(Number(row.amount_usd));
        if (tx) {
          markCredited(row.id);
          addNotification("deposit", "Deposit approved ✅", `$${Number(row.amount_usd).toFixed(2)} (${row.crypto}) credited to your wallet.`);
          toast.success(`Deposit approved: +$${Number(row.amount_usd).toFixed(2)}`);
        }
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
