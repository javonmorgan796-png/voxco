import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface FlashscoreMatch {
  id: string;
  homeTeam: {
    name: string;
    logo?: string | null;
  };
  awayTeam: {
    name: string;
    logo?: string | null;
  };
  homeScore: number;
  awayScore: number;
  minute?: string | null;
  status: string;
  competition?: {
    name: string;
    logo?: string | null;
  };
  venue?: string | null;
  startTime?: string | null;
}

interface EspnCompetitionStatus {
  type?: {
    completed?: boolean;
    state?: string;
    description?: string;
    detail?: string;
    shortDetail?: string;
  };
}

interface EspnCompetitor {
  homeAway?: "home" | "away";
  team?: {
    displayName?: string;
    shortDisplayName?: string;
    logo?: string;
    logos?: Array<{ href?: string }>;
  };
  score?: string;
}

interface EspnEvent {
  id?: string;
  date?: string;
  competitions?: Array<{
    status?: EspnCompetitionStatus;
    venue?: {
      fullName?: string;
    };
    competitors?: EspnCompetitor[];
  }>;
  leagues?: Array<{
    name?: string;
    logos?: Array<{ href?: string }>;
  }>;
  status?: EspnCompetitionStatus;
  shortName?: string;
  name?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { endpoint = "live", sport = "football" } = await req.json().catch(() => ({}));
    
    console.log(`Fetching ${endpoint} matches for ${sport}...`);

