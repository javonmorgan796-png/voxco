import { useState, useMemo } from "react";
import { X, RefreshCw, Clock, Filter, ChevronRight, Calendar, Trophy, Zap } from "lucide-react";
import CountdownTimer from "./CountdownTimer";
 import { motion, AnimatePresence } from "framer-motion";
 import { Button } from "@/components/ui/button";
 import { useLiveMatches, ApiMatch } from "@/hooks/useLiveMatches";
 import TeamLogo from "./TeamLogo";
 import BetnaroLoader from "./BetnaroLoader";
 
 interface MatchesScreenProps {
   onClose: () => void;
   onSelectMatch: (match: ApiMatch) => void;
   onOpenBetting: () => void;
 }
 
 type DateFilter = "today" | "tomorrow" | "week" | "all";
 
const parseMatchDate = (startTime: string): Date | null => {
  try {
    const timestamp = parseInt(startTime, 10);
    if (!Number.isNaN(timestamp) && /^\d+$/.test(startTime.trim())) {
      return new Date(timestamp * 1000);
    }

    const parsed = new Date(startTime);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  } catch {
    return null;
  }
};

const formatStartTime = (startTime: string): string => {
  const date = parseMatchDate(startTime);
  return date ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "TBD";
};

const formatDate = (startTime: string): string => {
  const date = parseMatchDate(startTime);
  return date ? date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' }) : "Live";
};

const isToday = (startTime: string): boolean => {
  const date = parseMatchDate(startTime);
  if (!date) return false;
  return date.toDateString() === new Date().toDateString();
};

const isTomorrow = (startTime: string): boolean => {
  const date = parseMatchDate(startTime);
  if (!date) return false;
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return date.toDateString() === tomorrow.toDateString();
};

