import { useState, useEffect } from "react";
import { 
  X, User, Heart, History, Settings, Bell, HelpCircle, 
  LogOut, ChevronRight, Star, Trophy, Wallet, Moon, Sun, Crown, ShieldCheck 
} from "lucide-react";
import { motion } from "framer-motion";
import { Switch } from "@/components/ui/switch";
import { useFavoriteTeams } from "@/hooks/useFavoriteTeams";
import { useBetHistory } from "@/hooks/useBetHistory";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useWallet } from "@/hooks/useWallet";
import { useUserRole } from "@/hooks/useUserRole";
import { useVIP } from "@/hooks/useVIP";
import { supabase } from "@/integrations/supabase/client";
import TeamLogo from "./TeamLogo";
import { toast } from "sonner";

interface ProfileScreenProps {
  onClose: () => void;
  onOpenBetHistory: () => void;
  onOpenFavorites: () => void;
  onOpenLeaderboard?: () => void;
  onOpenWallet?: () => void;
  onOpenVIP?: () => void;
  onOpenAdminVIP?: () => void;
  onOpenAdminDashboard?: () => void;
}

const ProfileScreen = ({ onClose, onOpenBetHistory, onOpenFavorites, onOpenLeaderboard, onOpenWallet, onOpenVIP, onOpenAdminVIP, onOpenAdminDashboard }: ProfileScreenProps) => {
  const { isAdmin } = useUserRole();
  const { isVIP, daysRemaining, currentPlan, membership } = useVIP();
  const [darkMode, setDarkMode] = useState(() => {
    return document.documentElement.classList.contains("dark") || 
           !document.documentElement.classList.contains("light");
  });
  const [notifications, setNotifications] = useState(() => {
    return localStorage.getItem("notifications_enabled") !== "false";
  });
  const { favoriteTeams } = useFavoriteTeams();
  const { bets, getTotalWinnings, getTotalLosses } = useBetHistory();
  const { profile } = useUserProfile();
  const { balance } = useWallet();

  const totalWinnings = getTotalWinnings();
  const totalLosses = getTotalLosses();
  const profit = totalWinnings - totalLosses;
  const settledBets = bets.filter(b => b.status !== "pending");
  const winRate = settledBets.length > 0 
    ? Math.round((bets.filter(b => b.status === "won").length / settledBets.length) * 100)
    : 0;

  // Handle dark mode toggle
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
      document.documentElement.classList.remove("light");
    } else {
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.add("light");
    }
    localStorage.setItem("theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  // Handle notifications toggle
  const handleNotificationsToggle = (enabled: boolean) => {
    setNotifications(enabled);
    localStorage.setItem("notifications_enabled", String(enabled));
    toast.success(enabled ? "Notifications enabled" : "Notifications disabled");
  };

  const handleWalletClick = () => {
    if (onOpenWallet) {
      onOpenWallet();
    }
  };

  const handleSettingsClick = () => {
    toast.info("Settings", { description: "Settings page coming soon!" });
  };

  const handleHelpClick = () => {
    toast.info("Help & Support", { description: "Contact us at support@livefooty.app" });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Logged out successfully");
    window.location.reload();
  };

  const menuItems = [
    { 
      icon: Heart, 
      label: "Favorite Teams", 
      value: `${favoriteTeams.length} teams`,
      onClick: onOpenFavorites,
      color: "text-destructive"
    },
    { 
      icon: History, 
      label: "Bet History", 
      value: `${bets.length} bets`,
      onClick: onOpenBetHistory,
      color: "text-primary"
    },
    { 
      icon: Trophy, 
      label: "Leaderboard", 
      value: "Top Bettors",
      onClick: onOpenLeaderboard,
      color: "text-accent"
    },
    { 
      icon: Wallet, 
      label: "Wallet", 
      value: `$${balance.toFixed(2)}`,
      onClick: handleWalletClick,
      color: "text-green-500"
    },
    { 
      icon: Crown, 
      label: "Betnaro VIP", 
      value: isVIP
        ? `${currentPlan?.label || "Active"} · ${daysRemaining}d left${membership.expiresAt ? ` · exp ${new Date(membership.expiresAt).toLocaleDateString()}` : ""}`
        : "Premium picks",
      onClick: onOpenVIP,
      color: "text-yellow-400"
    },
    ...(isAdmin && onOpenAdminDashboard ? [{
      icon: ShieldCheck,
      label: "Admin Dashboard",
      value: "Users · Approvals",
      onClick: onOpenAdminDashboard,
      color: "text-emerald-400",
    }] : []),
    ...(isAdmin && onOpenAdminVIP ? [{
      icon: ShieldCheck,
      label: "Admin · VIP Picks",
      value: "Manage",
      onClick: onOpenAdminVIP,
      color: "text-emerald-400",
    }] : []),
    { 
      icon: Bell, 
      label: "Notifications", 
      toggle: true,
      value: notifications,
      onToggle: handleNotificationsToggle,
      color: "text-yellow-500"
    },
    { 
      icon: darkMode ? Moon : Sun, 
      label: "Dark Mode", 
      toggle: true,
      value: darkMode,
      onToggle: setDarkMode,
      color: "text-purple-500"
    },
    { 
      icon: Settings, 
      label: "Settings", 
      onClick: handleSettingsClick,
      color: "text-gray-500"
    },
    { 
      icon: HelpCircle, 
      label: "Help & Support", 
      onClick: handleHelpClick,
      color: "text-cyan-500"
    },
  ];

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
            className="w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center hover:bg-muted transition-colors"
          >
            <X className="w-5 h-5 text-foreground" />
          </button>

          <h1 className="font-bold text-lg text-foreground">Profile</h1>

          <div className="w-10" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 pb-24 space-y-6">
        {/* Profile Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-6"
        >
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-primary/50 flex items-center justify-center">
              <User className="w-10 h-10 text-primary-foreground" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-foreground">
                {profile?.displayName || profile?.username || "Guest User"}
              </h2>
              <p className="text-sm text-muted-foreground">
                @{profile?.username || "guest"}
              </p>
              <div className="flex items-center gap-1 mt-1">
                <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                <span className="text-sm text-foreground font-medium">Premium Member</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h3 className="text-sm font-medium text-muted-foreground mb-3">Your Stats</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="glass-card p-4 text-center">
              <Trophy className="w-6 h-6 text-primary mx-auto mb-2" />
              <p className="text-2xl font-bold text-foreground">{winRate}%</p>
              <p className="text-xs text-muted-foreground">Win Rate</p>
            </div>
            <div className="glass-card p-4 text-center">
              <History className="w-6 h-6 text-blue-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-foreground">{bets.length}</p>
              <p className="text-xs text-muted-foreground">Total Bets</p>
            </div>
            <div className="glass-card p-4 text-center">
              <Wallet className="w-6 h-6 text-green-500 mx-auto mb-2" />
              <p className={`text-2xl font-bold ${profit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                ${Math.abs(profit).toFixed(0)}
              </p>
              <p className="text-xs text-muted-foreground">{profit >= 0 ? 'Profit' : 'Loss'}</p>
            </div>
            <div className="glass-card p-4 text-center">
              <Heart className="w-6 h-6 text-red-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-foreground">{favoriteTeams.length}</p>
              <p className="text-xs text-muted-foreground">Favorites</p>
            </div>
          </div>
        </motion.div>

        {/* Favorite Teams Preview */}
        {favoriteTeams.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-muted-foreground">Favorite Teams</h3>
              <button 
                onClick={onOpenFavorites}
                className="text-xs text-primary hover:underline"
              >
                See All
              </button>
            </div>
            <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2">
              {favoriteTeams.slice(0, 5).map((team) => (
                <div 
                  key={team.id}
                  className="flex-shrink-0 glass-card p-3 flex items-center gap-2"
                >
                  <TeamLogo src={team.logo || ""} alt={team.name} size="sm" />
                  <span className="text-sm font-medium text-foreground whitespace-nowrap">
                    {team.shortName}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Menu Items */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="space-y-2"
        >
          <h3 className="text-sm font-medium text-muted-foreground mb-3">Settings</h3>
          {menuItems.map((item) => (
            <button
              key={item.label}
              onClick={item.toggle ? undefined : item.onClick}
              className="w-full flex items-center justify-between p-4 glass-card rounded-xl hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center ${item.color}`}>
                  <item.icon className="w-5 h-5" />
                </div>
                <span className="font-medium text-foreground">{item.label}</span>
              </div>
              {item.toggle ? (
                <Switch 
                  checked={item.value as boolean} 
                  onCheckedChange={item.onToggle}
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <div className="flex items-center gap-2">
                  {item.value && (
                    <span className="text-sm text-muted-foreground">{item.value as string}</span>
                  )}
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </div>
              )}
            </button>
          ))}
        </motion.div>

        {/* Logout */}
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 p-4 glass-card rounded-xl text-destructive hover:bg-destructive/10 transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium">Log Out</span>
        </motion.button>
      </div>
    </motion.div>
  );
};

export default ProfileScreen;
