import { X, Bell, CheckCheck, Trash2, DollarSign, Trophy, TrendingDown, ArrowDownLeft, ArrowUpRight, Zap, Info } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { AppNotification } from "@/hooks/useNotifications";
import { Button } from "@/components/ui/button";

interface NotificationPanelProps {
  notifications: AppNotification[];
  unreadCount: number;
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onClearAll: () => void;
  onClose: () => void;
}

const getIcon = (type: AppNotification["type"]) => {
  switch (type) {
    case "cashout": return <DollarSign className="w-4 h-4 text-yellow-500" />;
    case "win": return <Trophy className="w-4 h-4 text-accent" />;
    case "loss": return <TrendingDown className="w-4 h-4 text-destructive" />;
    case "deposit": return <ArrowDownLeft className="w-4 h-4 text-accent" />;
    case "withdrawal": return <ArrowUpRight className="w-4 h-4 text-destructive" />;
    case "bet_placed": return <Zap className="w-4 h-4 text-primary" />;
    case "info": return <Info className="w-4 h-4 text-muted-foreground" />;
  }
};

const timeAgo = (dateStr: string) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

const NotificationPanel = ({
  notifications,
  unreadCount,
  onMarkAsRead,
  onMarkAllAsRead,
  onClearAll,
  onClose,
}: NotificationPanelProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: "-100%" }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: "-100%" }}
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
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-primary" />
            <h1 className="font-bold text-lg text-foreground">Notifications</h1>
            {unreadCount > 0 && (
              <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                {unreadCount} new
              </span>
            )}
          </div>
          <div className="w-10" />
        </div>

        {notifications.length > 0 && (
          <div className="flex items-center gap-2 mt-3">
            {unreadCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="text-xs gap-1.5"
                onClick={onMarkAllAsRead}
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Mark all read
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              className="text-xs gap-1.5 text-destructive hover:text-destructive"
              onClick={onClearAll}
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear all
            </Button>
          </div>
        )}
      </div>

      {/* Notification List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2 pb-24">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-16 h-16 rounded-full bg-muted/30 flex items-center justify-center mb-4">
              <Bell className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground font-medium">No notifications yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Activity from your bets and wallet will appear here
            </p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {notifications.map((notif, index) => (
              <motion.div
                key={notif.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2, delay: index * 0.02 }}
                onClick={() => !notif.read && onMarkAsRead(notif.id)}
                className={`relative p-4 rounded-xl border transition-colors cursor-pointer ${
                  notif.read
                    ? "bg-muted/10 border-border/30"
                    : "bg-muted/30 border-primary/20 shadow-sm"
                }`}
              >
                {!notif.read && (
                  <span className="absolute top-4 right-4 w-2.5 h-2.5 bg-primary rounded-full" />
                )}
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center flex-shrink-0 mt-0.5">
                    {getIcon(notif.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">{notif.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                      {notif.message}
                    </p>
                    <p className="text-[10px] text-muted-foreground/60 mt-1.5">
                      {timeAgo(notif.createdAt)}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </motion.div>
  );
};

export default NotificationPanel;
