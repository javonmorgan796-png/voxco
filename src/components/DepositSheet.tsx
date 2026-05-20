import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Headphones,
  ShieldCheck,
  Copy,
  Check,
  RefreshCw,
  UploadCloud,
  Loader2,
  AlertTriangle,
  Repeat2,
  Send,
} from "lucide-react";
import { motion } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";

import { useCryptoPrices } from "@/hooks/useCryptoPrices";
import { useNotifications } from "@/hooks/useNotifications";
import { useSuspension } from "@/hooks/useSuspension";
import { usePaymentWallets } from "@/hooks/usePaymentWallets";
import { supabase } from "@/integrations/supabase/client";
import { mongoSync } from "@/lib/mongoSync";

interface Props {
  onClose: () => void;
}

type Sym = "USDT" | "ETH" | "BTC";

const META: Record<Sym, { name: string; network: string; ring: string; bg: string; icon: string }> = {
  USDT: { name: "USDT", network: "TRC20", ring: "ring-emerald-500/60", bg: "bg-emerald-500/10", icon: "₮" },
  ETH: { name: "ETH", network: "ERC20", ring: "ring-indigo-400/60", bg: "bg-indigo-500/10", icon: "Ξ" },
  BTC: { name: "BTC", network: "Bitcoin", ring: "ring-amber-400/60", bg: "bg-amber-500/10", icon: "₿" },
};

const QUICK = [20, 50, 100, 200, 500] as const;
const MIN_USD = 5;
const MAX_USD = 100_000;

