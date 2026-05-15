import { MessageSquare, Bell, Search, Wallet } from "lucide-react";
import { motion } from "framer-motion";
import SportCategories from "./SportCategories";
import LiveMatchCard from "./LiveMatchCard";
import UpcomingMatches from "./UpcomingMatches";
import VIPCard from "./VIPCard";
import { ApiMatch } from "@/hooks/useLiveMatches";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useWallet } from "@/hooks/useWallet";
import { useNotifications } from "@/hooks/useNotifications";

interface DashboardScreenProps {
  onOpenLive: () => void;
  onViewAllMatches?: () => void;
  onSelectMatch?: (match: ApiMatch) => void;
  onOpenWallet?: () => void;
  onOpenNotifications?: () => void;
  onOpenVIP?: () => void;
}

const DashboardScreen = ({ onOpenLive, onViewAllMatches, onSelectMatch, onOpenWallet, onOpenNotifications, onOpenVIP }: DashboardScreenProps) => {
  const { profile } = useUserProfile();
  const { balance } = useWallet();
  const { unreadCount } = useNotifications();
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="sticky top-0 z-20 bg-background/80 backdrop-blur-lg border-b border-border/50 p-4"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center overflow-hidden">
              <span className="text-lg font-bold text-primary">
                {(profile?.displayName || profile?.username || "U").charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">
                {new Date().getHours() < 12 ? "Good Morning" : new Date().getHours() < 18 ? "Good Afternoon" : "Good Evening"}
              </p>
              <h2 className="font-semibold text-foreground">
                {profile?.displayName || profile?.username || "Guest"}
              </h2>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={onOpenWallet}
              className="flex items-center gap-1.5 px-3 py-2 rounded-full glass-card hover:bg-muted/50 transition-colors"
            >
              <Wallet className="w-4 h-4 text-primary" />
              <span className="text-sm font-bold text-foreground">${balance.toFixed(0)}</span>
            </button>
            <button 
              onClick={onOpenNotifications}
              className="w-10 h-10 rounded-full glass-card flex items-center justify-center hover:bg-muted/50 transition-colors relative"
            >
              <Bell className="w-5 h-5 text-muted-foreground" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-primary text-primary-foreground text-[10px] rounded-full flex items-center justify-center font-bold px-1">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </motion.header>

      <div className="p-4 space-y-6 pb-24">
        {/* Sport Categories */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <SportCategories />
        </motion.div>

        {/* VIP Card */}
        {onOpenVIP && (
          <VIPCard onClick={onOpenVIP} />
        )}

        {/* Live Match */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <LiveMatchCard onOpenLive={onOpenLive} />
        </motion.div>

        {/* Upcoming Matches */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
        >
          <UpcomingMatches 
            onViewAll={onViewAllMatches}
            onSelectMatch={onSelectMatch}
          />
        </motion.div>
      </div>
    </div>
  );
};

export default DashboardScreen;
