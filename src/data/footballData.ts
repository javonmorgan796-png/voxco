// Real football team data with official logos from public CDNs
export interface Team {
  id: string;
  name: string;
  shortName: string;
  logo: string;
  country: string;
  primaryColor: string;
}

export interface Match {
  id: string;
  competition: Competition;
  homeTeam: Team;
  awayTeam: Team;
  homeScore: number;
  awayScore: number;
  status: "live" | "upcoming" | "finished";
  minute?: string;
  date: string;
  time: string;
  venue?: string;
  odds?: {
    home: number;
    draw: number;
    away: number;
  };
}

export interface Competition {
  id: string;
  name: string;
  logo: string | null;
  country: string;
}

// Real team logos from public sources
export const teams: Record<string, Team> = {
  barcelona: {
    id: "barcelona",
    name: "FC Barcelona",
    shortName: "Barcelona",
    logo: "https://upload.wikimedia.org/wikipedia/en/thumb/4/47/FC_Barcelona_%28crest%29.svg/180px-FC_Barcelona_%28crest%29.svg.png",
    country: "Spain",
    primaryColor: "#A50044",
  },
  chelsea: {
    id: "chelsea",
    name: "Chelsea FC",
    shortName: "Chelsea",
    logo: "https://upload.wikimedia.org/wikipedia/en/thumb/c/cc/Chelsea_FC.svg/180px-Chelsea_FC.svg.png",
    country: "England",
    primaryColor: "#034694",
  },
  manchester_united: {
    id: "manchester_united",
    name: "Manchester United",
    shortName: "Man United",
    logo: "https://upload.wikimedia.org/wikipedia/en/thumb/7/7a/Manchester_United_FC_crest.svg/180px-Manchester_United_FC_crest.svg.png",
    country: "England",
    primaryColor: "#DA291C",
  },
  real_madrid: {
    id: "real_madrid",
    name: "Real Madrid CF",
    shortName: "Real Madrid",
    logo: "https://upload.wikimedia.org/wikipedia/en/thumb/5/56/Real_Madrid_CF.svg/180px-Real_Madrid_CF.svg.png",
    country: "Spain",
    primaryColor: "#FFFFFF",
  },
  liverpool: {
    id: "liverpool",
    name: "Liverpool FC",
    shortName: "Liverpool",
    logo: "https://upload.wikimedia.org/wikipedia/en/thumb/0/0c/Liverpool_FC.svg/180px-Liverpool_FC.svg.png",
    country: "England",
    primaryColor: "#C8102E",
  },
  arsenal: {
    id: "arsenal",
    name: "Arsenal FC",
    shortName: "Arsenal",
    logo: "https://upload.wikimedia.org/wikipedia/en/thumb/5/53/Arsenal_FC.svg/180px-Arsenal_FC.svg.png",
    country: "England",
    primaryColor: "#EF0107",
  },
  borussia_dortmund: {
    id: "borussia_dortmund",
    name: "Borussia Dortmund",
    shortName: "Dortmund",
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/67/Borussia_Dortmund_logo.svg/180px-Borussia_Dortmund_logo.svg.png",
    country: "Germany",
    primaryColor: "#FDE100",
  },
  bayern_munich: {
    id: "bayern_munich",
    name: "Bayern Munich",
    shortName: "Bayern",
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1b/FC_Bayern_M%C3%BCnchen_logo_%282017%29.svg/180px-FC_Bayern_M%C3%BCnchen_logo_%282017%29.svg.png",
    country: "Germany",
    primaryColor: "#DC052D",
  },
  psg: {
    id: "psg",
    name: "Paris Saint-Germain",
    shortName: "PSG",
    logo: "https://upload.wikimedia.org/wikipedia/en/thumb/a/a7/Paris_Saint-Germain_F.C..svg/180px-Paris_Saint-Germain_F.C..svg.png",
    country: "France",
    primaryColor: "#004170",
  },
  juventus: {
    id: "juventus",
    name: "Juventus FC",
    shortName: "Juventus",
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/bc/Juventus_FC_2017_icon_%28black%29.svg/180px-Juventus_FC_2017_icon_%28black%29.svg.png",
    country: "Italy",
    primaryColor: "#000000",
  },
  inter_milan: {
    id: "inter_milan",
    name: "Inter Milan",
    shortName: "Inter",
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/05/FC_Internazionale_Milano_2021.svg/180px-FC_Internazionale_Milano_2021.svg.png",
    country: "Italy",
    primaryColor: "#0068A8",
  },
  ac_milan: {
    id: "ac_milan",
    name: "AC Milan",
    shortName: "Milan",
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d0/Logo_of_AC_Milan.svg/180px-Logo_of_AC_Milan.svg.png",
    country: "Italy",
    primaryColor: "#FB090B",
  },
  manchester_city: {
    id: "manchester_city",
    name: "Manchester City",
    shortName: "Man City",
    logo: "https://upload.wikimedia.org/wikipedia/en/thumb/e/eb/Manchester_City_FC_badge.svg/180px-Manchester_City_FC_badge.svg.png",
    country: "England",
    primaryColor: "#6CABDD",
  },
  atletico_madrid: {
    id: "atletico_madrid",
    name: "Atlético Madrid",
    shortName: "Atlético",
    logo: "https://upload.wikimedia.org/wikipedia/en/thumb/f/f4/Atletico_Madrid_2017_logo.svg/180px-Atletico_Madrid_2017_logo.svg.png",
    country: "Spain",
    primaryColor: "#CB3524",
  },
  tottenham: {
    id: "tottenham",
    name: "Tottenham Hotspur",
    shortName: "Tottenham",
    logo: "https://upload.wikimedia.org/wikipedia/en/thumb/b/b4/Tottenham_Hotspur.svg/180px-Tottenham_Hotspur.svg.png",
    country: "England",
    primaryColor: "#132257",
  },
  napoli: {
    id: "napoli",
    name: "SSC Napoli",
    shortName: "Napoli",
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2d/SSC_Napoli_%282024%29.svg/180px-SSC_Napoli_%282024%29.svg.png",
    country: "Italy",
    primaryColor: "#12A0D7",
  },
};

