import { useState, useEffect, useCallback } from "react";
import { X, Trophy, ChevronDown, Medal, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import TeamLogo from "./TeamLogo";
import { supabase } from "@/integrations/supabase/client";

interface StandingsScreenProps {
  onClose: () => void;
}

interface TeamStanding {
  position: number;
  team: string;
  shortName: string;
  logo: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  form: ("W" | "D" | "L")[];
}

interface LeagueInfo {
  id: string;
  name: string;
  country: string;
}

const leagues: LeagueInfo[] = [
  { id: "epl", name: "Premier League", country: "England" },
  { id: "laliga", name: "La Liga", country: "Spain" },
  { id: "seriea", name: "Serie A", country: "Italy" },
  { id: "bundesliga", name: "Bundesliga", country: "Germany" },
  { id: "ligue1", name: "Ligue 1", country: "France" },
];

// Build standings from live API match data
const buildStandingsFromMatches = (matches: any[], leagueKeywords: string[]): TeamStanding[] => {
  // Filter matches by league keywords (case-insensitive partial match)
  const leagueMatches = matches.filter((m: any) => {
    const compName = (m.competition?.name || m.tournamentName || "").toLowerCase();
    return leagueKeywords.some(kw => compName.includes(kw.toLowerCase()));
  });

  if (leagueMatches.length === 0) return [];

  // Build team stats from finished/live matches
  const teamStats: Record<string, {
    name: string;
    logo: string;
    played: number;
    won: number;
    drawn: number;
    lost: number;
    goalsFor: number;
    goalsAgainst: number;
    results: ("W" | "D" | "L")[];
  }> = {};

  leagueMatches.forEach((match: any) => {
    const homeTeam = match.homeTeam?.name || match.homeName || "";
    const awayTeam = match.awayTeam?.name || match.awayName || "";
    const homeScore = match.homeScore || 0;
    const awayScore = match.awayScore || 0;
    const homeLogo = match.homeTeam?.logo || match.homeLogo || "";
    const awayLogo = match.awayTeam?.logo || match.awayLogo || "";
    const status = match.status || "";

    // Only count finished or live matches for standings
    if (status !== "live" && status !== "finished") return;

    if (!homeTeam || !awayTeam) return;

    // Initialize teams
    if (!teamStats[homeTeam]) {
      teamStats[homeTeam] = { name: homeTeam, logo: homeLogo, played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, results: [] };
    }
    if (!teamStats[awayTeam]) {
      teamStats[awayTeam] = { name: awayTeam, logo: awayLogo, played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, results: [] };
    }

    teamStats[homeTeam].played++;
    teamStats[homeTeam].goalsFor += homeScore;
    teamStats[homeTeam].goalsAgainst += awayScore;

    teamStats[awayTeam].played++;
    teamStats[awayTeam].goalsFor += awayScore;
    teamStats[awayTeam].goalsAgainst += homeScore;

    if (homeScore > awayScore) {
      teamStats[homeTeam].won++;
      teamStats[homeTeam].results.push("W");
      teamStats[awayTeam].lost++;
      teamStats[awayTeam].results.push("L");
    } else if (homeScore < awayScore) {
      teamStats[homeTeam].lost++;
      teamStats[homeTeam].results.push("L");
      teamStats[awayTeam].won++;
      teamStats[awayTeam].results.push("W");
    } else {
      teamStats[homeTeam].drawn++;
      teamStats[homeTeam].results.push("D");
      teamStats[awayTeam].drawn++;
      teamStats[awayTeam].results.push("D");
    }
  });

  // Convert to standings array and sort by points
  const createShortName = (name: string): string => {
    if (name.length <= 5) return name;
    const words = name.split(" ");
    if (words.length >= 2) {
      return words.map(w => w[0]).join("").toUpperCase().slice(0, 4);
    }
    return name.substring(0, 4).toUpperCase();
  };

  return Object.values(teamStats)
    .map(t => ({
      position: 0,
      team: t.name,
      shortName: createShortName(t.name),
      logo: t.logo,
      played: t.played,
      won: t.won,
      drawn: t.drawn,
      lost: t.lost,
      goalsFor: t.goalsFor,
      goalsAgainst: t.goalsAgainst,
      goalDifference: t.goalsFor - t.goalsAgainst,
      points: t.won * 3 + t.drawn,
      form: t.results.slice(-5) as ("W" | "D" | "L")[],
    }))
    .sort((a, b) => b.points - a.points || b.goalDifference - a.goalDifference || b.goalsFor - a.goalsFor)
    .map((t, i) => ({ ...t, position: i + 1 }));
};

// League keyword mapping for filtering API data
const leagueKeywords: Record<string, string[]> = {
  epl: ["premier league", "english premier"],
  laliga: ["la liga", "laliga", "spanish primera", "spanish la liga"],
  seriea: ["serie a", "italian serie"],
  bundesliga: ["bundesliga", "german bundesliga"],
  ligue1: ["ligue 1", "french ligue"],
};

const StandingsScreen = ({ onClose }: StandingsScreenProps) => {
  const [selectedLeague, setSelectedLeague] = useState(leagues[0]);
  const [showLeagueSelector, setShowLeagueSelector] = useState(false);
  const [standings, setStandings] = useState<TeamStanding[]>([]);
  const [allMatches, setAllMatches] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [dataSource, setDataSource] = useState<"api" | "none">("none");

  const fetchMatches = useCallback(async (silent = false) => {
    if (silent) setIsRefreshing(true); else setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("live-matches", {
        body: { endpoint: "all", sport: "football" },
      });

      if (error || data?.useSimulation) {
        console.log("API unavailable for standings");
        setDataSource("none");
        setAllMatches([]);
        setIsLoading(false);
        return;
      }

      if (data?.matches && Array.isArray(data.matches)) {
        setDataSource("api");
        setAllMatches(data.matches);
        setLastUpdated(new Date());
      }
    } catch (err) {
      console.error("Standings fetch error:", err);
      setDataSource("none");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Fetch on mount + auto-refresh every 30s (silent)
  useEffect(() => {
    fetchMatches();
    const interval = setInterval(() => fetchMatches(true), 30000);
    return () => clearInterval(interval);
  }, [fetchMatches]);

  // Rebuild standings when league or matches change
  useEffect(() => {
    if (allMatches.length > 0) {
      const keywords = leagueKeywords[selectedLeague.id] || [];
      const built = buildStandingsFromMatches(allMatches, keywords);
      setStandings(built);
    } else {
      setStandings([]);
    }
  }, [selectedLeague, allMatches]);

  const getFormColor = (result: "W" | "D" | "L") => {
    switch (result) {
      case "W": return "bg-green-500";
      case "D": return "bg-yellow-500";
      case "L": return "bg-red-500";
    }
  };

  const getPositionStyle = (position: number) => {
    if (position <= 4) return "text-green-500";
    if (position === 5) return "text-blue-500";
    if (position >= 18) return "text-red-500";
    return "text-foreground";
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
              <h1 className="font-bold text-lg text-foreground">Standings</h1>
              {dataSource === "api" && (
                <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded-full">LIVE</span>
              )}
              {isRefreshing && (
                <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Updating
                </span>
              )}
            </div>

            <button
              onClick={() => fetchMatches(false)}
              disabled={isLoading || isRefreshing}
              title={lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString()}` : "Refresh"}
              className="w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center hover:bg-muted transition-colors"
            >
              <RefreshCw className={`w-5 h-5 text-foreground ${(isLoading || isRefreshing) ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* League Selector */}
        <div className="px-4 pb-3">
          <button
            onClick={() => setShowLeagueSelector(!showLeagueSelector)}
            className="w-full flex items-center justify-between p-3 glass-card rounded-lg"
          >
            <div className="flex items-center gap-3">
              <Medal className="w-5 h-5 text-primary" />
              <div className="text-left">
                <p className="font-medium text-foreground">{selectedLeague.name}</p>
                <p className="text-xs text-muted-foreground">{selectedLeague.country}</p>
              </div>
            </div>
            <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform ${showLeagueSelector ? 'rotate-180' : ''}`} />
          </button>

          <AnimatePresence>
            {showLeagueSelector && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-2 space-y-1"
              >
                {leagues.map((league) => (
                  <button
                    key={league.id}
                    onClick={() => {
                      setSelectedLeague(league);
                      setShowLeagueSelector(false);
                    }}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${
                      selectedLeague.id === league.id
                        ? "bg-primary/20 text-primary"
                        : "bg-muted/30 hover:bg-muted/50 text-foreground"
                    }`}
                  >
                    <Medal className="w-4 h-4" />
                    <span className="text-sm font-medium">{league.name}</span>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Legend */}
        <div className="px-4 pb-3 flex items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            <span>Champions League</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            <span>Europa League</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            <span>Relegation</span>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-x-auto overflow-y-auto pb-24">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <RefreshCw className="w-8 h-8 text-primary animate-spin" />
          </div>
        ) : standings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Trophy className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center">No standings data available</p>
            <p className="text-xs text-muted-foreground mt-1">
              Standings are built from live & finished match data
            </p>
            <button
              onClick={() => fetchMatches(false)}
              className="mt-4 text-primary text-sm flex items-center gap-1 hover:underline"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>
        ) : (
          <table className="w-full min-w-[600px]">
            <thead className="bg-muted/30 sticky top-0">
              <tr className="text-xs text-muted-foreground">
                <th className="text-left p-3 font-medium">#</th>
                <th className="text-left p-3 font-medium">Team</th>
                <th className="text-center p-3 font-medium">P</th>
                <th className="text-center p-3 font-medium">W</th>
                <th className="text-center p-3 font-medium">D</th>
                <th className="text-center p-3 font-medium">L</th>
                <th className="text-center p-3 font-medium">GD</th>
                <th className="text-center p-3 font-medium">Pts</th>
                <th className="text-center p-3 font-medium">Form</th>
              </tr>
            </thead>
            <tbody>
              {standings.map((team, index) => (
                <motion.tr
                  key={team.team}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2, delay: index * 0.03 }}
                  className="border-b border-border/30 hover:bg-muted/20 transition-colors"
                >
                  <td className={`p-3 font-bold ${getPositionStyle(team.position)}`}>
                    {team.position}
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <TeamLogo src={team.logo} alt={team.team} size="xs" />
                      <span className="font-medium text-foreground text-sm">{team.shortName}</span>
                    </div>
                  </td>
                  <td className="text-center p-3 text-sm text-foreground">{team.played}</td>
                  <td className="text-center p-3 text-sm text-foreground">{team.won}</td>
                  <td className="text-center p-3 text-sm text-foreground">{team.drawn}</td>
                  <td className="text-center p-3 text-sm text-foreground">{team.lost}</td>
                  <td className={`text-center p-3 text-sm font-medium ${team.goalDifference > 0 ? 'text-green-500' : team.goalDifference < 0 ? 'text-red-500' : 'text-foreground'}`}>
                    {team.goalDifference > 0 ? '+' : ''}{team.goalDifference}
                  </td>
                  <td className="text-center p-3 text-sm font-bold text-foreground">{team.points}</td>
                  <td className="p-3">
                    <div className="flex items-center justify-center gap-0.5">
                      {team.form.map((result, i) => (
                        <span
                          key={i}
                          className={`w-4 h-4 rounded-full text-[10px] flex items-center justify-center text-white font-bold ${getFormColor(result)}`}
                        >
                          {result}
                        </span>
                      ))}
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </motion.div>
  );
};

export default StandingsScreen;
