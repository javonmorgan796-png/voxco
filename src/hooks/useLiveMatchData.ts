import { useState, useEffect, useCallback, useRef } from "react";
import { Match, Team, Competition, teams } from "@/data/footballData";
import { supabase } from "@/integrations/supabase/client";

// Types for the API response
interface ApiMatch {
  id: string;
  homeTeam: {
    name: string;
    logo?: string;
  };
  awayTeam: {
    name: string;
    logo?: string;
  };
  homeScore: number;
  awayScore: number;
  minute?: string;
  status: string;
  competition?: {
    name: string;
    logo?: string;
  };
  venue?: string;
}

// Match events for timeline
export interface MatchEvent {
  id: string;
  type: "goal" | "yellow_card" | "red_card" | "substitution" | "var";
  minute: number;
  team: "home" | "away";
  player: string;
  assist?: string;
}

// Extended match with events
export interface LiveMatchData extends Match {
  events: MatchEvent[];
  possession: { home: number; away: number };
  shots: { home: number; away: number };
  shotsOnTarget: { home: number; away: number };
  corners: { home: number; away: number };
  fouls: { home: number; away: number };
}

// Simulate realistic match events and scorers
const getRandomScorer = (team: "home" | "away", homeTeam: Team, awayTeam: Team): string => {
  const homeScorers = ["Lewandowski", "Raphinha", "Pedri", "Gavi", "Ferran Torres", "Yamal"];
  const awayScorers = ["Palmer", "Jackson", "Madueke", "Mudryk", "Gallagher", "Nkunku"];
  const scorers = team === "home" ? homeScorers : awayScorers;
  return scorers[Math.floor(Math.random() * scorers.length)];
};

const generateInitialEvents = (): MatchEvent[] => {
  return [
    { id: "1", type: "goal", minute: 12, team: "home", player: "Lewandowski", assist: "Pedri" },
    { id: "2", type: "yellow_card", minute: 23, team: "away", player: "Cucurella" },
    { id: "3", type: "goal", minute: 34, team: "away", player: "Palmer" },
    { id: "4", type: "yellow_card", minute: 41, team: "home", player: "Araujo" },
    { id: "5", type: "substitution", minute: 46, team: "away", player: "Nkunku", assist: "Sterling" },
    { id: "6", type: "goal", minute: 56, team: "home", player: "Raphinha", assist: "Yamal" },
    { id: "7", type: "substitution", minute: 62, team: "home", player: "Fermin", assist: "Gavi" },
    { id: "8", type: "goal", minute: 67, team: "away", player: "Jackson", assist: "Palmer" },
    { id: "9", type: "red_card", minute: 72, team: "away", player: "Disasi" },
    { id: "10", type: "goal", minute: 78, team: "away", player: "Mudryk" },
    { id: "11", type: "substitution", minute: 80, team: "home", player: "Ansu Fati", assist: "Lewandowski" },
  ];
};

const generateInitialStats = () => ({
  possession: { home: 58, away: 42 },
  shots: { home: 14, away: 11 },
  shotsOnTarget: { home: 6, away: 5 },
  corners: { home: 7, away: 4 },
  fouls: { home: 11, away: 14 },
});

