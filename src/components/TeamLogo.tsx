import { useState } from "react";

interface TeamLogoProps {
  src?: string | null;
  alt: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
}

const sizeClasses = {
  xs: "w-6 h-6",
  sm: "w-8 h-8",
  md: "w-10 h-10",
  lg: "w-12 h-12",
  xl: "w-14 h-14",
};

const TeamLogo = ({ src, alt, size = "md", className = "" }: TeamLogoProps) => {
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    // Fallback to first letter avatar
    return (
      <div
        className={`${sizeClasses[size]} rounded-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center ${className}`}
      >
        <span className="font-bold text-primary text-sm">
          {alt.charAt(0).toUpperCase()}
        </span>
      </div>
    );
  }

  return (
    <div
      className={`${sizeClasses[size]} rounded-full bg-secondary/50 flex items-center justify-center overflow-hidden ${className}`}
    >
      <img
        src={src ?? undefined}
        alt={alt}
        className="w-[80%] h-[80%] object-contain"
        onError={() => setHasError(true)}
        loading="lazy"
      />
    </div>
  );
};

export default TeamLogo;
