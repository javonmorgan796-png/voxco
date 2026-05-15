import { motion } from "framer-motion";

interface MatchStatsProps {
  possession: { home: number; away: number };
  shots: { home: number; away: number };
  shotsOnTarget: { home: number; away: number };
  corners: { home: number; away: number };
  fouls: { home: number; away: number };
  homeTeamName: string;
  awayTeamName: string;
}

const StatBar = ({ 
  label, 
  homeValue, 
  awayValue, 
  isPercentage = false 
}: { 
  label: string; 
  homeValue: number; 
  awayValue: number; 
  isPercentage?: boolean;
}) => {
  const total = homeValue + awayValue;
  const homePercent = total > 0 ? (homeValue / total) * 100 : 50;
  const awayPercent = total > 0 ? (awayValue / total) * 100 : 50;

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="font-semibold text-foreground">
          {isPercentage ? `${homeValue}%` : homeValue}
        </span>
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold text-foreground">
          {isPercentage ? `${awayValue}%` : awayValue}
        </span>
      </div>
      <div className="flex gap-1 h-2">
        <motion.div 
          className="bg-primary rounded-l-full"
          initial={{ width: 0 }}
          animate={{ width: `${homePercent}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
        <motion.div 
          className="bg-muted-foreground/50 rounded-r-full"
          initial={{ width: 0 }}
          animate={{ width: `${awayPercent}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </div>
    </div>
  );
};

const MatchStats = ({
  possession,
  shots,
  shotsOnTarget,
  corners,
  fouls,
  homeTeamName,
  awayTeamName,
}: MatchStatsProps) => {
  return (
    <div className="glass-card p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-foreground">Match Statistics</h3>
        <span className="text-xs text-muted-foreground">LIVE</span>
      </div>
      
      {/* Team names header */}
      <div className="flex justify-between text-xs text-muted-foreground border-b border-border pb-2">
        <span>{homeTeamName}</span>
        <span>{awayTeamName}</span>
      </div>

      <div className="space-y-4">
        <StatBar 
          label="Possession" 
          homeValue={possession.home} 
          awayValue={possession.away} 
          isPercentage 
        />
        <StatBar 
          label="Shots" 
          homeValue={shots.home} 
          awayValue={shots.away} 
        />
        <StatBar 
          label="Shots on Target" 
          homeValue={shotsOnTarget.home} 
          awayValue={shotsOnTarget.away} 
        />
        <StatBar 
          label="Corners" 
          homeValue={corners.home} 
          awayValue={corners.away} 
        />
        <StatBar 
          label="Fouls" 
          homeValue={fouls.home} 
          awayValue={fouls.away} 
        />
      </div>
    </div>
  );
};

export default MatchStats;
