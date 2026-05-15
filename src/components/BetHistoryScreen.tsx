import { useState } from "react";
import { X, Clock, Trophy, TrendingUp, TrendingDown, Filter, Trash2, Receipt, ChevronDown, ChevronUp, DollarSign } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useBetHistory, PlacedBet, BetTicket } from "@/hooks/useBetHistory";
import { useWallet } from "@/hooks/useWallet";
import { useNotifications } from "@/hooks/useNotifications";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import TeamLogo from "./TeamLogo";
import { toast } from "sonner";

interface BetHistoryScreenProps {
  onClose: () => void;
}

type FilterType = "all" | "pending" | "won" | "lost";
type ViewMode = "tickets" | "individual";

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString([], { 
    month: 'short', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const BetHistoryScreen = ({ onClose }: BetHistoryScreenProps) => {
  const [filter, setFilter] = useState<FilterType>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("tickets");
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [expandedTicket, setExpandedTicket] = useState<string | null>(null);
  const [cashOutTarget, setCashOutTarget] = useState<{ type: "bet" | "ticket"; id: string; potentialWin: number } | null>(null);
  const { 
    bets, 
    tickets,
    clearHistory, 
    cashOutBet,
    cashOutTicket,
    getCashOutValue,
    getTotalWinnings, 
    getTotalLosses,
    getPendingBets,
    getWonBets,
    getLostBets
  } = useBetHistory();
  const { cashoutCredit } = useWallet();
  const { addNotification } = useNotifications();

  const filteredBets = (): PlacedBet[] => {
    switch (filter) {
      case "pending": return getPendingBets();
      case "won": return getWonBets();
      case "lost": return getLostBets();
      default: return bets;
    }
  };

  const filteredTickets = (): BetTicket[] => {
    if (filter === "all") return tickets;
    return tickets.filter(t => t.status === filter);
  };

  const getSelectionLabel = (bet: PlacedBet) => {
    if (bet.selection === "home") return bet.homeTeam;
    if (bet.selection === "away") return bet.awayTeam;
    return "Draw";
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "won": return "text-green-500 bg-green-500/20";
      case "lost": return "text-red-500 bg-red-500/20";
      case "partial": return "text-yellow-500 bg-yellow-500/20";
      default: return "text-yellow-500 bg-yellow-500/20";
    }
  };

  const totalWinnings = getTotalWinnings();
  const totalLosses = getTotalLosses();
  const profit = totalWinnings - totalLosses;

  const handleCashOut = () => {
    if (!cashOutTarget) return;
    const cashOutAmount = getCashOutValue(cashOutTarget.potentialWin);
    if (cashOutTarget.type === "bet") {
      cashOutBet(cashOutTarget.id);
      cashoutCredit(cashOutAmount, "Early cash out");
      addNotification("cashout", "Cash Out Successful! 💰", `You cashed out $${cashOutAmount.toFixed(2)} early. The amount has been credited to your wallet.`);
      toast.success(`Cashed out for $${cashOutAmount.toFixed(2)}! Credited to wallet.`);
    } else {
      cashOutTicket(cashOutTarget.id);
      cashoutCredit(cashOutAmount, "Ticket early cash out");
      addNotification("cashout", "Ticket Cash Out! 💰", `Your ticket was cashed out for $${cashOutAmount.toFixed(2)}. The amount has been credited to your wallet.`);
      toast.success(`Ticket cashed out for $${cashOutAmount.toFixed(2)}! Credited to wallet.`);
    }
    setCashOutTarget(null);
  };

  const handleClearHistory = () => {
    clearHistory();
    setShowClearDialog(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: "100%" }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: "100%" }}
      transition={{ type: "spring", damping: 25, stiffness: 300 }}
      className="fixed inset-0 z-50 bg-background flex flex-col"
    >
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-lg border-b border-border/50">
        <div className="p-4">
          <div className="flex items-center justify-between">
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center hover:bg-muted transition-colors"
            >
              <X className="w-5 h-5 text-foreground" />
            </button>

            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-primary" />
              <h1 className="font-bold text-lg text-foreground">Bet History</h1>
            </div>

            <button
              onClick={() => setShowClearDialog(true)}
              className="w-10 h-10 rounded-full bg-destructive/20 flex items-center justify-center hover:bg-destructive/30 transition-colors"
              disabled={bets.length === 0 && tickets.length === 0}
            >
              <Trash2 className="w-5 h-5 text-destructive" />
            </button>
          </div>
        </div>

        {/* Stats Summary */}
        <div className="px-4 pb-3">
          <div className="grid grid-cols-3 gap-2">
            <div className="glass-card p-3 text-center">
              <TrendingUp className="w-4 h-4 text-green-500 mx-auto mb-1" />
              <p className="text-xs text-muted-foreground">Won</p>
              <p className="font-bold text-green-500">${totalWinnings.toFixed(2)}</p>
            </div>
            <div className="glass-card p-3 text-center">
              <TrendingDown className="w-4 h-4 text-red-500 mx-auto mb-1" />
              <p className="text-xs text-muted-foreground">Lost</p>
              <p className="font-bold text-red-500">${totalLosses.toFixed(2)}</p>
            </div>
            <div className="glass-card p-3 text-center">
              <Trophy className="w-4 h-4 text-primary mx-auto mb-1" />
              <p className="text-xs text-muted-foreground">Profit</p>
              <p className={`font-bold ${profit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {profit >= 0 ? '+' : ''}${profit.toFixed(2)}
              </p>
            </div>
          </div>
        </div>

        {/* View Mode Toggle */}
        <div className="px-4 pb-2">
          <div className="flex bg-muted/50 rounded-lg p-1">
            <button
              onClick={() => setViewMode("tickets")}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                viewMode === "tickets" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
              }`}
            >
              <Receipt className="w-3.5 h-3.5" />
              Slip Tickets ({tickets.length})
            </button>
            <button
              onClick={() => setViewMode("individual")}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                viewMode === "individual" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              All Bets ({bets.length})
            </button>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="px-4 pb-3">
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
            {(["all", "pending", "won", "lost"] as FilterType[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors capitalize ${
                  filter === f
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted/50 text-muted-foreground hover:bg-muted"
                }`}
              >
                <Filter className="w-3 h-3" />
                {f} ({f === "all" ? (viewMode === "tickets" ? tickets.length : bets.length) : 
                      f === "pending" ? getPendingBets().length :
                      f === "won" ? getWonBets().length : getLostBets().length})
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 pb-24">
        {viewMode === "tickets" ? (
          /* Ticket View */
          filteredTickets().length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Receipt className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-center">No bet slips found</p>
              <p className="text-xs text-muted-foreground mt-1">
                Place bets to see your slip tickets here
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <AnimatePresence mode="popLayout">
                {filteredTickets().map((ticket, index) => {
                  const isExpanded = expandedTicket === ticket.id;
                  return (
                    <motion.div
                      key={ticket.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.2, delay: index * 0.02 }}
                      className="glass-card overflow-hidden"
                    >
                      {/* Ticket Header */}
                      <div
                        className="p-4 cursor-pointer"
                        onClick={() => setExpandedTicket(isExpanded ? null : ticket.id)}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <Receipt className="w-4 h-4 text-primary" />
                            <span className="text-sm font-bold text-foreground">
                              {ticket.isAccumulator ? "🎯 Accumulator" : "Bet Slip"} • {ticket.bets.length} match{ticket.bets.length > 1 ? "es" : ""}
                            </span>
                            {ticket.isAccumulator && (
                              <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded-full font-bold">
                                x{ticket.accumulatorOdds?.toFixed(2)}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${getStatusColor(ticket.status)}`}>
                              {ticket.status}
                            </span>
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-muted-foreground" />
                            )}
                          </div>
                        </div>

                        {/* Team logos row */}
                        <div className="flex items-center gap-1 mb-3 flex-wrap">
                          {ticket.bets.map((bet, i) => (
                            <div key={bet.id} className="flex items-center gap-0.5">
                              <TeamLogo src={bet.homeTeamLogo || ""} alt={bet.homeTeam} size="sm" />
                              <span className="text-xs text-muted-foreground mx-0.5">v</span>
                              <TeamLogo src={bet.awayTeamLogo || ""} alt={bet.awayTeam} size="sm" />
                              {i < ticket.bets.length - 1 && (
                                <span className="text-muted-foreground/40 mx-1">|</span>
                              )}
                            </div>
                          ))}
                        </div>

                        {/* Ticket Summary */}
                        <div className="bg-muted/30 rounded-lg p-3">
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-muted-foreground">Total Stake:</span>
                            <span className="font-bold text-foreground">${ticket.totalStake.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">
                              {ticket.status === "won" ? "Won:" : "Potential Win:"}
                            </span>
                            <span className={`font-bold ${ticket.status === "won" ? "text-green-500" : "text-primary"}`}>
                              ${ticket.totalPotentialWin.toFixed(2)}
                            </span>
                          </div>
                        </div>

                        {/* Cash Out Button */}
                        {ticket.status === "pending" && (
                          <motion.button
                            whileTap={{ scale: 0.97 }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setCashOutTarget({ type: "ticket", id: ticket.id, potentialWin: ticket.totalPotentialWin });
                            }}
                            className="w-full mt-3 py-2.5 rounded-xl bg-accent/20 border border-accent/30 text-accent font-semibold text-sm flex items-center justify-center gap-2"
                          >
                            <DollarSign className="w-4 h-4" />
                            Cash Out ${getCashOutValue(ticket.totalPotentialWin).toFixed(2)}
                          </motion.button>
                        )}

                        <p className="text-xs text-muted-foreground mt-2 text-right">
                          {formatDate(ticket.placedAt)}
                        </p>
                      </div>

                      {/* Expanded: Individual bets */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className="border-t border-border/50 px-4 pb-4 space-y-3 pt-3">
                              {ticket.bets.map((bet) => (
                                <div key={bet.id} className="bg-muted/20 rounded-lg p-3">
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs text-muted-foreground">{bet.competition}</span>
                                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${getStatusColor(bet.status)}`}>
                                      {bet.status}
                                    </span>
                                  </div>
                                  <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                      <TeamLogo src={bet.homeTeamLogo || ""} alt={bet.homeTeam} size="sm" />
                                      <span className="text-xs font-medium text-foreground">{bet.homeTeam}</span>
                                    </div>
                                    {bet.result && (
                                      <span className="text-xs font-bold text-foreground">
                                        {bet.result.homeScore} - {bet.result.awayScore}
                                      </span>
                                    )}
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs font-medium text-foreground">{bet.awayTeam}</span>
                                      <TeamLogo src={bet.awayTeamLogo || ""} alt={bet.awayTeam} size="sm" />
                                    </div>
                                  </div>
                                  <div className="flex justify-between text-xs">
                                    <span className="text-muted-foreground">
                                      {getSelectionLabel(bet)} @ {bet.odds.toFixed(2)}
                                    </span>
                                    <span className="font-medium text-foreground">
                                      ${bet.stake.toFixed(2)} → ${bet.potentialWin.toFixed(2)}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )
        ) : (
          /* Individual Bets View */
          filteredBets().length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Clock className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-center">No bets found</p>
              <p className="text-xs text-muted-foreground mt-1">
                {filter === "all" 
                  ? "Place your first bet to see it here" 
                  : `No ${filter} bets yet`}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <AnimatePresence mode="popLayout">
                {filteredBets().map((bet, index) => (
                  <motion.div
                    key={bet.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2, delay: index * 0.02 }}
                    className="glass-card p-4"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs text-muted-foreground">{bet.competition}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${getStatusColor(bet.status)}`}>
                        {bet.status}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <TeamLogo src={bet.homeTeamLogo || ""} alt={bet.homeTeam} size="sm" />
                        <span className="text-sm font-medium text-foreground">{bet.homeTeam}</span>
                      </div>
                      {bet.result && (
                        <span className="text-sm font-bold text-foreground">
                          {bet.result.homeScore} - {bet.result.awayScore}
                        </span>
                      )}
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground">{bet.awayTeam}</span>
                        <TeamLogo src={bet.awayTeamLogo || ""} alt={bet.awayTeam} size="sm" />
                      </div>
                    </div>
                    <div className="bg-muted/30 rounded-lg p-3 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Selection:</span>
                        <span className="font-medium text-foreground">{getSelectionLabel(bet)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Odds:</span>
                        <span className="font-medium text-foreground">{bet.odds.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Stake:</span>
                        <span className="font-medium text-foreground">${bet.stake.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm border-t border-border/50 pt-2">
                        <span className="text-muted-foreground">
                          {bet.status === "won" ? "Won:" : "Potential Win:"}
                        </span>
                        <span className={`font-bold ${bet.status === "won" ? "text-green-500" : "text-primary"}`}>
                          ${bet.potentialWin.toFixed(2)}
                        </span>
                      </div>
                    </div>
                    {/* Cash Out for individual bet */}
                    {bet.status === "pending" && (
                      <motion.button
                        whileTap={{ scale: 0.97 }}
                        onClick={() => setCashOutTarget({ type: "bet", id: bet.id, potentialWin: bet.potentialWin })}
                        className="w-full mt-3 py-2.5 rounded-xl bg-accent/20 border border-accent/30 text-accent font-semibold text-sm flex items-center justify-center gap-2"
                      >
                        <DollarSign className="w-4 h-4" />
                        Cash Out ${getCashOutValue(bet.potentialWin).toFixed(2)}
                      </motion.button>
                    )}
                    <p className="text-xs text-muted-foreground mt-2 text-right">
                      Placed: {formatDate(bet.placedAt)}
                    </p>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )
        )}
      </div>

      {/* Clear History Confirmation Dialog */}
      <Dialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <DialogContent className="max-w-[340px] rounded-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-destructive" />
              Clear All History?
            </DialogTitle>
            <DialogDescription>
              This will permanently delete all your bet history and slip tickets. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setShowClearDialog(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleClearHistory}
              className="flex-1"
            >
              Clear All
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cash Out Confirmation Dialog */}
      <Dialog open={!!cashOutTarget} onOpenChange={(open) => !open && setCashOutTarget(null)}>
        <DialogContent className="max-w-[340px] rounded-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-accent" />
              Cash Out?
            </DialogTitle>
            <DialogDescription>
              {cashOutTarget && (
                <>
                  Settle this {cashOutTarget.type === "ticket" ? "ticket" : "bet"} early for{" "}
                  <span className="font-bold text-foreground">
                    ${getCashOutValue(cashOutTarget.potentialWin).toFixed(2)}
                  </span>{" "}
                  (70% of ${cashOutTarget.potentialWin.toFixed(2)} potential win). This cannot be undone.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setCashOutTarget(null)}
              className="flex-1"
            >
              Keep Bet
            </Button>
            <Button
              onClick={handleCashOut}
              className="flex-1 bg-accent text-accent-foreground hover:bg-accent/90"
            >
              Cash Out
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
};

export default BetHistoryScreen;
