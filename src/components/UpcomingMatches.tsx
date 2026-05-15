import { ChevronRight, RefreshCw, Wifi, WifiOff } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import TeamLogo from "./TeamLogo";
import CountdownTimer from "./CountdownTimer";
import { useLiveMatches, ApiMatch } from "@/hooks/useLiveMatches";
import BetnaroLoader from "./BetnaroLoader";

interface UpcomingMatchesProps {
  onViewAll?: () => void;
  onSelectMatch?: (match: ApiMatch) => void;
}

const UpcomingMatches = ({ onViewAll, onSelectMatch }: UpcomingMatchesProps) => {
  const { matches, isLoading, error, refetch, dataSource } = useLiveMatches({
    endpoint: "all",
    autoRefresh: true,
    refreshInterval: 30000,
  });

  // Separate live and upcoming
  const liveMatches = matches.filter(m => m.status === "live");
  const upcomingMatches = matches.filter(m => m.status === "upcoming");

  // Show live matches first, then upcoming - max 6 in dashboard
  const displayMatches = [...liveMatches, ...upcomingMatches].slice(0, 6);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="h-5 w-5 bg-muted rounded animate-pulse" />
          <div className="h-5 w-24 bg-muted rounded animate-pulse" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass-card p-4 h-24 animate-pulse bg-muted/20" />
          ))}
        </div>
      </div>
    );
  }

  if (error || matches.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <WifiOff className="h-5 w-5 text-muted-foreground" />
            <h3 className="font-semibold text-foreground">Matches</h3>
          </div>
          <button
            onClick={() => refetch()}
            className="text-xs text-primary flex items-center gap-1 hover:underline"
          >
            <RefreshCw className="w-3 h-3" />
            Retry
          </button>
        </div>
        <div className="glass-card p-6 text-center">
          <p className="text-muted-foreground text-sm">
            {error || "No matches available right now"}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Check back later for updates
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {dataSource === "api" ? (
            <Wifi className="h-4 w-4 text-primary" />
          ) : (
            <WifiOff className="h-4 w-4 text-muted-foreground" />
          )}
          <h3 className="font-semibold text-foreground">
            {liveMatches.length > 0 ? "Live & Upcoming" : "Upcoming Matches"}
          </h3>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
            {matches.length} total
          </span>
        </div>
        <button
          onClick={() => refetch()}
          className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors"
        >
          <RefreshCw className="w-3 h-3" />
          Refresh
        </button>
      </div>

      {/* Match List */}
      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {displayMatches.map((match, index) => (
            <motion.div
              key={match.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              onClick={() => onSelectMatch?.(match)}
              className="glass-card p-4 hover:bg-muted/20 transition-colors cursor-pointer active:scale-[0.98]"
            >
              <div className="flex items-center justify-between">
                {/* Home Team */}
                <div className="flex items-center gap-3 flex-1">
                  <TeamLogo 
                    src={match.homeTeam.logo || ""}
                    alt={match.homeTeam.name}
                    size="md"
                  />
                  <div>
                    <p className="font-medium text-sm text-foreground">
                      {match.homeTeam.shortName}
                    </p>
                    <p className="text-xs text-muted-foreground">Home</p>
                  </div>
                </div>

                {/* Score & Time */}
                <div className="flex flex-col items-center px-4">
                  {match.status === "live" ? (
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
                  ) : (
                    <CountdownTimer startTime={match.startTime} size="md" />
                  )}
                </div>

                {/* Away Team */}
                <div className="flex items-center gap-3 flex-1 justify-end">
                  <div className="text-right">
                    <p className="font-medium text-sm text-foreground">
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
              </div>

              {/* Competition Name */}
              <div className="mt-2 pt-2 border-t border-border/50">
                <p className="text-xs text-muted-foreground text-center">
                  {match.competition.name}
                </p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* View More */}
      <button 
        onClick={onViewAll}
        className="w-full py-3 text-center text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center gap-1"
      >
        <span>View All Matches</span>
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
};

function formatStartTime(startTime: string): string {
  try {
    const timestamp = parseInt(startTime);
    if (!isNaN(timestamp)) {
      const date = new Date(timestamp * 1000);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    const date = new Date(startTime);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return "TBD";
  }
}

export default UpcomingMatches;
