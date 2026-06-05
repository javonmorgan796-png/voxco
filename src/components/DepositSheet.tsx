import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Headphones,
  ShieldCheck,
  Copy,
  Check,
  Loader2,
  Send,
  Hash,
} from "lucide-react";
import { motion } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";

import { useCryptoPrices } from "@/hooks/useCryptoPrices";
import { useNotifications } from "@/hooks/useNotifications";
import { useSuspension } from "@/hooks/useSuspension";
import { usePaymentWallets } from "@/hooks/usePaymentWallets";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  onClose: () => void;
}

type Sym = "USDT" | "ETH" | "BTC";

const META: Record<
  Sym,
  {
    name: string;
    network: string;
    ring: string;
    bg: string;
    icon: string;
  }
> = {
  USDT: {
    name: "USDT",
    network: "TRC20",
    ring: "ring-emerald-500/60",
    bg: "bg-emerald-500/10",
    icon: "₮",
  },
  ETH: {
    name: "ETH",
    network: "ERC20",
    ring: "ring-indigo-400/60",
    bg: "bg-indigo-500/10",
    icon: "Ξ",
  },
  BTC: {
    name: "BTC",
    network: "Bitcoin",
    ring: "ring-amber-400/60",
    bg: "bg-amber-500/10",
    icon: "₿",
  },
};

const QUICK = [20, 50, 100, 200, 500] as const;
const MIN_USD = 5;
const MAX_USD = 100000;

