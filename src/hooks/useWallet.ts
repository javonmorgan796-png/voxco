import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface WalletTransaction {
  id: string;
  type: "deposit" | "withdrawal" | "bet_placed" | "bet_won" | "bet_cashout" | "bonus";
  amount: number;
  description: string;
  createdAt: string;
  balanceAfter: number;
}

const WALLET_TRANSACTIONS_KEY = "wallet_transactions";

/**
 * Wallet hook: balance is sourced from the `user_wallets` DB table (single source of truth).
 * Realtime subscription pushes admin-driven changes (deposit/withdrawal approvals)
 * straight into the UI with no localStorage delay.
 * Transactions log is kept locally for UX history.
 */
export const useWallet = () => {
  const [balance, setBalance] = useState<number>(0);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const userIdRef = useRef<string | null>(null);

  // Load local tx log
  useEffect(() => {
    const stored = localStorage.getItem(WALLET_TRANSACTIONS_KEY);
    if (stored) {
      try { setTransactions(JSON.parse(stored)); } catch { /* ignore */ }
    }
  }, []);

  // Fetch + subscribe to balance
  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;

    const fetchBalance = async (uid: string) => {
      const { data } = await supabase
        .from("user_wallets")
        .select("balance")
        .eq("user_id", uid)
        .maybeSingle();
      if (cancelled) return;
      if (data) setBalance(Number(data.balance));
      else {
        // create empty wallet if missing (edge case)
        await supabase.from("user_wallets").insert({ user_id: uid, balance: 0 });
        setBalance(0);
      }
    };

    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      userIdRef.current = session.user.id;
      await fetchBalance(session.user.id);

      channel = supabase
        .channel(`wallet_${session.user.id}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "user_wallets", filter: `user_id=eq.${session.user.id}` },
          (payload) => {
            const next = (payload.new as { balance?: number })?.balance;
            if (typeof next === "number") setBalance(Number(next));
          }
        )
        .subscribe();
    };

    init();
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session?.user.id && session.user.id !== userIdRef.current) {
        userIdRef.current = session.user.id;
        fetchBalance(session.user.id);
      } else if (!session) {
        userIdRef.current = null;
        setBalance(0);
      }
    });

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
      sub.subscription.unsubscribe();
    };
  }, []);

  const saveTx = useCallback((tx: WalletTransaction) => {
    setTransactions((prev) => {
      const next = [tx, ...prev].slice(0, 200);
      localStorage.setItem(WALLET_TRANSACTIONS_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  // Adjust DB balance (used for bet flows; deposits/withdrawals are handled by DB triggers).
  const adjustBalance = useCallback(async (delta: number): Promise<number | null> => {
    const uid = userIdRef.current;
    if (!uid) return null;
    const { data: current } = await supabase
      .from("user_wallets")
      .select("balance")
      .eq("user_id", uid)
      .maybeSingle();
    const curr = Number(current?.balance ?? 0);
    const next = Math.max(0, Math.round((curr + delta) * 100) / 100);
    const { error } = await supabase
      .from("user_wallets")
      .upsert({ user_id: uid, balance: next }, { onConflict: "user_id" });
    if (error) return null;
    setBalance(next);
    return next;
  }, []);

  const addTransaction = async (type: WalletTransaction["type"], amount: number, description: string) => {
    const isDebit = type === "withdrawal" || type === "bet_placed";
    const delta = isDebit ? -amount : amount;
    const newBalance = await adjustBalance(delta);
    if (newBalance === null) return null;
    const tx: WalletTransaction = {
      id: `tx_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      type, amount, description,
      createdAt: new Date().toISOString(),
      balanceAfter: newBalance,
    };
    saveTx(tx);
    return tx;
  };

  const deposit = (amount: number) => amount > 0 ? addTransaction("deposit", amount, `Deposit of $${amount.toFixed(2)}`) : null;
  const withdraw = (amount: number) => (amount > 0 && amount <= balance) ? addTransaction("withdrawal", amount, `Withdrawal of $${amount.toFixed(2)}`) : null;
  const placeBetDeduction = (amount: number, m: string) => (amount > 0 && amount <= balance) ? addTransaction("bet_placed", amount, `Bet: ${m}`) : null;
  const betWinCredit = (amount: number, m: string) => addTransaction("bet_won", amount, `Won: ${m}`);
  const cashoutCredit = (amount: number, m: string) => addTransaction("bet_cashout", amount, `Cash out: ${m}`);
  const canAfford = (amount: number) => balance >= amount;

  return {
    balance,
    transactions,
    deposit,
    withdraw,
    placeBetDeduction,
    betWinCredit,
    cashoutCredit,
    canAfford,
  };
};
