import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";

interface LiveScoreIndicatorProps {
  score: number;
  previousScore?: number;
  size?: "sm" | "md" | "lg" | "xl";
}

const sizeClasses = {
  sm: "text-lg",
  md: "text-2xl",
  lg: "text-3xl",
  xl: "text-4xl",
};

const LiveScoreIndicator = ({ score, previousScore, size = "xl" }: LiveScoreIndicatorProps) => {
  const [showFlash, setShowFlash] = useState(false);
  const [displayScore, setDisplayScore] = useState(score);

  useEffect(() => {
    if (previousScore !== undefined && score > previousScore) {
      setShowFlash(true);
      
      // Animate the score change
      const flashTimer = setTimeout(() => {
        setDisplayScore(score);
        setShowFlash(false);
      }, 500);

      return () => clearTimeout(flashTimer);
    } else {
      setDisplayScore(score);
    }
  }, [score, previousScore]);

  return (
    <div className="relative">
      <AnimatePresence mode="wait">
        <motion.span
          key={displayScore}
          initial={{ scale: 1.5, opacity: 0, y: -10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.8, opacity: 0, y: 10 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className={`font-bold font-display text-foreground ${sizeClasses[size]}`}
        >
          {displayScore}
        </motion.span>
      </AnimatePresence>
      
      {showFlash && (
        <motion.div
          initial={{ scale: 0, opacity: 1 }}
          animate={{ scale: 3, opacity: 0 }}
          transition={{ duration: 0.6 }}
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
        >
          <div className="w-8 h-8 bg-primary rounded-full" />
        </motion.div>
      )}
    </div>
  );
};

export default LiveScoreIndicator;