const DepositSheet = ({ onClose }: Props) => {
  const { prices, loading: pricesLoading } = useCryptoPrices();

  const {
    wallets = [],
    loading: walletsLoading,
    refresh,
  } = usePaymentWallets() || {};

  const { addNotification } = useNotifications();
  const { isSuspended } = useSuspension();

  const [sym, setSym] = useState<Sym>("USDT");
  const [amount, setAmount] = useState("100");
  const [copied, setCopied] = useState(false);

  const [txHash, setTxHash] = useState("");

  const [submitting, setSubmitting] = useState(false);

  const cryptoWallets = useMemo(() => {
    return (
      wallets?.filter(
        (w: any) => w && w.crypto && w.crypto !== "BANK" && w.is_active
      ) || []
    );
  }, [wallets]);

  const availableSyms = useMemo(() => {
    return Array.from(
      new Set(cryptoWallets.map((w: any) => w.crypto))
    ) as Sym[];
  }, [cryptoWallets]);

  const wallet = useMemo(() => {
    return (
      cryptoWallets.find((w: any) => w.crypto === sym) ||
      cryptoWallets[0] ||
      null
    );
  }, [cryptoWallets, sym]);

  useEffect(() => {
    if (availableSyms.length > 0 && !availableSyms.includes(sym)) {
      setSym(availableSyms[0]);
    }
  }, [availableSyms, sym]);

  const amountNum = Number(amount) || 0;

  const price = wallet?.crypto
    ? prices?.[wallet.crypto as Sym]
    : undefined;

  const cryptoAmount =
    price?.usd && price.usd > 0
      ? amountNum / price.usd
      : amountNum;

  const rate =
    price?.usd || (sym === "USDT" ? 1 : 0);

  const amountError = (() => {
    if (!amount) return null;

    if (Number.isNaN(amountNum)) {
      return "Enter a valid number";
    }

    if (amountNum < MIN_USD) {
      return `Minimum deposit is $${MIN_USD}`;
    }

    if (amountNum > MAX_USD) {
      return `Maximum deposit is $${MAX_USD.toLocaleString()}`;
    }

    return null;
  })();

  const handleCopy = async () => {
    if (!wallet?.address) {
      toast.error("No wallet address found");
      return;
    }

    try {
      await navigator.clipboard.writeText(wallet.address);

      setCopied(true);

      toast.success("Wallet address copied");

      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (err) {
      console.error(err);
      toast.error("Failed to copy");
    }
  };

  const pickFile = (file: File | null) => {
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("File must be below 5MB");
      return;
    }

    setReceipt(file);

    try {
      if (file.type.startsWith("image/")) {
        const url = URL.createObjectURL(file);
        setReceiptPreview(url);
      } else {
        setReceiptPreview(null);
      }
    } catch (err) {
      console.error(err);
      setReceiptPreview(null);
    }
  };

  const handleSubmit = async () => {
    if (isSuspended) {
      toast.error("Account suspended");
      return;
    }

    if (amountError) {
      toast.error(amountError);
      return;
    }

    if (!wallet) {
      toast.error("No wallet available");
      return;
    }

    if (!receipt) {
      toast.error("Upload payment proof");
      return;
    }

    setSubmitting(true);

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session?.user?.id) {
        toast.error("Please sign in");
        return;
      }

      const ext =
        receipt.name.split(".").pop()?.toLowerCase() || "jpg";

      const filePath = `${session.user.id}/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("receipts")
        .upload(filePath, receipt, {
          upsert: false,
          contentType: receipt.type,
        });

      if (uploadError) {
        console.error(uploadError);
        throw uploadError;
      }

      const { error: insertError } = await supabase
        .from("deposit_requests")
        .insert({
          user_id: session.user.id,
          amount_usd: amountNum,
          crypto: wallet.crypto,
          receipt_url: filePath,
          note: `${cryptoAmount.toFixed(
            wallet.crypto === "USDT" ? 2 : 8
          )} ${wallet.crypto}`,
        });

      if (insertError) {
        console.error(insertError);
        throw insertError;
      }

      try {
        addNotification(
          "deposit",
          "Deposit Submitted",
          `$${amountNum.toFixed(2)} pending approval`
        );
      } catch (err) {
        console.warn(err);
      }

      toast.success("Deposit submitted successfully");

      onClose();
    } catch (err: any) {
      console.error("Deposit Error:", err);

      toast.error(
        err?.message || "Failed to submit deposit"
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (walletsLoading) {
    return (
      <div className="fixed inset-0 z-[60] bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  const meta = wallet
    ? META[wallet.crypto as Sym]
    : META.USDT;

  return (
    <motion.div
      initial={{ opacity: 0, y: "100%" }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: "100%" }}
      transition={{
        type: "spring",
        damping: 28,
        stiffness: 280,
      }}
      className="fixed inset-0 z-[60] bg-[#05070a] text-white flex flex-col"
    >
      <div className="sticky top-0 z-10 bg-[#05070a]/95 border-b border-white/5">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full flex items-center justify-center"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <h1 className="text-lg font-bold">
            Deposit
          </h1>

          <button className="w-10 h-10 rounded-full flex items-center justify-center">
            <Headphones className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-32">
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <ShieldCheck className="w-6 h-6 text-emerald-400" />
            </div>

            <div>
              <h2 className="text-emerald-400 font-bold">
                Secure Deposit
              </h2>

              <p className="text-xs text-white/60">
                Safe crypto transactions
              </p>
            </div>
          </div>
        </div>

        <section className="space-y-3">
          <h3 className="text-sm font-semibold">
            Select Cryptocurrency
          </h3>

          <div className="grid grid-cols-3 gap-3">
            {(["USDT", "ETH", "BTC"] as Sym[]).map((s) => {
              const active = sym === s;
              const enabled = availableSyms.includes(s);

              return (
                <button
                  key={s}
                  disabled={!enabled}
                  onClick={() => enabled && setSym(s)}
                  className={`rounded-2xl border p-3 text-left ${
                    active
                      ? "border-emerald-500 bg-emerald-500/10"
                      : "border-white/10"
                  }`}
                >
                  <div className="font-bold">
                    {s}
                  </div>

                  <div className="text-xs text-white/60">
                    {META[s].network}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-semibold">
            Enter Amount
          </h3>

          <input
            type="number"
            value={amount}
            onChange={(e) =>
              setAmount(e.target.value)
            }
            className="w-full rounded-2xl border border-white/10 bg-white/5 p-4 text-2xl outline-none"
          />

          {amountError && (
            <p className="text-xs text-red-400">
              {amountError}
            </p>
          )}

          <div className="grid grid-cols-5 gap-2">
            {QUICK.map((v) => (
              <button
                key={v}
                onClick={() => setAmount(String(v))}
                className="rounded-xl border border-white/10 py-2 text-sm"
              >
                ${v}
              </button>
            ))}
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-sm text-white/60">
              You will send
            </p>

            <p className="text-xl font-bold text-emerald-400">
              {cryptoAmount.toFixed(
                wallet?.crypto === "USDT" ? 2 : 8
              )}{" "}
              {wallet?.crypto || sym}
            </p>

            <p className="text-xs text-white/60 mt-2">
              Rate: 1 {wallet?.crypto || sym} = $
              {rate}
            </p>
          </div>
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-semibold">
            Wallet Address
          </h3>

          {!wallet ? (
            <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-4">
              <p className="text-sm text-red-400">
                No active wallet found
              </p>

              <button
                onClick={() => refresh?.()}
                className="mt-3 px-4 py-2 rounded-lg bg-red-500/20 text-sm"
              >
                Retry
              </button>
            </div>
          ) : (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-4">
              <p className="break-all font-mono text-sm">
                {wallet.address}
              </p>

              <button
                onClick={handleCopy}
                className="w-full rounded-xl border border-emerald-500/30 py-3 flex items-center justify-center gap-2"
              >
                {copied ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}

                {copied
                  ? "Copied"
                  : "Copy Address"}
              </button>

              {wallet.address && (
                <div className="bg-white p-3 rounded-xl w-fit mx-auto">
                  <QRCodeSVG
                    value={wallet.address}
                    size={120}
                  />
                </div>
              )}
            </div>
          )}
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-semibold">
            Upload Receipt
          </h3>

          <input
            ref={fileRef}
            type="file"
            accept="image/*,application/pdf"
            className="hidden"
            onChange={(e) =>
              pickFile(
                e.target.files?.[0] || null
              )
            }
          />

          <button
            onClick={() =>
              fileRef.current?.click()
            }
            className="w-full rounded-2xl border-2 border-dashed border-white/10 p-5 flex items-center gap-4"
          >
            <UploadCloud className="w-6 h-6 text-emerald-400" />

            <div className="text-left">
              <div className="font-medium">
                {receipt?.name ||
                  "Upload Screenshot"}
              </div>

              <div className="text-xs text-white/50">
                PNG, JPG, PDF
              </div>
            </div>
          </button>

          {receiptPreview && (
            <img
              src={receiptPreview}
              alt="preview"
              className="rounded-xl max-h-52 mx-auto"
            />
          )}
        </section>
      </div>

      <div className="sticky bottom-0 bg-[#05070a]/95 border-t border-white/5 p-4">
        <button
          onClick={handleSubmit}
          disabled={
            submitting ||
            !!amountError ||
            !wallet ||
            !receipt
          }
          className="w-full rounded-2xl bg-emerald-500 text-black font-bold py-4 flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {submitting ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              Submit Deposit
              <Send className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    </motion.div>
  );
};

export default DepositSheet;
