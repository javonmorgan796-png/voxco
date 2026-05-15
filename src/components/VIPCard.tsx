import { motion } from "framer-motion";
import { Crown, ChevronRight, Sparkles } from "lucide-react";
import { useVIP, VIP_PRICE } from "@/hooks/useVIP";

interface VIPCardProps {
  onClick: () => void;
}

const VIPCard = ({ onClick }: VIPCardProps) => {
  const { isVIP } = useVIP();

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.7, y: 40 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: "spring", damping: 12, stiffness: 200, delay: 0.15 }}
      className="relative"
    >
      {/* Pulsing glow ring behind card */}
      <motion.div
        aria-hidden
        className="absolute -inset-1 rounded-2xl pointer-events-none"
        style={{
          background: "linear-gradient(135deg, hsl(45 95% 55%), hsl(20 85% 45%))",
          filter: "blur(14px)",
          opacity: 0.55,
        }}
        animate={{ opacity: [0.35, 0.75, 0.35], scale: [0.98, 1.04, 0.98] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Floating sparkle accents */}
      <motion.div
        aria-hidden
        className="absolute -top-2 -right-1 text-yellow-300 z-10 pointer-events-none"
        animate={{ y: [-2, -8, -2], opacity: [0.6, 1, 0.6], rotate: [0, 15, 0] }}
        transition={{ duration: 2.2, repeat: Infinity }}
      >
        <Sparkles className="w-5 h-5 drop-shadow" />
      </motion.div>
      <motion.div
        aria-hidden
        className="absolute -bottom-1 -left-1 text-amber-200 z-10 pointer-events-none"
        animate={{ y: [0, -5, 0], opacity: [0.5, 0.95, 0.5], rotate: [0, -12, 0] }}
        transition={{ duration: 2.6, repeat: Infinity, delay: 0.5 }}
      >
        <Sparkles className="w-4 h-4 drop-shadow" />
      </motion.div>

      <motion.button
        onClick={onClick}
        whileTap={{ scale: 0.96 }}
        whileHover={{ scale: 1.02 }}
        animate={{ scale: [1, 1.015, 1] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
        className="w-full relative overflow-hidden rounded-2xl p-4 text-left z-[1]"
        style={{
          background:
            "linear-gradient(135deg, hsl(45 95% 55%) 0%, hsl(35 92% 48%) 50%, hsl(20 85% 38%) 100%)",
          boxShadow:
            "0 14px 38px -12px hsl(45 95% 55% / 0.65), inset 0 1px 0 rgba(255,255,255,0.35)",
        }}
      >
        {/* Animated diagonal shine sweep */}
        <motion.div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "linear-gradient(110deg, transparent 30%, rgba(255,255,255,0.55) 50%, transparent 70%)",
          }}
          animate={{ x: ["-110%", "110%"] }}
          transition={{ duration: 2.2, repeat: Infinity, repeatDelay: 1, ease: "easeInOut" }}
        />

        <div className="relative flex items-center gap-3">
          <motion.div
            animate={{ rotate: [0, -12, 12, -6, 0], scale: [1, 1.08, 1] }}
            transition={{ duration: 2.6, repeat: Infinity, repeatDelay: 0.6 }}
            className="w-12 h-12 rounded-xl bg-white/25 backdrop-blur flex items-center justify-center shadow-lg flex-shrink-0"
          >
            <Crown className="w-7 h-7 text-white drop-shadow" />
          </motion.div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-white text-base tracking-wide drop-shadow">BETNARO VIP</h3>
              {isVIP ? (
                <motion.span
                  animate={{ opacity: [0.7, 1, 0.7] }}
                  transition={{ duration: 1.8, repeat: Infinity }}
                  className="text-[9px] font-bold bg-white/30 backdrop-blur text-white px-1.5 py-0.5 rounded-full uppercase"
                >
                  Active
                </motion.span>
              ) : (
                <motion.span
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 1.4, repeat: Infinity }}
                  className="text-[9px] font-bold bg-red-500 text-white px-1.5 py-0.5 rounded-full uppercase"
                >
                  Hot
                </motion.span>
              )}
            </div>
            <p className="text-xs text-white/95 leading-tight mt-0.5">
              {isVIP
                ? "Tap to view today's premium picks"
                : `Expert predictions · Sections A·B·C·E · $${VIP_PRICE}`}
            </p>
          </div>
          <ChevronRight className="w-5 h-5 text-white flex-shrink-0" />
        </div>
      </motion.button>
    </motion.div>
  );
};

export default VIPCard;