// Competition logos
export const competitions: Record<string, Competition> = {
  ucl: {
    id: "ucl",
    name: "UEFA Champions League",
    logo: "https://upload.wikimedia.org/wikipedia/en/thumb/b/bf/UEFA_Champions_League_logo_2.svg/200px-UEFA_Champions_League_logo_2.svg.png",
    country: "Europe",
  },
  premier_league: {
    id: "premier_league",
    name: "Premier League",
    logo: "https://upload.wikimedia.org/wikipedia/en/thumb/f/f2/Premier_League_Logo.svg/200px-Premier_League_Logo.svg.png",
    country: "England",
  },
  la_liga: {
    id: "la_liga",
    name: "La Liga",
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/54/LaLiga_EA_Sports_2023_Vertical_Logo.svg/150px-LaLiga_EA_Sports_2023_Vertical_Logo.svg.png",
    country: "Spain",
  },
  serie_a: {
    id: "serie_a",
    name: "Serie A",
    logo: "https://upload.wikimedia.org/wikipedia/en/thumb/e/e1/Serie_A_logo_%282019%29.svg/150px-Serie_A_logo_%282019%29.svg.png",
    country: "Italy",
  },
  bundesliga: {
    id: "bundesliga",
    name: "Bundesliga",
    logo: "https://upload.wikimedia.org/wikipedia/en/thumb/d/df/Bundesliga_logo_%282017%29.svg/200px-Bundesliga_logo_%282017%29.svg.png",
    country: "Germany",
  },
  europa_league: {
    id: "europa_league",
    name: "UEFA Europa League",
    logo: "https://upload.wikimedia.org/wikipedia/en/thumb/0/03/Europa_League.svg/200px-Europa_League.svg.png",
    country: "Europe",
  },
};

