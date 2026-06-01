import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Crown, Lock, TrendingUp, Sparkles, CheckCircle2, Wallet, ShieldCheck, Settings, Loader2, Calendar, History as HistoryIcon, ArrowRight } from "lucide-react";
import { useVIP, VIP_PLANS, VIPPlan } from "@/hooks/useVIP";
import { useVipHistory } from "@/hooks/useVipHistory";
import { useWallet } from "@/hooks/useWallet";
import { useNotifications } from "@/hooks/useNotifications";
import { useVIPPredictions, VIPPredictionRow, VIPSection } from "@/hooks/useVIPPredictions";
import { useUserRole } from "@/hooks/useUserRole";
import { useUserVipBets } from "@/hooks/useUserVipBets";
import { useSuspension } from "@/hooks/useSuspension";
import { mongoSync } from "@/lib/mongoSync";
import { toast } from "sonner";

interface VIPSheetProps {
  onClose: () => void;
  onOpenAdmin?: () => void;
}

const SECTION_META: Record<VIPSection, { title: string; subtitle: string; accent: string; badge: string }> = {
  A: { title: "Section A — Banker Picks", subtitle: "Highest confidence single picks", accent: "text-yellow-400", badge: "BANKER" },
  B: { title: "Section B — Value Doubles", subtitle: "Two-leg accumulators with strong edge", accent: "text-emerald-400", badge: "VALUE" },
  C: { title: "Section C — Combo Specials", subtitle: "Higher-odds combined picks", accent: "text-sky-400", badge: "COMBO" },
  E: { title: "Section E — Long Shots", subtitle: "High-odds, high-reward predictions", accent: "text-fuchsia-400", badge: "JACKPOT" },
};

