import { useEffect, useState } from "react";
import { X, Wallet, ArrowUpRight, ArrowDownLeft, TrendingUp, Gift, Zap, DollarSign, Bitcoin, Clock, CheckCircle2, XCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useWallet, WalletTransaction } from "@/hooks/useWallet";
import { useNotifications } from "@/hooks/useNotifications";
import { useSuspension } from "@/hooks/useSuspension";
import { supabase } from "@/integrations/supabase/client";
import DepositSheet from "./DepositSheet";
import WithdrawSheet from "./WithdrawSheet";

interface WalletScreenProps {
  onClose: () => void;
}

const QUICK_AMOUNTS = [50, 100, 250, 500];
type Crypto = "BTC" | "ETH" | "USDT";

interface MyRequest {
  id: string;
  kind: "deposit" | "withdrawal";
  amount_usd: number;
  crypto: Crypto;
  status: "pending" | "approved" | "rejected";
  created_at: string;
}

const WalletScreen = ({ onClose }: WalletScreenProps) => {
  const { balance, transactions } = useWallet();
  const { isSuspended } = useSuspension();
  const [showDeposit, setShowDeposit] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [myRequests, setMyRequests] = useState<MyRequest[]>([]);

  const fetchRequests = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const [d, w] = await Promise.all([
      supabase.from("deposit_requests").select("id, amount_usd, crypto, status, created_at").eq("user_id", session.user.id).order("created_at", { ascending: false }).limit(10),
      supabase.from("withdrawal_requests").select("id, amount_usd, crypto, status, created_at").eq("user_id", session.user.id).order("created_at", { ascending: false }).limit(10),
    ]);
    const merged: MyRequest[] = [
      ...((d.data || []) as Omit<MyRequest, "kind">[]).map((r) => ({ ...r, kind: "deposit" as const })),
      ...((w.data || []) as Omit<MyRequest, "kind">[]).map((r) => ({ ...r, kind: "withdrawal" as const })),
    ].sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
    setMyRequests(merged);
  };

  useEffect(() => {
    fetchRequests();
    const ch = supabase
      .channel("wallet_my_requests")
      .on("postgres_changes", { event: "*", schema: "public", table: "deposit_requests" }, () => fetchRequests())
      .on("postgres_changes", { event: "*", schema: "public", table: "withdrawal_requests" }, () => fetchRequests())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const getIcon = (type: WalletTransaction["type"]) => {
    switch (type) {
      case "deposit": return <ArrowDownLeft className="w-4 h-4 text-green-500" />;
      case "withdrawal": return <ArrowUpRight className="w-4 h-4 text-red-500" />;
      case "bet_placed": return <Zap className="w-4 h-4 text-primary" />;
      case "bet_won": return <TrendingUp className="w-4 h-4 text-green-500" />;
      case "bet_cashout": return <DollarSign className="w-4 h-4 text-yellow-500" />;
      case "bonus": return <Gift className="w-4 h-4 text-purple-500" />;
    }
  };

  const isCredit = (type: WalletTransaction["type"]) =>
    ["deposit", "bet_won", "bet_cashout", "bonus"].includes(type);

  return (
    <motion.div
      initial={{ opacity: 0, y: "100%" }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: "100%" }}
      transition={{ type: "spring", damping: 25, stiffness: 300 }}
      className="fixed inset-0 z-50 bg-background flex flex-col"
    >
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-lg border-b border-border/50 p-4">
        <div className="flex items-center justify-between">
          <button onClick={onClose} className="w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center">
            <X className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="font-bold text-lg text-foreground flex items-center gap-2">
            <Wallet className="w-5 h-5 text-primary" /> Wallet
          </h1>
          <div className="w-10" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 pb-24 space-y-6">
        {/* Balance Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-2xl p-6 shadow-lg"
          style={{ background: "linear-gradient(135deg, hsl(155 75% 30%) 0%, hsl(150 70% 18%) 60%, hsl(45 90% 45%) 140%)" }}
        >
          <div className="relative z-10">
            <p className="text-sm text-white/80 mb-1">Available Balance</p>
            <h2 className="text-4xl font-bold text-white drop-shadow">${balance.toFixed(2)}</h2>
            <p className="text-xs text-yellow-200/90 mt-2 font-medium">Betnaro Virtual Currency</p>
          </div>
          <div className="absolute top-4 right-4 w-20 h-20 rounded-full bg-yellow-300/15" />
          <div className="absolute -bottom-4 -right-4 w-32 h-32 rounded-full bg-yellow-300/10" />
        </motion.div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3">
          <Button
            onClick={() => setShowCryptoDeposit(true)}
            className="flex items-center gap-2 py-6 bg-gradient-to-r from-yellow-500 to-amber-600 text-white border-0"
          >
            <Bitcoin className="w-5 h-5" /> Crypto Deposit
          </Button>
          <Button
            onClick={() => setActiveTab("withdraw")}
            variant={activeTab === "withdraw" ? "default" : "outline"}
            className="flex items-center gap-2 py-6"
          >
            <ArrowUpRight className="w-5 h-5" /> Withdraw
          </Button>
        </div>

        {/* Deposit / Withdraw Form */}
        <AnimatePresence mode="wait">
          {(activeTab === "deposit" || activeTab === "withdraw") && (
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="glass-card p-4 space-y-4"
            >
              <h3 className="font-semibold text-foreground">
                {activeTab === "deposit" ? "Request Deposit" : "Request Withdrawal"}
              </h3>
              <p className="text-xs text-muted-foreground">
                {activeTab === "deposit"
                  ? "Submit your deposit; admin will credit your balance after confirming the on-chain transfer."
                  : "Submit your withdrawal; admin will review and process the payout."}
              </p>

              <div className="flex gap-2">
                {(["BTC", "ETH", "USDT"] as Crypto[]).map((c) => (
                  <button key={c} onClick={() => setCrypto(c)}
                    className={`flex-1 py-2 rounded-lg text-sm font-bold transition-colors ${
                      crypto === c ? "bg-primary text-primary-foreground" : "bg-muted/50 text-foreground hover:bg-muted"
                    }`}>{c}</button>
                ))}
              </div>

              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type="number"
                  placeholder="Enter amount in USD"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-muted/50 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              <div className="flex gap-2">
                {QUICK_AMOUNTS.map((qa) => (
                  <button
                    key={qa}
                    onClick={() => setAmount(String(qa))}
                    className="flex-1 py-2 rounded-lg bg-muted/50 text-sm font-medium text-foreground hover:bg-muted transition-colors"
                  >
                    ${qa}
                  </button>
                ))}
              </div>

              {activeTab === "withdraw" && (
                <input
                  type="text"
                  placeholder={`Your ${crypto} destination address`}
                  value={destAddr}
                  onChange={(e) => setDestAddr(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-muted/50 border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              )}

              <Button
                onClick={activeTab === "deposit" ? handleDepositRequest : handleWithdrawRequest}
                className="w-full"
                size="lg"
                disabled={submitting || isSuspended}
              >
                {submitting ? "Submitting…" : activeTab === "deposit" ? "Submit deposit request" : "Submit withdrawal request"}
              </Button>
              {isSuspended && (
                <p className="text-xs text-destructive text-center">Your account is suspended.</p>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* My Pending Requests */}
        {myRequests.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-3">My Requests</h3>
            <div className="space-y-2">
              {myRequests.map((r) => {
                const Icon = r.kind === "deposit" ? ArrowDownLeft : ArrowUpRight;
                const StatusIcon = r.status === "pending" ? Clock : r.status === "approved" ? CheckCircle2 : XCircle;
                const statusColor = r.status === "pending" ? "text-amber-400" : r.status === "approved" ? "text-emerald-400" : "text-destructive";
                return (
                  <div key={r.id} className="glass-card p-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-muted/50 flex items-center justify-center">
                        <Icon className="w-4 h-4 text-foreground" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">${r.amount_usd.toFixed(2)} {r.crypto} {r.kind}</p>
                        <p className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
                      </div>
                    </div>
                    <div className={`flex items-center gap-1 text-xs font-bold uppercase ${statusColor}`}>
                      <StatusIcon className="w-3.5 h-3.5" /> {r.status}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        {/* Transaction History */}
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-3">Transaction History</h3>
          <div className="space-y-2">
            {transactions.length === 0 ? (
              <p className="text-center text-muted-foreground py-8 text-sm">No transactions yet</p>
            ) : (
              transactions.slice(0, 50).map((tx) => (
                <div key={tx.id} className="glass-card p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-muted/50 flex items-center justify-center">
                      {getIcon(tx.type)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground truncate max-w-[180px]">{tx.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(tx.createdAt).toLocaleDateString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                  <span className={`text-sm font-bold ${isCredit(tx.type) ? "text-green-500" : "text-red-500"}`}>
                    {isCredit(tx.type) ? "+" : "-"}${tx.amount.toFixed(2)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Crypto Deposit Sheet */}
      <AnimatePresence>
        {showCryptoDeposit && (
          <CryptoDepositSheet onClose={() => setShowCryptoDeposit(false)} />
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default WalletScreen;
