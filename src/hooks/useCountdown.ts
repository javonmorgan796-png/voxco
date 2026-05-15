import { useState, useEffect } from "react";

interface CountdownResult {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isExpired: boolean;
  label: string;
}

export function useCountdown(startTime: string | undefined): CountdownResult {
  const getTarget = () => {
    if (!startTime) return 0;
    const ts = parseInt(startTime);
    return !isNaN(ts) ? ts * 1000 : new Date(startTime).getTime();
  };

  const [now, setNow] = useState(Date.now());
  const target = getTarget();

  useEffect(() => {
    if (!target || target <= Date.now()) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [target]);

  const diff = Math.max(0, target - now);
  const isExpired = diff <= 0;
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);

  let label = "";
  if (isExpired) label = "Starting soon";
  else if (days > 0) label = `${days}d ${hours}h`;
  else if (hours > 0) label = `${hours}h ${minutes}m`;
  else label = `${minutes}m ${seconds}s`;

  return { days, hours, minutes, seconds, isExpired, label };
}
