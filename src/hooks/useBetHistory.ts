import { useState, useEffect } from "react";
import { ApiMatch } from "./useLiveMatches";

export interface PlacedBet {
  id: string;
  matchId: string;
  homeTeam: string;
  awayTeam: string;
 homeTeamLogo?: string | null;
 awayTeamLogo?: string | null;
  competition: string;
  selection: "home" | "draw" | "away";
  odds: number;
  stake: number;
  potentialWin: number;
  status: "pending" | "won" | "lost";
  placedAt: string;
  matchStartTime: string;
  result?: {
    homeScore: number;
    awayScore: number;
  };
}

export interface BetTicket {
  id: string;
  bets: PlacedBet[];
  totalStake: number;
  totalPotentialWin: number;
  status: "pending" | "won" | "lost" | "partial";
  placedAt: string;
  isAccumulator?: boolean;
  accumulatorOdds?: number;
}

const BET_HISTORY_KEY = "bet_history";
const BET_TICKETS_KEY = "bet_tickets";

export const useBetHistory = () => {
  const [bets, setBets] = useState<PlacedBet[]>([]);
  const [tickets, setTickets] = useState<BetTicket[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem(BET_HISTORY_KEY);
    if (stored) {
      try { setBets(JSON.parse(stored)); } catch { setBets([]); }
    }
    const storedTickets = localStorage.getItem(BET_TICKETS_KEY);
    if (storedTickets) {
      try { setTickets(JSON.parse(storedTickets)); } catch { setTickets([]); }
    }
  }, []);

  const saveBets = (newBets: PlacedBet[]) => {
    setBets(newBets);
    localStorage.setItem(BET_HISTORY_KEY, JSON.stringify(newBets));
  };

  const saveTickets = (newTickets: BetTicket[]) => {
    setTickets(newTickets);
    localStorage.setItem(BET_TICKETS_KEY, JSON.stringify(newTickets));
  };

  const placeBet = (
    match: ApiMatch,
    selection: "home" | "draw" | "away",
    odds: number,
    stake: number
  ): PlacedBet => {
    const newBet: PlacedBet = {
      id: `bet_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      matchId: match.id,
      homeTeam: match.homeTeam.name,
      awayTeam: match.awayTeam.name,
      homeTeamLogo: match.homeTeam.logo,
      awayTeamLogo: match.awayTeam.logo,
      competition: match.competition.name,
      selection,
      odds,
      stake,
      potentialWin: stake * odds,
      status: "pending",
      placedAt: new Date().toISOString(),
      matchStartTime: match.startTime || "",
    };

    const stored = localStorage.getItem(BET_HISTORY_KEY);
    let currentBets: PlacedBet[] = [];
    try { currentBets = stored ? JSON.parse(stored) : []; } catch { currentBets = []; }
    const updatedBets = [newBet, ...currentBets];
    setBets(updatedBets);
    localStorage.setItem(BET_HISTORY_KEY, JSON.stringify(updatedBets));
    return newBet;
  };

  const placeBetSlip = (
    slipBets: Array<{
      match: ApiMatch;
      selection: "home" | "draw" | "away";
      odds: number;
      stake: number;
    }>
  ): BetTicket => {
    const now = new Date().toISOString();
    const placedBets: PlacedBet[] = slipBets.map((slip) => ({
      id: `bet_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      matchId: slip.match.id,
      homeTeam: slip.match.homeTeam.name,
      awayTeam: slip.match.awayTeam.name,
      homeTeamLogo: slip.match.homeTeam.logo,
      awayTeamLogo: slip.match.awayTeam.logo,
      competition: slip.match.competition.name,
      selection: slip.selection,
      odds: slip.odds,
      stake: slip.stake,
      potentialWin: slip.stake * slip.odds,
      status: "pending" as const,
      placedAt: now,
      matchStartTime: slip.match.startTime || "",
    }));

    const ticket: BetTicket = {
      id: `ticket_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      bets: placedBets,
      totalStake: placedBets.reduce((acc, b) => acc + b.stake, 0),
      totalPotentialWin: placedBets.reduce((acc, b) => acc + b.potentialWin, 0),
      status: "pending",
      placedAt: now,
    };

    // Save ticket
    const storedTickets = localStorage.getItem(BET_TICKETS_KEY);
    let currentTickets: BetTicket[] = [];
    try { currentTickets = storedTickets ? JSON.parse(storedTickets) : []; } catch { currentTickets = []; }
    const updatedTickets = [ticket, ...currentTickets];
    setTickets(updatedTickets);
    localStorage.setItem(BET_TICKETS_KEY, JSON.stringify(updatedTickets));

    // Also save individual bets
    const storedBets = localStorage.getItem(BET_HISTORY_KEY);
    let currentBets: PlacedBet[] = [];
    try { currentBets = storedBets ? JSON.parse(storedBets) : []; } catch { currentBets = []; }
    const updatedBets = [...placedBets, ...currentBets];
    setBets(updatedBets);
    localStorage.setItem(BET_HISTORY_KEY, JSON.stringify(updatedBets));

    return ticket;
  };

  const placeBetAccumulator = (
    slipBets: Array<{
      match: ApiMatch;
      selection: "home" | "draw" | "away";
      odds: number;
    }>,
    totalStake: number
  ): BetTicket => {
    const now = new Date().toISOString();
    const accumulatorOdds = slipBets.reduce((acc, b) => acc * b.odds, 1);
    const totalPotentialWin = totalStake * accumulatorOdds;

    const placedBets: PlacedBet[] = slipBets.map((slip) => ({
      id: `bet_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      matchId: slip.match.id,
      homeTeam: slip.match.homeTeam.name,
      awayTeam: slip.match.awayTeam.name,
      homeTeamLogo: slip.match.homeTeam.logo,
      awayTeamLogo: slip.match.awayTeam.logo,
      competition: slip.match.competition.name,
      selection: slip.selection,
      odds: slip.odds,
      stake: totalStake / slipBets.length,
      potentialWin: totalPotentialWin / slipBets.length,
      status: "pending" as const,
      placedAt: now,
      matchStartTime: slip.match.startTime || "",
    }));

    const ticket: BetTicket = {
      id: `ticket_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      bets: placedBets,
      totalStake,
      totalPotentialWin: Math.round(totalPotentialWin * 100) / 100,
      status: "pending",
      placedAt: now,
      isAccumulator: true,
      accumulatorOdds: Math.round(accumulatorOdds * 100) / 100,
    };

    const storedTickets = localStorage.getItem(BET_TICKETS_KEY);
    let currentTickets: BetTicket[] = [];
    try { currentTickets = storedTickets ? JSON.parse(storedTickets) : []; } catch { currentTickets = []; }
    const updatedTickets = [ticket, ...currentTickets];
    setTickets(updatedTickets);
    localStorage.setItem(BET_TICKETS_KEY, JSON.stringify(updatedTickets));

    const storedBets = localStorage.getItem(BET_HISTORY_KEY);
    let currentBets: PlacedBet[] = [];
    try { currentBets = storedBets ? JSON.parse(storedBets) : []; } catch { currentBets = []; }
    const updatedBets = [...placedBets, ...currentBets];
    setBets(updatedBets);
    localStorage.setItem(BET_HISTORY_KEY, JSON.stringify(updatedBets));

    return ticket;
  };

  const updateBetResult = (
    betId: string,
    homeScore: number,
    awayScore: number
  ) => {
    const updatedBets = bets.map((bet) => {
      if (bet.id !== betId) return bet;
      let won = false;
      if (bet.selection === "home" && homeScore > awayScore) won = true;
      if (bet.selection === "away" && awayScore > homeScore) won = true;
      if (bet.selection === "draw" && homeScore === awayScore) won = true;
      return {
        ...bet,
        status: won ? ("won" as const) : ("lost" as const),
        result: { homeScore, awayScore },
      };
    });
    saveBets(updatedBets);
  };

  const clearHistory = () => {
    saveBets([]);
    saveTickets([]);
  };

  const cashOutBet = (betId: string, cashOutPercentage: number = 0.7) => {
    const stored = localStorage.getItem(BET_HISTORY_KEY);
    let currentBets: PlacedBet[] = [];
    try { currentBets = stored ? JSON.parse(stored) : []; } catch { currentBets = []; }
    
    const updatedBets = currentBets.map((bet) => {
      if (bet.id !== betId || bet.status !== "pending") return bet;
      const cashOutAmount = Math.round(bet.potentialWin * cashOutPercentage * 100) / 100;
      return {
        ...bet,
        status: "won" as const,
        potentialWin: cashOutAmount,
        result: { homeScore: 0, awayScore: 0 },
      };
    });
    saveBets(updatedBets);
    return updatedBets.find(b => b.id === betId);
  };

  const cashOutTicket = (ticketId: string, cashOutPercentage: number = 0.7) => {
    const storedTickets = localStorage.getItem(BET_TICKETS_KEY);
    let currentTickets: BetTicket[] = [];
    try { currentTickets = storedTickets ? JSON.parse(storedTickets) : []; } catch { currentTickets = []; }
    
    const updatedTickets = currentTickets.map((ticket) => {
      if (ticket.id !== ticketId || ticket.status !== "pending") return ticket;
      const cashOutAmount = Math.round(ticket.totalPotentialWin * cashOutPercentage * 100) / 100;
      return {
        ...ticket,
        status: "won" as const,
        totalPotentialWin: cashOutAmount,
        bets: ticket.bets.map(b => ({ ...b, status: "won" as const })),
      };
    });
    saveTickets(updatedTickets);

    // Also update individual bets
    const ticket = currentTickets.find(t => t.id === ticketId);
    if (ticket) {
      const betIds = new Set(ticket.bets.map(b => b.id));
      const stored = localStorage.getItem(BET_HISTORY_KEY);
      let currentBets: PlacedBet[] = [];
      try { currentBets = stored ? JSON.parse(stored) : []; } catch { currentBets = []; }
      const updatedBets = currentBets.map(b => 
        betIds.has(b.id) ? { ...b, status: "won" as const } : b
      );
      saveBets(updatedBets);
    }

    return updatedTickets.find(t => t.id === ticketId);
  };

  const getCashOutValue = (potentialWin: number, percentage: number = 0.7) => {
    return Math.round(potentialWin * percentage * 100) / 100;
  };

  const getPendingBets = () => bets.filter((b) => b.status === "pending");
  const getSettledBets = () => bets.filter((b) => b.status !== "pending");
  const getWonBets = () => bets.filter((b) => b.status === "won");
  const getLostBets = () => bets.filter((b) => b.status === "lost");

  const getTotalWinnings = () =>
    bets.filter((b) => b.status === "won").reduce((acc, b) => acc + b.potentialWin, 0);

  const getTotalLosses = () =>
    bets.filter((b) => b.status === "lost").reduce((acc, b) => acc + b.stake, 0);

  return {
    bets,
    tickets,
    placeBet,
    placeBetSlip,
    placeBetAccumulator,
    updateBetResult,
    clearHistory,
    cashOutBet,
    cashOutTicket,
    getCashOutValue,
    getPendingBets,
    getSettledBets,
    getWonBets,
    getLostBets,
    getTotalWinnings,
    getTotalLosses,
  };
};
