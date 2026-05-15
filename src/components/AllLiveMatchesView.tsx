import { useState, useRef, useCallback, useMemo } from "react";
import { X, RefreshCw, Wifi, WifiOff, ChevronRight, Filter, Clock, Zap, Calendar } from "lucide-react";
import { motion, AnimatePresence, useMotionValue, useTransform, PanInfo } from "framer-motion";
import TeamLogo from "./TeamLogo";
import CountdownTimer from "./CountdownTimer";
import { useLiveMatches, ApiMatch } from "@/hooks/useLiveMatches";
import { Button } from "@/components/ui/button";
import BetnaroLoader from "./BetnaroLoader";

interface AllLiveMatchesViewProps {
  onClose: () => void;
  onSelectMatch: (match: ApiMatch) => void;
}

type MatchFilter = "all" | "live" | "upcoming";

const AllLiveMatchesView = ({ onClose, onSelectMatch }: AllLiveMatchesViewProps) => {
  const [activeFilter, setActiveFilter] = useState<MatchFilter>("all");
  const [selectedCompetition, setSelectedCompetition] = useState<string | null>(null);
  const [isPulling, setIsPulling] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // Fetch all matches at once (more efficient than separate calls)
  const { 
    matches: allApiMatches, 
    isLoading, 
    error: apiError, 
    refetch, 
    dataSource 
  } = useLiveMatches({
    endpoint: "all",
    autoRefresh: true,
    refreshInterval: 30000,
  });

  const allMatches = allApiMatches;

  // Get unique competitions
  const competitions = useMemo(() => {
    const competitionSet = new Set<string>();
    allMatches.forEach(match => {
      if (match.competition.name) {
        competitionSet.add(match.competition.name);
      }
    });
    return Array.from(competitionSet).sort();
  }, [allMatches]);

  // Filter matches
  const filteredMatches = useMemo(() => {
    let matches = allMatches;

    // Filter by status
    if (activeFilter === "live") {
      matches = matches.filter(m => m.status === "live");
    } else if (activeFilter === "upcoming") {
      matches = matches.filter(m => m.status === "upcoming");
    }

    // Filter by competition
    if (selectedCompetition) {
      matches = matches.filter(m => m.competition.name === selectedCompetition);
    }

    return matches;
  }, [allMatches, activeFilter, selectedCompetition]);

  // Pull to refresh logic
  const y = useMotionValue(0);
  const pullProgress = useTransform(y, [0, 100], [0, 1]);
  const rotate = useTransform(y, [0, 100], [0, 360]);

  const handleRefresh = useCallback(async () => {
    setIsPulling(true);
    await refetch();
    setIsPulling(false);
  }, [refetch]);

  const handlePanEnd = useCallback(async (_: any, info: PanInfo) => {
    if (info.offset.y > 80 && scrollRef.current?.scrollTop === 0) {
      await handleRefresh();
    }
    y.set(0);
  }, [handleRefresh, y]);

  const handlePan = useCallback((_: any, info: PanInfo) => {
    if (scrollRef.current?.scrollTop === 0 && info.offset.y > 0) {
      y.set(Math.min(info.offset.y, 100));
    }
  }, [y]);

  const canBet = (match: ApiMatch) => match.status === "upcoming";

  return (
    <motion.div
      initial={{ opacity: 0, y: "100%" }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: "100%" }}
      transition={{ type: "spring", damping: 25, stiffness: 300 }}
      className="fixed inset-0 z-50 bg-background"
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
              {dataSource === "api" ? (
                <Wifi className="w-4 h-4 text-primary" />
              ) : (
                <WifiOff className="w-4 h-4 text-yellow-500" />
              )}
              <h1 className="font-bold text-lg text-foreground">All Matches</h1>
              {filteredMatches.length > 0 && (
                <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                  {filteredMatches.length}
                </span>
              )}
            </div>

            <button
              onClick={handleRefresh}
              disabled={isLoading || isPulling}
              className="w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center hover:bg-muted transition-colors"
            >
              <RefreshCw className={`w-5 h-5 text-foreground ${isLoading || isPulling ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="px-4 pb-3">
          <div className="flex gap-2 mb-3">
            <Button
              variant={activeFilter === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveFilter("all")}
              className="flex-1"
            >
              All
            </Button>
            <Button
              variant={activeFilter === "live" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveFilter("live")}
              className="flex-1 gap-1"
            >
              <Zap className="w-3 h-3" />
              Live
            </Button>
            <Button
              variant={activeFilter === "upcoming" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveFilter("upcoming")}
              className="flex-1 gap-1"
            >
              <Clock className="w-3 h-3" />
              Upcoming
            </Button>
          </div>

          {/* Competition Filter */}
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
            {competitions.map((comp) => (
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

      {/* Pull to Refresh Indicator */}
      <motion.div 
        style={{ 
          opacity: pullProgress,
          height: y
        }}
        className="flex items-center justify-center overflow-hidden bg-muted/20"
      >
        <motion.div style={{ rotate }}>
          <RefreshCw className="w-6 h-6 text-primary" />
        </motion.div>
      </motion.div>

      {/* Content */}
      <motion.div
        ref={scrollRef}
        onPan={handlePan}
        onPanEnd={handlePanEnd}
        className="p-4 pb-24 overflow-y-auto max-h-[calc(100vh-180px)]"
      >
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <BetnaroLoader size={96} label="Fetching live matches..." />
          </div>
        ) : filteredMatches.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Calendar className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center">No matches available</p>
            <p className="text-xs text-muted-foreground mt-1">
              {activeFilter === "live" 
                ? "No live matches right now. Check upcoming matches!" 
                : activeFilter === "upcoming"
                ? "No upcoming matches found"
                : "Check back later for updates"
              }
            </p>
            <button
              onClick={handleRefresh}
              className="mt-4 text-primary text-sm flex items-center gap-1 hover:underline"
            >
              <RefreshCw className="w-4 h-4" />
              Try Again
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {filteredMatches.map((match, index) => (
                <motion.div
                  key={match.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.3, delay: index * 0.03 }}
                  onClick={() => onSelectMatch(match)}
                  className="glass-card p-4 hover:bg-muted/30 transition-colors cursor-pointer active:scale-[0.98]"
                >
                  <div className="flex items-center justify-between">
                    {/* Home Team */}
                    <div className="flex items-center gap-3 flex-1">
                      <TeamLogo
                        src={match.homeTeam.logo || ""}
                        alt={match.homeTeam.name}
                        size="md"
                      />
                      <div className="min-w-0">
                        <p className="font-medium text-sm text-foreground truncate">
                          {match.homeTeam.shortName}
                        </p>
                        <p className="text-xs text-muted-foreground">Home</p>
                      </div>
                    </div>

                    {/* Score & Time / Betting */}
                    <div className="flex flex-col items-center px-3 shrink-0">
                      {match.status === "upcoming" ? (
                        <CountdownTimer startTime={match.startTime} size="md" />
                      ) : (
                        <>
                          <div className="flex items-center gap-2">
                            <span className="text-xl font-bold text-foreground">
                              {match.homeScore}
                            </span>
                            <span className="text-muted-foreground">-</span>
                            <span className="text-xl font-bold text-foreground">
                              {match.awayScore}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 mt-1">
                            <span className="w-1.5 h-1.5 bg-primary rounded-full live-pulse" />
                            <span className="text-xs font-medium text-primary">
                              {match.minute || "LIVE"}
                            </span>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Away Team */}
                    <div className="flex items-center gap-3 flex-1 justify-end">
                      <div className="text-right min-w-0">
                        <p className="font-medium text-sm text-foreground truncate">
                          {match.awayTeam.shortName}
                        </p>
                        <p className="text-xs text-muted-foreground">Away</p>
                      </div>
                      <TeamLogo
                        src={match.awayTeam.logo || ""}
                        alt={match.awayTeam.name}
                        size="md"
                      />
                    </div>

                    <ChevronRight className="w-4 h-4 text-muted-foreground ml-2 shrink-0" />
                  </div>

                  {/* Competition Name & Bet Button */}
                  <div className="mt-2 pt-2 border-t border-border/50 flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">
                      {match.competition.name}
                    </p>
                    
                    {canBet(match) ? (
                      <Button 
                        size="sm" 
                        variant="secondary"
                        className="h-7 text-xs px-3 bg-primary/10 text-primary hover:bg-primary/20"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectMatch(match);
                        }}
                      >
                        Place Bet
                      </Button>
                    ) : (
                      <span className="text-xs text-yellow-500/80 bg-yellow-500/10 px-2 py-0.5 rounded">
                        Betting Closed
                      </span>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};

// Helper function to format start time
function formatStartTime(startTime: string): string {
  try {
    // Handle unix timestamp
    const timestamp = parseInt(startTime);
    if (!isNaN(timestamp)) {
      const date = new Date(timestamp * 1000);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    // Handle ISO string
    const date = new Date(startTime);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return "TBD";
  }
}

export default AllLiveMatchesView;
