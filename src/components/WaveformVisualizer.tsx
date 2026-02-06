import { cn } from "@/lib/utils";

interface WaveformVisualizerProps {
  isActive?: boolean;
  barCount?: number;
  className?: string;
}

export function WaveformVisualizer({ 
  isActive = false, 
  barCount = 24,
  className 
}: WaveformVisualizerProps) {
  return (
    <div className={cn("flex items-center justify-center gap-0.5 h-16", className)}>
      {Array.from({ length: barCount }).map((_, i) => {
        const delay = i * 0.05;
        const height = isActive 
          ? `${Math.random() * 60 + 20}%` 
          : "20%";
        
        return (
          <div
            key={i}
            className={cn(
              "w-1 rounded-full transition-all duration-150",
              isActive 
                ? "bg-gradient-to-t from-primary to-primary-glow wave-bar" 
                : "bg-muted"
            )}
            style={{
              height: isActive ? undefined : height,
              animationDelay: isActive ? `${delay}s` : undefined,
            }}
          />
        );
      })}
    </div>
  );
}
