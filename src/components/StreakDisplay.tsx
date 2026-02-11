import { Flame, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface StreakDisplayProps {
  currentStreak: number;
  weekProgress: boolean[]; // 7 days, true = completed
  className?: string;
  onWeekClick?: () => void;
}

export function StreakDisplay({ currentStreak, weekProgress, className, onWeekClick }: StreakDisplayProps) {
  const days = ["S", "M", "T", "W", "T", "F", "S"];
  
  return (
    <div className={cn("flex items-center gap-4", className)}>
      {/* Streak counter */}
      <div className="flex items-center gap-2 bg-streak-fire/10 px-4 py-2 rounded-2xl">
        <Flame 
          className={cn(
            "w-6 h-6 text-streak-fire",
            currentStreak > 0 && "animate-flame"
          )} 
          fill={currentStreak > 0 ? "currentColor" : "none"}
        />
        <span className="font-bold text-lg text-streak-fire">{currentStreak}</span>
        <span className="text-sm text-muted-foreground">dias</span>
      </div>
      
      {/* Week progress */}
      <button onClick={onWeekClick} className="flex gap-1.5 cursor-pointer hover:opacity-80 transition-opacity">
        {weekProgress.map((completed, index) => (
          <div
            key={index}
            className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-all",
              completed
                ? "bg-accent text-accent-foreground shadow-sm"
                : "bg-muted text-muted-foreground"
            )}
          >
            {completed ? (
              <Check className="w-4 h-4" />
            ) : (
              days[index]
            )}
          </div>
        ))}
      </button>
    </div>
  );
}
