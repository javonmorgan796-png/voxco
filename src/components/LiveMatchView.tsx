import { X, Pause, Play, Share2, Heart, RefreshCw, Wifi, WifiOff } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import liveMatchBg from "@/assets/live-match-bg.jpg";
import TeamLogo from "./TeamLogo";
import LiveScoreIndicator from "./LiveScoreIndicator";
import MatchStats from "./MatchStats";
import GoalCelebration from "./GoalCelebration";
import { useLiveMatchData, MatchEvent, LiveMatchData } from "@/hooks/useLiveMatchData";
import { ApiMatch } from "@/hooks/useLiveMatches";

interface LiveMatchViewProps {
  onClose: () => void;
  selectedMatch?: ApiMatch | null;
}

const LiveMatchView = ({ onClose, selectedMatch }: LiveMatchViewProps) => {
  const [isPlaying, setIsPlaying] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);
  const [activeTab, setActiveTab] = useState<"timeline" | "stats">("timeline");
  const { matchData: hookMatchData, isLoading: hookLoading, isLive: hookIsLive, resetMatch, dataSource: hookDataSource, newGoal } = useLiveMatchData();
  
  // Use selected match data if provided, otherwise use hook data
  const [displayMatch, setDisplayMatch] = useState<LiveMatchData | null>(null);
  const [isLive, setIsLive] = useState(true);
  const [dataSource, setDataSource] = useState<"api" | "simulation">("api");
  const [isLoading, setIsLoading] = useState(true);
  const [prevScores, setPrevScores] = useState({ home: 0, away: 0 });

  // Initialize display match from selected match or hook data
  useEffect(() => {
    if (selectedMatch) {
      // Convert ApiMatch to LiveMatchData format
      const converted: LiveMatchData = {
        id: selectedMatch.id,
        competition: {
          id: "selected",
          name: selectedMatch.competition.name,
          logo: selectedMatch.competition.logo,
          country: "",
        },
        homeTeam: {
          id: selectedMatch.homeTeam.name.toLowerCase().replace(/\s+/g, "-"),
          name: selectedMatch.homeTeam.name,
          shortName: selectedMatch.homeTeam.shortName,
          logo: selectedMatch.homeTeam.logo || "",
          primaryColor: "#666666",
          country: "",
        },
        awayTeam: {
          id: selectedMatch.awayTeam.name.toLowerCase().replace(/\s+/g, "-"),
          name: selectedMatch.awayTeam.name,
          shortName: selectedMatch.awayTeam.shortName,
          logo: selectedMatch.awayTeam.logo || "",
          primaryColor: "#666666",
          country: "",
        },
        homeScore: selectedMatch.homeScore,
        awayScore: selectedMatch.awayScore,
        status: selectedMatch.status,
        minute: selectedMatch.minute || "LIVE",
        date: "Today",
        time: "Now",
        venue: selectedMatch.venue || "Stadium",
        odds: { home: 2.50, draw: 3.20, away: 2.80 },
        events: [],
        possession: { home: 50, away: 50 },
        shots: { home: 0, away: 0 },
        shotsOnTarget: { home: 0, away: 0 },
        corners: { home: 0, away: 0 },
        fouls: { home: 0, away: 0 },
      };
      setDisplayMatch(converted);
      setIsLive(selectedMatch.status === "live");
      setDataSource("api");
      setIsLoading(false);
    } else if (hookMatchData) {
      setDisplayMatch(hookMatchData);
      setIsLive(hookIsLive);
      setDataSource(hookDataSource);
      setIsLoading(hookLoading);
    }
  }, [selectedMatch, hookMatchData, hookIsLive, hookDataSource, hookLoading]);

  // Track score changes
  useEffect(() => {
    if (displayMatch) {
      setPrevScores({ home: displayMatch.homeScore, away: displayMatch.awayScore });
    }
  }, [displayMatch?.homeScore, displayMatch?.awayScore]);

  if (isLoading || !displayMatch) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-background flex items-center justify-center"
      >
        <RefreshCw className="w-8 h-8 text-primary animate-spin" />
      </motion.div>
    );
  }

  const match = displayMatch;
  const matchEvents = match.events;
  const currentMinute = parseInt(match.minute?.replace(/\+.*/, "").replace(/[^\d]/g, "") || "0");

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-background"
    >
      {/* Enhanced Goal Celebration */}
      <GoalCelebration
        event={newGoal}
        homeTeamName={match.homeTeam.shortName}
        awayTeamName={match.awayTeam.shortName}
        homeTeamColor={match.homeTeam.primaryColor}
        awayTeamColor={match.awayTeam.primaryColor}
      />

      {/* Video Area */}
      <div className="relative h-[45vh] w-full">
        <img
          src={liveMatchBg}
          alt="Live match"
          className="h-full w-full object-cover"
        />
        
        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/80" />

        {/* Top Controls */}
        <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between">
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center hover:bg-black/60 transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>

          <div className="flex items-center gap-2 bg-black/40 backdrop-blur-sm px-3 py-1.5 rounded-full">
            {dataSource === "api" ? (
              <Wifi className="w-3 h-3 text-green-400" />
            ) : (
              <WifiOff className="w-3 h-3 text-yellow-400" />
            )}
            <span className={`w-2 h-2 rounded-full ${isLive ? 'bg-red-500 live-pulse' : 'bg-muted-foreground'}`} />
            <span className="text-sm font-medium text-white">{isLive ? 'LIVE' : 'ENDED'}</span>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={() => setIsFavorite(!isFavorite)}
              className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center hover:bg-black/60 transition-colors"
            >
              <Heart className={`w-5 h-5 ${isFavorite ? 'text-primary fill-primary' : 'text-white'}`} />
            </button>
            <button className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center hover:bg-black/60 transition-colors">
              <Share2 className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        {/* Match Info Overlay */}
        <div className="absolute bottom-4 left-4 right-4">
          <div className="flex items-center justify-between bg-black/50 backdrop-blur-md rounded-xl p-3">
            <div className="flex items-center gap-2">
              <TeamLogo src={match.homeTeam.logo} alt={match.homeTeam.name} size="sm" />
              <span className="text-white font-medium text-sm">{match.homeTeam.shortName}</span>
            </div>
            <div className="flex items-center gap-2">
              <LiveScoreIndicator score={match.homeScore} previousScore={prevScores.home} size="lg" />
              <span className="text-white/60">-</span>
              <LiveScoreIndicator score={match.awayScore} previousScore={prevScores.away} size="lg" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-white font-medium text-sm">{match.awayTeam.shortName}</span>
              <TeamLogo src={match.awayTeam.logo} alt={match.awayTeam.name} size="sm" />
            </div>
          </div>
        </div>

        {/* Play/Pause Button */}
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full bg-primary/90 flex items-center justify-center hover:bg-primary transition-colors shadow-glow"
        >
          {isPlaying ? (
            <Pause className="w-8 h-8 text-white" />
          ) : (
            <Play className="w-8 h-8 text-white ml-1" />
          )}
        </button>
      </div>

      {/* Match Info Panel */}
      <motion.div
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        transition={{ delay: 0.2, type: "spring", stiffness: 300, damping: 30 }}
        className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-background via-background to-background/95 rounded-t-3xl p-5 space-y-4 max-h-[60vh] overflow-y-auto"
      >
        {/* Competition Badge */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img 
              src={match.competition.logo}
              alt={match.competition.name}
              className="h-6 w-auto object-contain"
              onError={(e) => (e.currentTarget.style.display = 'none')}
            />
            <span className="text-xs font-medium text-muted-foreground">
              {match.competition.name}
            </span>
          </div>
          <motion.div 
            key={match.minute}
            initial={{ scale: 1.1 }}
            animate={{ scale: 1 }}
            className="flex items-center gap-1 bg-primary/20 px-2 py-0.5 rounded-full"
          >
            <span className="w-1.5 h-1.5 bg-primary rounded-full live-pulse" />
            <span className="text-xs font-medium text-primary">
              {isLive ? `${match.minute}'` : "FT"}
            </span>
          </motion.div>
        </div>

        {/* Score Section */}
        <div className="flex items-center justify-between">
          {/* Home Team */}
          <div className="flex items-center gap-3">
            <TeamLogo src={match.homeTeam.logo} alt={match.homeTeam.name} size="lg" />
            <div>
              <p className="font-semibold text-foreground">{match.homeTeam.shortName}</p>
              <p className="text-xs text-muted-foreground">Home</p>
            </div>
          </div>

          {/* Score */}
          <div className="flex items-center gap-4">
            <LiveScoreIndicator score={match.homeScore} previousScore={prevScores.home} size="xl" />
            <div className="flex flex-col items-center">
              <span className="text-xl text-muted-foreground">:</span>
            </div>
            <LiveScoreIndicator score={match.awayScore} previousScore={prevScores.away} size="xl" />
          </div>

          {/* Away Team */}
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="font-semibold text-foreground">{match.awayTeam.shortName}</p>
              <p className="text-xs text-muted-foreground">Away</p>
            </div>
            <TeamLogo src={match.awayTeam.logo} alt={match.awayTeam.name} size="lg" />
          </div>
        </div>

        {/* Tab Selector */}
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab("timeline")}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === "timeline" 
                ? "bg-primary text-primary-foreground" 
                : "bg-muted/50 text-muted-foreground hover:bg-muted"
            }`}
          >
            Timeline
          </button>
          <button
            onClick={() => setActiveTab("stats")}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === "stats" 
                ? "bg-primary text-primary-foreground" 
                : "bg-muted/50 text-muted-foreground hover:bg-muted"
            }`}
          >
            Statistics
          </button>
        </div>

        <AnimatePresence mode="wait">
          {activeTab === "timeline" ? (
            <motion.div
              key="timeline"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-4"
            >
              {/* Timeline */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-foreground">Match Timeline</h4>
                <div className="relative">
                  <div className="flex gap-px">
                    {[...Array(90)].map((_, i) => {
                      const event = matchEvents.find(e => e.minute === i + 1);
                      const isPlayed = i + 1 <= currentMinute;
                      return (
                        <div 
                          key={i}
                          className={`flex-1 h-2 rounded-sm transition-colors ${
                            event?.type === 'goal' 
                              ? event.team === 'home' ? 'bg-primary' : 'bg-blue-500'
                              : event?.type === 'yellow_card' 
                                ? 'bg-yellow-500'
                                : event?.type === 'red_card'
                                  ? 'bg-red-600'
                                  : event?.type === 'substitution'
                                    ? 'bg-green-500'
                                    : isPlayed ? 'bg-muted-foreground/30' : 'bg-muted/50'
                          }`}
                          title={event ? `${event.minute}' - ${event.player}` : ''}
                        />
                      );
                    })}
                  </div>
                  {/* Current minute indicator */}
                  <motion.div 
                    className="absolute top-0 w-0.5 h-4 bg-primary -mt-1"
                    style={{ left: `${Math.min(100, (currentMinute / 90) * 100)}%` }}
                    animate={{ opacity: [1, 0.5, 1] }}
                    transition={{ repeat: Infinity, duration: 1 }}
                  />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>0'</span>
                  <span>45'</span>
                  <span>90'</span>
                </div>
              </div>

              {/* Key Events */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-foreground">Key Events</h4>
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {[...matchEvents]
                    .filter(e => e.minute <= currentMinute)
                    .sort((a, b) => b.minute - a.minute)
                    .map((event, i) => {
                      const isHome = event.team === "home";
                      const icon = event.type === "goal" ? "⚽" 
                        : event.type === "yellow_card" ? "🟨"
                        : event.type === "red_card" ? "🟥"
                        : event.type === "substitution" ? "🔄"
                        : "📋";
                      
                      return (
                        <motion.div
                          key={event.id}
                          initial={{ opacity: 0, x: isHome ? -10 : 10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.03 }}
                          className={`flex items-center gap-2 text-xs py-1.5 px-2 rounded-lg ${
                            event.type === "goal" ? "bg-primary/10" : "bg-muted/30"
                          } ${isHome ? "" : "flex-row-reverse text-right"}`}
                        >
                          <span className="text-base">{icon}</span>
                          <span className="font-medium text-muted-foreground w-8">{event.minute}'</span>
                          <div className={`flex-1 ${isHome ? "" : "text-right"}`}>
                            <span className="font-medium text-foreground">{event.player}</span>
                            {event.type === "goal" && event.assist && (
                              <span className="text-muted-foreground ml-1">(ast. {event.assist})</span>
                            )}
                            {event.type === "substitution" && event.assist && (
                              <span className="text-muted-foreground ml-1">↔ {event.assist}</span>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                  {matchEvents.filter(e => e.minute <= currentMinute).length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-4">No events yet</p>
                  )}
                </div>
              </div>

              {/* Betting Odds */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-foreground">Live Betting Odds</h4>
                <div className="flex items-center justify-between gap-3">
                  <motion.div 
                    key={`home-${match.odds?.home}`}
                    initial={{ scale: 1.05 }}
                    animate={{ scale: 1 }}
                    className="flex-1 glass-card p-3 text-center hover:bg-muted/30 transition-colors cursor-pointer"
                  >
                    <p className="text-xs text-muted-foreground mb-1">Home Win</p>
                    <p className="font-bold text-foreground">{match.odds?.home.toFixed(2)}</p>
                  </motion.div>
                  <motion.div 
                    key={`draw-${match.odds?.draw}`}
                    initial={{ scale: 1.05 }}
                    animate={{ scale: 1 }}
                    className="flex-1 glass-card p-3 text-center hover:bg-muted/30 transition-colors cursor-pointer"
                  >
                    <p className="text-xs text-muted-foreground mb-1">Draw</p>
                    <p className="font-bold text-foreground">{match.odds?.draw.toFixed(2)}</p>
                  </motion.div>
                  <motion.div 
                    key={`away-${match.odds?.away}`}
                    initial={{ scale: 1.05 }}
                    animate={{ scale: 1 }}
                    className="flex-1 glass-card p-3 text-center hover:bg-muted/30 transition-colors cursor-pointer"
                  >
                    <p className="text-xs text-muted-foreground mb-1">Away Win</p>
                    <p className="font-bold text-foreground">{match.odds?.away.toFixed(2)}</p>
                  </motion.div>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="stats"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <MatchStats
                possession={match.possession}
                shots={match.shots}
                shotsOnTarget={match.shotsOnTarget}
                corners={match.corners}
                fouls={match.fouls}
                homeTeamName={match.homeTeam.shortName}
                awayTeamName={match.awayTeam.shortName}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Venue & Match Status */}
        <div className="flex items-center justify-between pt-2 border-t border-border/50">
          <p className="text-xs text-muted-foreground">📍 {match.venue}</p>
          {!isLive && (
            <button
              onClick={resetMatch}
              className="text-xs text-primary flex items-center gap-1 hover:underline"
            >
              <RefreshCw className="w-3 h-3" />
              Watch Again
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default LiveMatchView;
