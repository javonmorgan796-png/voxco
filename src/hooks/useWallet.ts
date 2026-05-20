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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const userIdRef = useRef<string | null>(null);

  // Load local tx log
  useEffect(() => {
    try {
      const stored = localStorage.getItem(WALLET_TRANSACTIONS_KEY);
      if (stored) {
        try {
          setTransactions(JSON.parse(stored));
        } catch (e) {
          console.warn("Failed to parse stored transactions:", e);
          setTransactions([]);
        }
      }
    } catch (e) {
      console.warn("Failed to load transactions from localStorage:", e);
    }
  }, []);

  // Fetch + subscribe to balance
  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;

    const fetchBalance = async (uid: string) => {
      try {
        const { data, error: fetchErr } = await supabase
          .from("user_wallets")
          .select("balance")
          .eq("user_id", uid)
          .maybeSingle();
        
        if (cancelled) return;
        
        if (fetchErr) throw fetchErr;
        
        if (data?.balance !== undefined) {
          setBalance(Number(data.balance) || 0);
        } else {
          // create empty wallet if missing (edge case)
          try {
            await supabase.from("user_wallets").insert({ user_id: uid, balance: 0 });
            setBalance(0);
          } catch (insertErr) {
            console.warn("Failed to create wallet:", insertErr);
            setBalance(0);
          }
        }
      } catch (err) {
        console.error("Failed to fetch wallet balance:", err);
        setError(err instanceof Error ? err.message : "Failed to fetch balance");
      }
    };

    const init = async () => {
      try {
        setLoading(true);
        const { data: { session }, error: sessionErr } = await supabase.auth.getSession();
        
        if (sessionErr) {
          console.error("Failed to get session:", sessionErr);
          setError("Authentication error");
          return;
        }
        
        if (!session?.user?.id) {
          setBalance(0);
          setLoading(false);
          return;
        }
        
        userIdRef.current = session.user.id;
        await fetchBalance(session.user.id);

        // Subscribe to realtime updates
        channel = supabase
          .channel(`wallet_${session.user.id}`)
          .on(
            "postgres_changes",
            { event: "*", schema: "public", table: "user_wallets", filter: `user_id=eq.${session.user.id}` },
            (payload) => {
              if (!cancelled && payload?.new) {
                const newBalance = (payload.new as { balance?: number })?.balance;
                if (typeof newBalance === "number") {
                  setBalance(Number(newBalance) || 0);
                }
              }
            }
          )
          .subscribe((status) => {
            if (status === "CHANNEL_ERROR") {
              console.warn("Realtime subscription failed");
            }
          });
      } catch (err) {
        console.error("Failed to initialize wallet:", err);
        setError(err instanceof Error ? err.message : "Failed to initialize wallet");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    init();
    
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session?.user?.id && session.user.id !== userIdRef.current) {
        userIdRef.current = session.user.id;
        fetchBalance(session.user.id);
      } else if (!session) {
        userIdRef.current = null;
        setBalance(0);
      }
    });

    return () => {
      cancelled = true;
      if (channel) {
        try {
          supabase.removeChannel(channel);
        } catch (e) {
          console.warn("Failed to remove channel:", e);
        }
      }
      try {
        sub?.subscription?.unsubscribe?.();
      } catch (e) {
        console.warn("Failed to unsubscribe from auth:", e);
      }
    };
  }, []);

  const saveTx = useCallback((tx: WalletTransaction) => {
    try {
      setTransactions((prev) => {
        const next = [tx, ...prev].slice(0, 200);
        try {
          localStorage.setItem(WALLET_TRANSACTIONS_KEY, JSON.stringify(next));
        } catch (e) {
          console.warn("Failed to save transactions to localStorage:", e);
        }
        return next;
      });
    } catch (e) {
      console.error("Failed to save transaction:", e);
    }
  }, []);

  // Adjust DB balance (used for bet flows; deposits/withdrawals are handled by DB triggers).
  const adjustBalance = useCallback(async (delta: number): Promise<number | null> => {
    try {
      const uid = userIdRef.current;
      if (!uid) {
        console.warn("No user ID available for balance adjustment");
        return null;
      }
      
      const { data: current, error: fetchErr } = await supabase
        .from("user_wallets")
        .select("balance")
        .eq("user_id", uid)
        .maybeSingle();
      
      if (fetchErr) throw fetchErr;
      
      const curr = Number(current?.balance ?? 0) || 0;
      const next = Math.max(0, Math.round((curr + delta) * 100) / 100);
      
      const { error: upsertErr } = await supabase
        .from("user_wallets")
        .upsert({ user_id: uid, balance: next }, { onConflict: "user_id" });
      
      if (upsertErr) throw upsertErr;
      
      setBalance(next);
      return next;
    } catch (err) {
      console.error("Failed to adjust balance:", err);
      setError(err instanceof Error ? err.message : "Failed to adjust balance");
      return null;
    }
  }, []);

  const addTransaction = async (type: WalletTransaction["type"], amount: number, description: string) => {
    try {
      if (amount < 0) {
        console.warn("Invalid transaction amount:", amount);
        return null;
      }
      
      const isDebit = type === "withdrawal" || type === "bet_placed";
      const delta = isDebit ? -amount : amount;
      const newBalance = await adjustBalance(delta);
      
      if (newBalance === null) {
        return null;
      }
      
      const tx: WalletTransaction = {
        id: `tx_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        type,
        amount,
        description,
        createdAt: new Date().toISOString(),
        balanceAfter: newBalance,
      };
      saveTx(tx);
      return tx;
    } catch (err) {
      console.error("Failed to add transaction:", err);
      setError(err instanceof Error ? err.message : "Failed to add transaction");
      return null;
    }
  };

  const deposit = (amount: number) =>
    amount > 0 ? addTransaction("deposit", amount, `Deposit of $${amount.toFixed(2)}`) : null;
  
  const withdraw = (amount: number) =>
    amount > 0 && amount <= balance ? addTransaction("withdrawal", amount, `Withdrawal of $${amount.toFixed(2)}`) : null;
  
  const placeBetDeduction = (amount: number, m: string) =>
    amount > 0 && amount <= balance ? addTransaction("bet_placed", amount, `Bet: ${m}`) : null;
  
  const betWinCredit = (amount: number, m: string) =>
    amount > 0 ? addTransaction("bet_won", amount, `Won: ${m}`) : null;
  
  const cashoutCredit = (amount: number, m: string) =>
    amount > 0 ? addTransaction("bet_cashout", amount, `Cash out: ${m}`) : null;
  
  const canAfford = (amount: number) => amount >= 0 && balance >= amount;

  return {
    balance,
    transactions,
    loading,
    error,
    deposit,
    withdraw,
    placeBetDeduction,
    betWinCredit,
    cashoutCredit,
    canAfford,
  };
};
