import { useState, useEffect } from "react";
import { X, Trophy, Medal, TrendingUp, Crown, Star } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";

interface LeaderboardScreenProps {
  onClose: () => void;
}

interface LeaderboardEntry {
  user_id: string;
  username: string;
  display_name: string;
  total_bets: number;
  wins: number;
  losses: number;
  total_wagered: number;
  total_won: number;
  biggest_payout: number;
  win_rate: number;
}

// Mock leaderboard data for when DB is empty
const mockLeaderboard: LeaderboardEntry[] = [
  { user_id: "1", username: "GoalKing", display_name: "Goal King", total_bets: 145, wins: 98, losses: 47, total_wagered: 5200, total_won: 12400, biggest_payout: 1850, win_rate: 67.6 },
  { user_id: "2", username: "BetMaster", display_name: "Bet Master", total_bets: 210, wins: 134, losses: 76, total_wagered: 8900, total_won: 18200, biggest_payout: 3200, win_rate: 63.8 },
  { user_id: "3", username: "LuckyStrike", display_name: "Lucky Strike", total_bets: 89, wins: 55, losses: 34, total_wagered: 3100, total_won: 7600, biggest_payout: 2100, win_rate: 61.8 },
  { user_id: "4", username: "AcePredictor", display_name: "Ace Predictor", total_bets: 178, wins: 105, losses: 73, total_wagered: 6700, total_won: 13500, biggest_payout: 2800, win_rate: 59.0 },
  { user_id: "5", username: "FootyGenius", display_name: "Footy Genius", total_bets: 67, wins: 39, losses: 28, total_wagered: 2400, total_won: 5100, biggest_payout: 1200, win_rate: 58.2 },
  { user_id: "6", username: "SharpShooter", display_name: "Sharp Shooter", total_bets: 124, wins: 71, losses: 53, total_wagered: 4800, total_won: 9200, biggest_payout: 1650, win_rate: 57.3 },
  { user_id: "7", username: "BigWinner", display_name: "Big Winner", total_bets: 95, wins: 53, losses: 42, total_wagered: 3600, total_won: 7000, biggest_payout: 1400, win_rate: 55.8 },
  { user_id: "8", username: "ProTipper", display_name: "Pro Tipper", total_bets: 203, wins: 110, losses: 93, total_wagered: 7200, total_won: 12800, biggest_payout: 2500, win_rate: 54.2 },
  { user_id: "9", username: "ScoreProphet", display_name: "Score Prophet", total_bets: 56, wins: 30, losses: 26, total_wagered: 1900, total_won: 3800, biggest_payout: 900, win_rate: 53.6 },
  { user_id: "10", username: "PitchKing", display_name: "Pitch King", total_bets: 142, wins: 74, losses: 68, total_wagered: 5500, total_won: 9800, biggest_payout: 1950, win_rate: 52.1 },
];

type SortBy = "win_rate" | "total_won" | "biggest_payout";

