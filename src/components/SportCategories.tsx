import { useState } from "react";
import { sportCategories } from "@/data/footballData";

const SportCategories = () => {
  const [activeCategory, setActiveCategory] = useState("football");

  return (
    <div className="flex items-center gap-3 overflow-x-auto scrollbar-hide pb-2">
      {sportCategories.map((category) => (
        <button
          key={category.id}
          onClick={() => setActiveCategory(category.id)}
          className={`
            flex items-center gap-2 px-4 py-2.5 rounded-full whitespace-nowrap transition-all duration-300
            ${
              activeCategory === category.id
                ? "bg-secondary border border-border text-foreground shadow-card"
                : "bg-transparent hover:bg-muted/30 text-muted-foreground"
            }
          `}
        >
          <span className="text-lg">{category.icon}</span>
          {activeCategory === category.id && (
            <>
              <span className="font-medium text-sm">{category.label}</span>
              <span className="text-xs bg-primary/20 text-primary px-1.5 py-0.5 rounded-full">
                {category.matchCount}
              </span>
            </>
          )}
        </button>
      ))}
    </div>
  );
};

export default SportCategories;
