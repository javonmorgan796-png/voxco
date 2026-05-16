import { Home, Calendar, Trophy, User, Play } from "lucide-react";
import { useState } from "react";

const navItems = [
  { id: "home", icon: Home, label: "Home" },
  { id: "matches", icon: Calendar, label: "Matches" },
  { id: "live", icon: Play, label: "Live", isSpecial: true },
  { id: "standings", icon: Trophy, label: "Standings" },
  { id: "profile", icon: User, label: "Profile" },
];

interface BottomNavProps {
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}

const BottomNav = ({ activeTab = "home", onTabChange }: BottomNavProps) => {
  const [active, setActive] = useState(activeTab);

  const handleTabClick = (tabId: string) => {
    setActive(tabId);
    onTabChange?.(tabId);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-background/90 backdrop-blur-xl border-t border-border/50 pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-end justify-around py-1.5 px-2 max-w-screen-sm mx-auto">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => handleTabClick(item.id)}
            aria-label={item.label}
            className={`
              flex flex-col items-center gap-0.5 py-1.5 px-2 rounded-xl transition-all duration-300 min-w-0 flex-1
              ${item.isSpecial
                ? "relative -mt-5"
                : active === item.id
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }
            `}
          >
            {item.isSpecial ? (
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full gradient-crimson flex items-center justify-center shadow-button ring-4 ring-background">
                <item.icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
            ) : (
              <>
                <item.icon className="w-5 h-5" />
                <span className="text-[10px] sm:text-xs font-medium leading-none">{item.label}</span>
              </>
            )}
          </button>
        ))}
      </div>
    </nav>
  );
};

export default BottomNav;
