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
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-background/90 backdrop-blur-xl border-t border-border/50">
      <div className="flex items-center justify-around py-2 px-4">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => handleTabClick(item.id)}
            className={`
              flex flex-col items-center gap-1 py-2 px-4 rounded-xl transition-all duration-300
              ${item.isSpecial 
                ? "relative -mt-6" 
                : active === item.id
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }
            `}
          >
            {item.isSpecial ? (
              <div className="w-14 h-14 rounded-full gradient-crimson flex items-center justify-center shadow-button">
                <item.icon className="w-6 h-6 text-white" />
              </div>
            ) : (
              <>
                <item.icon className="w-5 h-5" />
                <span className="text-xs font-medium">{item.label}</span>
              </>
            )}
          </button>
        ))}
      </div>
    </nav>
  );
};

export default BottomNav;
