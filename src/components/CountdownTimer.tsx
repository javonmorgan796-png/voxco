import { useCountdown } from "@/hooks/useCountdown";
import { Clock } from "lucide-react";

interface CountdownTimerProps {
  startTime: string | undefined;
  size?: "sm" | "md";
}

const CountdownTimer = ({ startTime, size = "sm" }: CountdownTimerProps) => {
  const { days, hours, minutes, seconds, isExpired, label } = useCountdown(startTime);

  if (!startTime) return <span className="text-xs text-muted-foreground">TBD</span>;

  if (size === "md") {
    return (
      <div className="flex flex-col items-center gap-1">
        <div className="flex items-center gap-1 text-muted-foreground">
          <Clock className="w-3 h-3" />
          <span className="text-[10px] uppercase tracking-wider font-medium">Kickoff in</span>
        </div>
        {isExpired ? (
          <span className="text-xs font-semibold text-primary animate-pulse">Starting soon</span>
        ) : days > 0 ? (
          <div className="flex items-center gap-1">
            <TimeBlock value={days} unit="D" />
            <span className="text-muted-foreground text-xs">:</span>
            <TimeBlock value={hours} unit="H" />
          </div>
        ) : (
          <div className="flex items-center gap-1">
            <TimeBlock value={hours} unit="H" />
            <span className="text-muted-foreground text-xs">:</span>
            <TimeBlock value={minutes} unit="M" />
            <span className="text-muted-foreground text-xs">:</span>
            <TimeBlock value={seconds} unit="S" />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 text-xs">
      <Clock className="w-3 h-3 text-muted-foreground" />
      <span className={`font-medium ${isExpired ? 'text-primary animate-pulse' : 'text-foreground'}`}>
        {label}
      </span>
    </div>
  );
};

const TimeBlock = ({ value, unit }: { value: number; unit: string }) => (
  <div className="flex flex-col items-center">
    <span className="text-sm font-bold text-foreground tabular-nums leading-none">
      {String(value).padStart(2, "0")}
    </span>
    <span className="text-[9px] text-muted-foreground">{unit}</span>
  </div>
);

export default CountdownTimer;
