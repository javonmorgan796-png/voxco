import { useState } from "react";
import {
  ArrowRight,
  ChevronRight,
  ChevronLeft,
} from "lucide-react";

import {
  motion,
  AnimatePresence,
} from "framer-motion";

// ✅ FIXED IMPORTS (removed ?url)
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
    description:
      "Highlights, scores, and live action — your football world in one app.",
  },

  {
    image: heroSlide2,
    title: "Track Every",
    highlight: "Match Live",
    subtitle: "",
    description:
      "Real-time scores, stats, and notifications for every game that matters.",
  },

  {
    image: heroSlide3,
    title: "Bet Smart &",
    highlight: "Win Big",
    subtitle: "",
    description:
      "Place bets, build accumulators, and climb the leaderboard.",
  },
];

const OnboardingScreen = ({
  onGetStarted,
  onSignIn,
  onSignUp,
}: OnboardingScreenProps) => {
  const [currentSlide, setCurrentSlide] =
    useState(0);

  const [direction, setDirection] =
    useState(0);

  // GO TO SPECIFIC SLIDE
  const goToSlide = (index: number) => {
    setDirection(
      index > currentSlide ? 1 : -1
    );

    setCurrentSlide(index);
  };

  // NEXT
  const nextSlide = () => {
    if (currentSlide < slides.length - 1) {
      setDirection(1);

      setCurrentSlide((prev) => prev + 1);
    }
  };

  // PREVIOUS
  const prevSlide = () => {
    if (currentSlide > 0) {
      setDirection(-1);

      setCurrentSlide((prev) => prev - 1);
    }
  };

  const slide = slides[currentSlide];

  const isLastSlide =
    currentSlide === slides.length - 1;

  // ANIMATION VARIANTS
  const variants = {
    enter: (dir: number) => ({
      x: dir > 0 ? 300 : -300,
      opacity: 0,
    }),

    center: {
      x: 0,
      opacity: 1,
    },

    exit: (dir: number) => ({
      x: dir > 0 ? -300 : 300,
      opacity: 0,
    }),
  };

  return (
    <div className="relative h-screen w-full overflow-hidden bg-black">
      {/* BACKGROUND IMAGE */}
      <AnimatePresence
        mode="wait"
        custom={direction}
      >
        <motion.div
          key={currentSlide}
          custom={direction}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6 }}
          className="absolute inset-0"
        >
          {/* IMAGE */}
          <img
            src={slide.image}
            alt="Football Background"
            className="h-full w-full object-cover object-center"
            loading="eager"
            decoding="async"
            draggable={false}
            onError={(e) => {
              console.log(
                "Image failed to load:",
                slide.image
              );

              // fallback background
              (
                e.currentTarget as HTMLImageElement
              ).style.display = "none";
            }}
          />

          {/* SAFE OVERLAY */}
          <div className="absolute inset-0 bg-black/50" />

          {/* EXTRA GRADIENT */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(to top, rgba(0,0,0,0.85), rgba(0,0,0,0.2), rgba(0,0,0,0.4))",
            }}
          />
        </motion.div>
      </AnimatePresence>

      {/* LOGO */}
      <motion.div
        initial={{
          opacity: 0,
          y: -20,
        }}
        animate={{
          opacity: 1,
          y: 0,
        }}
        transition={{ duration: 0.5 }}
        className="absolute top-4 left-4 z-30 flex items-center gap-2"
      >
        <motion.img
          src={betnaroLogo}
          alt="Betnaro"
          className="w-14 h-14 object-contain"
          animate={{
            rotate: [0, 4, -4, 0],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </motion.div>

      {/* PREV BUTTON */}
      {currentSlide > 0 && (
        <button
          onClick={prevSlide}
          className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center"
        >
          <ChevronLeft className="w-5 h-5 text-white" />
        </button>
      )}

      {/* NEXT BUTTON */}
      {currentSlide <
        slides.length - 1 && (
        <button
          onClick={nextSlide}
          className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center"
        >
          <ChevronRight className="w-5 h-5 text-white" />
        </button>
      )}

      {/* CONTENT */}
      <div className="relative z-10 flex h-full flex-col justify-end p-6 pb-10">
        <motion.div
          initial={{
            opacity: 0,
            y: 30,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          transition={{
            duration: 0.6,
          }}
          className="backdrop-blur-xl bg-black/30 border border-white/10 rounded-3xl p-6 space-y-5"
        >
          {/* DOTS */}
          <div className="flex items-center justify-center gap-2">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() =>
                  goToSlide(i)
                }
                className={`h-2 rounded-full transition-all duration-300 ${
                  i === currentSlide
                    ? "w-8 bg-green-500"
                    : "w-2 bg-white/30"
                }`}
              />
            ))}
          </div>

          {/* TEXT */}
          <AnimatePresence
            mode="wait"
            custom={direction}
          >
            <motion.div
              key={currentSlide}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{
                duration: 0.35,
              }}
              className="space-y-3"
            >
              <h1 className="text-3xl font-bold leading-tight text-white">
                <span>{slide.title}</span>

                {slide.subtitle && (
                  <>
                    <br />
                    <span className="text-white/80">
                      {slide.subtitle}{" "}
                    </span>
                  </>
                )}

                {!slide.subtitle && " "}

                <span className="text-green-400">
                  {slide.highlight}
                </span>
              </h1>

              <p className="text-white/70 text-sm leading-relaxed">
                {slide.description}
              </p>
            </motion.div>
          </AnimatePresence>

          {/* CTA */}
          {isLastSlide ? (
            <div className="space-y-3">
              {/* SIGN UP */}
              <motion.button
                onClick={onSignUp}
                whileHover={{
                  scale: 1.02,
                }}
                whileTap={{
                  scale: 0.98,
                }}
                className="w-full bg-green-500 hover:bg-green-600 transition-colors text-white py-4 px-6 rounded-2xl font-semibold flex items-center justify-center gap-2 shadow-lg"
              >
                <span>
                  Create Account
                </span>

                <ArrowRight className="w-5 h-5" />
              </motion.button>

              {/* SIGN IN */}
              <motion.button
                onClick={onSignIn}
                whileHover={{
                  scale: 1.02,
                }}
                whileTap={{
                  scale: 0.98,
                }}
                className="w-full border border-white/10 bg-white/5 backdrop-blur-md text-white py-4 px-6 rounded-2xl font-semibold"
              >
                Sign In
              </motion.button>

              {/* GUEST */}
              <button
                onClick={onGetStarted}
                className="w-full text-center text-sm text-white/60 hover:text-white transition-colors py-2"
              >
                Continue as Guest
              </button>
            </div>
          ) : (
            <motion.button
              onClick={nextSlide}
              whileHover={{
                scale: 1.02,
              }}
              whileTap={{
                scale: 0.98,
              }}
              className="w-full bg-red-600 hover:bg-red-700 transition-colors text-white py-4 px-6 rounded-2xl font-semibold flex items-center justify-between shadow-lg group"
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
