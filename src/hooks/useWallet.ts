import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface WalletTransaction {
  id: string;
  type:
    | "deposit"
    | "withdrawal"
    | "bet_placed"
    | "bet_won"
    | "bet_cashout"
    | "bonus";
  amount: number;
  description: string;
  createdAt: string;
  balanceAfter: number;
}

const WALLET_TRANSACTIONS_KEY = "wallet_transactions";

export const useWallet = () => {
  const [balance, setBalance] = useState<number>(0);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const userIdRef = useRef<string | null>(null);
  const channelRef = useRef<any>(null);
  const initializedRef = useRef(false);

  /**
   * Load transaction history from localStorage
   */
  useEffect(() => {
    try {
      const stored = localStorage.getItem(WALLET_TRANSACTIONS_KEY);

      if (stored) {
        setTransactions(JSON.parse(stored));
      }
    } catch (err) {
      console.warn("Failed to load wallet transactions:", err);
    }
  }, []);

  /**
   * Remove existing wallet channels
   */
  const cleanupWalletChannels = useCallback((userId?: string) => {
    try {
      const channels = supabase.getChannels();

      channels.forEach((channel) => {
        const topic = channel.topic || "";

        if (
          topic.includes("wallet_") ||
          (userId && topic.includes(`wallet_${userId}`))
        ) {
          supabase.removeChannel(channel);
        }
      });
    } catch (err) {
      console.warn("Failed to cleanup wallet channels:", err);
    }
  }, []);

  /**
   * Fetch wallet balance
   */
  const fetchBalance = useCallback(async (uid: string) => {
    try {
      setError(null);

      const { data, error: fetchError } = await supabase
        .from("user_wallets")
        .select("balance")
        .eq("user_id", uid)
        .maybeSingle();

      if (fetchError) {
        throw fetchError;
      }

      /**
       * Wallet exists
       */
      if (data?.balance !== undefined) {
        setBalance(Number(data.balance) || 0);
        return;
      }

      /**
       * Create wallet if missing
       */
      const { error: upsertError } = await supabase
        .from("user_wallets")
        .upsert(
          {
            user_id: uid,
            balance: 0,
          },
          {
            onConflict: "user_id",
          }
        );

      if (upsertError) {
        throw upsertError;
      }

      setBalance(0);
    } catch (err: any) {
      console.error("Failed to fetch wallet:", err);
      setError(err?.message || "Failed to fetch wallet");
    }
  }, []);

  /**
   * Setup realtime subscription
   */
  const setupRealtime = useCallback((uid: string) => {
    try {
      /**
       * Remove old channels first
       */
      cleanupWalletChannels(uid);

      /**
       * Remove previous ref channel
       */
      if (channelRef.current) {
        try {
          supabase.removeChannel(channelRef.current);
        } catch (err) {
          console.warn("Failed removing previous channel:", err);
        }
      }

      /**
       * Create new channel
       */
      const channel = supabase
        .channel(`wallet_${uid}_${Date.now()}`)

        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "user_wallets",
            filter: `user_id=eq.${uid}`,
          },
          (payload) => {
            try {
              console.log("Wallet realtime payload:", payload);

              /**
               * Ignore DELETE events
               */
              if (
                payload.eventType === "DELETE" ||
                !payload.new
              ) {
                return;
              }

              const newBalance = (payload.new as any)?.balance;

              if (typeof newBalance === "number") {
                setBalance(Number(newBalance) || 0);
              }
            } catch (err) {
              console.warn("Realtime payload error:", err);
            }
          }
        )

        .subscribe((status) => {
          console.log("Wallet realtime status:", status);

          if (status === "CHANNEL_ERROR") {
            console.warn("Wallet realtime channel error");
          }

          if (status === "TIMED_OUT") {
            console.warn("Wallet realtime timed out");
          }

          if (status === "CLOSED") {
            console.warn("Wallet realtime closed");
          }
        });

      channelRef.current = channel;
    } catch (err) {
      console.error("Failed to setup realtime:", err);
    }
  }, [cleanupWalletChannels]);

  /**
   * Initialize wallet
   */
  useEffect(() => {
    let mounted = true;

    /**
     * Prevent duplicate init in StrictMode
     */
    if (initializedRef.current) {
      return;
    }

    initializedRef.current = true;

    const initializeWallet = async () => {
      try {
        setLoading(true);

        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) {
          throw sessionError;
        }

        if (!mounted) return;

        /**
         * No user logged in
         */
        if (!session?.user?.id) {
          setBalance(0);
          setLoading(false);
          return;
        }

        const uid = session.user.id;

        userIdRef.current = uid;

        /**
         * Fetch wallet
         */
        await fetchBalance(uid);

        /**
         * Setup realtime
         */
        setupRealtime(uid);
      } catch (err: any) {
        console.error("Wallet initialization failed:", err);
        setError(err?.message || "Failed to initialize wallet");
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initializeWallet();

    /**
     * Auth listener
     */
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      try {
        /**
         * User signed out
         */
        if (!session?.user?.id) {
          userIdRef.current = null;
          setBalance(0);

          cleanupWalletChannels();

          return;
        }

        const uid = session.user.id;

        /**
         * Prevent duplicate reload
         */
        if (uid === userIdRef.current) {
          return;
        }

        userIdRef.current = uid;

        /**
         * Reload wallet
         */
        await fetchBalance(uid);

        /**
         * Recreate realtime channel
         */
        setupRealtime(uid);
      } catch (err) {
        console.error("Auth wallet sync failed:", err);
      }
    });

    return () => {
      mounted = false;

      initializedRef.current = false;

      try {
        cleanupWalletChannels();

        if (channelRef.current) {
          supabase.removeChannel(channelRef.current);
        }
      } catch (err) {
        console.warn("Wallet cleanup failed:", err);
      }

      try {
        subscription?.unsubscribe?.();
      } catch (err) {
        console.warn("Failed to unsubscribe auth listener:", err);
      }
    };
  }, [fetchBalance, setupRealtime, cleanupWalletChannels]);

  /**
   * Save transaction locally
   */
  const saveTx = useCallback((tx: WalletTransaction) => {
    try {
      setTransactions((prev) => {
        const next = [tx, ...prev].slice(0, 200);

        localStorage.setItem(
          WALLET_TRANSACTIONS_KEY,
          JSON.stringify(next)
        );

        return next;
      });
    } catch (err) {
      console.error("Failed to save transaction:", err);
    }
  }, []);

  /**
   * Adjust wallet balance
   * IMPORTANT:
   * Move this to backend RPC later for security
   */
  const adjustBalance = useCallback(async (delta: number) => {
    try {
      const uid = userIdRef.current;

      if (!uid) {
        throw new Error("No authenticated user");
      }

      const { data, error: fetchError } = await supabase
        .from("user_wallets")
        .select("balance")
        .eq("user_id", uid)
        .maybeSingle();

      if (fetchError) {
        throw fetchError;
      }

      const currentBalance = Number(data?.balance || 0);

      const nextBalance = Math.max(
        0,
        Math.round((currentBalance + delta) * 100) / 100
      );

      const { error: updateError } = await supabase
        .from("user_wallets")
        .upsert(
          {
            user_id: uid,
            balance: nextBalance,
          },
          {
            onConflict: "user_id",
          }
        );

      if (updateError) {
        throw updateError;
      }

      setBalance(nextBalance);

      return nextBalance;
    } catch (err: any) {
      console.error("Failed to adjust balance:", err);

      setError(err?.message || "Failed to adjust balance");

      return null;
    }
  }, []);

  /**
   * Add transaction
   */
  const addTransaction = async (
    type: WalletTransaction["type"],
    amount: number,
    description: string
  ) => {
    try {
      if (amount <= 0) {
        return null;
      }

      const isDebit =
        type === "withdrawal" ||
        type === "bet_placed";

      const delta = isDebit ? -amount : amount;

      const newBalance = await adjustBalance(delta);

      if (newBalance === null) {
        return null;
      }

      const tx: WalletTransaction = {
        id: `tx_${Date.now()}_${Math.random()
          .toString(36)
          .slice(2, 8)}`,
        type,
        amount,
        description,
        createdAt: new Date().toISOString(),
        balanceAfter: newBalance,
      };

      saveTx(tx);

      return tx;
    } catch (err: any) {
      console.error("Failed to add transaction:", err);

      setError(err?.message || "Transaction failed");

      return null;
    }
  };

  /**
   * Public methods
   */
  const deposit = (amount: number) =>
    addTransaction(
      "deposit",
      amount,
      `Deposit of $${amount.toFixed(2)}`
    );

  const withdraw = (amount: number) =>
    amount <= balance
      ? addTransaction(
          "withdrawal",
          amount,
          `Withdrawal of $${amount.toFixed(2)}`
        )
      : null;

  const placeBetDeduction = (amount: number, match: string) =>
    amount <= balance
      ? addTransaction(
          "bet_placed",
          amount,
          `Bet: ${match}`
        )
      : null;

  const betWinCredit = (amount: number, match: string) =>
    addTransaction(
      "bet_won",
      amount,
      `Won: ${match}`
    );

  const cashoutCredit = (amount: number, match: string) =>
    addTransaction(
      "bet_cashout",
      amount,
      `Cash out: ${match}`
    );

  const canAfford = (amount: number) =>
    balance >= amount;

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
