import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type CryptoKind = "BTC" | "ETH" | "USDT" | "BANK";

export interface PaymentWallet {
  id: string;
  crypto: CryptoKind;
  label: string;
  address: string;
  network: string;
  qr_url: string | null;
  icon_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const DEFAULT_ICONS: Record<string, string> = {
  BTC: "https://assets.coingecko.com/coins/images/1/large/bitcoin.png",
  ETH: "https://assets.coingecko.com/coins/images/279/large/ethereum.png",
  USDT: "https://assets.coingecko.com/coins/images/325/large/Tether.png",
};

export const usePaymentWallets = (
  opts: { adminMode?: boolean } = {}
) => {
  const [wallets, setWallets] = useState<PaymentWallet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const mountedRef = useRef(true);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from("payment_wallets")
        .select("*")
        .order("created_at", { ascending: true });

      if (!opts.adminMode) {
        query = query.eq("is_active", true);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      if (!mountedRef.current) return;

      setWallets(Array.isArray(data) ? (data as PaymentWallet[]) : []);
    } catch (err) {
      console.error("Failed to fetch payment wallets:", err);

      if (!mountedRef.current) return;

      setWallets([]);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load wallets"
      );
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [opts.adminMode]);

  useEffect(() => {
    mountedRef.current = true;

    refresh();

    // cleanup old channel if exists
    if (channelRef.current) {
      try {
        supabase.removeChannel(channelRef.current);
      } catch (e) {
        console.warn("Failed to remove old channel:", e);
      }
    }

    const channel = supabase.channel(
      `payment_wallets_sub_${opts.adminMode ? "admin" : "user"}`
    );

    channel
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "payment_wallets",
        },
        () => {
          if (mountedRef.current) {
            refresh();
          }
        }
      )
      .subscribe((status) => {
        console.log("payment_wallets realtime:", status);

        if (status === "CHANNEL_ERROR") {
          console.warn("Realtime channel error");
        }

        if (status === "TIMED_OUT") {
          console.warn("Realtime channel timeout");
        }

        if (status === "CLOSED") {
          console.warn("Realtime channel closed");
        }
      });

    channelRef.current = channel;

    return () => {
      mountedRef.current = false;

      if (channelRef.current) {
        try {
          supabase.removeChannel(channelRef.current);
        } catch (e) {
          console.warn("Failed to cleanup channel:", e);
        }

        channelRef.current = null;
      }
    };
  }, [refresh, opts.adminMode]);

  const add = async (
    data: Omit<
      PaymentWallet,
      "id" | "created_at" | "updated_at" | "is_active"
    > & {
      is_active?: boolean;
    }
  ) => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      return await supabase.from("payment_wallets").insert({
        ...data,
        icon_url:
          data.icon_url ||
          DEFAULT_ICONS[data.crypto] ||
          null,
        created_by: session?.user?.id ?? null,
      });
    } catch (err) {
      console.error("Failed to add wallet:", err);
      throw err;
    }
  };

  const update = async (
    id: string,
    patch: Partial<PaymentWallet>
  ) => {
    try {
      return await supabase
        .from("payment_wallets")
        .update(patch)
        .eq("id", id);
    } catch (err) {
      console.error("Failed to update wallet:", err);
      throw err;
    }
  };

  const remove = async (id: string) => {
    try {
      return await supabase
        .from("payment_wallets")
        .delete()
        .eq("id", id);
    } catch (err) {
      console.error("Failed to delete wallet:", err);
      throw err;
    }
  };

  const uploadQr = async (file: File) => {
    try {
      const ext =
        file.name.split(".").pop()?.toLowerCase() || "png";

      const path = `qr/${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}.${ext}`;

      const { error } = await supabase.storage
        .from("wallet-qr")
        .upload(path, file, {
          upsert: false,
          contentType: file.type,
        });

      if (error) {
        throw error;
      }

      const { data } = supabase.storage
        .from("wallet-qr")
        .getPublicUrl(path);

      return data.publicUrl;
    } catch (err) {
      console.error("Failed to upload QR:", err);
      throw err;
    }
  };

  return {
    wallets,
    loading,
    error,
    refresh,
    add,
    update,
    remove,
    uploadQr,
  };
};