const VIPSheet = ({ onClose, onOpenAdmin }: VIPSheetProps) => {
  const { membership, isVIP, activate, previewExtension, daysRemaining, currentPlan } = useVIP();
  const { balance, withdraw, placeBetDeduction } = useWallet();
  const { addNotification } = useNotifications();
  const { isAdmin } = useUserRole();
  const { isSuspended } = useSuspension();
  const { predictions, loading, getDerivedStatus, bySection } = useVIPPredictions();
  const { placeBet: placeVipBet, statusFor } = useUserVipBets();
  const { history: vipHistory } = useVipHistory();
  const [activeSection, setActiveSection] = useState<VIPSection>("A");
  const [showCelebrate, setShowCelebrate] = useState(false);
  const [stakeFor, setStakeFor] = useState<Record<string, string>>({});
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<string>(VIP_PLANS[1].id);
  const [confirmPlan, setConfirmPlan] = useState<VIPPlan | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const selectedPlan: VIPPlan = VIP_PLANS.find((p) => p.id === selectedPlanId) || VIP_PLANS[0];

  const askConfirm = () => {
    if (isSuspended) { toast.error("Account suspended", { description: "Contact support." }); return; }
    if (balance < selectedPlan.price) {
      toast.error("Insufficient balance", {
        description: `You need $${selectedPlan.price} for the ${selectedPlan.label} plan. Your balance: $${balance.toFixed(2)}`,
      });
      return;
    }
    setConfirmPlan(selectedPlan);
  };

  const [purchasing, setPurchasing] = useState(false);
  const handleConfirmJoin = async () => {
    if (!confirmPlan || purchasing) return;
    if (balance < confirmPlan.price) {
      toast.error("Insufficient balance", { description: `Need $${confirmPlan.price}, have $${balance.toFixed(2)}` });
      return;
    }
    setPurchasing(true);
    const wasActive = isVIP;
    const { error } = await activate(confirmPlan);
    setPurchasing(false);
    if (error) {
      toast.error("Payment failed", { description: error });
      return;
    }
    setConfirmPlan(null);
    setShowCelebrate(true);
    const verb = wasActive ? "extended" : "joined";
    addNotification("info", wasActive ? "VIP extended ⏳" : "Welcome to VIP! 👑", `You ${verb} VIP ${confirmPlan.label} for $${confirmPlan.price}.`);
    toast.success(wasActive ? `VIP extended +${confirmPlan.months} mo` : `VIP ${confirmPlan.label} activated!`);
    mongoSync(wasActive ? "vip_extended" : "vip_joined", { price: confirmPlan.price, plan: confirmPlan.id, months: confirmPlan.months });
    setTimeout(() => setShowCelebrate(false), 2200);
  };

  const handlePlaceVIPBet = async (p: VIPPredictionRow) => {
    if (isSuspended) { toast.error("Account suspended"); return; }
    const stakeStr = stakeFor[p.id] || "10";
    const stake = parseFloat(stakeStr);
    if (!stake || stake <= 0) { toast.error("Enter a valid stake"); return; }
    if (stake > balance) { toast.error("Insufficient balance"); return; }
    if (new Date(p.kickoff).getTime() <= Date.now()) { toast.error("Match has already started"); return; }
    setSubmittingId(p.id);
    const tx = await placeBetDeduction(stake, `VIP ${p.section}: ${p.home_team} vs ${p.away_team}`);
    if (!tx) { setSubmittingId(null); toast.error("Could not place bet"); return; }
    const { error } = await placeVipBet(p.id, stake, Number(p.odds));
    setSubmittingId(null);
    if (error) { toast.error(error.message); return; }
    addNotification("info", "VIP bet placed", `$${stake.toFixed(2)} on ${p.prediction} @ ${p.odds} · awaiting admin approval`);
    toast.success(`Bet placed: $${stake.toFixed(2)} @ ${p.odds}`, {
      description: `Potential win: $${(stake * Number(p.odds)).toFixed(2)} · Pending review`,
    });
    mongoSync("vip_bet_placed", { prediction_id: p.id, stake, odds: Number(p.odds) });
    setStakeFor((prev) => ({ ...prev, [p.id]: "" }));
  };

  const sectionPicks = useMemo(() => bySection(activeSection), [bySection, activeSection, predictions]);
  const sectionMeta = SECTION_META[activeSection];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: "100%", scale: 0.9, opacity: 0 }}
        animate={{ y: 0, scale: 1, opacity: 1 }}
        exit={{ y: "100%", scale: 0.9, opacity: 0 }}
        transition={{ type: "spring", damping: 22, stiffness: 280 }}
        className="w-full max-w-md max-h-[92vh] bg-background rounded-t-3xl sm:rounded-3xl border border-primary/30 flex flex-col overflow-hidden relative"
        onClick={(e) => e.stopPropagation()}
        style={{ boxShadow: "0 -10px 60px -10px hsl(var(--primary) / 0.5)" }}
      >
        {/* Header */}
        <div className="relative p-5 bg-gradient-to-br from-yellow-500/20 via-primary/10 to-transparent border-b border-border/50">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-background/60 backdrop-blur flex items-center justify-center hover:bg-muted transition-colors z-10"
          >
            <X className="w-5 h-5 text-foreground" />
          </button>

          <div className="flex items-center gap-3">
            <motion.div
              animate={{ rotate: [0, -8, 8, -4, 0] }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 1.5 }}
              className="w-14 h-14 rounded-2xl bg-gradient-to-br from-yellow-400 to-amber-600 flex items-center justify-center shadow-lg"
            >
              <Crown className="w-8 h-8 text-white" />
            </motion.div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold text-foreground">Betnaro VIP</h2>
              <p className="text-xs text-muted-foreground">
                {isVIP ? "Active member · Premium picks unlocked" : `Plans from $${VIP_PLANS[0].price} / month`}
              </p>
            </div>
            {isAdmin && onOpenAdmin && (
              <button
                onClick={onOpenAdmin}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-primary/20 text-primary text-xs font-semibold hover:bg-primary/30 transition-colors"
              >
                <Settings className="w-3.5 h-3.5" /> Admin
              </button>
            )}
          </div>

          {!isVIP && (
            <div className="mt-4 grid grid-cols-3 gap-2">
              {[
                { icon: Sparkles, label: "Expert picks" },
                { icon: TrendingUp, label: "Edge analysis" },
                { icon: CheckCircle2, label: "4 sections" },
              ].map((b) => (
                <div key={b.label} className="glass-card p-2 flex flex-col items-center text-center">
                  <b.icon className="w-4 h-4 text-yellow-400 mb-1" />
                  <span className="text-[10px] text-muted-foreground leading-tight">{b.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Section tabs */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {(Object.keys(SECTION_META) as VIPSection[]).map((s) => (
              <button
                key={s}
                onClick={() => setActiveSection(s)}
                className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-bold transition-all ${
                  activeSection === s
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30"
                    : "bg-muted/40 text-muted-foreground hover:bg-muted/60"
                }`}
              >
                Section {s}
              </button>
            ))}
          </div>

          {/* Section header */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className={`font-bold text-lg ${sectionMeta.accent}`}>{sectionMeta.title}</h3>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full bg-muted/40 ${sectionMeta.accent}`}>
                {sectionMeta.badge}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">{sectionMeta.subtitle}</p>
          </div>

          {/* Predictions list */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 text-primary animate-spin" />
            </div>
          ) : sectionPicks.length === 0 ? (
            <div className="text-center text-muted-foreground py-10 text-sm">
              No predictions yet for this section.
            </div>
          ) : (
            <div className="space-y-3">
              {sectionPicks.map((p, i) => {
                const userBet = statusFor(p.id);
                let derivedTone: "locked" | "unlocked" | "placed" | "won" | "lost" | "started" = "locked";
                let derivedLabel = "Locked";
                if (!isVIP) {
                  derivedTone = "locked"; derivedLabel = "Locked";
                } else if (userBet) {
                  if (userBet.status === "won") { derivedTone = "won"; derivedLabel = "Won"; }
                  else if (userBet.status === "lost") { derivedTone = "lost"; derivedLabel = "Lost"; }
                  else if (userBet.status === "rejected") { derivedTone = "lost"; derivedLabel = "Rejected"; }
                  else if (userBet.status === "approved") { derivedTone = "placed"; derivedLabel = "Bet Approved"; }
                  else { derivedTone = "placed"; derivedLabel = "Bet Placed"; }
                } else if (new Date(p.kickoff).getTime() <= Date.now()) {
                  derivedTone = "started"; derivedLabel = "Match Started";
                } else {
                  derivedTone = "unlocked"; derivedLabel = "Available";
                }
                const stake = stakeFor[p.id] ?? "";
                const stakeNum = parseFloat(stake) || 0;
                const canBet = isVIP && derivedTone === "unlocked" && !userBet;
                return (
                  <motion.div
                    key={p.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.06 }}
                    className="relative glass-card p-3 overflow-hidden"
                  >
                    {!isVIP && (
                      <div className="absolute inset-0 z-10 bg-background/70 backdrop-blur-md flex items-center justify-center">
                        <div className="flex flex-col items-center gap-1">
                          <Lock className="w-5 h-5 text-yellow-400" />
                          <span className="text-[10px] font-bold text-yellow-400 uppercase tracking-wider">VIP only</span>
                        </div>
                      </div>
                    )}
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wide truncate max-w-[55%]">{p.league}</span>
                      <StatusBadge tone={derivedTone} label={derivedLabel} />
                    </div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-foreground leading-tight truncate">{p.home_team}</p>
                        <p className="text-xs text-muted-foreground">vs</p>
                        <p className="text-sm font-bold text-foreground leading-tight truncate">{p.away_team}</p>
                      </div>
                      <div className="text-right ml-2">
                        <div className="text-[10px] text-muted-foreground">Odds</div>
                        <div className="text-lg font-bold text-primary">{Number(p.odds).toFixed(2)}</div>
                      </div>
                    </div>
                    <div className="bg-muted/30 rounded-lg p-2 mb-2">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] text-muted-foreground uppercase">Pick</span>
                        <span className="text-[10px] font-bold text-emerald-400">{p.confidence}% conf.</span>
                      </div>
                      <p className="text-sm font-bold text-foreground">{p.prediction}</p>
                    </div>
                    {p.analysis && (
                      <p className="text-[11px] text-muted-foreground italic leading-snug mb-2">{p.analysis}</p>
                    )}
                    <p className="text-[10px] text-muted-foreground mb-2">
                      Kickoff: {new Date(p.kickoff).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </p>

                    {userBet && (
                      <div className="flex items-center justify-between pt-2 border-t border-border/40 text-[11px]">
                        <span className="text-muted-foreground">Stake <span className="font-bold text-foreground">${userBet.stake.toFixed(2)}</span></span>
                        <span className="text-muted-foreground">Win <span className="font-bold text-emerald-400">${userBet.potential_payout.toFixed(2)}</span></span>
                      </div>
                    )}

                    {canBet && (
                      <div className="flex items-center gap-2 pt-2 border-t border-border/40">
                        <input
                          type="number"
                          inputMode="decimal"
                          min={1}
                          placeholder="Stake $"
                          value={stake}
                          onChange={(e) => setStakeFor((prev) => ({ ...prev, [p.id]: e.target.value }))}
                          className="w-20 bg-muted/40 rounded-lg px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                        <div className="flex-1 text-[11px] text-muted-foreground">
                          Win: <span className="font-bold text-emerald-400">${(stakeNum * Number(p.odds)).toFixed(2)}</span>
                        </div>
                        <button
                          onClick={() => handlePlaceVIPBet(p)}
                          disabled={!stakeNum || submittingId === p.id}
                          className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-bold disabled:opacity-50 flex items-center gap-1"
                        >
                          {submittingId === p.id ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                          Place Bet
                        </button>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        {!isVIP ? (
          <div className="p-4 border-t border-border/50 bg-background/95 backdrop-blur space-y-3">
            <div>
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-bold mb-2">Choose your plan</p>
              <div className="grid grid-cols-2 gap-2">
                {VIP_PLANS.map((plan) => {
                  const isSelected = plan.id === selectedPlanId;
                  return (
                    <motion.button
                      key={plan.id}
                      whileTap={{ scale: 0.96 }}
                      onClick={() => setSelectedPlanId(plan.id)}
                      className={`relative p-3 rounded-xl border-2 text-left transition-all ${
                        isSelected
                          ? "border-yellow-400 bg-yellow-400/10 shadow-lg shadow-yellow-400/20"
                          : "border-border/50 bg-muted/20 hover:border-border"
                      }`}
                    >
                      {plan.badge && (
                        <span className="absolute -top-2 right-2 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-gradient-to-r from-yellow-500 to-amber-600 text-white">
                          {plan.badge}
                        </span>
                      )}
                      <div className="flex items-baseline justify-between">
                        <span className="text-sm font-bold text-foreground">{plan.label}</span>
                      </div>
                      <div className="text-lg font-bold text-yellow-400">${plan.price}</div>
                      {plan.savings && (
                        <div className="text-[10px] text-emerald-400 font-semibold">{plan.savings}</div>
                      )}
                    </motion.button>
                  );
                })}
              </div>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground flex items-center gap-1">
                <Wallet className="w-3.5 h-3.5" /> Balance
              </span>
              <span className="font-bold text-foreground">${balance.toFixed(2)}</span>
            </div>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={askConfirm}
              disabled={balance < selectedPlan.price}
              className="w-full py-4 rounded-xl bg-gradient-to-r from-yellow-500 to-amber-600 text-white font-bold text-base shadow-lg shadow-yellow-500/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Crown className="w-5 h-5" />
              Join VIP {selectedPlan.label} — ${selectedPlan.price}
            </motion.button>
            {balance < selectedPlan.price && (
              <p className="text-xs text-destructive text-center">Top up your wallet to join this plan</p>
            )}
          </div>
        ) : (
          <div className="p-4 border-t border-border/50 bg-background/95 backdrop-blur space-y-3">
            {/* Active membership status */}
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-emerald-400">
                <ShieldCheck className="w-4 h-4" />
                <div className="flex flex-col">
                  <span className="font-semibold">
                    VIP {currentPlan?.label || ""} active
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    Expires {membership.expiresAt ? new Date(membership.expiresAt).toLocaleDateString() : "—"} · {daysRemaining} day{daysRemaining === 1 ? "" : "s"} left
                  </span>
                </div>
              </div>
              <button
                onClick={() => setShowHistory(true)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-muted/40 text-foreground text-[10px] font-bold hover:bg-muted/60"
              >
                <HistoryIcon className="w-3 h-3" /> History · {vipHistory.length}
              </button>
            </div>
            <div className="text-[11px] text-muted-foreground text-right">
              Bal: <span className="text-foreground font-bold">${balance.toFixed(2)}</span>
            </div>

            {/* Upgrade / Extend */}
            <div>
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-bold mb-2">
                Upgrade or extend
              </p>
              <div className="grid grid-cols-2 gap-2">
                {VIP_PLANS.map((plan) => {
                  const isSelected = plan.id === selectedPlanId;
                  return (
                    <motion.button
                      key={plan.id}
                      whileTap={{ scale: 0.96 }}
                      onClick={() => setSelectedPlanId(plan.id)}
                      className={`relative p-2.5 rounded-xl border-2 text-left transition-all ${
                        isSelected
                          ? "border-yellow-400 bg-yellow-400/10 shadow-md shadow-yellow-400/20"
                          : "border-border/50 bg-muted/20 hover:border-border"
                      }`}
                    >
                      {plan.badge && (
                        <span className="absolute -top-2 right-2 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-gradient-to-r from-yellow-500 to-amber-600 text-white">
                          {plan.badge}
                        </span>
                      )}
                      <div className="text-xs font-bold text-foreground">{plan.label}</div>
                      <div className="text-base font-bold text-yellow-400">${plan.price}</div>
                      {plan.savings && (
                        <div className="text-[9px] text-emerald-400 font-semibold">{plan.savings}</div>
                      )}
                    </motion.button>
                  );
                })}
              </div>
            </div>

            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={askConfirm}
              disabled={balance < selectedPlan.price}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-yellow-500 to-amber-600 text-white font-bold text-sm shadow-lg shadow-yellow-500/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Crown className="w-4 h-4" />
              Extend +{selectedPlan.months} mo — ${selectedPlan.price}
            </motion.button>
            {balance < selectedPlan.price && (
              <p className="text-[11px] text-destructive text-center">Top up your wallet to extend</p>
            )}
          </div>
        )}

        {/* Celebration overlay */}
        <AnimatePresence>
          {showCelebrate && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-20 bg-background/90 backdrop-blur flex flex-col items-center justify-center"
            >
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", damping: 12 }}
                className="w-24 h-24 rounded-full bg-gradient-to-br from-yellow-400 to-amber-600 flex items-center justify-center shadow-2xl shadow-yellow-500/50"
              >
                <Crown className="w-14 h-14 text-white" />
              </motion.div>
              <motion.h3
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="mt-4 text-2xl font-bold text-foreground"
              >
                Welcome to VIP!
              </motion.h3>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Confirmation dialog */}
        <AnimatePresence>
          {confirmPlan && (() => {
            const preview = previewExtension(confirmPlan);
            const newBalance = balance - confirmPlan.price;
            return (
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="absolute inset-0 z-30 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-3"
                onClick={() => setConfirmPlan(null)}
              >
                <motion.div
                  initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
                  onClick={(e) => e.stopPropagation()}
                  className="w-full max-w-sm rounded-2xl bg-background border border-yellow-400/30 p-5 space-y-4 shadow-2xl"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-400 to-amber-600 flex items-center justify-center">
                      <Crown className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-bold text-foreground text-base">Confirm {isVIP ? "extension" : "VIP plan"}</h3>
                      <p className="text-[11px] text-muted-foreground">{confirmPlan.label} · +{preview.addedDays} days</p>
                    </div>
                  </div>

                  <div className="rounded-xl bg-muted/30 border border-border/50 divide-y divide-border/40">
                    <div className="flex items-center justify-between p-3">
                      <span className="text-xs text-muted-foreground">Current balance</span>
                      <span className="text-sm font-bold text-foreground">${balance.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between p-3">
                      <span className="text-xs text-muted-foreground">Plan price</span>
                      <span className="text-sm font-bold text-destructive">- ${confirmPlan.price.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-emerald-500/5">
                      <span className="text-xs text-muted-foreground">New balance</span>
                      <span className="text-base font-bold text-emerald-400">${newBalance.toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="rounded-xl bg-yellow-500/5 border border-yellow-500/20 p-3 space-y-2">
                    <div className="flex items-center gap-2 text-yellow-500">
                      <Calendar className="w-4 h-4" />
                      <span className="text-[11px] font-bold uppercase tracking-wider">VIP expiration</span>
                    </div>
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <div className="text-muted-foreground">
                        {preview.previousExpires
                          ? <>From <span className="text-foreground font-semibold">{preview.previousExpires.toLocaleDateString()}</span></>
                          : "New membership"}
                      </div>
                      <ArrowRight className="w-3 h-3 text-muted-foreground shrink-0" />
                      <div className="text-emerald-400 font-bold">
                        {preview.newExpires.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button onClick={() => setConfirmPlan(null)} className="flex-1 py-2.5 rounded-xl bg-muted/40 text-foreground font-semibold text-sm">
                      Cancel
                    </button>
                    <button
                      onClick={handleConfirmJoin}
                      disabled={purchasing}
                      className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-yellow-500 to-amber-600 text-white font-bold text-sm disabled:opacity-60 flex items-center justify-center gap-2"
                    >
                      {purchasing && <Loader2 className="w-4 h-4 animate-spin" />}
                      {purchasing ? "Processing..." : `Confirm — $${confirmPlan.price}`}
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            );
          })()}
        </AnimatePresence>

        {/* VIP History overlay */}
        <AnimatePresence>
          {showHistory && (
            <motion.div
              initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 30 }}
              className="absolute inset-0 z-30 bg-background flex flex-col"
            >
              <div className="p-4 border-b border-border/50 flex items-center justify-between">
                <h3 className="font-bold text-foreground flex items-center gap-2">
                  <HistoryIcon className="w-4 h-4 text-yellow-400" /> VIP Activity
                </h3>
                <button onClick={() => setShowHistory(false)} className="w-9 h-9 rounded-full bg-muted/50 flex items-center justify-center">
                  <X className="w-4 h-4 text-foreground" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {vipHistory.length === 0 ? (
                  <p className="text-center text-muted-foreground py-12 text-sm">No VIP activity yet.</p>
                ) : vipHistory.map((h) => (
                  <div key={h.id} className="glass-card p-3">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full ${
                          h.action === "joined" ? "bg-emerald-500/20 text-emerald-400" : "bg-sky-500/20 text-sky-400"
                        }`}>{h.action}</span>
                        <span className="text-sm font-bold text-foreground">{h.plan_label}</span>
                      </div>
                      <span className="text-sm font-bold text-yellow-400">- ${Number(h.price).toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>{new Date(h.created_at).toLocaleString()}</span>
                      <span>Expires <span className="text-emerald-400 font-semibold">{new Date(h.new_expires_at).toLocaleDateString()}</span></span>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
};

const StatusBadge = ({ tone, label }: { tone: string; label: string }) => {
  const map: Record<string, string> = {
    locked: "bg-muted/40 text-muted-foreground",
    unlocked: "bg-emerald-500/20 text-emerald-400",
    placed: "bg-sky-500/20 text-sky-400",
    won: "bg-emerald-600/30 text-emerald-300",
    lost: "bg-destructive/25 text-destructive",
    started: "bg-amber-500/20 text-amber-400",
  };
  return (
    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${map[tone] || map.locked}`}>
      {label}
    </span>
  );
};

export default VIPSheet;
