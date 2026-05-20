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
            onClick={() => setShowDeposit(true)}
            disabled={isSuspended}
            className="flex items-center gap-2 py-6 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white border-0"
          >
            <ArrowDownLeft className="w-5 h-5" /> Deposit
          </Button>
          <Button
            onClick={() => setShowWithdraw(true)}
            disabled={isSuspended}
            variant="outline"
            className="flex items-center gap-2 py-6"
          >
            <ArrowUpRight className="w-5 h-5" /> Withdraw
          </Button>
        </div>
        {isSuspended && (
          <p className="text-xs text-destructive text-center">Your account is suspended.</p>
        )}

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

      {/* Sheets */}
      <AnimatePresence>
        {showDeposit && <DepositSheet onClose={() => setShowDeposit(false)} />}
        {showWithdraw && <WithdrawSheet onClose={() => setShowWithdraw(false)} />}
      </AnimatePresence>
    </motion.div>
  );
};

export default WalletScreen;
