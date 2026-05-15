import { motion } from "framer-motion";
import logo from "@/assets/betnaro-logo.png";

interface BetnaroLoaderProps {
  size?: number;
  className?: string;
  label?: string;
}

const BetnaroLoader = ({ size = 80, className = "", label }: BetnaroLoaderProps) => {
  return (
    <div className={`flex flex-col items-center justify-center gap-3 ${className}`}>
      <motion.div
        style={{ width: size, height: size }}
        className="relative"
        animate={{
          scale: [1, 1.08, 1],
          rotate: [0, 3, -3, 0],
        }}
        transition={{
          duration: 1.6,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{
            background:
              "radial-gradient(circle, hsl(142 70% 45% / 0.35) 0%, transparent 70%)",
            filter: "blur(12px)",
          }}
          animate={{ opacity: [0.4, 0.9, 0.4] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
        />
        <img
          src={logo}
          alt="Betnaro"
          className="relative w-full h-full object-contain drop-shadow-[0_0_12px_rgba(34,197,94,0.5)]"
        />
      </motion.div>
      {label && (
        <motion.p
          className="text-sm text-muted-foreground font-medium"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.4, repeat: Infinity }}
        >
          {label}
        </motion.p>
      )}
    </div>
  );
};

export default BetnaroLoader;
