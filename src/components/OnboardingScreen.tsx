import { useState } from "react";
import { ArrowRight, ChevronRight, ChevronLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import heroSlide1 from "@/assets/hero-onboarding.jpg";
import heroSlide2 from "@/assets/hero-slide2.jpg";
import heroSlide3 from "@/assets/hero-slide3.jpg";
import betnaroLogo from "@/assets/betnaro-logo.png";

interface OnboardingScreenProps {
  onGetStarted: () => void;
  onSignIn: () => void;
  onSignUp: () => void;
}

const slides = [
  {
    image: heroSlide1,
    title: "Feel The Adrenaline",
    highlight: "Live Football",
    subtitle: "of",
    description: "Highlights, scores, and live action — your football world in one app.",
  },
  {
    image: heroSlide2,
    title: "Track Every",
    highlight: "Match Live",
    subtitle: "",
    description: "Real-time scores, stats, and notifications for every game that matters.",
  },
  {
    image: heroSlide3,
    title: "Bet Smart &",
    highlight: "Win Big",
    subtitle: "",
    description: "Place bets, build accumulators, and climb the leaderboard.",
  },
];

const OnboardingScreen = ({ onGetStarted, onSignIn, onSignUp }: OnboardingScreenProps) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [direction, setDirection] = useState(0);

  const goToSlide = (index: number) => {
    setDirection(index > currentSlide ? 1 : -1);
    setCurrentSlide(index);
  };

  const nextSlide = () => {
    if (currentSlide < slides.length - 1) {
      setDirection(1);
      setCurrentSlide((p) => p + 1);
    }
  };

  const prevSlide = () => {
    if (currentSlide > 0) {
      setDirection(-1);
      setCurrentSlide((p) => p - 1);
    }
  };

  const slide = slides[currentSlide];
  const isLastSlide = currentSlide === slides.length - 1;

  const variants = {
    enter: (dir: number) => ({ x: dir > 0 ? 300 : -300, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? -300 : 300, opacity: 0 }),
  };

  return (
    <div className="relative h-screen w-full overflow-hidden bg-background">
      {/* Background Image with crossfade */}
      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          key={currentSlide}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="absolute inset-0"
        >
          <img
            src={slide.image}
            alt="Football"
            className="h-full w-full object-cover object-top"
            width={1080}
            height={1920}
          />
          <div
            className="absolute inset-0"
            style={{ background: "var(--gradient-hero)" }}
          />
        </motion.div>
      </AnimatePresence>

      {/* Navigation arrows */}
      {/* Brand logo top-left */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="absolute top-4 left-4 z-30 flex items-center gap-2"
      >
        <motion.img
          src={betnaroLogo}
          alt="Betnaro"
          className="w-14 h-14 object-contain drop-shadow-[0_0_10px_rgba(34,197,94,0.6)]"
          animate={{ rotate: [0, 4, -4, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        />
      </motion.div>

      {currentSlide > 0 && (
        <button
          onClick={prevSlide}
          className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-background/30 backdrop-blur-sm flex items-center justify-center"
        >
          <ChevronLeft className="w-5 h-5 text-foreground" />
        </button>
      )}
      {currentSlide < slides.length - 1 && (
        <button
          onClick={nextSlide}
          className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-background/30 backdrop-blur-sm flex items-center justify-center"
        >
          <ChevronRight className="w-5 h-5 text-foreground" />
        </button>
      )}

      {/* Content */}
      <div className="relative z-10 flex h-full flex-col justify-end p-6 pb-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="glass-card-strong p-6 space-y-4"
        >
          {/* Slide dots */}
          <div className="flex items-center justify-center gap-2">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => goToSlide(i)}
                className={`h-2 rounded-full transition-all duration-300 ${
                  i === currentSlide
                    ? "w-8 bg-primary"
                    : "w-2 bg-muted-foreground/40"
                }`}
              />
            ))}
          </div>

          {/* Title */}
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={currentSlide}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3 }}
              className="space-y-2"
            >
              <h1 className="text-3xl font-bold leading-tight">
                <span className="text-foreground">{slide.title}</span>
                {slide.subtitle && (
                  <>
                    <br />
                    <span className="text-foreground/90">{slide.subtitle} </span>
                  </>
                )}
                {!slide.subtitle && " "}
                <span className="text-primary">{slide.highlight}</span>
              </h1>
              <p className="text-muted-foreground text-sm">{slide.description}</p>
            </motion.div>
          </AnimatePresence>

          {/* CTA Buttons */}
          {isLastSlide ? (
            <div className="space-y-3">
              <motion.button
                onClick={onSignUp}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full gradient-crimson text-primary-foreground py-4 px-6 rounded-xl font-semibold flex items-center justify-center gap-2 shadow-button"
              >
                <span>Create Account</span>
                <ArrowRight className="w-5 h-5" />
              </motion.button>
              <motion.button
                onClick={onSignIn}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full border border-border bg-background/50 text-foreground py-4 px-6 rounded-xl font-semibold flex items-center justify-center gap-2"
              >
                <span>Sign In</span>
              </motion.button>
              <button
                onClick={onGetStarted}
                className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
              >
                Continue as Guest
              </button>
            </div>
          ) : (
            <motion.button
              onClick={nextSlide}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full gradient-crimson text-primary-foreground py-4 px-6 rounded-xl font-semibold flex items-center justify-between shadow-button group"
            >
              <ArrowRight className="w-5 h-5" />
              <span>Next</span>
              <div className="flex items-center gap-0.5">
                <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                <ChevronRight className="w-4 h-4 -ml-2 transition-transform group-hover:translate-x-0.5" />
                <ChevronRight className="w-4 h-4 -ml-2 transition-transform group-hover:translate-x-0.5" />
              </div>
            </motion.button>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default OnboardingScreen;