const LeaderboardScreen = ({ onClose }: LeaderboardScreenProps) => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [sortBy, setSortBy] = useState<SortBy>("win_rate");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    try {
      const { data, error } = await supabase
        .from("leaderboard_stats")
        .select(`
          user_id,
          total_bets,
          wins,
          losses,
          total_wagered,
          total_won,
          biggest_payout
        `)
        .gt("total_bets", 0)
        .order("wins", { ascending: false })
        .limit(50);

      if (error) throw error;

      if (data && data.length > 0) {
        // Fetch profiles for usernames
        const userIds = data.map((d) => d.user_id);
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, username, display_name")
          .in("id", userIds);

        const profileMap = new Map(
          (profiles || []).map((p) => [p.id, p])
        );

        const entries: LeaderboardEntry[] = data.map((d) => {
          const profile = profileMap.get(d.user_id);
          return {
            ...d,
            username: profile?.username || "Unknown",
            display_name: profile?.display_name || "Unknown",
            win_rate: d.total_bets > 0 ? (d.wins / d.total_bets) * 100 : 0,
          };
        });
        setLeaderboard(entries);
      } else {
        // Use mock data when no real data
        setLeaderboard(mockLeaderboard);
      }
    } catch {
      setLeaderboard(mockLeaderboard);
    } finally {
      setLoading(false);
    }
  };

  const sorted = [...leaderboard].sort((a, b) => {
    if (sortBy === "win_rate") return b.win_rate - a.win_rate;
    if (sortBy === "total_won") return b.total_won - a.total_won;
    return b.biggest_payout - a.biggest_payout;
  });

  const getRankIcon = (index: number) => {
    if (index === 0) return <Crown className="w-6 h-6 text-yellow-400" />;
    if (index === 1) return <Medal className="w-6 h-6 text-gray-300" />;
    if (index === 2) return <Medal className="w-6 h-6 text-amber-600" />;
    return <span className="text-sm font-bold text-muted-foreground w-6 text-center">{index + 1}</span>;
  };

  const getRankBg = (index: number) => {
    if (index === 0) return "bg-yellow-500/10 border-yellow-500/30";
    if (index === 1) return "bg-gray-400/10 border-gray-400/30";
    if (index === 2) return "bg-amber-600/10 border-amber-600/30";
    return "";
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
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-lg border-b border-border/50 p-4">
        <div className="flex items-center justify-between">
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center"
          >
            <X className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="font-bold text-lg text-foreground flex items-center gap-2">
            <Trophy className="w-5 h-5 text-primary" />
            Leaderboard
          </h1>
          <div className="w-10" />
        </div>
      </div>

      {/* Sort Tabs */}
      <div className="px-4 pt-4 flex gap-2">
        {[
          { key: "win_rate" as SortBy, label: "Win Rate", icon: TrendingUp },
          { key: "total_won" as SortBy, label: "Total Won", icon: Trophy },
          { key: "biggest_payout" as SortBy, label: "Biggest Win", icon: Star },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setSortBy(tab.key)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
              sortBy === tab.key
                ? "gradient-crimson text-primary-foreground shadow-button"
                : "glass-card text-muted-foreground"
            }`}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Top 3 Podium */}
      {sorted.length >= 3 && (
        <div className="px-4 pt-6 pb-2">
          <div className="flex items-end justify-center gap-3">
            {/* 2nd place */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="flex-1 glass-card p-3 text-center border border-gray-400/20"
            >
              <div className="w-12 h-12 rounded-full bg-gray-400/20 mx-auto mb-2 flex items-center justify-center text-lg font-bold text-foreground">
                {sorted[1].display_name[0]}
              </div>
              <Medal className="w-5 h-5 text-gray-300 mx-auto mb-1" />
              <p className="text-xs font-semibold text-foreground truncate">{sorted[1].display_name}</p>
              <p className="text-xs text-primary font-bold">{sorted[1].win_rate.toFixed(1)}%</p>
              <p className="text-[10px] text-muted-foreground">${sorted[1].total_won.toLocaleString()}</p>
            </motion.div>

            {/* 1st place */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="flex-1 glass-card p-4 text-center border border-yellow-500/30 -mt-4"
            >
              <div className="w-14 h-14 rounded-full bg-yellow-500/20 mx-auto mb-2 flex items-center justify-center text-xl font-bold text-foreground">
                {sorted[0].display_name[0]}
              </div>
              <Crown className="w-6 h-6 text-yellow-400 mx-auto mb-1" />
              <p className="text-sm font-bold text-foreground truncate">{sorted[0].display_name}</p>
              <p className="text-sm text-primary font-bold">{sorted[0].win_rate.toFixed(1)}%</p>
              <p className="text-xs text-muted-foreground">${sorted[0].total_won.toLocaleString()}</p>
            </motion.div>

            {/* 3rd place */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex-1 glass-card p-3 text-center border border-amber-600/20"
            >
              <div className="w-12 h-12 rounded-full bg-amber-600/20 mx-auto mb-2 flex items-center justify-center text-lg font-bold text-foreground">
                {sorted[2].display_name[0]}
              </div>
              <Medal className="w-5 h-5 text-amber-600 mx-auto mb-1" />
              <p className="text-xs font-semibold text-foreground truncate">{sorted[2].display_name}</p>
              <p className="text-xs text-primary font-bold">{sorted[2].win_rate.toFixed(1)}%</p>
              <p className="text-[10px] text-muted-foreground">${sorted[2].total_won.toLocaleString()}</p>
            </motion.div>
          </div>
        </div>
      )}

      {/* Full List */}
      <div className="flex-1 overflow-y-auto px-4 pb-24 space-y-2 mt-4">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          sorted.map((entry, index) => (
            <motion.div
              key={entry.user_id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.03 }}
              className={`glass-card p-4 flex items-center gap-3 ${getRankBg(index)} ${index < 3 ? "border" : ""}`}
            >
              <div className="flex items-center justify-center w-8">
                {getRankIcon(index)}
              </div>

              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-foreground">
                {entry.display_name[0]}
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-foreground truncate">{entry.display_name}</p>
                <p className="text-xs text-muted-foreground">@{entry.username} · {entry.total_bets} bets</p>
              </div>

              <div className="text-right">
                <p className="text-sm font-bold text-primary">{entry.win_rate.toFixed(1)}%</p>
                <p className="text-[10px] text-muted-foreground">${entry.total_won.toLocaleString()}</p>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </motion.div>
  );
};

export default LeaderboardScreen;