    if (sport !== "football") {
      return new Response(
        JSON.stringify({ error: "Only football is supported right now", useSimulation: true }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Priority leagues: Premier League, La Liga, Serie A, Bundesliga, UEFA Champions League
    const PRIORITY_LEAGUES = [
      { slug: "eng.1", name: "English Premier League" },
      { slug: "esp.1", name: "Spanish La Liga" },
      { slug: "ita.1", name: "Italian Serie A" },
      { slug: "ger.1", name: "German Bundesliga" },
      { slug: "fra.1", name: "French Ligue 1" },
      { slug: "uefa.champions", name: "UEFA Champions League" },
    ];

    // Fetch priority leagues in parallel + the global "all" feed for coverage
    const fetchUrl = (slug: string) =>
      `https://site.api.espn.com/apis/site/v2/sports/soccer/${slug}/scoreboard`;

    const allUrls = [
      ...PRIORITY_LEAGUES.map((l) => fetchUrl(l.slug)),
      "https://site.api.espn.com/apis/site/v2/sports/soccer/all/scoreboard",
    ];

    console.log(`Fetching ${allUrls.length} ESPN feeds (priority leagues + global)`);

    // Track each event's source league so we can tag competition.name correctly
    // (ESPN returns `leagues` at the response top-level, NOT per-event).
    const labeledFeeds: Array<{ leagueName: string | null; leagueLogo: string | null }> = [
      ...PRIORITY_LEAGUES.map((l) => ({ leagueName: l.name, leagueLogo: null as string | null })),
      { leagueName: null, leagueLogo: null }, // global "all" feed — fall back to response leagues[]
    ];

    const responses = await Promise.allSettled(
      allUrls.map((url) =>
        fetch(url, { method: "GET", headers: { "Content-Type": "application/json" } })
      )
    );

    const allEvents: EspnEvent[] = [];
    for (let i = 0; i < responses.length; i++) {
      const r = responses[i];
      const label = labeledFeeds[i];
      if (r.status === "fulfilled" && r.value.ok) {
        try {
          const data = await r.value.json();
          // Top-level league info from this feed's response
          const topLeague = Array.isArray(data?.leagues) ? data.leagues[0] : null;
          const feedLeagueName = label.leagueName || topLeague?.name || null;
          const feedLeagueLogo = topLeague?.logos?.[0]?.href || null;

          if (Array.isArray(data?.events)) {
            for (const ev of data.events) {
              // Inject league info onto each event so transformer can use it
              if (feedLeagueName) {
                ev.leagues = [{ name: feedLeagueName, logos: feedLeagueLogo ? [{ href: feedLeagueLogo }] : undefined }];
              }
              allEvents.push(ev);
            }
          }
        } catch (e) {
          console.error("Failed to parse a feed", e);
        }
      }
    }

    if (allEvents.length === 0) {
      console.error("All ESPN feeds failed or empty");
      return new Response(
        JSON.stringify({
          error: "All API feeds unavailable",
          useSimulation: true,
          message: "Using simulation mode - API unavailable",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Aggregated ${allEvents.length} total events from feeds`);

    // De-dupe by id, then transform
    const seen = new Set<string>();
    const uniqueEvents = allEvents.filter((e) => {
      const id = e.id || "";
      if (!id || seen.has(id)) return false;
      seen.add(id);
      return true;
    });

    const matches = transformApiData({ events: uniqueEvents }, endpoint);

    // Sort: priority leagues first, then by start time
    const priorityRank = (name?: string): number => {
      if (!name) return 99;
      const n = name.toLowerCase();
      if (n.includes("premier league") || n.includes("english premier")) return 0;
      if (n.includes("la liga") || n.includes("laliga") || n.includes("spanish primera")) return 1;
      if (n.includes("serie a") && !n.includes("brasil")) return 2;
      if (n.includes("bundesliga") && !n.includes("2.")) return 3;
      if (n.includes("champions league") || n.includes("uefa champions")) return 4;
      return 50;
    };

    matches.sort((a, b) => {
      const ra = priorityRank(a.competition?.name);
      const rb = priorityRank(b.competition?.name);
      if (ra !== rb) return ra - rb;
      const ta = a.startTime ? new Date(a.startTime).getTime() : 0;
      const tb = b.startTime ? new Date(b.startTime).getTime() : 0;
      return ta - tb;
    });

    console.log(`Returning ${matches.length} ${endpoint} matches (priority sorted)`);

    return new Response(
      JSON.stringify({
        matches,
        useSimulation: false,
        source: "espn-multi-league",
        timestamp: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error fetching live matches:", error);
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error",
        useSimulation: true,
        message: "Using simulation mode due to error"
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

// Transform sportdb.dev API data to our app format
function transformApiData(apiData: any, endpoint: string = "live"): FlashscoreMatch[] {
  if (!apiData) {
    console.log("No data received from API");
    return [];
  }

  const matches = Array.isArray(apiData?.events) ? apiData.events : [];
  
  if (!Array.isArray(matches)) {
    console.log("Data is not an array");
    return [];
  }

  const transformedMatches = matches
    .map((match: EspnEvent) => transformEspnMatch(match))
    .filter((match): match is FlashscoreMatch => Boolean(match));

  const filteredMatches = transformedMatches.filter((match) => {
    if (endpoint === "live") return match.status === "live";
    if (endpoint === "upcoming") return match.status === "upcoming";
    if (endpoint === "finished") return match.status === "finished";
    return match.status !== "finished";
  });

  console.log(`Found ${filteredMatches.length} ${endpoint} matches out of ${transformedMatches.length} total`);

  return filteredMatches;
}

function transformEspnMatch(match: EspnEvent): FlashscoreMatch | null {
  const competition = match.competitions?.[0];
  const competitors = competition?.competitors || [];
  const home = competitors.find((team) => team.homeAway === "home");
  const away = competitors.find((team) => team.homeAway === "away");

  if (!home?.team?.displayName || !away?.team?.displayName) {
    return null;
  }

  const statusInfo = competition?.status?.type || match.status?.type;
  const status = mapEspnStatus(statusInfo);

  return {
    id: match.id || crypto.randomUUID(),
    homeTeam: {
      name: home.team.displayName,
      logo: home.team.logo || home.team.logos?.[0]?.href || null,
    },
    awayTeam: {
      name: away.team.displayName,
      logo: away.team.logo || away.team.logos?.[0]?.href || null,
    },
    homeScore: parseInt(home.score || "0") || 0,
    awayScore: parseInt(away.score || "0") || 0,
    minute: status.minute,
    status: status.state,
    competition: {
      name: match.leagues?.[0]?.name || inferCompetitionName(match.shortName || match.name || "Match"),
      logo: match.leagues?.[0]?.logos?.[0]?.href || null,
    },
    venue: competition?.venue?.fullName || null,
    startTime: competition?.date || match.date || null,
  };
}

function mapEspnStatus(status?: EspnCompetitionStatus["type"]): {
  state: "live" | "upcoming" | "finished";
  minute: string | null;
} {
  const description = status?.description?.toLowerCase() || "";
  const detail = status?.shortDetail || status?.detail || null;
  const state = status?.state?.toLowerCase() || "";
  const completed = Boolean(status?.completed);

  if (completed || state === "post" || description.includes("final")) {
    return { state: "finished", minute: "FT" };
  }

  if (state === "in" || description.includes("half") || description.includes("extra time") || description.includes("penalties")) {
    return { state: "live", minute: detail || "LIVE" };
  }

  return { state: "upcoming", minute: null };
}

function inferCompetitionName(matchName: string): string {
  if (!matchName) return "Match";
  return "Football Match";
}
