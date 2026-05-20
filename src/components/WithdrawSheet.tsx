import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  History,
  Wallet as WalletIcon,
  ShieldCheck,
  Copy,
  Check,
  Clock,
  AlertCircle,
  Loader2,
  ChevronDown,
  Send,
  AlertTriangle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

import { useWallet } from "@/hooks/useWallet";
import { useCryptoPrices } from "@/hooks/useCryptoPrices";
import { useNotifications } from "@/hooks/useNotifications";
import { useSuspension } from "@/hooks/useSuspension";
import { supabase } from "@/integrations/supabase/client";
import { mongoSync } from "@/lib/mongoSync";

interface Props {
  onClose: () => void;
  onShowHistory?: () => void;
}

type Sym = "USDT" | "ETH" | "BTC";
const META: Record<Sym, { name: string; network: string; ring: string; bg: string; icon: string; networks: string[] }> = {
  USDT: { name: "USDT", network: "TRC20", ring: "ring-emerald-500/60", bg: "bg-emerald-500/10", icon: "₮", networks: ["TRC20 (Tron)", "ERC20 (Ethereum)", "BEP20 (BSC)"] },
  ETH: { name: "ETH", network: "ERC20", ring: "ring-indigo-400/60", bg: "bg-indigo-500/10", icon: "Ξ", networks: ["ERC20 (Ethereum)"] },
  BTC: { name: "BTC", network: "Bitcoin", ring: "ring-amber-400/60", bg: "bg-amber-500/10", icon: "₿", networks: ["Bitcoin (BTC)"] },
};

const NETWORK_FEE_USD = 1;
const MIN_USD = 10;
const MAX_USD = 10_000;

