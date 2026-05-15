import { useCallback, useEffect, useState } from "react";
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

export const usePaymentWallets = (opts: { adminMode?: boolean } = {}) => {
  const [wallets, setWallets] = useState<PaymentWallet[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    let q = supabase.from("payment_wallets").select("*").order("created_at", { ascending: true });
    if (!opts.adminMode) q = q.eq("is_active", true);
    const { data } = await q;
    if (data) setWallets(data as PaymentWallet[]);
    setLoading(false);
  }, [opts.adminMode]);

  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    const ch = supabase
      .channel("payment_wallets_sub")
      .on("postgres_changes", { event: "*", schema: "public", table: "payment_wallets" }, () => refresh())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [refresh]);

  const add = async (data: Omit<PaymentWallet, "id" | "created_at" | "updated_at" | "is_active"> & { is_active?: boolean }) => {
    const { data: { session } } = await supabase.auth.getSession();
    return supabase.from("payment_wallets").insert({
      ...data,
      icon_url: data.icon_url || DEFAULT_ICONS[data.crypto] || null,
      created_by: session?.user.id ?? null,
    });
  };

  const update = async (id: string, patch: Partial<PaymentWallet>) =>
    supabase.from("payment_wallets").update(patch).eq("id", id);

  const remove = async (id: string) =>
    supabase.from("payment_wallets").delete().eq("id", id);

  const uploadQr = async (file: File) => {
    const ext = file.name.split(".").pop()?.toLowerCase() || "png";
    const path = `qr/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await supabase.storage.from("wallet-qr").upload(path, file, { upsert: false, contentType: file.type });
    if (error) throw error;
    const { data } = supabase.storage.from("wallet-qr").getPublicUrl(path);
    return data.publicUrl;
  };

  return { wallets, loading, refresh, add, update, remove, uploadQr };
};
