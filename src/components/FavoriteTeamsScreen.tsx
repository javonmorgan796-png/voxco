import { useState, useMemo } from "react";
import { X, Heart, Search, Plus, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useFavoriteTeams, FavoriteTeam } from "@/hooks/useFavoriteTeams";
import { useLiveMatches, ApiMatch } from "@/hooks/useLiveMatches";
import TeamLogo from "./TeamLogo";

interface FavoriteTeamsScreenProps {
  onClose: () => void;
  onSelectMatch?: (match: ApiMatch) => void;
}

const FavoriteTeamsScreen = ({ onClose, onSelectMatch }: FavoriteTeamsScreenProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddTeam, setShowAddTeam] = useState(false);
  const { favoriteTeams, removeFavoriteTeam, addFavoriteTeam } = useFavoriteTeams();
  
  const { matches } = useLiveMatches({
    endpoint: "all",
    autoRefresh: false,
  });

  // Get unique teams from matches
  const availableTeams = useMemo(() => {
    const teamMap = new Map<string, { name: string; shortName: string; logo?: string }>();
    
    matches.forEach((match) => {
      if (!teamMap.has(match.homeTeam.name)) {
        teamMap.set(match.homeTeam.name, {
          name: match.homeTeam.name,
          shortName: match.homeTeam.shortName,
          logo: match.homeTeam.logo,
        });
      }
      if (!teamMap.has(match.awayTeam.name)) {
        teamMap.set(match.awayTeam.name, {
          name: match.awayTeam.name,
          shortName: match.awayTeam.shortName,
          logo: match.awayTeam.logo,
        });
      }
    });

    return Array.from(teamMap.values())
      .filter(team => !favoriteTeams.some(f => f.name === team.name))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [matches, favoriteTeams]);

  // Filter teams based on search
  const filteredTeams = useMemo(() => {
    if (!searchQuery) return availableTeams.slice(0, 20);
    const query = searchQuery.toLowerCase();
    return availableTeams.filter(
      t => t.name.toLowerCase().includes(query) || t.shortName.toLowerCase().includes(query)
    ).slice(0, 20);
  }, [availableTeams, searchQuery]);

  // Get matches involving favorite teams
  const favoriteMatches = useMemo(() => {
    const favoriteNames = favoriteTeams.map(t => t.name.toLowerCase());
    return matches.filter(
      m => favoriteNames.includes(m.homeTeam.name.toLowerCase()) ||
           favoriteNames.includes(m.awayTeam.name.toLowerCase())
    ).slice(0, 10);
  }, [matches, favoriteTeams]);

  const handleAddTeam = (team: { name: string; shortName: string; logo?: string }) => {
    addFavoriteTeam(team);
    setSearchQuery("");
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
              <Heart className="w-5 h-5 text-red-500" />
              <h1 className="font-bold text-lg text-foreground">Favorite Teams</h1>
            </div>

            <button
              onClick={() => setShowAddTeam(!showAddTeam)}
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                showAddTeam ? "bg-primary text-primary-foreground" : "bg-muted/50 hover:bg-muted"
              }`}
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 pb-24 space-y-6">
        {/* Add Team Section */}
        <AnimatePresence>
          {showAddTeam && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-3"
            >
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search teams to add..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-muted/50 border-border/50"
                />
              </div>

              {filteredTeams.length > 0 && (
                <div className="grid grid-cols-2 gap-2">
                  {filteredTeams.map((team) => (
                    <button
                      key={team.name}
                      onClick={() => handleAddTeam(team)}
                      className="flex items-center gap-2 p-3 glass-card rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <TeamLogo src={team.logo || ""} alt={team.name} size="sm" />
                      <span className="text-sm font-medium text-foreground truncate">
                        {team.shortName}
                      </span>
                      <Plus className="w-4 h-4 text-primary ml-auto flex-shrink-0" />
                    </button>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Favorite Teams List */}
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-3">
            Your Teams ({favoriteTeams.length})
          </h3>
          
          {favoriteTeams.length === 0 ? (
            <div className="text-center py-8">
              <Heart className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No favorite teams yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Tap the + button to add teams you follow
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <AnimatePresence mode="popLayout">
                {favoriteTeams.map((team) => (
                  <motion.div
                    key={team.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20, scale: 0.9 }}
                    className="flex items-center justify-between p-4 glass-card rounded-xl"
                  >
                    <div className="flex items-center gap-3">
                      <TeamLogo src={team.logo || ""} alt={team.name} size="md" />
                      <div>
                        <p className="font-medium text-foreground">{team.name}</p>
                        <p className="text-xs text-muted-foreground">{team.shortName}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => removeFavoriteTeam(team.id)}
                      className="w-10 h-10 rounded-full bg-destructive/20 flex items-center justify-center hover:bg-destructive/30 transition-colors"
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Matches with Favorite Teams */}
        {favoriteTeams.length > 0 && favoriteMatches.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-3">
              Upcoming Matches
            </h3>
            <div className="space-y-2">
              {favoriteMatches.map((match) => (
                <button
                  key={match.id}
                  onClick={() => onSelectMatch?.(match)}
                  className="w-full flex items-center justify-between p-4 glass-card rounded-xl hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <TeamLogo src={match.homeTeam.logo || ""} alt={match.homeTeam.name} size="sm" />
                    <span className="text-sm font-medium text-foreground">
                      {match.homeTeam.shortName}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">vs</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">
                      {match.awayTeam.shortName}
                    </span>
                    <TeamLogo src={match.awayTeam.logo || ""} alt={match.awayTeam.name} size="sm" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default FavoriteTeamsScreen;