// Main hook for live match data with real-time simulation
export const useLiveMatchData = () => {
  const [matchData, setMatchData] = useState<LiveMatchData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLive, setIsLive] = useState(true);
  const [dataSource, setDataSource] = useState<"api" | "simulation">("simulation");
  const lastGoalRef = useRef<MatchEvent | null>(null);
  const [newGoal, setNewGoal] = useState<MatchEvent | null>(null);

  // Initialize match data (fallback when no API data)
  const initializeMatch = useCallback(() => {
    const initialMatch: LiveMatchData = {
      id: "simulation-1",
      competition: {
        id: "simulation",
        name: "Live Football",
        logo: null,
        country: "",
      },
      homeTeam: teams.barcelona || {
        id: "home",
        name: "Home Team",
        shortName: "Home",
        logo: "",
        primaryColor: "#666666",
        country: "",
      },
      awayTeam: teams.chelsea || {
        id: "away",
        name: "Away Team",
        shortName: "Away",
        logo: "",
        primaryColor: "#666666",
        country: "",
      },
      homeScore: 2,
      awayScore: 3,
      status: "live",
      minute: "85",
      date: "Today",
      time: "21:00",
      venue: "Stadium",
      odds: {
        home: 3.74,
        draw: 4.85,
        away: 2.45,
      },
      events: generateInitialEvents(),
      ...generateInitialStats(),
    };
    
    setMatchData(initialMatch);
    setIsLoading(false);
  }, []);

  // Simulate real-time updates
  const simulateUpdate = useCallback(() => {
    if (!matchData || !isLive) return;

    setMatchData((prev) => {
      if (!prev) return prev;

      // Parse current minute
      let currentMinute = parseInt(prev.minute?.replace("+", "") || "0");
      
      // Advance time (1-3 minutes per update)
      const timeAdvance = Math.floor(Math.random() * 3) + 1;
      let newMinute = currentMinute + timeAdvance;
      
      // Handle match end and extra time
      let minuteString: string;
      if (newMinute > 90) {
        const extraTime = newMinute - 90;
        if (extraTime > 7) {
          // Match ends
          setIsLive(false);
          return {
            ...prev,
            status: "finished" as const,
            minute: "FT",
          };
        }
        minuteString = `90+${extraTime}`;
      } else {
        minuteString = `${newMinute}`;
      }

      // Random match events
      let newHomeScore = prev.homeScore;
      let newAwayScore = prev.awayScore;
      let newEvents = [...prev.events];

      // Random yellow card (3% chance)
      if (Math.random() < 0.03 && newMinute <= 97) {
        const team = Math.random() > 0.5 ? "home" : "away";
        const cardPlayers = team === "home" 
          ? ["Araujo", "Kounde", "Christensen", "Balde"]
          : ["Cucurella", "Caicedo", "Colwill", "Gusto"];
        newEvents.push({
          id: `event-card-${Date.now()}`,
          type: "yellow_card",
          minute: newMinute > 90 ? 90 : newMinute,
          team,
          player: cardPlayers[Math.floor(Math.random() * cardPlayers.length)],
        });
      }

      // Random substitution (4% chance)
      if (Math.random() < 0.04 && newMinute >= 45 && newMinute <= 90) {
        const team = Math.random() > 0.5 ? "home" : "away";
        const subIn = team === "home"
          ? ["Ansu Fati", "Fermin", "Vitor Roque", "Sergi Roberto"]
          : ["Nkunku", "Chukwuemeka", "Lavia", "Chilwell"];
        const subOut = team === "home"
          ? ["Pedri", "Gavi", "Raphinha", "Ferran Torres"]
          : ["Palmer", "Madueke", "Gallagher", "Mudryk"];
        const idx = Math.floor(Math.random() * subIn.length);
        newEvents.push({
          id: `event-sub-${Date.now()}`,
          type: "substitution",
          minute: newMinute > 90 ? 90 : newMinute,
          team,
          player: subIn[idx],
          assist: subOut[idx],
        });
      }
      
      if (Math.random() < 0.05 && newMinute <= 97) {
        const scoringTeam = Math.random() > 0.5 ? "home" : "away";
        const scorer = getRandomScorer(scoringTeam, prev.homeTeam, prev.awayTeam);
        
        if (scoringTeam === "home") {
          newHomeScore++;
        } else {
          newAwayScore++;
        }

        const goalEvent: MatchEvent = {
          id: `event-${Date.now()}`,
          type: "goal",
          minute: newMinute > 90 ? 90 : newMinute,
          team: scoringTeam,
          player: scorer,
        };

        newEvents.push(goalEvent);
        
        // Trigger goal celebration
        setNewGoal(goalEvent);
        setTimeout(() => setNewGoal(null), 4000);

        // Update odds after goal
        const totalGoals = newHomeScore + newAwayScore;
        const homeAdvantage = newHomeScore > newAwayScore ? 0.8 : newHomeScore < newAwayScore ? 1.3 : 1;
        
        return {
          ...prev,
          homeScore: newHomeScore,
          awayScore: newAwayScore,
          minute: minuteString,
          events: newEvents,
          odds: {
            home: Math.max(1.1, +(prev.odds!.home * homeAdvantage).toFixed(2)),
            draw: Math.max(1.1, +(prev.odds!.draw * (1 + Math.random() * 0.2)).toFixed(2)),
            away: Math.max(1.1, +(prev.odds!.away * (2 - homeAdvantage)).toFixed(2)),
          },
          // Update stats
          shots: {
            home: prev.shots.home + (scoringTeam === "home" ? 1 : 0),
            away: prev.shots.away + (scoringTeam === "away" ? 1 : 0),
          },
          shotsOnTarget: {
            home: prev.shotsOnTarget.home + (scoringTeam === "home" ? 1 : 0),
            away: prev.shotsOnTarget.away + (scoringTeam === "away" ? 1 : 0),
          },
        };
      }

      // Small stat updates even without goals
      const statChange = Math.random();
      let newPossession = { ...prev.possession };
      let newShots = { ...prev.shots };
      let newCorners = { ...prev.corners };

      if (statChange > 0.7) {
        // Possession fluctuation
        const shift = Math.floor(Math.random() * 3) - 1;
        newPossession = {
          home: Math.min(70, Math.max(30, prev.possession.home + shift)),
          away: Math.min(70, Math.max(30, prev.possession.away - shift)),
        };
      }

      if (statChange > 0.85) {
        // Shot added
        if (Math.random() > 0.5) {
          newShots.home++;
        } else {
          newShots.away++;
        }
      }

      if (statChange > 0.95) {
        // Corner added
        if (Math.random() > 0.5) {
          newCorners.home++;
        } else {
          newCorners.away++;
        }
      }

      return {
        ...prev,
        minute: minuteString,
        possession: newPossession,
        shots: newShots,
        corners: newCorners,
      };
    });
  }, [matchData, isLive]);

  // Fetch from live football API via edge function
  const fetchFromApi = useCallback(async () => {
    try {
      console.log("Fetching live matches from API...");
      
      const { data, error } = await supabase.functions.invoke("live-matches", {
        body: { endpoint: "live", sport: "football" },
      });

      if (error) {
        console.error("Edge function error:", error);
        return false;
      }

      console.log("API response:", data);

      // If API returned useSimulation flag, fall back to simulation
      if (data?.useSimulation) {
        console.log("API unavailable, using simulation:", data.message);
        setDataSource("simulation");
        return false;
      }

      // If we got matches from API, transform and use them
      if (data?.matches && data.matches.length > 0) {
        setDataSource("api");
        console.log(`Received ${data.matches.length} live matches from API`);
        
        // Use the first live match from the API
        const apiMatch = data.matches[0];
        
        // Create short name helper
        const createShortName = (name: string): string => {
          if (name.length <= 10) return name;
          const words = name.split(" ");
          if (words.length > 1) {
            return words[0].length <= 8 ? words[0] : name.substring(0, 8);
          }
          return name.substring(0, 10);
        };

        const transformedMatch: LiveMatchData = {
          id: apiMatch.id,
          competition: {
            id: "api-comp",
            name: apiMatch.competition?.name || "Live Match",
            logo: apiMatch.competition?.logo || null,
            country: "",
          },
          homeTeam: findTeamOrCreate(apiMatch.homeTeam?.name || "Home", apiMatch.homeTeam?.logo),
          awayTeam: findTeamOrCreate(apiMatch.awayTeam?.name || "Away", apiMatch.awayTeam?.logo),
          homeScore: apiMatch.homeScore || 0,
          awayScore: apiMatch.awayScore || 0,
          status: "live",
          minute: apiMatch.minute || "1",
          date: "Today",
          time: "Now",
          venue: apiMatch.venue || "",
          odds: { home: 2.50, draw: 3.20, away: 2.80 },
          events: [],
          ...generateInitialStats(),
        };
        
        setMatchData(transformedMatch);
        setIsLoading(false);
        setIsLive(true);
        return true;
      }

      return false;
    } catch (err) {
      console.error("API fetch error:", err);
      return false;
    }
  }, []);

  // Helper to find team or create from API data
  const findTeamOrCreate = (name: string, logo?: string): Team => {
    // Try to find existing team by name
    const existingTeam = Object.values(teams).find(
      t => t.name.toLowerCase().includes(name.toLowerCase()) ||
           name.toLowerCase().includes(t.name.toLowerCase())
    );
    
    if (existingTeam) return existingTeam;
    
    // Create new team from API data
    return {
      id: name.toLowerCase().replace(/\s+/g, "-"),
      name: name,
      shortName: name.length > 10 ? name.substring(0, 10) : name,
      logo: logo || "",
      primaryColor: "#666666",
      country: "",
    };
  };

  // Initialize on mount
  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      const apiSuccess = await fetchFromApi();
      if (!apiSuccess) {
        initializeMatch();
        setDataSource("simulation");
      }
    };
    init();
  }, [fetchFromApi, initializeMatch]);

  // Real-time update interval
  useEffect(() => {
    if (!isLive || isLoading) return;

    const interval = setInterval(() => {
      simulateUpdate();
    }, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, [isLive, isLoading, simulateUpdate]);

  // Reset match
  const resetMatch = useCallback(() => {
    setIsLive(true);
    initializeMatch();
  }, [initializeMatch]);

  return {
    matchData,
    isLoading,
    error,
    isLive,
    resetMatch,
    dataSource,
    newGoal,
  };
};

// Hook for multiple live matches from API
export const useMultipleLiveMatches = () => {
  const [matches, setMatches] = useState<LiveMatchData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dataSource, setDataSource] = useState<"api" | "simulation">("api");

  const fetchMatches = useCallback(async () => {
    try {
      console.log("Fetching multiple live matches from API...");
      
      const { data, error } = await supabase.functions.invoke("live-matches", {
        body: { endpoint: "live", sport: "football" },
      });

      if (error) {
        console.error("Edge function error:", error);
        setDataSource("simulation");
        setMatches([]);
        setIsLoading(false);
        return;
      }

      if (data?.useSimulation) {
        console.log("API unavailable, no matches to show");
        setDataSource("simulation");
        setMatches([]);
        setIsLoading(false);
        return;
      }

      if (data?.matches && Array.isArray(data.matches) && data.matches.length > 0) {
        setDataSource("api");
        console.log(`Received ${data.matches.length} live matches for multiple view`);
        
        // Helper to create short name
        const createShortName = (name: string): string => {
          if (name.length <= 10) return name;
          const words = name.split(" ");
          if (words.length > 1) {
            return words[0].length <= 8 ? words[0] : name.substring(0, 8);
          }
          return name.substring(0, 10);
        };

        // Transform API matches to LiveMatchData format
        const transformedMatches: LiveMatchData[] = data.matches.slice(0, 10).map((m: any) => ({
          id: m.id || String(Math.random()),
          competition: {
            id: "api-comp",
            name: m.competition?.name || "Live Match",
            logo: m.competition?.logo || null,
            country: "",
          },
          homeTeam: {
            id: m.homeTeam?.name?.toLowerCase().replace(/\s+/g, "-") || "home",
            name: m.homeTeam?.name || "Home",
            shortName: createShortName(m.homeTeam?.name || "Home"),
            logo: m.homeTeam?.logo || "",
            primaryColor: "#666666",
            country: "",
          },
          awayTeam: {
            id: m.awayTeam?.name?.toLowerCase().replace(/\s+/g, "-") || "away",
            name: m.awayTeam?.name || "Away",
            shortName: createShortName(m.awayTeam?.name || "Away"),
            logo: m.awayTeam?.logo || "",
            primaryColor: "#666666",
            country: "",
          },
          homeScore: m.homeScore || 0,
          awayScore: m.awayScore || 0,
          status: m.status === "finished" ? "finished" : "live",
          minute: m.minute || "LIVE",
          date: "Today",
          time: "Now",
          venue: m.venue || "",
          odds: { home: 2.50, draw: 3.20, away: 2.80 },
          events: [],
          possession: { home: 50, away: 50 },
          shots: { home: 0, away: 0 },
          shotsOnTarget: { home: 0, away: 0 },
          corners: { home: 0, away: 0 },
          fouls: { home: 0, away: 0 },
        }));

        setMatches(transformedMatches);
      } else {
        setMatches([]);
      }
    } catch (err) {
      console.error("Fetch error:", err);
      setDataSource("simulation");
      setMatches([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMatches();

    // Refresh every 30 seconds
    const interval = setInterval(() => {
      fetchMatches();
    }, 30000);

    return () => clearInterval(interval);
  }, [fetchMatches]);

  return { matches, isLoading, dataSource };
};
