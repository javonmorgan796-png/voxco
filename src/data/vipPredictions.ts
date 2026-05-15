export interface VIPPrediction {
  id: string;
  homeTeam: string;
  awayTeam: string;
  league: string;
  kickoff: string; // ISO
  prediction: string; // e.g. "Home Win", "Over 2.5", "Both Teams to Score"
  odds: number;
  confidence: number; // 1-100
  analysis: string;
}

export interface VIPSection {
  id: "A" | "B" | "C" | "E";
  title: string;
  subtitle: string;
  accent: string; // tailwind text color class
  badge: string;
  predictions: VIPPrediction[];
}

const inDays = (d: number) => new Date(Date.now() + d * 24 * 60 * 60 * 1000).toISOString();

export const vipSections: VIPSection[] = [
  {
    id: "A",
    title: "Section A — Banker Picks",
    subtitle: "Highest confidence single picks",
    accent: "text-yellow-400",
    badge: "BANKER",
    predictions: [
      {
        id: "vip-a-1",
        homeTeam: "Manchester City",
        awayTeam: "Brighton",
        league: "English Premier League",
        kickoff: inDays(1),
        prediction: "Home Win",
        odds: 1.45,
        confidence: 92,
        analysis: "City unbeaten at home in 14, Brighton missing two key defenders.",
      },
      {
        id: "vip-a-2",
        homeTeam: "Real Madrid",
        awayTeam: "Getafe",
        league: "Spanish La Liga",
        kickoff: inDays(2),
        prediction: "Home Win & Over 1.5",
        odds: 1.55,
        confidence: 89,
        analysis: "Madrid scored 2+ in last 9 home games. Getafe poor away form.",
      },
    ],
  },
  {
    id: "B",
    title: "Section B — Value Doubles",
    subtitle: "Two-leg accumulators with strong edge",
    accent: "text-emerald-400",
    badge: "VALUE",
    predictions: [
      {
        id: "vip-b-1",
        homeTeam: "Bayern Munich",
        awayTeam: "Wolfsburg",
        league: "German Bundesliga",
        kickoff: inDays(1),
        prediction: "Over 2.5 Goals",
        odds: 1.50,
        confidence: 84,
        analysis: "Bayern averaging 3.1 goals at home. Wolfsburg leak goals away.",
      },
      {
        id: "vip-b-2",
        homeTeam: "Inter Milan",
        awayTeam: "Lazio",
        league: "Italian Serie A",
        kickoff: inDays(2),
        prediction: "Both Teams to Score",
        odds: 1.70,
        confidence: 81,
        analysis: "BTTS landed in 7 of last 8 between these sides.",
      },
    ],
  },
  {
    id: "C",
    title: "Section C — Combo Specials",
    subtitle: "Higher-odds combined picks",
    accent: "text-sky-400",
    badge: "COMBO",
    predictions: [
      {
        id: "vip-c-1",
        homeTeam: "PSG",
        awayTeam: "Lyon",
        league: "French Ligue 1",
        kickoff: inDays(3),
        prediction: "Home Win & BTTS",
        odds: 2.40,
        confidence: 76,
        analysis: "Lyon scoring consistently away, but PSG firepower decisive.",
      },
      {
        id: "vip-c-2",
        homeTeam: "Liverpool",
        awayTeam: "Arsenal",
        league: "English Premier League",
        kickoff: inDays(3),
        prediction: "Over 2.5 & BTTS",
        odds: 2.10,
        confidence: 79,
        analysis: "Both teams averaging 2+ goals. Defensive injuries on both sides.",
      },
    ],
  },
  {
    id: "E",
    title: "Section E — Long Shots",
    subtitle: "High-odds, high-reward predictions",
    accent: "text-fuchsia-400",
    badge: "JACKPOT",
    predictions: [
      {
        id: "vip-e-1",
        homeTeam: "Atletico Madrid",
        awayTeam: "Sevilla",
        league: "Spanish La Liga",
        kickoff: inDays(2),
        prediction: "Correct Score 2-1",
        odds: 8.50,
        confidence: 62,
        analysis: "Atletico tight at home. Sevilla usually score one.",
      },
      {
        id: "vip-e-2",
        homeTeam: "Borussia Dortmund",
        awayTeam: "RB Leipzig",
        league: "German Bundesliga",
        kickoff: inDays(4),
        prediction: "First Half Over 1.5",
        odds: 3.20,
        confidence: 68,
        analysis: "Both teams press high in opening 20 mins. Average 1.4 first-half goals.",
      },
    ],
  },
];