const DepositSheet = ({ onClose }: Props) => {
  const { prices, loading: pricesLoading } = useCryptoPrices();
  const { wallets, loading: walletsLoading, refresh: refreshWallets } = usePaymentWallets();
  const { addNotification } = useNotifications();
  const { isSuspended } = useSuspension();

  const [sym, setSym] = useState<Sym>("USDT");
  const [amount, setAmount] = useState<string>("100");
  const [copied, setCopied] = useState(false);
  const [receipt, setReceipt] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // active crypto wallets only
  const cryptoWallets = useMemo(
    () => wallets?.filter((w) => w?.crypto !== "BANK" && w?.is_active) ?? [],
    [wallets],
  );
  const availableSyms = useMemo(
    () => Array.from(new Set(cryptoWallets.map((w) => w?.crypto))).filter(Boolean) as Sym[],
    [cryptoWallets],
  );
  const wallet = useMemo(
    () => cryptoWallets.find((w) => w?.crypto === sym) ?? cryptoWallets[0] ?? null,
    [cryptoWallets, sym],
  );

  // auto-select first available
  useEffect(() => {
    if (availableSyms.length && !availableSyms.includes(sym)) {
      setSym(availableSyms[0]);
    }
  }, [availableSyms, sym]);

  const amountNum = Number(amount) || 0;
  const price = wallet?.crypto ? prices[wallet.crypto as Sym] : undefined;
  const cryptoAmount = price?.usd && price.usd > 0 ? amountNum / price.usd : amountNum; // USDT≈1
  const rate = price?.usd ?? (sym === "USDT" ? 1 : 0);

  const amountError = (() => {
    if (!amount) return null;
    if (Number.isNaN(amountNum)) return "Enter a valid number";
    if (amountNum < MIN_USD) return `Minimum deposit is $${MIN_USD}`;
    if (amountNum > MAX_USD) return `Maximum deposit is $${MAX_USD.toLocaleString()}`;
    return null;
  })();

  const handleCopy = async () => {
    if (!wallet?.address) {
      toast.error("No address available");
      return;
    }
    try {
      await navigator.clipboard.writeText(wallet.address);
      setCopied(true);
      toast.success(`${wallet.crypto} address copied`);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy address");
    }
  };

  const pickFile = (f: File | null) => {
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) {
      toast.error("File must be under 5MB");
      return;
    }
    setReceipt(f);
    try {
      setReceiptPreview(f.type.startsWith("image/") ? URL.createObjectURL(f) : null);
    } catch (e) {
      console.warn("Failed to create object URL:", e);
      setReceiptPreview(null);
    }
  };

  const handleSubmit = async () => {
    if (isSuspended) return toast.error("Account suspended");
    if (amountError) return toast.error(amountError);
    if (!wallet) return toast.error("No wallet available");
    if (!receipt) return toast.error("Upload your payment proof");

    setSubmitting(true);
    try {
      const { data: { session }, error: sessionErr } = await supabase.auth.getSession();
      if (sessionErr || !session?.user?.id) {
        toast.error("Sign in required");
        return;
      }

      const ext = receipt.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${session.user.id}/${Date.now()}.${ext}`;
      
      const { error: upErr } = await supabase.storage
        .from("receipts")
        .upload(path, receipt, { upsert: false, contentType: receipt.type });
      
      if (upErr) throw upErr;

      const { error: insErr } = await supabase.from("deposit_requests").insert({
        user_id: session.user.id,
        amount_usd: amountNum,
        crypto: wallet.crypto,
        receipt_url: path,
        note: `${cryptoAmount.toFixed(wallet.crypto === "USDT" ? 2 : 8)} ${wallet.crypto} → ${wallet.address}`,
      });
      if (insErr) throw insErr;

      try {
        mongoSync("deposit_requested", { amount_usd: amountNum, crypto: wallet.crypto, has_receipt: true });
      } catch (e) {
        console.warn("MongoDB sync failed:", e);
      }

      addNotification("deposit", "Deposit submitted", `$${amountNum.toFixed(2)} pending approval`);
      toast.success("Deposit submitted for approval");
      onClose();
    } catch (err) {
      console.error("Deposit submission error:", err);
      toast.error(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (walletsLoading) {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  const meta = wallet ? META[wallet.crypto as Sym] : META.USDT;

  return (
    <motion.div
      initial={{ opacity: 0, y: "100%" }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: "100%" }}
      transition={{ type: "spring", damping: 28, stiffness: 280 }}
      className="fixed inset-0 z-[60] bg-[#05070a] text-white flex flex-col"
    >
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#05070a]/95 backdrop-blur border-b border-white/5">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/5"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-bold">Deposit</h1>
          <button className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/5">
            <Headphones className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6 pb-32">
        {/* Hero banner */}
        <div className="relative overflow-hidden rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/15 flex items-center justify-center">
              <ShieldCheck className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-emerald-400 font-bold text-base leading-tight">Secure & Instant Deposits</h2>
              <p className="text-xs text-white/70">Your funds are safe with us</p>
            </div>
          </div>
          <div className="absolute -right-4 -top-2 w-32 h-32 rounded-full bg-emerald-500/10 blur-2xl" />
        </div>

        {/* 1. Currency */}
        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-white">1. Select Cryptocurrency</h3>
          <div className="grid grid-cols-3 gap-3">
            {(["USDT", "ETH", "BTC"] as Sym[]).map((s) => {
              const enabled = availableSyms.includes(s);
              const active = sym === s;
              const m = META[s];
              return (
                <button
                  key={s}
                  disabled={!enabled}
                  onClick={() => enabled && setSym(s)}
                  className={`relative rounded-2xl border p-3 text-left transition ${
                    active
                      ? `border-emerald-500/60 bg-emerald-500/5 ring-1 ${m.ring}`
                      : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]"
                  } ${!enabled ? "opacity-40 cursor-not-allowed" : ""}`}
                >
                  <div className={`w-9 h-9 rounded-full ${m.bg} flex items-center justify-center text-base font-bold mb-2`}>
                    {m.icon}
                  </div>
                  <div className="font-bold">{m.name}</div>
                  <div className="text-[11px] text-white/60">{m.network}</div>
                  {active && (
                    <span className="absolute top-2 right-2 w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center">
                      <Check className="w-3 h-3 text-black" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </section>

        {/* 2. Amount */}
        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-white">2. Enter Amount (USD)</h3>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 flex items-center gap-3">
            <span className="text-white/50 text-2xl">$</span>
            <input
              type="number"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              className="flex-1 bg-transparent text-3xl font-bold outline-none placeholder:text-white/30"
            />
            <span className="text-xs font-semibold text-white/70 px-2 py-1 rounded-md bg-white/5">USD</span>
          </div>
          {amountError && (
            <p className="text-xs text-red-400 flex items-center gap-1"><AlertTriangle className="w-3 h-3" />{amountError}</p>
          )}
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            {QUICK.map((v) => (
              <button
                key={v}
                onClick={() => setAmount(String(v))}
                className={`px-4 py-2 rounded-xl text-sm font-medium border transition ${
                  amountNum === v
                    ? "border-emerald-500 text-emerald-400 bg-emerald-500/10"
                    : "border-white/10 text-white/80 hover:bg-white/5"
                }`}
              >
                ${v}
              </button>
            ))}
            <button
              onClick={() => setAmount(String(MAX_USD))}
              className="px-4 py-2 rounded-xl text-sm font-medium border border-white/10 text-white/80 hover:bg-white/5"
            >
              Max
            </button>
          </div>

          {/* Rate / send */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 grid grid-cols-2 gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-wider text-white/50">You will send</p>
              <p className="mt-1 font-bold text-emerald-400 text-lg">
                {cryptoAmount.toFixed(wallet?.crypto === "USDT" ? 2 : 8)}{" "}
                <span className="text-sm">{wallet?.crypto ?? sym}</span>
              </p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wider text-white/50 flex items-center gap-2">
                Rate
                {pricesLoading && <RefreshCw className="w-3 h-3 animate-spin" />}
              </p>
              <p className="mt-1 font-semibold text-white/90 text-sm">
                {rate > 0
                  ? `1 ${wallet?.crypto ?? sym} = $${rate.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
                  : "Live price unavailable"}
              </p>
            </div>
          </div>
        </section>

        {/* 3. Deposit to */}
        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-white">3. Deposit To</h3>
          {!wallet ? (
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm space-y-3">
              <p className="text-amber-300">No active wallet available for this currency.</p>
              <button
                onClick={() => refreshWallets()}
                className="px-3 py-2 rounded-lg bg-amber-500/20 text-amber-200 text-xs font-semibold"
              >
                Retry
              </button>
            </div>
          ) : (
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full ${meta.bg} flex items-center justify-center text-lg font-bold`}>
                    {meta.icon}
                  </div>
                  <div>
                    <div className="font-bold flex items-center gap-2">
                      {meta.name} <span className="text-white/60 text-sm">({wallet?.network || meta.network})</span>
                    </div>
                    <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-semibold text-emerald-300 bg-emerald-500/15 rounded-full px-2 py-0.5">
                      Active
                    </span>
                  </div>
                </div>
                {availableSyms.length > 1 && (
                  <button
                    onClick={() => {
                      const idx = availableSyms.indexOf(sym);
                      setSym(availableSyms[(idx + 1) % availableSyms.length]);
                    }}
                    className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10"
                  >
                    <Repeat2 className="w-3.5 h-3.5" /> Change
                  </button>
                )}
              </div>

              <div className="grid grid-cols-[1fr_auto] gap-3 items-start">
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-white/50 mb-1">Wallet Address</p>
                  <p className="font-mono text-sm break-all text-white/90 leading-relaxed">
                    {wallet?.address || "N/A"}
                  </p>
                  <button
                    onClick={handleCopy}
                    disabled={!wallet?.address}
                    className="mt-3 w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-emerald-500/40 text-emerald-300 bg-emerald-500/5 hover:bg-emerald-500/10 disabled:opacity-50 disabled:cursor-not-allowed transition"
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {copied ? "Copied" : "Copy Address"}
                  </button>
                </div>
                {wallet?.address && (
                  <div className="bg-white p-2 rounded-xl">
                    <QRCodeSVG value={wallet.address} size={110} />
                  </div>
                )}
              </div>

              <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 flex gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                <p className="text-xs text-amber-100/90">
                  Send only <strong>{meta.name} ({wallet?.network || meta.network})</strong> to this address.
                  Sending other coins may result in permanent loss.
                </p>
              </div>
            </div>
          )}
        </section>

        {/* 4. Upload proof */}
        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-white">4. Upload Payment Proof</h3>
          <input
            ref={fileRef}
            type="file"
            accept="image/*,application/pdf"
            className="hidden"
            onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
          />
          <button
            onClick={() => fileRef.current?.click()}
            className="w-full rounded-2xl border-2 border-dashed border-white/15 bg-white/[0.02] p-5 flex items-center gap-4 hover:bg-white/[0.05] transition text-left"
          >
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/30">
              <UploadCloud className="w-6 h-6 text-emerald-400" />
            </div>
            <div className="flex-1">
              <div className="font-semibold text-sm">
                {receipt?.name || "Upload Screenshot or Receipt"}
              </div>
              <div className="text-[11px] text-white/50 mt-0.5">PNG, JPG, JPEG, PDF (Max 5MB)</div>
            </div>
          </button>
          {receiptPreview && (
            <img src={receiptPreview} alt="receipt preview" className="rounded-xl max-h-48 w-auto mx-auto" />
          )}
        </section>
      </div>

      {/* Submit */}
      <div className="sticky bottom-0 z-10 bg-[#05070a]/95 backdrop-blur border-t border-white/5 px-4 py-3 pb-[calc(env(safe-area-inset-bottom)+12px)]">
        <button
          onClick={handleSubmit}
          disabled={submitting || !!amountError || !wallet || !receipt || isSuspended}
          className="w-full inline-flex items-center justify-center gap-2 py-4 rounded-2xl bg-gradient-to-r from-emerald-400 to-emerald-500 text-black font-bold text-base shadow-lg shadow-emerald-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          {submitting ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              Submit Deposit <Send className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    </motion.div>
  );
};

export default DepositSheet;
