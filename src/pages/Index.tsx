import { useState, useMemo, useEffect } from "react";
import { AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import OnboardingScreen from "@/components/OnboardingScreen";
import AuthScreen from "@/components/AuthScreen";
import DashboardScreen from "@/components/DashboardScreen";
import LiveMatchView from "@/components/LiveMatchView";
import AllLiveMatchesView from "@/components/AllLiveMatchesView";
import MatchesScreen from "@/components/MatchesScreen";
import BettingScreen from "@/components/BettingScreen";
import BetHistoryScreen from "@/components/BetHistoryScreen";
import StandingsScreen from "@/components/StandingsScreen";
import ProfileScreen from "@/components/ProfileScreen";
import FavoriteTeamsScreen from "@/components/FavoriteTeamsScreen";
import LeaderboardScreen from "@/components/LeaderboardScreen";
import WalletScreen from "@/components/WalletScreen";
import NotificationPanel from "@/components/NotificationPanel";
import VIPSheet from "@/components/VIPSheet";
import AdminVIPScreen from "@/components/AdminVIPScreen";
import AdminDashboard from "@/components/AdminDashboard";
import { mongoSync } from "@/lib/mongoSync";
import BottomNav from "@/components/BottomNav";
import { ApiMatch, useLiveMatches } from "@/hooks/useLiveMatches";
import { useBetHistory } from "@/hooks/useBetHistory";
import { useGoalNotifications } from "@/hooks/useGoalNotifications";
import { useMatchReminders } from "@/hooks/useMatchReminders";
import { useNotifications } from "@/hooks/useNotifications";
import { useDepositCredits } from "@/hooks/useDepositCredits";

type Screen = "onboarding" | "auth" | "dashboard";

const Index = () => {
  const [currentScreen, setCurrentScreen] = useState<Screen>("onboarding");
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signup");
  const [showLiveMatch, setShowLiveMatch] = useState(false);
  const [showAllMatches, setShowAllMatches] = useState(false);
  const [showMatchesScreen, setShowMatchesScreen] = useState(false);
  const [showBettingScreen, setShowBettingScreen] = useState(false);
  const [showBetHistory, setShowBetHistory] = useState(false);
  const [showStandings, setShowStandings] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showFavorites, setShowFavorites] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showWallet, setShowWallet] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showVIP, setShowVIP] = useState(false);
  const [showAdminVIP, setShowAdminVIP] = useState(false);
  const [showAdminDashboard, setShowAdminDashboard] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<ApiMatch | null>(null);
  const [activeTab, setActiveTab] = useState("home");

  // Check auth state on mount
  useEffect(() => {
    supabase.auth.onAuthStateChange((event, session) => {
      if (session && currentScreen !== "dashboard") {
        setCurrentScreen("dashboard");
      }
      if (event === "SIGNED_IN" && session) {
        mongoSync("signed_in", { provider: session.user.app_metadata?.provider });
      }
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setCurrentScreen("dashboard");
      }
    });
  }, []);

  // Goal notifications for betted matches
  const { matches: liveMatchesForNotif } = useLiveMatches({ endpoint: "live", autoRefresh: true, refreshInterval: 30000 });
  const { getPendingBets } = useBetHistory();
  const pendingBets = getPendingBets();
  const liveForNotif = useMemo(() => 
    liveMatchesForNotif
      .filter(m => m.status === "live")
      .map(m => ({
        id: m.id,
        homeTeam: m.homeTeam.name,
        awayTeam: m.awayTeam.name,
        homeScore: m.homeScore ?? 0,
        awayScore: m.awayScore ?? 0,
      })),
    [liveMatchesForNotif]
  );
  useGoalNotifications(pendingBets, liveForNotif);
  useMatchReminders(pendingBets);
  useDepositCredits();
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearAll } = useNotifications();

  const handleGetStarted = () => {
    setCurrentScreen("dashboard");
  };

  const handleSignIn = () => {
    setAuthMode("signin");
    setCurrentScreen("auth");
  };

  const handleSignUp = () => {
    setAuthMode("signup");
    setCurrentScreen("auth");
  };

  const handleAuthSuccess = () => {
    setCurrentScreen("dashboard");
  };

  const handleOpenLive = () => {
    setSelectedMatch(null);
    setShowLiveMatch(true);
  };

  const handleCloseLive = () => {
    setShowLiveMatch(false);
    setSelectedMatch(null);
  };

  const handleViewAllMatches = () => {
    setShowAllMatches(true);
  };

  const handleCloseAllMatches = () => {
    setShowAllMatches(false);
  };

  const handleSelectMatch = (match: ApiMatch) => {
    setSelectedMatch(match);
    setShowAllMatches(false);
    setShowMatchesScreen(false);
    setShowBettingScreen(false);
    setShowFavorites(false);
    setShowLiveMatch(true);
  };

  const closeAllScreens = () => {
    setShowLiveMatch(false);
    setShowAllMatches(false);
    setShowMatchesScreen(false);
    setShowBettingScreen(false);
    setShowBetHistory(false);
    setShowStandings(false);
    setShowProfile(false);
    setShowFavorites(false);
    setShowLeaderboard(false);
    setShowWallet(false);
    setShowNotifications(false);
    setShowVIP(false);
    setShowAdminVIP(false);
    setShowAdminDashboard(false);
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    closeAllScreens();
    
    switch (tab) {
      case "home":
        break;
      case "matches":
        setShowMatchesScreen(true);
        break;
      case "live":
        handleOpenLive();
        break;
      case "standings":
        setShowStandings(true);
        break;
      case "profile":
        setShowProfile(true);
        break;
    }
  };

  const handleOpenBetting = () => {
    setShowMatchesScreen(false);
    setShowBettingScreen(true);
  };

  const handleOpenBetHistory = () => {
    setShowProfile(false);
    setShowBetHistory(true);
  };

  const handleOpenFavorites = () => {
    setShowProfile(false);
    setShowFavorites(true);
  };

  const handleOpenLeaderboard = () => {
    setShowProfile(false);
    setShowLeaderboard(true);
  };

  const handleOpenWallet = () => {
    setShowProfile(false);
    setShowWallet(true);
  };

  const handleOpenNotifications = () => {
    setShowNotifications(true);
  };

  const handleOpenVIP = () => {
    setShowProfile(false);
    setShowVIP(true);
  };

  const handleOpenAdminVIP = () => {
    setShowVIP(false);
    setShowProfile(false);
    setShowAdminVIP(true);
  };

  const handleOpenAdminDashboard = () => {
    setShowProfile(false);
    setShowAdminDashboard(true);
  };

  const isAnyOverlayOpen = showLiveMatch || showAllMatches || showMatchesScreen ||
    showBettingScreen || showBetHistory || showStandings || showProfile || showFavorites || showLeaderboard || showWallet || showNotifications || showVIP || showAdminVIP || showAdminDashboard;

  return (
    <div className="min-h-screen bg-background max-w-md mx-auto relative overflow-hidden">
      <AnimatePresence mode="wait">
        {currentScreen === "onboarding" && (
          <OnboardingScreen
            key="onboarding"
            onGetStarted={handleGetStarted}
            onSignIn={handleSignIn}
            onSignUp={handleSignUp}
          />
        )}

        {currentScreen === "auth" && (
          <AuthScreen
            key="auth"
            mode={authMode}
            onBack={() => setCurrentScreen("onboarding")}
            onSuccess={handleAuthSuccess}
            onToggleMode={() => setAuthMode(authMode === "signin" ? "signup" : "signin")}
          />
        )}
        
        {currentScreen === "dashboard" && (
          <DashboardScreen 
            key="dashboard" 
            onOpenLive={handleOpenLive}
            onViewAllMatches={handleViewAllMatches}
            onSelectMatch={handleSelectMatch}
            onOpenWallet={handleOpenWallet}
            onOpenNotifications={handleOpenNotifications}
            onOpenVIP={handleOpenVIP}
          />
        )}
      </AnimatePresence>

      {currentScreen === "dashboard" && !isAnyOverlayOpen && (
        <BottomNav 
          activeTab={activeTab} 
          onTabChange={handleTabChange}
        />
      )}

      <AnimatePresence>
        {showAllMatches && (
          <AllLiveMatchesView 
            key="all-matches"
            onClose={handleCloseAllMatches}
            onSelectMatch={handleSelectMatch}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showMatchesScreen && (
          <MatchesScreen 
            key="matches"
            onClose={() => { setShowMatchesScreen(false); setActiveTab("home"); }}
            onSelectMatch={handleSelectMatch}
            onOpenBetting={handleOpenBetting}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showBettingScreen && (
          <BettingScreen 
            key="betting"
            onClose={() => { setShowBettingScreen(false); setActiveTab("home"); }}
            onSelectMatch={handleSelectMatch}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showBetHistory && (
          <BetHistoryScreen 
            key="bet-history"
            onClose={() => { setShowBetHistory(false); setActiveTab("home"); }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showStandings && (
          <StandingsScreen 
            key="standings"
            onClose={() => { setShowStandings(false); setActiveTab("home"); }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showProfile && (
          <ProfileScreen 
            key="profile"
            onClose={() => { setShowProfile(false); setActiveTab("home"); }}
            onOpenBetHistory={handleOpenBetHistory}
            onOpenFavorites={handleOpenFavorites}
            onOpenLeaderboard={handleOpenLeaderboard}
            onOpenWallet={handleOpenWallet}
            onOpenVIP={handleOpenVIP}
            onOpenAdminVIP={handleOpenAdminVIP}
            onOpenAdminDashboard={handleOpenAdminDashboard}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showFavorites && (
          <FavoriteTeamsScreen 
            key="favorites"
            onClose={() => { setShowFavorites(false); setActiveTab("home"); }}
            onSelectMatch={handleSelectMatch}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showLeaderboard && (
          <LeaderboardScreen
            key="leaderboard"
            onClose={() => { setShowLeaderboard(false); setActiveTab("home"); }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showWallet && (
          <WalletScreen
            key="wallet"
            onClose={() => { setShowWallet(false); setActiveTab("home"); }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showNotifications && (
          <NotificationPanel
            key="notifications"
            notifications={notifications}
            unreadCount={unreadCount}
            onMarkAsRead={markAsRead}
            onMarkAllAsRead={markAllAsRead}
            onClearAll={clearAll}
            onClose={() => setShowNotifications(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showVIP && (
          <VIPSheet key="vip" onClose={() => setShowVIP(false)} onOpenAdmin={handleOpenAdminVIP} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAdminVIP && (
          <AdminVIPScreen key="admin-vip" onClose={() => setShowAdminVIP(false)} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAdminDashboard && (
          <AdminDashboard key="admin-dash" onClose={() => setShowAdminDashboard(false)} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showLiveMatch && (
          <LiveMatchView 
            key="live" 
            onClose={handleCloseLive}
            selectedMatch={selectedMatch}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default Index;
