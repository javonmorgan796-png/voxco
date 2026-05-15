import { Eye, EyeOff, RefreshCw } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import TeamLogo from "./TeamLogo";
import LiveScoreIndicator from "./LiveScoreIndicator";
import { useLiveMatchData } from "@/hooks/useLiveMatchData";

interface LiveMatchCardProps {
  onOpenLive: () => void;
}

const LiveMatchCard = ({ onOpenLive }: LiveMatchCardProps) => {
  const [showMatch, setShowMatch] = useState(true);
  const { matchData, isLoading, isLive, resetMatch } = useLiveMatchData();
  const [prevScores, setPrevScores] = useState({ home: 0, away: 0 });
  const [goalAlert, setGoalAlert] = useState<"home" | "away" | null>(null);

  // Track previous scores for animation
  useEffect(() => {
    if (matchData) {
      if (matchData.homeScore > prevScores.home) {
        setGoalAlert("home");
        setTimeout(() => setGoalAlert(null), 2000);
      } else if (matchData.awayScore > prevScores.away) {
        setGoalAlert("away");
        setTimeout(() => setGoalAlert(null), 2000);
      }
      setPrevScores({ home: matchData.homeScore, away: matchData.awayScore });
    }
  }, [matchData?.homeScore, matchData?.awayScore]);

  if (isLoading || !matchData) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Live Match</span>
          <span className="w-2 h-2 bg-muted rounded-full animate-pulse" />
        </div>
        <div className="glass-card p-4 h-48 flex items-center justify-center">
          <RefreshCw className="w-6 h-6 text-muted-foreground animate-spin" />
        </div>
      </div>
    );
  }

  const match = matchData;

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Live Match</span>
          <span className="w-2 h-2 bg-primary rounded-full live-pulse" />
        </div>
        <button 
          onClick={() => setShowMatch(!showMatch)}
          className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors text-sm"
        >
          {showMatch ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          <span>{showMatch ? "Hide" : "Show"}</span>
        </button>
      </div>

      <AnimatePresence>
        {showMatch && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div 
              onClick={onOpenLive}
              className="glass-card p-4 space-y-4 cursor-pointer hover:bg-muted/20 transition-colors relative overflow-hidden"
            >
              {/* Goal Alert Overlay */}
              <AnimatePresence>
                {goalAlert && (
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 1.5, opacity: 0 }}
                    className="absolute inset-0 flex items-center justify-center bg-primary/20 backdrop-blur-sm z-10 pointer-events-none"
                  >
                    <motion.div
                      initial={{ y: 20 }}
                      animate={{ y: 0 }}
                      className="text-center"
                    >
                      <span className="text-4xl">⚽</span>
                      <p className="text-xl font-bold text-primary">GOAL!</p>
                      <p className="text-sm text-foreground">
                        {goalAlert === "home" ? match.homeTeam.shortName : match.awayTeam.shortName}
                      </p>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* League Info */}
              <div className="flex items-center justify-center gap-2">
                {match.competition.logo ? (
                  <img 
                    src={match.competition.logo} 
                    alt=""
                    className="h-5 w-auto object-contain"
                    onError={(e) => (e.currentTarget.style.display = 'none')}
                  />
                ) : null}
                <div className="text-center">
                  <h3 className="font-semibold text-foreground">{match.competition.name}</h3>
                  <p className="text-xs text-muted-foreground">Group Stage</p>
                </div>
              </div>

              {/* Score Section */}
              <div className="flex items-center justify-between">
                {/* Home Team */}
                <div className="flex flex-col items-center gap-2 flex-1">
                  <TeamLogo 
                    src={match.homeTeam.logo} 
                    alt={match.homeTeam.name} 
                    size="xl"
                  />
                  <div className="text-center">
                    <p className="font-semibold text-sm text-foreground">{match.homeTeam.shortName}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 justify-center">
                      <span>🏠</span> Home
                    </p>
                  </div>
                </div>

                {/* Score */}
                <div className="flex flex-col items-center gap-1 px-4">
                  <div className="flex items-center gap-3">
                    <LiveScoreIndicator 
                      score={match.homeScore} 
                      previousScore={prevScores.home}
                      size="xl"
                    />
                    <span className="text-2xl text-muted-foreground">:</span>
                    <LiveScoreIndicator 
                      score={match.awayScore} 
                      previousScore={prevScores.away}
                      size="xl"
                    />
                  </div>
                  <div className="flex items-center gap-1 bg-primary/20 px-2 py-0.5 rounded-full">
                    <span className="w-1.5 h-1.5 bg-primary rounded-full live-pulse" />
                    <motion.span 
                      key={match.minute}
                      initial={{ opacity: 0.5 }}
                      animate={{ opacity: 1 }}
                      className="text-xs font-medium text-primary"
                    >
                      {isLive ? match.minute : "FT"}
                    </motion.span>
                  </div>
                </div>

                {/* Away Team */}
                <div className="flex flex-col items-center gap-2 flex-1">
                  <TeamLogo 
                    src={match.awayTeam.logo} 
                    alt={match.awayTeam.name} 
                    size="xl"
                  />
                  <div className="text-center">
                    <p className="font-semibold text-sm text-foreground">{match.awayTeam.shortName}</p>
                    <p className="text-xs text-muted-foreground">Away</p>
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
                  <motion.div 
                    className="h-full bg-primary rounded-full"
                    initial={{ width: "0%" }}
                    animate={{ 
                      width: isLive 
                        ? `${Math.min(100, (parseInt(match.minute?.replace(/\+.*/, "") || "0") / 90) * 100)}%`
                        : "100%"
                    }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
              </div>

              {/* Venue & Reset */}
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">{match.venue}</p>
                {!isLive && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      resetMatch();
                    }}
                    className="text-xs text-primary flex items-center gap-1 hover:underline"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Restart
                  </button>
                )}
              </div>

              {/* Live Odds */}
              {match.odds && (
                <div className="flex items-center justify-between bg-muted/30 rounded-lg p-2">
                  <div className="text-center flex-1">
                    <p className="text-[10px] text-muted-foreground">1</p>
                    <motion.p 
                      key={match.odds.home}
                      initial={{ scale: 1.1 }}
                      animate={{ scale: 1 }}
                      className="text-sm font-semibold text-foreground"
                    >
                      {match.odds.home.toFixed(2)}
                    </motion.p>
                  </div>
                  <div className="text-center flex-1 border-x border-border">
                    <p className="text-[10px] text-muted-foreground">X</p>
                    <motion.p 
                      key={match.odds.draw}
                      initial={{ scale: 1.1 }}
                      animate={{ scale: 1 }}
                      className="text-sm font-semibold text-foreground"
                    >
                      {match.odds.draw.toFixed(2)}
                    </motion.p>
                  </div>
                  <div className="text-center flex-1">
                    <p className="text-[10px] text-muted-foreground">2</p>
                    <motion.p 
                      key={match.odds.away}
                      initial={{ scale: 1.1 }}
                      animate={{ scale: 1 }}
                      className="text-sm font-semibold text-foreground"
                    >
                      {match.odds.away.toFixed(2)}
                    </motion.p>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LiveMatchCard;
