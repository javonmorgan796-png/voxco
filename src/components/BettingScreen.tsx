import { useState, useMemo } from "react";
import CountdownTimer from "./CountdownTimer";
import { X, Clock, Trophy, ChevronDown, Filter, Search, Zap, Check, Layers } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLiveMatches, ApiMatch } from "@/hooks/useLiveMatches";
import { useBetHistory } from "@/hooks/useBetHistory";
import { useWallet } from "@/hooks/useWallet";
import { useNotifications } from "@/hooks/useNotifications";
import TeamLogo from "./TeamLogo";
import { toast } from "sonner";

interface BettingScreenProps {
  onClose: () => void;
  onSelectMatch: (match: ApiMatch) => void;
  initialMatch?: ApiMatch | null;
}

interface BetOdds {
  home: number;
  draw: number;
  away: number;
}

interface BetSlip {
  matchId: string;
  match: ApiMatch;
  selection: "home" | "draw" | "away";
  odds: number;
  stake: number;
}

// Generate random odds based on match data
const generateOdds = (match: ApiMatch): BetOdds => {
  const seed = match.id.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const homeBase = 1.5 + (seed % 20) / 10;
  const awayBase = 1.8 + ((seed * 2) % 25) / 10;
  const drawBase = 2.8 + ((seed * 3) % 15) / 10;
  
  return {
    home: Math.round(homeBase * 100) / 100,
    draw: Math.round(drawBase * 100) / 100,
    away: Math.round(awayBase * 100) / 100,
  };
};

const formatStartTime = (startTime: string): string => {
  try {
    const timestamp = parseInt(startTime);
    if (!isNaN(timestamp)) {
      const date = new Date(timestamp * 1000);
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const isToday = date.toDateString() === today.toDateString();
      const isTomorrow = date.toDateString() === tomorrow.toDateString();
      
      const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      
      if (isToday) return `Today ${time}`;
      if (isTomorrow) return `Tomorrow ${time}`;
      return date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' }) + ` ${time}`;
    }
    return "TBD";
  } catch {
    return "TBD";
  }
};

