import { useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";
import { PlacedBet } from "./useBetHistory";

interface GoalNotificationMatch {
  id: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
}

export const useGoalNotifications = (
  pendingBets: PlacedBet[],
  liveMatches: GoalNotificationMatch[]
) => {
  const prevScores = useRef<Map<string, { home: number; away: number }>>(new Map());
  const notificationPermission = useRef<NotificationPermission>("default");

  // Request notification permission
  useEffect(() => {
    if ("Notification" in window) {
      Notification.requestPermission().then((perm) => {
        notificationPermission.current = perm;
      });
    }
  }, []);

  const sendNotification = useCallback(
    (title: string, body: string, icon?: string) => {
      // In-app toast always
      toast("⚽ GOAL!", {
        description: body,
        duration: 8000,
        style: {
          background: "hsl(var(--primary))",
          color: "hsl(var(--primary-foreground))",
          border: "none",
        },
      });

      // Browser push notification
      if (
        "Notification" in window &&
        notificationPermission.current === "granted"
      ) {
        try {
          new Notification(title, { body, icon: icon || "⚽", tag: `goal-${Date.now()}` });
        } catch {}
      }
    },
    []
  );

  useEffect(() => {
    if (liveMatches.length === 0 || pendingBets.length === 0) return;

    // Get match IDs the user has bet on
    const bettedMatchIds = new Set(pendingBets.map((b) => b.matchId));

    liveMatches.forEach((match) => {
      if (!bettedMatchIds.has(match.id)) return;

      const prev = prevScores.current.get(match.id);
      if (prev) {
        const homeScored = match.homeScore > prev.home;
        const awayScored = match.awayScore > prev.away;

        if (homeScored) {
          sendNotification(
            "⚽ GOAL!",
            `${match.homeTeam} scored! ${match.homeTeam} ${match.homeScore} - ${match.awayScore} ${match.awayTeam}`
          );
        }
        if (awayScored) {
          sendNotification(
            "⚽ GOAL!",
            `${match.awayTeam} scored! ${match.homeTeam} ${match.homeScore} - ${match.awayScore} ${match.awayTeam}`
          );
        }
      }

      prevScores.current.set(match.id, {
        home: match.homeScore,
        away: match.awayScore,
      });
    });
  }, [liveMatches, pendingBets, sendNotification]);
};