// Current live match
export const liveMatch: Match = {
  id: "live-1",
  competition: competitions.ucl,
  homeTeam: teams.barcelona,
  awayTeam: teams.chelsea,
  homeScore: 2,
  awayScore: 3,
  status: "live",
  minute: "90+7",
  date: "Today",
  time: "21:00",
  venue: "Camp Nou",
  odds: {
    home: 3.74,
    draw: 4.85,
    away: 2.45,
  },
};

// Upcoming matches
export const upcomingMatches: Match[] = [
  {
    id: "upcoming-1",
    competition: competitions.ucl,
    homeTeam: teams.borussia_dortmund,
    awayTeam: teams.manchester_united,
    homeScore: 0,
    awayScore: 0,
    status: "upcoming",
    date: "16 April",
    time: "20:00",
    venue: "Signal Iduna Park",
    odds: {
      home: 2.15,
      draw: 3.40,
      away: 3.20,
    },
  },
  {
    id: "upcoming-2",
    competition: competitions.ucl,
    homeTeam: teams.real_madrid,
    awayTeam: teams.liverpool,
    homeScore: 0,
    awayScore: 0,
    status: "upcoming",
    date: "16 April",
    time: "20:00",
    venue: "Santiago Bernabéu",
    odds: {
      home: 2.10,
      draw: 3.50,
      away: 3.30,
    },
  },
  {
    id: "upcoming-3",
    competition: competitions.ucl,
    homeTeam: teams.psg,
    awayTeam: teams.bayern_munich,
    homeScore: 0,
    awayScore: 0,
    status: "upcoming",
    date: "17 April",
    time: "21:00",
    venue: "Parc des Princes",
    odds: {
      home: 2.60,
      draw: 3.40,
      away: 2.70,
    },
  },
  {
    id: "upcoming-4",
    competition: competitions.ucl,
    homeTeam: teams.arsenal,
    awayTeam: teams.inter_milan,
    homeScore: 0,
    awayScore: 0,
    status: "upcoming",
    date: "17 April",
    time: "21:00",
    venue: "Emirates Stadium",
    odds: {
      home: 1.95,
      draw: 3.60,
      away: 3.80,
    },
  },
];

// Featured matches for different competitions
export const featuredMatches: Match[] = [
  {
    id: "featured-1",
    competition: competitions.premier_league,
    homeTeam: teams.manchester_city,
    awayTeam: teams.arsenal,
    homeScore: 0,
    awayScore: 0,
    status: "upcoming",
    date: "20 April",
    time: "16:30",
    venue: "Etihad Stadium",
    odds: {
      home: 1.75,
      draw: 4.00,
      away: 4.20,
    },
  },
  {
    id: "featured-2",
    competition: competitions.la_liga,
    homeTeam: teams.barcelona,
    awayTeam: teams.real_madrid,
    homeScore: 0,
    awayScore: 0,
    status: "upcoming",
    date: "21 April",
    time: "21:00",
    venue: "Camp Nou",
    odds: {
      home: 2.20,
      draw: 3.40,
      away: 3.10,
    },
  },
  {
    id: "featured-3",
    competition: competitions.serie_a,
    homeTeam: teams.inter_milan,
    awayTeam: teams.ac_milan,
    homeScore: 0,
    awayScore: 0,
    status: "upcoming",
    date: "22 April",
    time: "20:45",
    venue: "San Siro",
    odds: {
      home: 1.90,
      draw: 3.50,
      away: 4.00,
    },
  },
];

// Sport categories with icons
export const sportCategories = [
  { id: "football", label: "Football", icon: "⚽", matchCount: 24 },
  { id: "tennis", label: "Tennis", icon: "🎾", matchCount: 12 },
  { id: "basketball", label: "Basketball", icon: "🏀", matchCount: 8 },
  { id: "cricket", label: "Cricket", icon: "🏏", matchCount: 6 },
  { id: "baseball", label: "Baseball", icon: "⚾", matchCount: 4 },
];