const WithdrawSheet = ({ onClose, onShowHistory }: Props) => {
  const { balance } = useWallet();
  const { prices } = useCryptoPrices();
  const { addNotification } = useNotifications();
  const { isSuspended } = useSuspension();

  const [sym, setSym] = useState<Sym>("USDT");
  const [amount, setAmount] = useState("");
  const [address, setAddress] = useState("");
  const [network, setNetwork] = useState<string>(META.USDT.networks[0]);
  const [networkOpen, setNetworkOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setNetwork(META[sym].networks[0]);
  }, [sym]);

  const amountNum = Number(amount) || 0;
  const price = prices[sym];
  const rate = price?.usd ?? (sym === "USDT" ? 1 : 0);
  const youReceive = rate > 0 ? amountNum / rate : amountNum;
  const feeCrypto = rate > 0 ? NETWORK_FEE_USD / rate : NETWORK_FEE_USD;
  const youGet = Math.max(0, youReceive - feeCrypto);

  const error = useMemo(() => {
    if (!amount) return null;
    if (Number.isNaN(amountNum)) return "Enter a valid number";
    if (amountNum < MIN_USD) return `Minimum withdrawal is $${MIN_USD}`;
    if (amountNum > MAX_USD) return `Maximum withdrawal is $${MAX_USD.toLocaleString()}`;
    if (amountNum > balance) return "Insufficient balance";
    return null;
  }, [amount, amountNum, balance]);

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setAddress(text.trim());
        toast.success("Address pasted");
      }
    } catch {
      toast.error("Clipboard not available");
    }
  };

  const handleSubmit = async () => {
    if (isSuspended) return toast.error("Account suspended");
    if (error) return toast.error(error);
    if (!address.trim()) return toast.error("Enter your wallet address");

    setSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Sign in required");
        return;
      }
      const { error: insErr } = await supabase.from("withdrawal_requests").insert({
        user_id: session.user.id,
        amount_usd: amountNum,
        crypto: sym,
        destination_address: address.trim(),
        note: `${sym} ${network}`,
      });
      if (insErr) throw insErr;

      try {
        mongoSync("withdrawal_requested", { amount_usd: amountNum, crypto: sym, destination_address: address });
      } catch { /* ignore */ }

      addNotification(
        "withdrawal",
        "Withdrawal submitted",
        `$${amountNum.toFixed(2)} (${sym}) → ${address.slice(0, 10)}… pending approval.`,
      );
      toast.success("Withdrawal request submitted");
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  const balanceUsdt = balance; // 1:1 display

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
          <h1 className="text-lg font-bold">Withdraw</h1>
          <button
            onClick={onShowHistory}
            className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/5"
            aria-label="History"
          >
            <History className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6 pb-32">
        {/* Balance card */}
        <div className="rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/15 flex items-center justify-center border border-emerald-500/30">
              <WalletIcon className="w-6 h-6 text-emerald-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-white/70">Available Balance</p>
              <p className="text-2xl font-extrabold text-emerald-400 leading-tight">
                ${balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <p className="text-[11px] text-white/60 mt-0.5">≈ {balanceUsdt.toFixed(2)} USDT</p>
            </div>
            <button
              onClick={onShowHistory}
              className="text-xs px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 inline-flex items-center gap-1.5"
            >
              <History className="w-3.5 h-3.5" /> History
            </button>
          </div>
        </div>

        {/* 1. Currency */}
        <Step n={1} title="Select Cryptocurrency">
          <div className="grid grid-cols-3 gap-3">
            {(["USDT", "ETH", "BTC"] as Sym[]).map((s) => {
              const active = sym === s;
              const m = META[s];
              return (
                <button
                  key={s}
                  onClick={() => setSym(s)}
                  className={`relative rounded-2xl border p-3 text-left transition ${
                    active
                      ? `border-emerald-500/60 bg-emerald-500/5 ring-1 ${m.ring}`
                      : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]"
                  }`}
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
        </Step>

        {/* 2. Amount */}
        <Step n={2} title="Enter Amount (USD)">
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
          <div className="flex items-center justify-between text-[11px] mt-2">
            <div className="flex gap-4 text-white/60">
              <span>Min: ${MIN_USD}</span>
              <span>Max: ${MAX_USD.toLocaleString()}</span>
            </div>
            <button
              onClick={() => setAmount(String(Math.min(balance, MAX_USD).toFixed(2)))}
              className="text-emerald-400 font-semibold"
            >
              Available: ${balance.toFixed(2)}
            </button>
          </div>
          {error && (
            <p className="text-xs text-red-400 flex items-center gap-1 mt-2">
              <AlertTriangle className="w-3 h-3" />{error}
            </p>
          )}

          {/* Receive breakdown */}
          <div className="mt-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-white/50">You Will Receive</p>
              <p className="mt-1 font-bold text-emerald-400">
                {youReceive.toFixed(sym === "USDT" ? 2 : 6)} <span className="text-[11px]">{sym}</span>
              </p>
            </div>
            <div className="border-x border-white/10">
              <p className="text-[10px] uppercase tracking-wider text-white/50">Network Fee</p>
              <p className="mt-1 font-bold text-white/90">
                {feeCrypto.toFixed(sym === "USDT" ? 2 : 6)} <span className="text-[11px]">{sym}</span>
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-white/50">You Will Get</p>
              <p className="mt-1 font-bold text-emerald-400">
                {youGet.toFixed(sym === "USDT" ? 2 : 6)} <span className="text-[11px]">{sym}</span>
              </p>
            </div>
          </div>
        </Step>

        {/* 3. Address */}
        <Step n={3} title="Wallet Address">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] flex items-center pr-2">
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder={`Enter ${sym} (${META[sym].network}) wallet address`}
              className="flex-1 bg-transparent px-4 py-4 text-sm outline-none placeholder:text-white/40"
            />
            <button
              onClick={handlePaste}
              className="w-10 h-10 rounded-lg flex items-center justify-center hover:bg-white/5"
              aria-label="Paste address"
            >
              <Copy className="w-4 h-4 text-white/70" />
            </button>
          </div>
          <div className="mt-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3 flex gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
            <p className="text-xs text-emerald-100/90">
              Make sure the address is correct and on the <strong>{META[sym].network}</strong> network.
            </p>
          </div>
        </Step>

        {/* 4. Network */}
        <Step n={4} title="Select Network">
          <button
            onClick={() => setNetworkOpen((v) => !v)}
            className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4 flex items-center justify-between text-sm hover:bg-white/[0.06]"
          >
            <span>{network}</span>
            <ChevronDown className={`w-4 h-4 transition-transform ${networkOpen ? "rotate-180" : ""}`} />
          </button>
          <AnimatePresence>
            {networkOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="mt-2 rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden"
              >
                {META[sym].networks.map((n) => (
                  <button
                    key={n}
                    onClick={() => { setNetwork(n); setNetworkOpen(false); }}
                    className={`w-full text-left px-4 py-3 text-sm hover:bg-white/5 ${
                      network === n ? "text-emerald-400 font-semibold" : "text-white/80"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </Step>

        {/* 5. Notes */}
        <Step n={5} title="Important Notes">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] divide-y divide-white/10">
            <Note icon={<Clock className="w-4 h-4 text-emerald-400" />} title="Withdrawal Processing">
              Withdrawals are processed within 5-30 minutes.
            </Note>
            <Note icon={<AlertCircle className="w-4 h-4 text-emerald-400" />} title="Important">
              Do not withdraw to exchange addresses.
            </Note>
          </div>
        </Step>
      </div>

      {/* Submit */}
      <div className="sticky bottom-0 z-10 bg-[#05070a]/95 backdrop-blur border-t border-white/5 px-4 py-3 pb-[calc(env(safe-area-inset-bottom)+12px)]">
        <button
          onClick={handleSubmit}
          disabled={submitting || !!error || !address.trim() || !amount || isSuspended}
          className="w-full inline-flex items-center justify-center gap-2 py-4 rounded-2xl bg-gradient-to-r from-emerald-400 to-emerald-500 text-black font-bold text-base shadow-lg shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              <Send className="w-4 h-4" /> Request Withdrawal
            </>
          )}
        </button>
      </div>
    </motion.div>
  );
};

const Step = ({ n, title, children }: { n: number; title: string; children: React.ReactNode }) => (
  <section className="space-y-3">
    <div className="flex items-center gap-2">
      <span className="w-6 h-6 rounded-full bg-emerald-500 text-black text-xs font-bold flex items-center justify-center">{n}</span>
      <h3 className="text-sm font-semibold">{title}</h3>
    </div>
    {children}
  </section>
);

const Note = ({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) => (
  <div className="p-4 flex gap-3">
    <div className="w-9 h-9 rounded-full border border-emerald-500/30 bg-emerald-500/10 flex items-center justify-center shrink-0">
      {icon}
    </div>
    <div>
      <p className="text-sm font-semibold">{title}</p>
      <p className="text-xs text-white/70 mt-0.5">{children}</p>
    </div>
  </div>
);

export default WithdrawSheet;
