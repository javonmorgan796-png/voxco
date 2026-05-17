import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { liveMatch, upcomingMatches, featuredMatches } from "@/data/footballData";

export interface ApiTeam {
  name: string;
  shortName: string;
  logo: string | null;
}

export interface ApiMatch {
  id: string;
  homeTeam: ApiTeam;
  awayTeam: ApiTeam;
  homeScore: number;
  awayScore: number;
  minute: string | null;
  status: "live" | "upcoming" | "finished";
  competition: {
    name: string;
    logo: string | null;
  };
  venue: string | null;
  startTime: string | null;
}

interface UseLiveMatchesResult {
  matches: ApiMatch[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  dataSource: "api" | "simulation";
}

// Helper to create short name from full name
const createShortName = (name: string): string => {
  if (name.length <= 10) return name;
  // Common abbreviations
  const words = name.split(" ");
  if (words.length > 1) {
    // Take first word if it's short, otherwise abbreviate
    return words[0].length <= 8 ? words[0] : name.substring(0, 8);
  }
  return name.substring(0, 10);
};

export const useLiveMatches = (
  options: { 
    endpoint?: "live" | "upcoming" | "finished" | "all";
    autoRefresh?: boolean;
    refreshInterval?: number;
  } = {}
): UseLiveMatchesResult => {
  const { 
    endpoint = "live", 
    autoRefresh = true,
    refreshInterval = 30000 // 30 seconds default
  } = options;

  const [matches, setMatches] = useState<ApiMatch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dataSource, setDataSource] = useState<"api" | "simulation">("api");

  const loadSimulation = useCallback(() => {
    const allLocal = [liveMatch, ...upcomingMatches, ...featuredMatches];
    const simulated: ApiMatch[] = allLocal.map((m) => ({
      id: m.id,
      homeTeam: { name: m.homeTeam.name, shortName: m.homeTeam.shortName, logo: m.homeTeam.logo },
      awayTeam: { name: m.awayTeam.name, shortName: m.awayTeam.shortName, logo: m.awayTeam.logo },
      homeScore: m.homeScore,
      awayScore: m.awayScore,
      minute: m.minute || null,
      status: m.status,
      competition: { name: m.competition.name, logo: m.competition.logo },
      venue: m.venue || null,
      startTime: null,
    }));
    const filtered = endpoint === "live" ? simulated.filter(s => s.status === "live")
      : endpoint === "upcoming" ? simulated.filter(s => s.status === "upcoming")
      : endpoint === "finished" ? simulated.filter(s => s.status === "finished")
      : simulated;
    setMatches(filtered);
    setDataSource("simulation");
    setError(null);
    setIsLoading(false);
  }, [endpoint]);

  const fetchMatches = useCallback(async () => {
    try {
      const { data, error: fetchError } = await supabase.functions.invoke("live-matches", {
        body: { endpoint, sport: "football" },
      });

      if (fetchError) {
        loadSimulation();
        return;
      }

      if (data?.useSimulation) {
        loadSimulation();
        return;
      }

      if (data?.matches && Array.isArray(data.matches)) {
        setDataSource("api");
        const transformedMatches: ApiMatch[] = data.matches.map((m: any) => ({
          id: m.id,
          homeTeam: {
            name: m.homeTeam?.name || "Home",
            shortName: createShortName(m.homeTeam?.name || "Home"),
            logo: m.homeTeam?.logo || null,
          },
          awayTeam: {
            name: m.awayTeam?.name || "Away",
            shortName: createShortName(m.awayTeam?.name || "Away"),
            logo: m.awayTeam?.logo || null,
          },
          homeScore: m.homeScore || 0,
          awayScore: m.awayScore || 0,
          minute: m.minute || null,
          status: m.status === "finished" ? "finished" : (m.status === "upcoming" ? "upcoming" : "live"),
          competition: {
            name: m.competition?.name || "Match",
            logo: m.competition?.logo || null,
          },
          venue: m.venue || null,
          startTime: m.startTime || null,
        }));

        if (transformedMatches.length === 0) {
          loadSimulation();
          return;
        }
        setMatches(transformedMatches);
        setError(null);
      } else {
        loadSimulation();
      }
    } catch (err) {
      loadSimulation();
    } finally {
      setIsLoading(false);
    }
  }, [endpoint, loadSimulation]);

  // Initial fetch
  useEffect(() => {
    fetchMatches();
  }, [fetchMatches]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchMatches();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, fetchMatches]);

  return {
    matches,
    isLoading,
    error,
    refetch: fetchMatches,
    dataSource,
  };
};
