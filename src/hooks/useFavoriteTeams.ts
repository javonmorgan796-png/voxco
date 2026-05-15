import { useState, useEffect } from "react";

export interface FavoriteTeam {
  id: string;
  name: string;
  shortName: string;
  logo?: string | null;
  addedAt: string;
}

const FAVORITE_TEAMS_KEY = "favorite_teams";

export const useFavoriteTeams = () => {
  const [favoriteTeams, setFavoriteTeams] = useState<FavoriteTeam[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem(FAVORITE_TEAMS_KEY);
    if (stored) {
      try {
        setFavoriteTeams(JSON.parse(stored));
      } catch {
        setFavoriteTeams([]);
      }
    }
  }, []);

  const saveTeams = (teams: FavoriteTeam[]) => {
    setFavoriteTeams(teams);
    localStorage.setItem(FAVORITE_TEAMS_KEY, JSON.stringify(teams));
  };

  const addFavoriteTeam = (team: Omit<FavoriteTeam, "id" | "addedAt">) => {
    const exists = favoriteTeams.some(
      (t) => t.name.toLowerCase() === team.name.toLowerCase()
    );
    if (exists) return false;

    const newTeam: FavoriteTeam = {
      ...team,
      id: `team_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      addedAt: new Date().toISOString(),
    };

    saveTeams([...favoriteTeams, newTeam]);
    return true;
  };

  const removeFavoriteTeam = (teamId: string) => {
    saveTeams(favoriteTeams.filter((t) => t.id !== teamId));
  };

  const isFavorite = (teamName: string) => {
    return favoriteTeams.some(
      (t) => t.name.toLowerCase() === teamName.toLowerCase()
    );
  };

  const toggleFavorite = (team: Omit<FavoriteTeam, "id" | "addedAt">) => {
    const existing = favoriteTeams.find(
      (t) => t.name.toLowerCase() === team.name.toLowerCase()
    );
    if (existing) {
      removeFavoriteTeam(existing.id);
      return false;
    } else {
      addFavoriteTeam(team);
      return true;
    }
  };

  return {
    favoriteTeams,
    addFavoriteTeam,
    removeFavoriteTeam,
    isFavorite,
    toggleFavorite,
  };
};
