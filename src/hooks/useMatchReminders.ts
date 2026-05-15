import { useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";
import { PlacedBet } from "./useBetHistory";

/**
 * Sends push/toast notifications when a match the user bet on
 * is about to kick off (15 min, 5 min, and 1 min before).
 */
export const useMatchReminders = (pendingBets: PlacedBet[]) => {
  const notifiedRef = useRef<Set<string>>(new Set());
  const notificationPermission = useRef<NotificationPermission>("default");

  useEffect(() => {
    if ("Notification" in window) {
      Notification.requestPermission().then((perm) => {
        notificationPermission.current = perm;
      });
    }
  }, []);

  const sendReminder = useCallback((title: string, body: string) => {
    toast("🔔 Match Reminder", {
      description: body,
      duration: 10000,
      style: {
        background: "hsl(var(--accent))",
        color: "hsl(var(--accent-foreground))",
        border: "none",
      },
    });

    if ("Notification" in window && notificationPermission.current === "granted") {
      try {
        new Notification(title, { body, icon: "⏰", tag: `reminder-${Date.now()}` });
      } catch {}
    }
  }, []);

  useEffect(() => {
    if (pendingBets.length === 0) return;

    const REMINDER_THRESHOLDS = [
      { minutes: 15, label: "15 minutes" },
      { minutes: 5, label: "5 minutes" },
      { minutes: 1, label: "1 minute" },
    ];

    const checkReminders = () => {
      const now = Date.now();

      pendingBets.forEach((bet) => {
        if (!bet.matchStartTime) return;

        let startMs: number;
        const parsed = parseInt(bet.matchStartTime);
        if (!isNaN(parsed) && parsed < 1e12) {
          startMs = parsed * 1000; // unix seconds
        } else if (!isNaN(parsed)) {
          startMs = parsed; // unix ms
        } else {
          startMs = new Date(bet.matchStartTime).getTime();
        }

        if (isNaN(startMs) || startMs <= now) return;

        const minutesUntil = (startMs - now) / 60000;

        REMINDER_THRESHOLDS.forEach(({ minutes, label }) => {
          const key = `${bet.matchId}_${minutes}`;
          if (notifiedRef.current.has(key)) return;

          if (minutesUntil <= minutes && minutesUntil > (minutes === 1 ? 0 : minutes - 2)) {
            notifiedRef.current.add(key);
            sendReminder(
              `⏰ Kickoff in ${label}!`,
              `${bet.homeTeam} vs ${bet.awayTeam} starts in ${label}. You have a bet on this match!`
            );
          }
        });
      });
    };

    checkReminders();
    const interval = setInterval(checkReminders, 30000); // check every 30s
    return () => clearInterval(interval);
  }, [pendingBets, sendReminder]);
};