const isThisWeek = (startTime: string): boolean => {
  const date = parseMatchDate(startTime);
  if (!date) return false;
  const today = new Date();
  const weekEnd = new Date();
  weekEnd.setDate(today.getDate() + 7);
  return date >= today && date <= weekEnd;
};
 
 const MatchesScreen = ({ onClose, onSelectMatch, onOpenBetting }: MatchesScreenProps) => {
   const [dateFilter, setDateFilter] = useState<DateFilter>("all");
   const [selectedCompetition, setSelectedCompetition] = useState<string | null>(null);
 
   const { 
     matches, 
     isLoading, 
     refetch,
   } = useLiveMatches({
     endpoint: "all",
     autoRefresh: true,
     refreshInterval: 60000,
   });
 
   // Get unique competitions
   const competitions = useMemo(() => {
     const competitionSet = new Set<string>();
     matches.forEach(match => {
       if (match.competition.name) {
         competitionSet.add(match.competition.name);
       }
     });
     return Array.from(competitionSet).sort();
   }, [matches]);
 
   // Filter matches by date and competition
   const filteredMatches = useMemo(() => {
     let filtered = matches;
 
     // Date filter
     if (dateFilter === "today") {
       filtered = filtered.filter(m => m.startTime && isToday(m.startTime));
     } else if (dateFilter === "tomorrow") {
       filtered = filtered.filter(m => m.startTime && isTomorrow(m.startTime));
     } else if (dateFilter === "week") {
       filtered = filtered.filter(m => m.startTime && isThisWeek(m.startTime));
     }
 
     // Competition filter
     if (selectedCompetition) {
       filtered = filtered.filter(m => m.competition.name === selectedCompetition);
     }
 
     // Sort by start time
     return filtered.sort((a, b) => {
       const timeA = parseInt(a.startTime || "0");
       const timeB = parseInt(b.startTime || "0");
       return timeA - timeB;
     });
   }, [matches, dateFilter, selectedCompetition]);
 
   // Group matches by date
   const groupedMatches = useMemo(() => {
     const groups: { [key: string]: ApiMatch[] } = {};
     
      filteredMatches.forEach(match => {
        const dateKey = match.status === "live" ? "Live Now" : match.startTime ? formatDate(match.startTime) : "Scheduled";
        if (!groups[dateKey]) {
          groups[dateKey] = [];
        }
        groups[dateKey].push(match);
     });
     
     return groups;
   }, [filteredMatches]);
 
   const upcomingCount = matches.filter(m => m.status === "upcoming").length;
   const liveCount = matches.filter(m => m.status === "live").length;
 
   return (
     <motion.div
       initial={{ opacity: 0, y: "100%" }}
       animate={{ opacity: 1, y: 0 }}
       exit={{ opacity: 0, y: "100%" }}
       transition={{ type: "spring", damping: 25, stiffness: 300 }}
       className="fixed inset-0 z-50 bg-background flex flex-col"
     >
       {/* Header */}
       <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-lg border-b border-border/50">
         <div className="p-4">
           <div className="flex items-center justify-between">
             <button
               onClick={onClose}
               className="w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center hover:bg-muted transition-colors"
             >
               <X className="w-5 h-5 text-foreground" />
             </button>
 
             <div className="flex items-center gap-2">
               <Calendar className="w-5 h-5 text-primary" />
               <h1 className="font-bold text-lg text-foreground">Matches</h1>
             </div>
 
             <button
               onClick={() => refetch()}
               className="w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center hover:bg-muted transition-colors"
             >
               <RefreshCw className={`w-5 h-5 text-foreground ${isLoading ? 'animate-spin' : ''}`} />
             </button>
           </div>
 
           {/* Stats */}
           <div className="flex items-center justify-center gap-4 mt-3">
             {liveCount > 0 && (
               <div className="flex items-center gap-1 text-sm">
                 <span className="w-2 h-2 bg-primary rounded-full live-pulse" />
                 <span className="font-medium text-primary">{liveCount} Live</span>
               </div>
             )}
             <div className="flex items-center gap-1 text-sm text-muted-foreground">
               <Clock className="w-4 h-4" />
               <span>{upcomingCount} Upcoming</span>
             </div>
           </div>
         </div>
 
         {/* Date Filter */}
         <div className="px-4 pb-2">
           <div className="flex gap-2">
             <Button
               variant={dateFilter === "all" ? "default" : "outline"}
               size="sm"
               onClick={() => setDateFilter("all")}
               className="flex-1"
             >
               All
             </Button>
             <Button
               variant={dateFilter === "today" ? "default" : "outline"}
               size="sm"
               onClick={() => setDateFilter("today")}
               className="flex-1"
             >
               Today
             </Button>
             <Button
               variant={dateFilter === "tomorrow" ? "default" : "outline"}
               size="sm"
               onClick={() => setDateFilter("tomorrow")}
               className="flex-1"
             >
               Tomorrow
             </Button>
             <Button
               variant={dateFilter === "week" ? "default" : "outline"}
               size="sm"
               onClick={() => setDateFilter("week")}
               className="flex-1"
             >
               Week
             </Button>
           </div>
         </div>
 
         {/* Competition Filter */}
         <div className="px-4 pb-3">
           <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1">
             <button
               onClick={() => setSelectedCompetition(null)}
               className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                 !selectedCompetition 
                   ? "bg-primary text-primary-foreground" 
                   : "bg-muted/50 text-muted-foreground hover:bg-muted"
               }`}
             >
               <Filter className="w-3 h-3" />
               All Leagues
             </button>
             {competitions.slice(0, 20).map((comp) => (
               <button
                 key={comp}
                 onClick={() => setSelectedCompetition(comp === selectedCompetition ? null : comp)}
                 className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                   selectedCompetition === comp
                     ? "bg-primary text-primary-foreground"
                     : "bg-muted/50 text-muted-foreground hover:bg-muted"
                 }`}
               >
                 {comp}
               </button>
             ))}
           </div>
         </div>
       </div>
 
       {/* Betting CTA */}
       <div className="px-4 py-3 bg-gradient-to-r from-primary/10 to-primary/5 border-b border-border/30">
         <button
           onClick={onOpenBetting}
           className="w-full flex items-center justify-between p-3 rounded-xl bg-primary/10 hover:bg-primary/20 transition-colors"
         >
           <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
               <Zap className="w-5 h-5 text-primary" />
             </div>
             <div className="text-left">
               <p className="font-semibold text-foreground">Place Bets</p>
               <p className="text-xs text-muted-foreground">{upcomingCount} matches available</p>
             </div>
           </div>
           <ChevronRight className="w-5 h-5 text-primary" />
         </button>
       </div>
 
       {/* Match List */}
       <div className="flex-1 overflow-y-auto p-4 pb-24">
         {isLoading ? (
           <div className="flex items-center justify-center py-16">
             <BetnaroLoader size={96} label="Loading matches..." />
           </div>
         ) : filteredMatches.length === 0 ? (
           <div className="flex flex-col items-center justify-center py-12">
             <Calendar className="w-12 h-12 text-muted-foreground mb-4" />
             <p className="text-muted-foreground text-center">No matches found</p>
             <p className="text-xs text-muted-foreground mt-1">Try changing the filters</p>
           </div>
         ) : (
           <div className="space-y-6">
             {Object.entries(groupedMatches).map(([date, dateMatches]) => (
               <div key={date}>
                 <div className="flex items-center gap-2 mb-3">
                   <Calendar className="w-4 h-4 text-primary" />
                   <h3 className="text-sm font-semibold text-foreground">{date}</h3>
                   <span className="text-xs text-muted-foreground">({dateMatches.length})</span>
                 </div>
                 
                 <div className="space-y-2">
                   <AnimatePresence mode="popLayout">
                     {dateMatches.map((match, index) => (
                       <motion.div
                         key={match.id}
                         initial={{ opacity: 0, y: 10 }}
                         animate={{ opacity: 1, y: 0 }}
                         exit={{ opacity: 0, scale: 0.95 }}
                         transition={{ duration: 0.2, delay: index * 0.02 }}
                         onClick={() => onSelectMatch(match)}
                         className="glass-card p-3 hover:bg-muted/30 transition-colors cursor-pointer active:scale-[0.98]"
                       >
                         <div className="flex items-center gap-3">
                           {/* Time/Status */}
                           <div className="w-14 shrink-0 text-center">
                             {match.status === "live" ? (
                               <div className="flex flex-col items-center">
                                 <span className="w-2 h-2 bg-primary rounded-full live-pulse mb-1" />
                                 <span className="text-xs font-bold text-primary">
                                   {match.minute || "LIVE"}
                                 </span>
                               </div>
                             ) : (
                               <CountdownTimer startTime={match.startTime} size="sm" />
                             )}
                           </div>
 
                           {/* Teams */}
                           <div className="flex-1 min-w-0">
                             <div className="flex items-center gap-2 mb-1">
                               <TeamLogo src={match.homeTeam.logo || ""} alt={match.homeTeam.name} size="xs" />
                               <span className="text-sm font-medium text-foreground truncate">
                                 {match.homeTeam.shortName}
                               </span>
                               {match.status === "live" && (
                                 <span className="font-bold text-foreground ml-auto">{match.homeScore}</span>
                               )}
                             </div>
                             <div className="flex items-center gap-2">
                               <TeamLogo src={match.awayTeam.logo || ""} alt={match.awayTeam.name} size="xs" />
                               <span className="text-sm font-medium text-foreground truncate">
                                 {match.awayTeam.shortName}
                               </span>
                               {match.status === "live" && (
                                 <span className="font-bold text-foreground ml-auto">{match.awayScore}</span>
                               )}
                             </div>
                           </div>
 
                           {/* Competition & Arrow */}
                           <div className="flex items-center gap-2 shrink-0">
                             <Trophy className="w-3 h-3 text-muted-foreground" />
                             <ChevronRight className="w-4 h-4 text-muted-foreground" />
                           </div>
                         </div>
 
                         {/* Competition Name */}
                         <p className="text-xs text-muted-foreground mt-2 pl-14">
                           {match.competition.name}
                         </p>
                       </motion.div>
                     ))}
                   </AnimatePresence>
                 </div>
               </div>
             ))}
           </div>
         )}
       </div>
     </motion.div>
   );
 };
 
 export default MatchesScreen;