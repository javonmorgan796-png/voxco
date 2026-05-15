import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { MatchEvent } from "@/hooks/useLiveMatchData";
import Confetti from "./Confetti";

interface GoalCelebrationProps {
  event: MatchEvent | null;
  homeTeamName: string;
  awayTeamName: string;
  homeTeamColor?: string;
  awayTeamColor?: string;
}

const GoalCelebration = ({ 
  event, 
  homeTeamName, 
  awayTeamName,
  homeTeamColor = "hsl(var(--primary))",
  awayTeamColor = "hsl(210, 100%, 50%)"
}: GoalCelebrationProps) => {
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (event) {
      setShowConfetti(true);
      const timer = setTimeout(() => setShowConfetti(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [event]);

  if (!event) return null;

  const teamName = event.team === "home" ? homeTeamName : awayTeamName;
  const teamColor = event.team === "home" ? homeTeamColor : awayTeamColor;

  return (
    <AnimatePresence>
      {event && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[60] flex items-center justify-center pointer-events-none"
        >
          {/* Background overlay with radial gradient */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
          />

          {/* Confetti */}
          {showConfetti && <Confetti />}

          {/* Pulsing rings */}
          <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
            {[1, 2, 3].map((i) => (
              <motion.div
                key={i}
                initial={{ scale: 0, opacity: 0.8 }}
                animate={{ scale: 4, opacity: 0 }}
                transition={{ 
                  duration: 1.5, 
                  delay: i * 0.2,
                  ease: "easeOut"
                }}
                className="absolute w-32 h-32 rounded-full border-4"
                style={{ borderColor: teamColor }}
              />
            ))}
          </div>

          {/* Main content */}
          <motion.div
            initial={{ scale: 0.3, y: 100, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 1.5, y: -50, opacity: 0 }}
            transition={{ 
              type: "spring", 
              stiffness: 300, 
              damping: 20 
            }}
            className="relative text-center z-10"
          >
            {/* Bouncing ball */}
            <motion.div
              initial={{ y: -200, rotate: 0 }}
              animate={{ 
                y: 0, 
                rotate: 720,
              }}
              transition={{ 
                type: "spring", 
                stiffness: 200, 
                damping: 10,
                duration: 0.8
              }}
              className="mb-4"
            >
              <motion.span
                animate={{ 
                  scale: [1, 1.3, 1],
                  rotate: [0, 10, -10, 0]
                }}
                transition={{ 
                  duration: 0.5, 
                  repeat: 3,
                  ease: "easeInOut"
                }}
                className="text-8xl inline-block filter drop-shadow-[0_0_30px_rgba(255,255,255,0.5)]"
              >
                ⚽
              </motion.span>
            </motion.div>

            {/* GOAL text with staggered animation */}
            <motion.div className="overflow-hidden mb-4">
              <motion.h2
                initial={{ y: 100 }}
                animate={{ y: 0 }}
                transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
                className="text-6xl font-bold font-display tracking-widest"
                style={{ 
                  color: teamColor,
                  textShadow: `0 0 40px ${teamColor}, 0 0 80px ${teamColor}` 
                }}
              >
                GOAL!
              </motion.h2>
            </motion.div>

            {/* Scorer name */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="space-y-2"
            >
              <motion.p 
                className="text-3xl font-bold text-white"
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ delay: 0.7, duration: 0.3 }}
              >
                {event.player}
              </motion.p>
              
              <motion.div
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: 0.6, duration: 0.3 }}
                className="w-32 h-0.5 mx-auto"
                style={{ backgroundColor: teamColor }}
              />
              
              <p className="text-lg text-muted-foreground">
                <span className="font-semibold text-foreground">{event.minute}'</span>
                {" "}&bull;{" "}
                <span style={{ color: teamColor }}>{teamName}</span>
              </p>

              {event.assist && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.8 }}
                  className="text-sm text-muted-foreground"
                >
                  Assist: <span className="text-foreground">{event.assist}</span>
                </motion.p>
              )}
            </motion.div>

            {/* Glowing background effect */}
            <motion.div
              animate={{ 
                scale: [1, 1.2, 1],
                opacity: [0.3, 0.5, 0.3]
              }}
              transition={{ 
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="absolute -inset-20 -z-10 rounded-full blur-3xl"
              style={{ backgroundColor: teamColor, opacity: 0.2 }}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default GoalCelebration;
