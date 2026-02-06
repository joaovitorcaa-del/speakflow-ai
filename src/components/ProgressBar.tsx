import { cn } from "@/lib/utils";

interface ProgressBarProps {
  progress: number; // 0-100
  className?: string;
  showPercentage?: boolean;
  animated?: boolean;
  size?: "sm" | "default" | "lg";
}

export function ProgressBar({ 
  progress, 
  className, 
  showPercentage = false,
  animated = true,
  size = "default"
}: ProgressBarProps) {
  const heights = {
    sm: "h-1.5",
    default: "h-2.5",
    lg: "h-4",
  };
  
  return (
    <div className={cn("w-full", className)}>
      <div className={cn("w-full bg-muted rounded-full overflow-hidden", heights[size])}>
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500 ease-out",
            animated ? "animate-shimmer" : "bg-gradient-to-r from-primary to-primary-glow"
          )}
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        />
      </div>
      {showPercentage && (
        <p className="text-sm text-muted-foreground mt-1 text-right">
          {Math.round(progress)}%
        </p>
      )}
    </div>
  );
}