const BettingScreen = ({ onClose, onSelectMatch, initialMatch }: BettingScreenProps) => {
  const [selectedCompetition, setSelectedCompetition] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [betSlips, setBetSlips] = useState<BetSlip[]>([]);
  const [showBetSlip, setShowBetSlip] = useState(false);
  const [placingBet, setPlacingBet] = useState(false);
  const [betMode, setBetMode] = useState<"single" | "accumulator">("single");
  const [accumulatorStake, setAccumulatorStake] = useState(10);
  
  const { matches, isLoading } = useLiveMatches({
    endpoint: "upcoming",
    autoRefresh: true,
    refreshInterval: 60000,
  });

  const { placeBetSlip, placeBetAccumulator } = useBetHistory();
  const { balance, placeBetDeduction, canAfford } = useWallet();
  const { addNotification } = useNotifications();

  // Filter only upcoming matches for betting
  const upcomingMatches = useMemo(() => {
    return matches.filter(m => m.status === "upcoming");
  }, [matches]);

  // Get unique competitions
  const competitions = useMemo(() => {
    const competitionSet = new Set<string>();
    upcomingMatches.forEach(match => {
      if (match.competition.name) {
        competitionSet.add(match.competition.name);
      }
    });
    return Array.from(competitionSet).sort();
  }, [upcomingMatches]);

  // Filter matches
  const filteredMatches = useMemo(() => {
    let filtered = upcomingMatches;

    if (selectedCompetition) {
      filtered = filtered.filter(m => m.competition.name === selectedCompetition);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(m => 
        m.homeTeam.name.toLowerCase().includes(query) ||
        m.awayTeam.name.toLowerCase().includes(query) ||
        m.competition.name.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [upcomingMatches, selectedCompetition, searchQuery]);

  const addToBetSlip = (match: ApiMatch, selection: "home" | "draw" | "away", odds: number) => {
    const existingIndex = betSlips.findIndex(b => b.matchId === match.id);
    if (existingIndex >= 0) {
      const existing = betSlips[existingIndex];
      if (existing.selection === selection) {
        setBetSlips(betSlips.filter(b => b.matchId !== match.id));
        return;
      }
    }

    const newSlip: BetSlip = {
      matchId: match.id,
      match,
      selection,
      odds,
      stake: 10,
    };

    setBetSlips([...betSlips.filter(b => b.matchId !== match.id), newSlip]);
    setShowBetSlip(true);
  };

  const updateStake = (matchId: string, stake: number) => {
    setBetSlips(betSlips.map(b => 
      b.matchId === matchId ? { ...b, stake: Math.max(0, stake) } : b
    ));
  };

  const removeBet = (matchId: string) => {
    setBetSlips(betSlips.filter(b => b.matchId !== matchId));
  };

  const totalStake = betMode === "accumulator" ? accumulatorStake : betSlips.reduce((acc, b) => acc + b.stake, 0);
  const accumulatorOdds = betSlips.reduce((acc, b) => acc * b.odds, 1);
  const potentialWin = betMode === "accumulator" 
    ? accumulatorStake * accumulatorOdds 
    : betSlips.reduce((acc, b) => acc + (b.stake * b.odds), 0);

  const isSelected = (matchId: string, selection: "home" | "draw" | "away") => {
    const bet = betSlips.find(b => b.matchId === matchId);
    return bet?.selection === selection;
  };

  const handlePlaceBets = () => {
    if (betSlips.length === 0 || totalStake <= 0) return;
    
    // Check wallet balance
    if (!canAfford(totalStake)) {
      toast.error("Insufficient balance", {
        description: `You need $${totalStake.toFixed(2)} but only have $${balance.toFixed(2)}`,
      });
      return;
    }
    
    setPlacingBet(true);
    
    // Deduct from wallet
    const matchDesc = betSlips.length === 1 
      ? `${betSlips[0].match.homeTeam.shortName} vs ${betSlips[0].match.awayTeam.shortName}`
      : `${betSlips.length} match bet slip`;
    placeBetDeduction(totalStake, matchDesc);
    
    if (betMode === "accumulator" && betSlips.length >= 2) {
      placeBetAccumulator(
        betSlips.map((slip) => ({
          match: slip.match,
          selection: slip.selection,
          odds: slip.odds,
        })),
        accumulatorStake
      );
    } else {
      placeBetSlip(
        betSlips.map((slip) => ({
          match: slip.match,
          selection: slip.selection,
          odds: slip.odds,
          stake: slip.stake,
        }))
      );
    }
    
    const count = betSlips.length;
    const isAcca = betMode === "accumulator" && count >= 2;
    
    setBetSlips([]);
    setShowBetSlip(false);
    setPlacingBet(false);
    
    addNotification(
      "bet_placed",
      isAcca ? `Accumulator Placed! ⚡` : `Bet Placed! 🎯`,
      isAcca
        ? `${count} selections • Stake: $${accumulatorStake.toFixed(2)} • Combined odds: ${accumulatorOdds.toFixed(2)} • Potential win: $${potentialWin.toFixed(2)}`
        : `${count} match${count > 1 ? 'es' : ''} • Stake: $${totalStake.toFixed(2)} • Potential win: $${potentialWin.toFixed(2)}`
    );

    toast.success(
      isAcca 
        ? `Accumulator with ${count} selections placed!` 
        : `Bet slip with ${count} match${count > 1 ? 'es' : ''} placed!`,
      {
        description: isAcca
          ? `Stake: $${accumulatorStake.toFixed(2)} • Combined odds: ${accumulatorOdds.toFixed(2)} • Potential win: $${potentialWin.toFixed(2)}`
          : `Total stake: $${totalStake.toFixed(2)} • Potential win: $${potentialWin.toFixed(2)}`,
      }
    );
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
              <h1 className="font-bold text-lg text-foreground">Betting</h1>
              {upcomingMatches.length > 0 && (
                <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                  {upcomingMatches.length} matches
                </span>
              )}
            </div>

            <button
              onClick={() => setShowBetSlip(!showBetSlip)}
              className="relative w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center hover:bg-primary/30 transition-colors"
            >
              <Zap className="w-5 h-5 text-primary" />
              {betSlips.length > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-primary-foreground text-xs rounded-full flex items-center justify-center font-bold">
                  {betSlips.length}
                </span>
              )}
            </button>
          </div>

          {/* Search */}
          <div className="relative mt-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search teams or leagues..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-muted/50 border-border/50"
            />
          </div>
        </div>

        {/* Competition Filter */}
        <div className="px-4 pb-3">
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1">
            <button
              onClick={() => setSelectedCompetition(null)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                !selectedCompetition 
                  ? "bg-primary text-primary-foreground" 
                  : "bg-muted/50 text-muted-foreground hover:bg-muted"
              }`}
            >
              <Filter className="w-3 h-3" />
              All Leagues
            </button>
            {competitions.slice(0, 20).map((comp) => (
              <button
                key={comp}
                onClick={() => setSelectedCompetition(comp === selectedCompetition ? null : comp)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                  selectedCompetition === comp
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted/50 text-muted-foreground hover:bg-muted"
                }`}
              >
                {comp}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Match List */}
      <div className="flex-1 overflow-y-auto p-4 pb-32">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="glass-card p-4 h-32 animate-pulse bg-muted/20" />
            ))}
          </div>
        ) : filteredMatches.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Clock className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center">No upcoming matches</p>
            <p className="text-xs text-muted-foreground mt-1">Check back later for matches to bet on</p>
          </div>
        ) : (
          <div className="space-y-4">
            <AnimatePresence mode="popLayout">
              {filteredMatches.map((match, index) => {
                const odds = generateOdds(match);
                return (
                  <motion.div
                    key={match.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.3, delay: index * 0.02 }}
                    className="glass-card p-4"
                  >
                    {/* Match Header */}
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs text-muted-foreground font-medium">
                        {match.competition.name}
                      </span>
                      <CountdownTimer startTime={match.startTime} size="sm" />
                    </div>

                    {/* Teams */}
                    <div 
                      className="flex items-center justify-between mb-4 cursor-pointer"
                      onClick={() => onSelectMatch(match)}
                    >
                      <div className="flex items-center gap-2 flex-1">
                        <TeamLogo src={match.homeTeam.logo || ""} alt={match.homeTeam.name} size="sm" />
                        <span className="text-sm font-medium text-foreground truncate">
                          {match.homeTeam.shortName}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground px-2">vs</span>
                      <div className="flex items-center gap-2 flex-1 justify-end">
                        <span className="text-sm font-medium text-foreground truncate">
                          {match.awayTeam.shortName}
                        </span>
                        <TeamLogo src={match.awayTeam.logo || ""} alt={match.awayTeam.name} size="sm" />
                      </div>
                    </div>

                    {/* Odds Selection */}
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        onClick={() => addToBetSlip(match, "home", odds.home)}
                        className={`flex flex-col items-center p-2 rounded-lg transition-all ${
                          isSelected(match.id, "home")
                            ? "bg-primary text-primary-foreground ring-2 ring-primary"
                            : "bg-muted/50 hover:bg-muted"
                        }`}
                      >
                        <span className="text-xs text-muted-foreground mb-1">1</span>
                        <span className="font-bold">{odds.home.toFixed(2)}</span>
                      </button>
                      <button
                        onClick={() => addToBetSlip(match, "draw", odds.draw)}
                        className={`flex flex-col items-center p-2 rounded-lg transition-all ${
                          isSelected(match.id, "draw")
                            ? "bg-primary text-primary-foreground ring-2 ring-primary"
                            : "bg-muted/50 hover:bg-muted"
                        }`}
                      >
                        <span className="text-xs text-muted-foreground mb-1">X</span>
                        <span className="font-bold">{odds.draw.toFixed(2)}</span>
                      </button>
                      <button
                        onClick={() => addToBetSlip(match, "away", odds.away)}
                        className={`flex flex-col items-center p-2 rounded-lg transition-all ${
                          isSelected(match.id, "away")
                            ? "bg-primary text-primary-foreground ring-2 ring-primary"
                            : "bg-muted/50 hover:bg-muted"
                        }`}
                      >
                        <span className="text-xs text-muted-foreground mb-1">2</span>
                        <span className="font-bold">{odds.away.toFixed(2)}</span>
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Bet Slip */}
      <AnimatePresence>
        {showBetSlip && betSlips.length > 0 && (
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 bg-card border-t border-border shadow-lg rounded-t-2xl max-h-[60vh] overflow-hidden"
          >
            {/* Bet Slip Header */}
            <div 
              className="flex items-center justify-between p-4 border-b border-border/50 cursor-pointer"
              onClick={() => setShowBetSlip(!showBetSlip)}
            >
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-primary" />
                <span className="font-bold text-foreground">Bet Slip</span>
                <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                  {betSlips.length}
                </span>
              </div>
              <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform ${showBetSlip ? '' : 'rotate-180'}`} />
            </div>

            {/* Bet Mode Toggle */}
            {betSlips.length >= 2 && (
              <div className="px-4 pb-2">
                <div className="flex bg-muted/50 rounded-lg p-1">
                  <button
                    onClick={() => setBetMode("single")}
                    className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium transition-colors ${
                      betMode === "single" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                    }`}
                  >
                    <Zap className="w-3.5 h-3.5" />
                    Singles
                  </button>
                  <button
                    onClick={() => setBetMode("accumulator")}
                    className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium transition-colors ${
                      betMode === "accumulator" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    Accumulator
                  </button>
                </div>
                {betMode === "accumulator" && (
                  <div className="mt-2 bg-primary/10 border border-primary/20 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-primary">Combined Odds</span>
                      <span className="font-bold text-primary text-sm">{accumulatorOdds.toFixed(2)}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground">All {betSlips.length} selections must win</p>
                  </div>
                )}
              </div>
            )}

            {/* Bet Slip Content */}
            <div className="overflow-y-auto max-h-[30vh] p-4 space-y-3">
              {betSlips.map((bet) => (
                <div key={bet.matchId} className="bg-muted/30 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">
                        {bet.match.homeTeam.shortName} vs {bet.match.awayTeam.shortName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {bet.selection === "home" ? bet.match.homeTeam.shortName : 
                         bet.selection === "away" ? bet.match.awayTeam.shortName : "Draw"} @ {bet.odds.toFixed(2)}
                      </p>
                    </div>
                    <button
                      onClick={() => removeBet(bet.matchId)}
                      className="text-destructive hover:text-destructive/80 p-1"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  {betMode === "single" && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Stake:</span>
                      <Input
                        type="number"
                        value={bet.stake}
                        onChange={(e) => updateStake(bet.matchId, parseFloat(e.target.value) || 0)}
                        className="w-20 h-8 text-sm"
                        min={0}
                      />
                      <span className="text-xs text-muted-foreground">→</span>
                      <span className="text-sm font-bold text-primary">
                        ${(bet.stake * bet.odds).toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Bet Slip Footer */}
            <div className="p-4 border-t border-border/50 bg-card">
              {betMode === "accumulator" && (
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs text-muted-foreground">Stake:</span>
                  <Input
                    type="number"
                    value={accumulatorStake}
                    onChange={(e) => setAccumulatorStake(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="w-24 h-8 text-sm"
                    min={0}
                  />
                  <div className="flex-1 text-right">
                    <span className="text-[10px] text-muted-foreground block">Combined Odds</span>
                    <span className="text-sm font-bold text-primary">{accumulatorOdds.toFixed(2)}</span>
                  </div>
                </div>
              )}
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-xs text-muted-foreground">Total Stake</p>
                  <p className="font-bold text-foreground">${totalStake.toFixed(2)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Potential Win</p>
                  <p className="font-bold text-primary">${potentialWin.toFixed(2)}</p>
                </div>
              </div>
              <div className="flex items-center justify-between mb-2 text-xs">
                <span className="text-muted-foreground">Wallet Balance</span>
                <span className={`font-bold ${canAfford(totalStake) ? 'text-accent' : 'text-destructive'}`}>
                  ${balance.toFixed(2)}
                </span>
              </div>
              <Button 
                className="w-full gap-2" 
                size="lg" 
                onClick={handlePlaceBets}
                disabled={placingBet || totalStake <= 0 || !canAfford(totalStake) || (betMode === "accumulator" && betSlips.length < 2)}
              >
                {betMode === "accumulator" ? <Layers className="w-5 h-5" /> : <Check className="w-5 h-5" />}
                {placingBet ? "Placing..." : betMode === "accumulator" ? `Place Accumulator (${betSlips.length} legs)` : `Place Bet${betSlips.length > 1 ? 's' : ''}`}
              </Button>
              {betMode === "accumulator" && betSlips.length < 2 && (
                <p className="text-[10px] text-destructive text-center mt-2">Add at least 2 selections for an accumulator</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Bet Slip Button (when collapsed) */}
      {betSlips.length > 0 && !showBetSlip && (
        <motion.button
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          onClick={() => setShowBetSlip(true)}
          className="fixed bottom-20 right-4 bg-primary text-primary-foreground rounded-full px-4 py-3 shadow-lg flex items-center gap-2 font-medium"
        >
          <Zap className="w-5 h-5" />
          <span>{betSlips.length} Bet{betSlips.length > 1 ? 's' : ''}</span>
          <span className="text-primary-foreground/80">→</span>
          <span>${potentialWin.toFixed(2)}</span>
        </motion.button>
      )}
    </motion.div>
  );
};

export default BettingScreen;
